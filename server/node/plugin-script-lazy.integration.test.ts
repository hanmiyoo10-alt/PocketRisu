import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'
import { Packr } from 'msgpackr'
import { createRequire } from 'node:module'

const packr = new Packr({ useRecords: false })
const magicHeader = new Uint8Array([0, 82, 73, 83, 85, 83, 65, 86, 69, 0, 7])

function encodeRisuSaveLegacy(data: Record<string, unknown>) {
    const encoded = packr.encode(data)
    const result = new Uint8Array(encoded.length + magicHeader.length)
    result.set(magicHeader, 0)
    result.set(encoded, magicHeader.length)
    return result
}

const HERE = path.dirname(fileURLToPath(import.meta.url))
const SERVER_PATH = path.join(HERE, 'server.cjs')
const utils = createRequire(import.meta.url)('./utils.cjs') as {
    decodeRisuSave: (data: Buffer) => Promise<any>
    normalizeJSON: (value: any) => any
    calculateHash: (value: any) => number
}

let tmpDir: string
let port: number
let base: string
let child: ChildProcessWithoutNullStreams
let token: string
let sessionCookie: string
let stdout = ''
let stderr = ''

function hexKey(key: string) {
    return Buffer.from(key, 'utf-8').toString('hex')
}

function jwt(secret: string) {
    const now = Math.floor(Date.now() / 1000)
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
    const payload = Buffer.from(JSON.stringify({ iat: now, exp: now + 300 })).toString('base64url')
    const sig = crypto.createHmac('sha256', secret)
        .update(header + '.' + payload)
        .digest('base64url')
    return header + '.' + payload + '.' + sig
}

function reservePort(): Promise<number> {
    return new Promise((resolve, reject) => {
        const server = net.createServer()
        server.once('error', reject)
        server.listen(0, '127.0.0.1', () => {
            const nextPort = (server.address() as net.AddressInfo).port
            server.close(() => resolve(nextPort))
        })
    })
}

async function waitForServer() {
    const deadline = Date.now() + 10_000
    while (Date.now() < deadline) {
        if (child.exitCode !== null) {
            throw new Error('server exited early\nstdout:\n' + stdout + '\nstderr:\n' + stderr)
        }
        try {
            const res = await fetch(base + '/api/test_auth')
            if (res.ok) return
        } catch {}
        await new Promise(resolve => setTimeout(resolve, 100))
    }
    throw new Error('server did not start\nstdout:\n' + stdout + '\nstderr:\n' + stderr)
}

async function stopServer() {
    if (!child || child.exitCode !== null) return
    const exited = new Promise<void>(resolve => child.once('exit', () => resolve()))
    child.kill('SIGTERM')
    await Promise.race([exited, new Promise<void>(resolve => setTimeout(resolve, 3000))])
    if (child.exitCode === null) child.kill('SIGKILL')
}

function authHeaders(): Record<string, string> {
    return {
        'risu-auth': token,
        'x-session-id': 'plugin-script-lazy-integration',
        'x-user-active': 'true',
    }
}

async function startServer() {
    port = await reservePort()
    base = 'http://127.0.0.1:' + port
    stdout = ''
    stderr = ''
    child = spawn(process.execPath, [SERVER_PATH], {
        cwd: tmpDir,
        env: {
            ...process.env,
            PORT: String(port),
            RISU_TUNNEL_DISABLED: 'true',
            RISU_UPDATE_CHECK: 'false',
            POCKETRISU_BACKUP_INTERVAL_MS: String(60 * 60 * 1000),
        },
    })
    child.stdout.on('data', chunk => { stdout += String(chunk) })
    child.stderr.on('data', chunk => { stderr += String(chunk) })
    await waitForServer()
    const secret = fs.readFileSync(path.join(tmpDir, 'save', '__jwt_secret'), 'utf-8').trim()
    token = jwt(secret)

    const sessionRes = await fetch(base + '/api/session', {
        method: 'POST',
        headers: authHeaders(),
    })
    expect(sessionRes.status).toBe(200)
    const setCookie = sessionRes.headers.get('set-cookie') ?? ''
    sessionCookie = setCookie.split(';')[0]
    expect(sessionCookie.startsWith('risu-session=')).toBe(true)
}

