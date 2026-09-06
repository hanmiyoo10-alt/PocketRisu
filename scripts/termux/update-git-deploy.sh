#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

REMOTE="fork"
BRANCH="deploy/termux-pocketrisu"
EXPECTED_REMOTE="https://github.com/hanmiyoo10-alt/PocketRisu.git"
REMOTE_REF="refs/heads/$BRANCH"
REMOTE_TRACKING="refs/remotes/$REMOTE/$BRANCH"

ROOT="${POCKETRISU_ROOT:-$(cd "$(dirname "$0")/../.." && pwd)}"
SERVICE="${POCKETRISU_SERVICE:-$PREFIX/var/service/pocketrisu}"
HEALTH_URL="${POCKETRISU_HEALTH_URL:-http://127.0.0.1:6001/api/health}"

STATE_BASE="${XDG_STATE_HOME:-$HOME/.local/state}"
CACHE_BASE="${XDG_CACHE_HOME:-$HOME/.cache}"
STATE_ROOT="$STATE_BASE/pocketrisu-git-deploy"
CACHE_ROOT="$CACHE_BASE/pocketrisu-git-deploy"

MODE="${1:---check}"

OLD=""
TARGET=""
RUN_DIR=""
WORKTREE=""
LOCK_DIR="$STATE_ROOT/lock"
LOCK_HELD=0
TRANSACTION_ACTIVE=0
ROLLBACK_RUNNING=0
PRESERVE_RUN_DIR=0

log() {
    printf '[git-deploy] %s\n' "$*"
}

warn() {
    printf '[git-deploy][WARN] %s\n' "$*" >&2
}

die() {
    printf '[git-deploy][ERROR] %s\n' "$*" >&2
    exit 1
}

g() {
    git -C "$ROOT" "$@"
}

usage() {
    cat <<USAGE
Usage:
  $0 --check
  $0 --apply

--check
  Verify the deployment contract, fetch the verified fork branch,
  and report whether an update is available. Does not change HEAD,
  dist/, node_modules/, or the service state.

--apply
  Prebuild the fetched target in a detached temporary Git worktree.
  Only after that build succeeds:
    - stop PocketRisu
    - fast-forward the deployment branch
    - sync dependencies from the warmed pnpm store
    - install the prebuilt dist/
    - restart and verify /api/health
  On failure, restore the previous commit and dist/ and restart it.
USAGE
}

case "$MODE" in
    --check|--apply)
        ;;
    -h|--help)
        usage
        exit 0
        ;;
    *)
        usage >&2
        die "Unknown mode: $MODE"
        ;;
esac

SELF_REL="${BASH_SOURCE[0]#"$ROOT"/}"

require_commands() {
    local cmd
    for cmd in git node pnpm curl sv; do
        command -v "$cmd" >/dev/null 2>&1 ||
            die "Required command not found: $cmd"
    done
}

assert_repo_contract() {
    [ -d "$ROOT/.git" ] ||
        die "Not a Git checkout: $ROOT"

    local branch
    branch="$(g branch --show-current)"
    [ "$branch" = "$BRANCH" ] ||
        die "Expected branch $BRANCH, got ${branch:-DETACHED}"

    local remote_url push_url
    remote_url="$(g remote get-url "$REMOTE")"
    push_url="$(g remote get-url --push "$REMOTE")"

    [ "$remote_url" = "$EXPECTED_REMOTE" ] ||
        die "Unexpected $REMOTE fetch URL: $remote_url"

    [ "$push_url" = "$EXPECTED_REMOTE" ] ||
        die "Unexpected $REMOTE push URL: $push_url"

    local tracking_remote tracking_merge
    tracking_remote="$(g config --get "branch.$BRANCH.remote" || true)"
    tracking_merge="$(g config --get "branch.$BRANCH.merge" || true)"

    [ "$tracking_remote" = "$REMOTE" ] ||
        die "Unexpected tracking remote: ${tracking_remote:-NONE}"

    [ "$tracking_merge" = "$REMOTE_REF" ] ||
        die "Unexpected tracking ref: ${tracking_merge:-NONE}"
}

assert_clean_tracked() {
    g diff --quiet -- ||
        die "Unstaged tracked changes exist"

    g diff --cached --quiet -- ||
        die "Staged tracked changes exist"
}

assert_safe_untracked() {
    local path
    while IFS= read -r path; do
        [ -n "$path" ] || continue

        case "$path" in
            generic_mock_bridge.cjs)
                continue
                ;;
        esac

        # During initial review only, allow this updater itself to be untracked
        # in --check mode. --apply is forbidden until the updater is committed.
        if [ "$MODE" = "--check" ] &&
           [ "$path" = "$SELF_REL" ] &&
           ! g ls-files --error-unmatch "$SELF_REL" >/dev/null 2>&1; then
            continue
        fi

        die "Unexpected untracked path: $path"
    done < <(g ls-files --others --exclude-standard)
}

assert_apply_is_committed() {
    [ "$MODE" = "--apply" ] || return 0

    g ls-files --error-unmatch "$SELF_REL" >/dev/null 2>&1 ||
        die "--apply is disabled until $SELF_REL is tracked by Git"

    g diff --quiet HEAD -- "$SELF_REL" ||
        die "--apply is disabled while $SELF_REL differs from HEAD"
}

assert_pre_switch_contract() {
    # Candidate preparation can take a while. Re-check everything that could
    # have changed before touching the live checkout or service.
    assert_repo_contract
    assert_clean_tracked
    assert_safe_untracked

    local current tracking_tip advertised

    current="$(g rev-parse HEAD)"
    [ "$current" = "$OLD" ] ||
        die "Local HEAD changed while candidate was building: $current"

    tracking_tip="$(g rev-parse "$REMOTE_TRACKING^{commit}")"
    [ "$tracking_tip" = "$TARGET" ] ||
        die "Fetched deployment target changed locally; run again"

    advertised="$(
        g ls-remote \
            --heads \
            "$REMOTE" \
            "$REMOTE_REF" |
        awk '{print $1}'
    )"

    [ -n "$advertised" ] ||
        die "Remote deployment branch disappeared before live switch"

    [ "$advertised" = "$TARGET" ] ||
        die "Remote deployment branch moved while candidate was building; run again"
}

health_ok() {
    local body
    body="$(
        curl -fsS \
            --connect-timeout 2 \
            --max-time 3 \
            "$HEALTH_URL" \
            2>/dev/null
    )" || return 1

    printf '%s\n' "$body" |
        grep -Eq '"ok"[[:space:]]*:[[:space:]]*true' ||
        return 1

    printf '%s\n' "$body" |
        grep -Eq '"status"[[:space:]]*:[[:space:]]*"ready"' ||
        return 1

    return 0
}

wait_for_health() {
    local tries="${1:-30}"
    local i

    for ((i = 1; i <= tries; i++)); do
        if health_ok; then
            return 0
        fi
        sleep 1
    done

    return 1
}

wait_for_down() {
    local i status

    for ((i = 1; i <= 20; i++)); do
        status="$(sv status "$SERVICE" 2>&1 || true)"
        case "$status" in
            down:*)
                return 0
                ;;
        esac
        sleep 1
    done

    return 1
}

acquire_lock() {
    mkdir -p "$STATE_ROOT"

    if mkdir "$LOCK_DIR" 2>/dev/null; then
        printf '%s\n' "$$" > "$LOCK_DIR/pid"
        LOCK_HELD=1
        return 0
    fi

    local old_pid=""
    if [ -f "$LOCK_DIR/pid" ]; then
        old_pid="$(cat "$LOCK_DIR/pid" 2>/dev/null || true)"
    fi

    if [ -n "$old_pid" ] && kill -0 "$old_pid" 2>/dev/null; then
        die "Another updater is running with pid $old_pid"
    fi

    warn "Removing stale updater lock"

    rm -f "$LOCK_DIR/pid"

    rmdir "$LOCK_DIR" 2>/dev/null ||
        die "Stale lock contains unexpected files: $LOCK_DIR"

    mkdir "$LOCK_DIR"
    printf '%s\n' "$$" > "$LOCK_DIR/pid"
    LOCK_HELD=1
}