async function writeDb(db: any) {
    const res = await fetch(base + '/api/write', {
        method: 'POST',
        headers: {
            ...authHeaders(),
            'file-path': hexKey('database/database.bin'),
            'content-type': 'application/octet-stream',
        },
        body: Buffer.from(encodeRisuSaveLegacy(db)) as any,
    })
    expect(res.status).toBe(200)
}

async function readClientDb() {
    const res = await fetch(base + '/api/read', {
        headers: {
            ...authHeaders(),
            'file-path': hexKey('database/database.bin'),
        },
    })
    expect(res.status).toBe(200)
    return utils.normalizeJSON(await utils.decodeRisuSave(Buffer.from(await res.arrayBuffer())))
}

function withDb<T>(fn: (db: any) => T): T {
    const db = new Database(path.join(tmpDir, 'save', 'risuai.db'))
    db.pragma('busy_timeout = 5000')
    try { return fn(db) } finally { db.close() }
}

async function diskDb() {
    const raw = withDb((db) => db.prepare('SELECT value FROM kv WHERE key = ?').get('database/database.bin'))
    return utils.normalizeJSON(await utils.decodeRisuSave(Buffer.from(raw.value)))
}

async function flushDb() {
    const res = await fetch(base + '/api/db/flush', {
        method: 'POST',
        headers: { cookie: sessionCookie },
    })
    expect(res.status).toBe(200)
}

function plugin(name: string, enabled: boolean, script: string) {
    return {
        name,
        displayName: name.toUpperCase(),
        enabled,
        version: '3.0',
        script,
        realArg: { token: name },
        arguments: { token: 'string' },
        customLink: [],
        argMeta: {},
        folderId: 'folder-' + name,
    }
}

function seedShape() {
    return {
        botPresetsId: 0,
        botPresets: [],
        characters: [],
        modules: [],
        plugins: [
            plugin('enabled', true, 'enabled-secret-code'),
            plugin('disabled', false, 'disabled-secret-code'),
            plugin('other', false, 'other-secret-code'),
        ],
    }
}

beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-script-lazy-integration-'))
    await startServer()
    await writeDb(seedShape())
})