release_lock() {
    [ "$LOCK_HELD" -eq 1 ] || return 0

    rm -f "$LOCK_DIR/pid" 2>/dev/null || true
    rmdir "$LOCK_DIR" 2>/dev/null || true
    LOCK_HELD=0
}

remove_worktree() {
    [ -n "$WORKTREE" ] || return 0

    if [ -d "$WORKTREE" ]; then
        g worktree remove --force "$WORKTREE" >/dev/null 2>&1 ||
            warn "Could not remove temporary worktree: $WORKTREE"
    fi

    WORKTREE=""
}

cleanup_runtime() {
    remove_worktree

    if [ -n "$RUN_DIR" ] && [ -d "$RUN_DIR" ]; then
        if [ "$PRESERVE_RUN_DIR" -eq 1 ]; then
            warn "Preserving recovery directory: $RUN_DIR"
        else
            rm -rf "$RUN_DIR"
        fi
    fi

    release_lock
}

rollback_transaction() {
    [ "$TRANSACTION_ACTIVE" -eq 1 ] || return 0
    [ "$ROLLBACK_RUNNING" -eq 0 ] || return 1

    ROLLBACK_RUNNING=1
    TRANSACTION_ACTIVE=0

    warn "Rolling back to $OLD"

    local rollback_ok=1
    local current=""

    set +e

    sv down "$SERVICE" >/dev/null 2>&1

    if ! wait_for_down; then
        warn "Service did not stop; refusing to modify files during rollback"
        rollback_ok=0
    fi

    if [ "$rollback_ok" -eq 1 ]; then
        current="$(g rev-parse HEAD 2>/dev/null)"

        case "$current" in
            "$TARGET")
                if ! g update-ref "refs/heads/$BRANCH" "$OLD" "$TARGET"; then
                    warn "Could not move branch ref back to $OLD"
                    rollback_ok=0
                fi
                ;;
            "$OLD")
                ;;
            *)
                warn "HEAD is unexpected during rollback: ${current:-UNKNOWN}"
                rollback_ok=0
                ;;
        esac
    fi

    if [ "$rollback_ok" -eq 1 ]; then
        if ! g restore \
            --source="$OLD" \
            --staged \
            --worktree \
            -- .; then
            warn "Tracked worktree restore failed"
            rollback_ok=0
        fi
    fi

    if [ "$rollback_ok" -eq 1 ]; then
        if [ "$(g rev-parse HEAD 2>/dev/null)" != "$OLD" ]; then
            warn "HEAD does not match rollback commit after restore"
            rollback_ok=0
        elif ! g diff --quiet -- || ! g diff --cached --quiet --; then
            warn "Tracked tree is not clean after rollback restore"
            rollback_ok=0
        fi
    fi

    if [ "$rollback_ok" -eq 1 ]; then
        if [ -d "$RUN_DIR/dist-old" ] &&
           [ -s "$RUN_DIR/dist-old/index.html" ]; then
            rm -rf "$ROOT/dist"

            if ! cp -a "$RUN_DIR/dist-old" "$ROOT/dist"; then
                warn "Old dist restore failed"
                rollback_ok=0
            fi
        else
            warn "Old dist backup is missing or incomplete"
            rollback_ok=0
        fi
    fi

    if [ "$rollback_ok" -eq 1 ]; then
        (
            cd "$ROOT" || exit 1
            export GYP_DEFINES="android_ndk_path=''"
            pnpm install --offline --frozen-lockfile
        )

        if [ $? -ne 0 ]; then
            warn "Old dependency restore failed"
            rollback_ok=0
        fi
    fi

    if [ "$rollback_ok" -eq 1 ]; then
        if ! sv up "$SERVICE"; then
            warn "Could not start service after rollback"
            rollback_ok=0
        elif wait_for_health 30; then
            warn "Rollback health check passed"
        else
            warn "Rollback completed but health check FAILED"
            rollback_ok=0
        fi
    fi

    if [ "$rollback_ok" -eq 1 ]; then
        rm -f "$STATE_ROOT/pending-target-sha"
        printf '%s\n' "$OLD" > "$STATE_ROOT/last-rollback-success-sha.tmp"
        mv \
            "$STATE_ROOT/last-rollback-success-sha.tmp" \
            "$STATE_ROOT/last-rollback-success-sha"

        ROLLBACK_RUNNING=0
        set -e
        return 0
    fi

    PRESERVE_RUN_DIR=1
    warn "Automatic rollback is incomplete"
    warn "Recovery data will be preserved at: $RUN_DIR"
    warn "Pending target state is preserved under: $STATE_ROOT"

    ROLLBACK_RUNNING=0
    set -e
    return 1
}