afterEach(async () => {
    await stopServer()
    fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('disabled plugin script lazy hydration server integration', () => {
    it('serves enabled scripts full, disabled scripts as stubs, and hydrates by name', async () => {
        const client = await readClientDb()

        expect(client.plugins[0].script).toBe('enabled-secret-code')
        expect(client.plugins[0]._pluginScriptStub).toBeUndefined()
        expect(client.plugins[1]).toMatchObject({
            name: 'disabled',
            displayName: 'DISABLED',
            enabled: false,
            script: '',
            _pluginScriptStub: true,
        })

        const res = await fetch(base + '/api/plugin-content/' + encodeURIComponent('disabled'), {
            headers: authHeaders(),
        })
        expect(res.status).toBe(200)
        const hydrated = utils.normalizeJSON(await utils.decodeRisuSave(Buffer.from(await res.arrayBuffer())))
        expect(hydrated.name).toBe('disabled')
        expect(hydrated.script).toBe('disabled-secret-code')
    })

    it('serves a newer full disabled plugin from dbCache before persist commits', async () => {
        const client = await readClientDb()
        const expectedHash = utils.calculateHash(client).toString(16)
        const livePlugin = plugin('disabled', false, 'new-live-code')

        const patchRes = await fetch(base + '/api/patch', {
            method: 'POST',
            headers: {
                ...authHeaders(),
                'file-path': hexKey('database/database.bin'),
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                expectedHash,
                patch: [{ op: 'replace', path: '/plugins/1', value: livePlugin }],
            }),
        })
        expect(patchRes.status).toBe(200)

        const res = await fetch(base + '/api/plugin-content/disabled', {
            headers: authHeaders(),
        })
        expect(res.status).toBe(200)
        const hydrated = utils.normalizeJSON(await utils.decodeRisuSave(Buffer.from(await res.arrayBuffer())))
        expect(hydrated.script).toBe('new-live-code')
    })

    it('re-strips a newly updated disabled script at the next read boundary', async () => {
        const client = await readClientDb()
        const expectedHash = utils.calculateHash(client).toString(16)
        const updated = plugin('disabled', false, 'updated-disabled-code')

        const patchRes = await fetch(base + '/api/patch', {
            method: 'POST',
            headers: {
                ...authHeaders(),
                'file-path': hexKey('database/database.bin'),
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                expectedHash,
                patch: [{ op: 'replace', path: '/plugins/1', value: updated }],
            }),
        })
        expect(patchRes.status).toBe(200)

        const nextClient = await readClientDb()
        expect(nextClient.plugins[1].script).toBe('')
        expect(nextClient.plugins[1]._pluginScriptStub).toBe(true)

        const content = await fetch(base + '/api/plugin-content/disabled', {
            headers: authHeaders(),
        })
        expect(content.status).toBe(200)
        const hydrated = utils.normalizeJSON(await utils.decodeRisuSave(Buffer.from(await content.arrayBuffer())))
        expect(hydrated.script).toBe('updated-disabled-code')

        const disk = await diskDb()
        expect(disk.plugins[1].script).toBe('updated-disabled-code')
    })

    it('keeps the newest script when update is followed immediately by disable stub', async () => {
        const client = await readClientDb()
        const firstHash = utils.calculateHash(client).toString(16)
        const updatedEnabled = plugin('enabled', true, 'enabled-new-code')

        const updateRes = await fetch(base + '/api/patch', {
            method: 'POST',
            headers: {
                ...authHeaders(),
                'file-path': hexKey('database/database.bin'),
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                expectedHash: firstHash,
                patch: [{ op: 'replace', path: '/plugins/0', value: updatedEnabled }],
            }),
        })
        expect(updateRes.status).toBe(200)

        const fullAfterUpdate = structuredClone(client)
        fullAfterUpdate.plugins[0] = updatedEnabled
        const secondHash = utils.calculateHash(fullAfterUpdate).toString(16)
        const disabledStub = {
            ...updatedEnabled,
            enabled: false,
            script: '',
            _pluginScriptStub: true,
        }

        const disableRes = await fetch(base + '/api/patch', {
            method: 'POST',
            headers: {
                ...authHeaders(),
                'file-path': hexKey('database/database.bin'),
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                expectedHash: secondHash,
                patch: [{ op: 'replace', path: '/plugins/0', value: disabledStub }],
            }),
        })
        expect(disableRes.status).toBe(200)

        await flushDb()
        const disk = await diskDb()
        expect(disk.plugins[0].enabled).toBe(false)
        expect(disk.plugins[0].script).toBe('enabled-new-code')
        expect(disk.plugins[0]._pluginScriptStub).toBeUndefined()
    })

    it('preserves disabled script through a stub metadata patch', async () => {
        const client = await readClientDb()
        const expectedHash = utils.calculateHash(client).toString(16)

        const res = await fetch(base + '/api/patch', {
            method: 'POST',
            headers: {
                ...authHeaders(),
                'file-path': hexKey('database/database.bin'),
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                expectedHash,
                patch: [
                    { op: 'replace', path: '/plugins/1/folderId', value: 'folder-moved' },
                    { op: 'replace', path: '/plugins/1/realArg/token', value: 'changed' },
                ],
            }),
        })
        expect(res.status).toBe(200)
        await flushDb()

        const disk = await diskDb()
        expect(disk.plugins[1].script).toBe('disabled-secret-code')
        expect(disk.plugins[1].folderId).toBe('folder-moved')
        expect(disk.plugins[1].realArg.token).toBe('changed')
        expect(disk.plugins[1]._pluginScriptStub).toBeUndefined()
    })

    it('preserves disabled scripts through a full write carrying stubs', async () => {
        const client = await readClientDb()
        client.plugins[2].folderId = null
        client.plugins[2].realArg.token = 'other-changed'

        await writeDb(client)

        const disk = await diskDb()
        expect(disk.plugins[2].script).toBe('other-secret-code')
        expect(disk.plugins[2].folderId).toBeNull()
        expect(disk.plugins[2].realArg.token).toBe('other-changed')
        expect(disk.plugins[2]._pluginScriptStub).toBeUndefined()

        const nextClient = await readClientDb()
        expect(nextClient.plugins[2]._pluginScriptStub).toBe(true)
        expect(nextClient.plugins[2].script).toBe('')
    })
})