on_exit() {
    local rc=$?

    trap - EXIT INT TERM

    if [ "$rc" -ne 0 ] && [ "$TRANSACTION_ACTIVE" -eq 1 ]; then
        if ! rollback_transaction; then
            PRESERVE_RUN_DIR=1
            warn "Updater failed and automatic rollback was incomplete"
        fi
    fi

    cleanup_runtime
    exit "$rc"
}

trap on_exit EXIT
trap 'exit 130' INT TERM

fetch_verified_target() {
    log "Fetching $REMOTE/$BRANCH"

    g fetch \
        --no-tags \
        "$REMOTE" \
        "+$REMOTE_REF:$REMOTE_TRACKING"

    TARGET="$(g rev-parse "$REMOTE_TRACKING^{commit}")"

    local advertised
    advertised="$(
        g ls-remote \
            --heads \
            "$REMOTE" \
            "$REMOTE_REF" |
        awk '{print $1}'
    )"

    [ -n "$advertised" ] ||
        die "Remote deployment branch is missing"

    [ "$TARGET" = "$advertised" ] ||
        die "Remote branch changed during fetch; run again"

    OLD="$(g rev-parse HEAD)"

    if [ "$OLD" != "$TARGET" ]; then
        g merge-base --is-ancestor "$OLD" "$TARGET" ||
            die "Remote target is not a fast-forward descendant of current HEAD"
    fi
}

report_contract() {
    log "mode=$MODE"
    log "root=$ROOT"
    log "branch=$(g branch --show-current)"
    log "head=$(g rev-parse HEAD)"
    log "remote=$EXPECTED_REMOTE"
    log "service=$SERVICE"
    log "health=$HEALTH_URL"
}

prepare_candidate() {
    mkdir -p "$STATE_ROOT" "$CACHE_ROOT"

    local run_id
    run_id="$(date +%Y%m%d-%H%M%S)-$$"

    RUN_DIR="$STATE_ROOT/run-$run_id"
    WORKTREE="$CACHE_ROOT/worktree-$run_id"

    mkdir -p "$RUN_DIR"

    log "Creating detached candidate worktree"
    g worktree add --detach "$WORKTREE" "$TARGET"

    log "Installing candidate dependencies"
    (
        cd "$WORKTREE"
        export GYP_DEFINES="android_ndk_path=''"
        pnpm install --frozen-lockfile
    )

    log "Building candidate"
    (
        cd "$WORKTREE"
        NODE_OPTIONS="--max-old-space-size=2048" pnpm build
        node --check server/node/server.cjs
    )

    [ -s "$WORKTREE/dist/index.html" ] ||
        die "Candidate build did not produce dist/index.html"

    git -C "$WORKTREE" diff --quiet -- ||
        die "Candidate build changed tracked files"

    git -C "$WORKTREE" diff --cached --quiet -- ||
        die "Candidate build staged tracked files"

    cp -a "$WORKTREE/dist" "$RUN_DIR/dist-new"

    [ -s "$RUN_DIR/dist-new/index.html" ] ||
        die "Candidate dist staging failed"

    log "Candidate build verified"
}

record_rollback_point() {
    mkdir -p "$STATE_ROOT"

    printf '%s\n' "$OLD" > "$STATE_ROOT/last-rollback-sha.tmp"
    mv \
        "$STATE_ROOT/last-rollback-sha.tmp" \
        "$STATE_ROOT/last-rollback-sha"

    printf '%s\n' "$TARGET" > "$STATE_ROOT/pending-target-sha.tmp"
    mv \
        "$STATE_ROOT/pending-target-sha.tmp" \
        "$STATE_ROOT/pending-target-sha"
}

apply_target() {
    [ -s "$ROOT/dist/index.html" ] ||
        die "Current dist/index.html is missing"

    health_ok ||
        die "Current PocketRisu service is not healthy; refusing update"

    log "Backing up current dist"
    cp -a "$ROOT/dist" "$RUN_DIR/dist-old"

    [ -s "$RUN_DIR/dist-old/index.html" ] ||
        die "Current dist backup failed"

    record_rollback_point

    # Candidate node_modules is only needed to warm the pnpm store.
    # Remove its worktree before stopping the live service.
    remove_worktree

    log "Re-validating deployment contract before live switch"
    assert_pre_switch_contract

    health_ok ||
        die "Live service became unhealthy before deployment switch"

    TRANSACTION_ACTIVE=1

    log "Stopping PocketRisu service"
    sv down "$SERVICE"

    wait_for_down ||
        die "PocketRisu service did not stop cleanly"

    log "Fast-forwarding $OLD -> $TARGET"
    g merge --ff-only "$TARGET"

    [ "$(g rev-parse HEAD)" = "$TARGET" ] ||
        die "HEAD does not match target after fast-forward"

    log "Synchronizing dependencies from warmed pnpm store"
    (
        cd "$ROOT"
        export GYP_DEFINES="android_ndk_path=''"
        pnpm install --offline --frozen-lockfile
    )

    log "Installing prebuilt dist"
    rm -rf "$ROOT/dist"
    cp -a "$RUN_DIR/dist-new" "$ROOT/dist"

    [ -s "$ROOT/dist/index.html" ] ||
        die "Installed dist/index.html is missing"

    node --check "$ROOT/server/node/server.cjs"

    assert_clean_tracked
    assert_safe_untracked

    log "Starting PocketRisu service"
    sv up "$SERVICE"

    if ! wait_for_health 30; then
        die "New PocketRisu failed /api/health"
    fi

    TRANSACTION_ACTIVE=0

    printf '%s\n' "$TARGET" > "$STATE_ROOT/last-success-sha.tmp"
    mv \
        "$STATE_ROOT/last-success-sha.tmp" \
        "$STATE_ROOT/last-success-sha"

    rm -f "$STATE_ROOT/pending-target-sha"

    log "Health check passed"
    log "Update complete: $OLD -> $TARGET"
}

main() {
    require_commands
    assert_repo_contract
    assert_clean_tracked
    assert_apply_is_committed
    assert_safe_untracked

    report_contract

    if [ "$MODE" = "--apply" ]; then
        acquire_lock
    fi

    fetch_verified_target

    log "remote_target=$TARGET"

    if [ "$OLD" = "$TARGET" ]; then
        log "up_to_date=YES"

        if health_ok; then
            log "live_health=OK"
        else
            die "Repository is current but live service health check failed"
        fi

        return 0
    fi

    log "update_available=YES"
    log "current=$OLD"
    log "target=$TARGET"

    if [ "$MODE" = "--check" ]; then
        if health_ok; then
            log "live_health=OK"
        else
            die "Update is available but current live service is unhealthy"
        fi

        log "check_only=YES"
        return 0
    fi

    prepare_candidate
    apply_target
}

main "$@"
