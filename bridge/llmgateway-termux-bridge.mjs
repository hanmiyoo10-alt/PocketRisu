#!/usr/bin/env node
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const VERSION = '1.6.1';
const PROTOCOL_VERSION = 2;
const MIN_PLUGIN_VERSION = '2.5.4';
const RECOMMENDED_PLUGIN_VERSION = '2.7.3';
const HOST = '127.0.0.1';
const PORT = Number(process.env.DEVPASS_BRIDGE_PORT || 39117);
const CLI_VERSION = process.env.LLMGATEWAY_CLI_VERSION || '1.9.0';
const CONFIG_DIR = path.join(os.homedir(), '.config', 'llmgateway-devpass-bridge');
const TOKEN_FILE = path.join(CONFIG_DIR, 'token');
const UPDATE_READY_DIR = path.join(os.homedir(), 'PocketRisu', 'bridge', 'update-ready');
const PLUGIN_LATEST_FILE = path.join(UPDATE_READY_DIR, 'latest_dashboard.js');
const CAPTURE_TAP_FILE = path.join(CONFIG_DIR, 'capture-orgs.cjs');
const CACHE_TTL = {
  orgs: 30_000,
  accountCapture: 30_000,
  devpassStatus: 30_000,
  'activity:24h': 60_000,
  'activity:7d': 300_000,
  'activity:30d': 600_000,
  analytics: 60_000,
};

const cache = new Map();
const inFlight = new Map();
const STARTED_AT = Date.now();
const CACHE_MAX_ENTRIES = 128;
const CACHE_STALE_MAX_MS = 30 * 60_000;
const cacheStats = {
  hits: 0,
  misses: 0,
  joins: 0,
  loads: 0,
  errors: 0,
  staleFallbacks: 0,
  totalLoadMs: 0,
  lastLoadMs: 0,
};
const CLI_CONCURRENCY = Math.max(1, Math.min(2, Number(process.env.DEVPASS_BRIDGE_CLI_CONCURRENCY || 1)));
const cliWaiters = [];
const cliStats = { active: 0, queued: 0, runs: 0, maxActive: 0 };
const CIRCUIT_FAILURE_THRESHOLD = 3;
const CIRCUIT_BASE_OPEN_MS = 45_000;
const CIRCUIT_MAX_OPEN_MS = 5 * 60_000;
const circuits = new Map();
const circuitStats = { opens: 0, blocked: 0, recoveries: 0 };

async function withCliSlot(task) {
  if (cliStats.active >= CLI_CONCURRENCY) {
    cliStats.queued += 1;
    await new Promise((resolve) => cliWaiters.push(resolve));
    cliStats.queued = Math.max(0, cliStats.queued - 1);
  }
  cliStats.active += 1;
  cliStats.runs += 1;
  cliStats.maxActive = Math.max(cliStats.maxActive, cliStats.active);
  try {
    return await task();
  } finally {
    cliStats.active = Math.max(0, cliStats.active - 1);
    const next = cliWaiters.shift();
    if (next) next();
  }
}
const logThrottle = new Map();
let bridgeToken = '';

function logRateLimited(level, key, message, intervalMs = 60_000) {
  const now = Date.now();
  const last = logThrottle.get(key) || 0;
  if (now - last < intervalMs) return;
  logThrottle.set(key, now);
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  fn(`[bridge] ${message}`);
  if (logThrottle.size > 128) {
    for (const [entryKey, at] of logThrottle) {
      if (now - at > intervalMs * 4) logThrottle.delete(entryKey);
    }
  }
}

function pruneCache() {
  if (cache.size <= CACHE_MAX_ENTRIES) return;
  const entries = [...cache.entries()].sort((a, b) => (a[1]?.at || 0) - (b[1]?.at || 0));
  for (const [key] of entries.slice(0, Math.max(0, cache.size - CACHE_MAX_ENTRIES))) cache.delete(key);
}

function staleClone(value, ageMs, error) {
  if (!value || typeof value !== 'object') return value;
  const meta = { stale: true, ageMs, reason: safeMessage(error) };
  return Array.isArray(value) ? value.slice() : { ...value, _cache: meta };
}

function json(res, status, body) {
  const text = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-DevPass-Bridge-Key',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  });
  res.end(text);
}

function parsePluginMetadata(text) {
  const source = String(text || '');
  const match = (name) => source.match(new RegExp(`^\\/\\/@${name}\\s+([^\\r\\n]+)`, 'm'))?.[1]?.trim() || '';
  return {
    name: match('name'),
    displayName: match('display-name'),
    api: match('api'),
    version: match('version'),
    updateUrl: match('update-url'),
  };
}

async function pluginUpdateInfo() {
  try {
    const [buffer, stat] = await Promise.all([
      fs.readFile(PLUGIN_LATEST_FILE),
      fs.stat(PLUGIN_LATEST_FILE),
    ]);
    const meta = parsePluginMetadata(buffer.toString('utf8', 0, Math.min(buffer.length, 16 * 1024)));
    return {
      available: true,
      version: meta.version || null,
      name: meta.name || null,
      api: meta.api || null,
      size: buffer.length,
      modifiedAt: stat.mtimeMs || null,
      endpoint: `http://${HOST}:${PORT}/plugin/latest`,
    };
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return {
        available: false,
        version: null,
        size: 0,
        modifiedAt: null,
        endpoint: `http://${HOST}:${PORT}/plugin/latest`,
      };
    }
    throw error;
  }
}

async function serveLatestPlugin(req, res) {
  let buffer;
  try {
    buffer = await fs.readFile(PLUGIN_LATEST_FILE);
  } catch (error) {
    if (error?.code === 'ENOENT') return json(res, 404, { error: 'No staged plugin update' });
    throw error;
  }

  const size = buffer.length;
  const baseHeaders = {
    'Content-Type': 'application/javascript; charset=utf-8',
    'Cache-Control': 'no-store, max-age=0',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Range, Content-Type',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Expose-Headers': 'Accept-Ranges, Content-Range, Content-Length',
    'Accept-Ranges': 'bytes',
    'X-Content-Type-Options': 'nosniff',
  };

  const range = String(req.headers.range || '').trim();
  if (range) {
    const match = range.match(/^bytes=(\d*)-(\d*)$/i);
    if (!match || (!match[1] && !match[2])) {
      res.writeHead(416, { ...baseHeaders, 'Content-Range': `bytes */${size}` });
      return res.end();
    }

    let start;
    let end;
    if (!match[1]) {
      const suffix = Number(match[2]);
      if (!Number.isFinite(suffix) || suffix <= 0) {
        res.writeHead(416, { ...baseHeaders, 'Content-Range': `bytes */${size}` });
        return res.end();
      }
      start = Math.max(0, size - suffix);
      end = Math.max(0, size - 1);
    } else {
      start = Number(match[1]);
      end = match[2] ? Number(match[2]) : Math.max(0, size - 1);
    }

    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || start >= size) {
      res.writeHead(416, { ...baseHeaders, 'Content-Range': `bytes */${size}` });
      return res.end();
    }
    end = Math.min(end, Math.max(0, size - 1));
    const chunk = buffer.subarray(start, end + 1);
    res.writeHead(206, {
      ...baseHeaders,
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Content-Length': String(chunk.length),
    });
    if (req.method === 'HEAD') return res.end();
    return res.end(chunk);
  }

  res.writeHead(200, { ...baseHeaders, 'Content-Length': String(size) });
  if (req.method === 'HEAD') return res.end();
  return res.end(buffer);
}

function safeMessage(error) {
  const text = String(error?.message || error || 'unknown error');
  return text
    .replace(/llmgtwy_[A-Za-z0-9_-]+/g, 'llmgtwy_[REDACTED]')
    .replace(/Bearer\s+[^\s'"]+/gi, 'Bearer [REDACTED]')
    .replace(/((?:authorization|cookie|session(?:id|token)?)\s*[:=]\s*)[^\s,;]+/gi, '$1[REDACTED]')
    .slice(0, 500);
}


function classifyError(error) {
  const text = safeMessage(error).toLowerCase();
  if (/401|unauthor/.test(text)) return 'AUTH_UNAUTHORIZED';
  if (/403|forbidden/.test(text)) return 'AUTH_FORBIDDEN';
  if (/timeout|timed out|etimedout/.test(text)) return 'UPSTREAM_TIMEOUT';
  if (/organization .*not found|no organizations/.test(text)) return 'ORG_NOT_FOUND';
  if (/projectid unavailable|\/activity .*unavailable/.test(text)) return 'DEVPASS_ACTIVITY_UNAVAILABLE';
  if (/could not parse|json/.test(text)) return 'UPSTREAM_PARSE_ERROR';
  if (/enoent|not found/.test(text)) return 'CLI_NOT_FOUND';
  return 'UPSTREAM_ERROR';
}

function circuitFamily(name) {
  const key = String(name || 'unknown');
  if (key === 'accountCapture' || key === 'devpassStatus') return 'account';
  if (key.startsWith('devpassActivity:')) return 'devpassActivity';
  if (key.startsWith('usage:')) return 'creditsUsage';
  if (key.startsWith('activity:')) return 'activity';
  if (key.startsWith('analytics:') || key === 'analyticsScopes') return 'analytics';
  if (key === 'usageScopes') return 'usageScopes';
  if (key.startsWith('runway:')) return 'runway';
  if (key === 'orgs') return 'organizations';
  return key.split(':')[0] || 'unknown';
}

function getCircuit(name) {
  const family = circuitFamily(name);
  if (!circuits.has(family)) {
    circuits.set(family, {
      family,
      failures: 0,
      state: 'closed',
      openUntil: 0,
      lastFailureAt: null,
      lastSuccessAt: null,
      lastErrorCode: '',
      lastError: '',
    });
  }
  return circuits.get(family);
}

function circuitBeforeLoad(name) {
  const circuit = getCircuit(name);
  const now = Date.now();
  if (circuit.state === 'open' && now < circuit.openUntil) {
    circuitStats.blocked += 1;
    const seconds = Math.max(1, Math.ceil((circuit.openUntil - now) / 1000));
    const error = new Error(`Circuit ${circuit.family} open; retry in ${seconds}s`);
    error.code = 'CIRCUIT_OPEN';
    return { allowed: false, circuit, error };
  }
  if (circuit.state === 'open' && now >= circuit.openUntil) circuit.state = 'half-open';
  return { allowed: true, circuit };
}

function circuitSuccess(name) {
  const circuit = getCircuit(name);
  if (circuit.state !== 'closed' || circuit.failures > 0) circuitStats.recoveries += 1;
  circuit.failures = 0;
  circuit.state = 'closed';
  circuit.openUntil = 0;
  circuit.lastSuccessAt = Date.now();
  circuit.lastErrorCode = '';
  circuit.lastError = '';
}

function circuitFailure(name, error) {
  const circuit = getCircuit(name);
  circuit.failures += 1;
  circuit.lastFailureAt = Date.now();
  circuit.lastErrorCode = classifyError(error);
  circuit.lastError = safeMessage(error);
  if (circuit.failures >= CIRCUIT_FAILURE_THRESHOLD) {
    const exponent = Math.max(0, circuit.failures - CIRCUIT_FAILURE_THRESHOLD);
    const openMs = Math.min(CIRCUIT_MAX_OPEN_MS, CIRCUIT_BASE_OPEN_MS * (2 ** exponent));
    const wasOpen = circuit.state === 'open';
    circuit.state = 'open';
    circuit.openUntil = Date.now() + openMs;
    if (!wasOpen) circuitStats.opens += 1;
  }
  return circuit;
}

function circuitSnapshot() {
  const now = Date.now();
  const out = {};
  for (const [family, circuit] of circuits) {
    const state = circuit.state === 'open' && now >= circuit.openUntil ? 'half-open' : circuit.state;
    out[family] = {
      state,
      failures: circuit.failures,
      retryInMs: state === 'open' ? Math.max(0, circuit.openUntil - now) : 0,
      lastFailureAt: circuit.lastFailureAt,
      lastSuccessAt: circuit.lastSuccessAt,
      lastErrorCode: circuit.lastErrorCode || null,
    };
  }
  return out;
}

async function ensureToken() {
  await fs.mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });
  try {
    bridgeToken = (await fs.readFile(TOKEN_FILE, 'utf8')).trim();
  } catch {
    bridgeToken = crypto.randomBytes(24).toString('hex');
    await fs.writeFile(TOKEN_FILE, `${bridgeToken}\n`, { mode: 0o600 });
  }
  if (!bridgeToken) throw new Error('bridge token is empty');
  try { await fs.chmod(TOKEN_FILE, 0o600); } catch {}
}

function parseJsonOutput(stdout) {
  const raw = String(stdout || '').trim();
  if (!raw) throw new Error('LLMGateway CLI returned empty output');
  try { return JSON.parse(raw); } catch {}

  // Some npm/CLI versions may print a harmless notice around JSON.
  const starts = [raw.indexOf('{'), raw.indexOf('[')].filter((n) => n >= 0);
  const start = starts.length ? Math.min(...starts) : -1;
  const end = Math.max(raw.lastIndexOf('}'), raw.lastIndexOf(']'));
  if (start >= 0 && end > start) {
    try { return JSON.parse(raw.slice(start, end + 1)); } catch {}
  }
  throw new Error('Could not parse CLI JSON output');
}

async function runProgram(program, args, extraEnv = {}) {
  return execFileAsync(program, args, {
    timeout: 25_000,
    maxBuffer: 4 * 1024 * 1024,
    env: { ...process.env, ...extraEnv, NO_COLOR: '1', FORCE_COLOR: '0' },
  });
}

async function runCliProcess(args, extraEnv = {}) {
  return withCliSlot(async () => {
    try {
      return await runProgram('llmgateway', args, extraEnv);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
    return runProgram('npx', ['--yes', `@llmgateway/cli@${CLI_VERSION}`, ...args], extraEnv);
  });
}

async function runCli(args) {
  try {
    const { stdout } = await runCliProcess(args);
    return parseJsonOutput(stdout);
  } catch (error) {
    if (error?.stdout) {
      try { return parseJsonOutput(error.stdout); } catch {}
    }
    throw error;
  }
}

async function ensureCaptureTap() {
  await fs.mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });
  const source = String.raw`'use strict';
const fs = require('node:fs');
const http = require('node:http');
const https = require('node:https');
const output = process.env.DEVPASS_BRIDGE_CAPTURE_FILE;
const requestedActivityRange = ['24h','7d','30d'].includes(String(process.env.DEVPASS_BRIDGE_ACTIVITY_RANGE || ''))
  ? String(process.env.DEVPASS_BRIDGE_ACTIVITY_RANGE)
  : '';
const marker = Symbol.for('llmgateway.devpass.bridge.capture.v6');
if (output && !globalThis[marker]) {
  globalThis[marker] = true;
  const state = { orgs: null, devPlanStatus: null, devpassActivity: null, captureMode: null };
  let extrasInFlight = false;
  let extrasDone = false;
  const rawHttpRequest = http.request;
  const rawHttpsRequest = https.request;

  const writeState = () => {
    try {
      fs.writeFileSync(output, JSON.stringify(state), { mode: 0o600 });
    } catch {}
  };

  const parseJsonText = (text) => {
    try {
      const trimmed = String(text || '').trim();
      if (!trimmed || (!trimmed.startsWith('{') && !trimmed.startsWith('['))) return null;
      return JSON.parse(trimmed);
    } catch {
      return null;
    }
  };

  const sanitizeStatus = (value) => {
    if (!value || typeof value !== 'object') return null;
    const raw = value.data && typeof value.data === 'object' ? value.data : value;
    const allowed = [
      'hasPersonalOrg','hasBillingHistory','devPlan','devPlanPendingTier','devPlanCycle',
      'devPlanCreditsUsed','devPlanCreditsLimit','devPlanCreditsRemaining',
      'devPlanPremiumWeeklyLimit','devPlanPremiumCreditsUsed','devPlanPremiumWeekResetsAt',
      'devPlanResetPasses','devPlanIncludedResetPasses','devPlanIncludedResetPassesRemaining',
      'devPlanResetPassPrice','devPlanBillingCycleStart','devPlanCancelled','devPlanExpiresAt',
      'regularCredits','devPlanPaygEnabled','autoTopUpEnabled','autoTopUpThreshold','autoTopUpAmount',
      'organizationId','projectId','devPlanServiceTier','defaultRoutingStrategy'
    ];
    const safe = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(raw, key)) safe[key] = raw[key];
    }
    return safe;
  };

  const sanitizeModel = (row) => {
    if (!row || typeof row !== 'object') return null;
    const allowed = ['id','provider','requestCount','inputTokens','outputTokens','totalTokens','cost'];
    const safe = {};
    for (const key of allowed) if (Object.prototype.hasOwnProperty.call(row, key)) safe[key] = row[key];
    return Object.keys(safe).length ? safe : null;
  };

  const sanitizeActivity = (value) => {
    if (!value || typeof value !== 'object') return null;
    const raw = value.data && typeof value.data === 'object' ? value.data : value;
    const rows = Array.isArray(raw.activity) ? raw.activity : [];
    const allowed = [
      'date','requestCount','inputTokens','outputTokens','cachedTokens','cacheWriteTokens','totalTokens',
      'cost','inputCost','outputCost','requestCost','dataStorageCost','imageInputCost','audioInputCost',
      'audioOutputCost','imageOutputCost','videoOutputCost','cachedInputCost','cacheWriteInputCost',
      'errorCount','errorRate','cacheCount','cacheRate','discountSavings','creditsRequestCount',
      'apiKeysRequestCount','creditsCost','apiKeysCost','creditsDataStorageCost','apiKeysDataStorageCost'
    ];
    const activity = rows.map((row) => {
      if (!row || typeof row !== 'object') return null;
      const safe = {};
      for (const key of allowed) if (Object.prototype.hasOwnProperty.call(row, key)) safe[key] = row[key];
      const models = Array.isArray(row.modelBreakdown) ? row.modelBreakdown.map(sanitizeModel).filter(Boolean) : [];
      safe.modelBreakdown = models;
      return safe;
    }).filter(Boolean);
    const safe = { activity };
    if (typeof raw.granularity === 'string') safe.granularity = raw.granularity;
    return safe;
  };

  const storeStatus = (value, mode) => {
    const safe = sanitizeStatus(value);
    if (!safe || !Object.keys(safe).length) return null;
    state.devPlanStatus = safe;
    state.captureMode = mode;
    writeState();
    return safe;
  };

  const storeActivity = (value, range, mode) => {
    const safe = sanitizeActivity(value);
    if (!safe) return false;
    state.devpassActivity = { range: String(range), payload: safe, mode: String(mode || '') };
    writeState();
    return true;
  };

  const safeHeaders = (headersLike) => {
    const headers = {};
    try {
      if (headersLike && typeof headersLike.forEach === 'function') {
        headersLike.forEach((value, key) => { headers[String(key)] = String(value); });
      } else if (headersLike && typeof headersLike === 'object') {
        for (const [key, value] of Object.entries(headersLike)) {
          if (value !== undefined && value !== null) headers[String(key)] = Array.isArray(value) ? value.join(', ') : String(value);
        }
      }
    } catch {}
    for (const key of Object.keys(headers)) {
      const lower = key.toLowerCase();
      if (['content-length', 'content-type', 'host', 'connection', 'transfer-encoding'].includes(lower)) delete headers[key];
    }
    headers.Accept = 'application/json';
    return headers;
  };

  const pathPrefix = (pathname, suffix) => {
    const text = String(pathname || '');
    return text.endsWith(suffix) ? text.slice(0, -suffix.length) : '';
  };

  const officialOrigins = (orgUrl, preferredUrl) => {
    const out = [];
    const push = (u, allowObservedOrigin = false) => {
      try {
        const parsed = u instanceof URL ? u : new URL(String(u));
        if (allowObservedOrigin || /([.]|^)llmgateway[.]io$/i.test(parsed.hostname)) out.push(parsed.origin);
      } catch {}
    };
    // Reusing the exact origin already contacted by the authenticated CLI is
    // safe; auth is never forwarded to an unrelated third-party origin.
    if (preferredUrl) push(preferredUrl, true);
    push(orgUrl, true);
    if (/([.]|^)llmgateway[.]io$/i.test(orgUrl.hostname)) push('https://internal.llmgateway.io');
    return [...new Set(out)];
  };

  const statusCandidates = (orgUrl) => {
    const prefixes = [...new Set([pathPrefix(orgUrl.pathname, '/orgs'), ''])];
    const out = [];
    for (const origin of officialOrigins(orgUrl, null)) {
      for (const prefix of prefixes) {
        const u = new URL(origin);
        u.pathname = (prefix + '/dev-plans/status').replace(/\/{2,}/g, '/');
        out.push(u);
      }
    }
    return [...new Map(out.map((u) => [u.toString(), u])).values()];
  };

  const activityCandidates = (orgUrl, statusUrl, projectId, range) => {
    const prefixes = [...new Set([
      pathPrefix(statusUrl && statusUrl.pathname, '/dev-plans/status'),
      pathPrefix(orgUrl.pathname, '/orgs'),
      ''
    ])];
    const out = [];
    for (const origin of officialOrigins(orgUrl, statusUrl)) {
      for (const prefix of prefixes) {
        const u = new URL(origin);
        u.pathname = (prefix + '/activity').replace(/\/{2,}/g, '/');
        u.searchParams.set('projectId', String(projectId));
        u.searchParams.set('timeRange', String(range));
        u.searchParams.set('groupBy', 'model');
        u.searchParams.set('timezone', 'Asia/Seoul');
        out.push(u);
      }
    }
    return [...new Map(out.map((u) => [u.toString(), u])).values()];
  };

  const originalFetch = globalThis.fetch;
  const requestJsonFetch = async (target, headers, baseInit) => {
    try {
      const nextInit = baseInit && typeof baseInit === 'object' ? { ...baseInit } : {};
      nextInit.method = 'GET';
      nextInit.headers = headers;
      delete nextInit.body;
      delete nextInit.signal;
      const response = await originalFetch(target.toString(), nextInit);
      if (!response || !response.ok) return null;
      return parseJsonText(await response.clone().text());
    } catch {
      return null;
    }
  };

  const requestExtrasWithFetch = async (input, init, orgUrl) => {
    if (extrasDone || extrasInFlight || typeof originalFetch !== 'function') return;
    extrasInFlight = true;
    try {
      const inputHeaders = typeof Request === 'function' && input instanceof Request ? input.headers : (init && init.headers);
      const headers = safeHeaders(inputHeaders);
      for (const target of statusCandidates(orgUrl)) {
        const parsed = await requestJsonFetch(target, headers, init);
        const safeStatus = parsed ? storeStatus(parsed, 'fetch') : null;
        if (!safeStatus) continue;
        if (requestedActivityRange && safeStatus.projectId) {
          for (const activityTarget of activityCandidates(orgUrl, target, safeStatus.projectId, requestedActivityRange)) {
            const activity = await requestJsonFetch(activityTarget, headers, init);
            if (activity && storeActivity(activity, requestedActivityRange, 'fetch')) break;
          }
        }
        extrasDone = true;
        return;
      }
    } finally {
      extrasInFlight = false;
    }
  };

  if (typeof originalFetch === 'function') {
    globalThis.fetch = async function devpassBridgeCapturedFetch(...args) {
      const response = await originalFetch.apply(this, args);
      try {
        const input = args[0];
        const rawUrl = typeof input === 'string' || input instanceof URL
          ? String(input)
          : String(input && input.url || '');
        const url = new URL(rawUrl);
        if (url.pathname.endsWith('/orgs') && response && response.ok) {
          try {
            const parsed = parseJsonText(await response.clone().text());
            if (parsed) {
              state.orgs = parsed;
              writeState();
            }
          } catch {}
          await requestExtrasWithFetch(input, args[1], url);
        }
      } catch {}
      return response;
    };
  }

  const requestInfo = (args, protocolDefault) => {
    try {
      const first = args[0];
      const second = args[1] && typeof args[1] === 'object' ? args[1] : {};
      if (typeof first === 'string' || first instanceof URL) {
        const url = new URL(String(first));
        return { url, options: second };
      }
      if (first && typeof first === 'object') {
        const protocol = String(first.protocol || protocolDefault);
        const hostname = String(first.hostname || first.host || 'localhost').replace(/^\[|\]$/g, '');
        const port = first.port ? ':' + first.port : '';
        const reqPath = String(first.path || first.pathname || '/');
        const url = new URL(protocol + '//' + hostname + port + reqPath);
        return { url, options: first };
      }
    } catch {}
    return null;
  };

  const requestJsonNode = (target, headers) => new Promise((resolve) => {
    const rawRequest = target.protocol === 'http:' ? rawHttpRequest : rawHttpsRequest;
    const requestModule = target.protocol === 'http:' ? http : https;
    const opts = {
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || undefined,
      method: 'GET',
      path: target.pathname + target.search,
      headers,
    };
    let req;
    try {
      req = rawRequest.call(requestModule, opts, (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => { if (body.length < 4 * 1024 * 1024) body += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(parseJsonText(body));
          else resolve(null);
        });
      });
      req.on('error', () => resolve(null));
      req.setTimeout(10000, () => { try { req.destroy(); } catch {} resolve(null); });
      req.end();
    } catch {
      resolve(null);
    }
  });

  const requestExtrasWithNode = async (orgUrl, headers) => {
    if (extrasDone || extrasInFlight) return;
    extrasInFlight = true;
    try {
      for (const target of statusCandidates(orgUrl)) {
        const parsed = await requestJsonNode(target, headers);
        const safeStatus = parsed ? storeStatus(parsed, 'node-request') : null;
        if (!safeStatus) continue;
        if (requestedActivityRange && safeStatus.projectId) {
          for (const activityTarget of activityCandidates(orgUrl, target, safeStatus.projectId, requestedActivityRange)) {
            const activity = await requestJsonNode(activityTarget, headers);
            if (activity && storeActivity(activity, requestedActivityRange, 'node-request')) break;
          }
        }
        extrasDone = true;
        return;
      }
    } finally {
      extrasInFlight = false;
    }
  };

  const patchNodeRequest = (mod, protocolDefault) => {
    const originalRequest = mod.request;
    if (typeof originalRequest !== 'function') return;
    mod.request = function devpassBridgeCapturedRequest(...args) {
      const req = originalRequest.apply(this, args);
      try {
        const info = requestInfo(args, protocolDefault);
        if (!info || !info.url.pathname.endsWith('/orgs')) return req;
        const originalEnd = req.end;
        req.end = function devpassBridgeCapturedEnd(...endArgs) {
          try {
            const headers = safeHeaders(typeof req.getHeaders === 'function' ? req.getHeaders() : info.options.headers);
            requestExtrasWithNode(info.url, headers).catch(() => {});
          } catch {}
          return originalEnd.apply(this, endArgs);
        };
      } catch {}
      return req;
    };
  };

  // Authentication headers stay in memory only long enough to perform official,
  // read-only /dev-plans/status and optional project-scoped /activity requests.
  // They are never written to the capture file or returned by the bridge.
  patchNodeRequest(http, 'http:');
  patchNodeRequest(https, 'https:');
}
`;
  await fs.writeFile(CAPTURE_TAP_FILE, source, { mode: 0o600 });
  try { await fs.chmod(CAPTURE_TAP_FILE, 0o600); } catch {}
}

async function captureAccountDetailsViaCliSession(activityRange = '') {
  await ensureCaptureTap();
  const captureFile = path.join(
    CONFIG_DIR,
    `account-${process.pid}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.json`,
  );
  const existingNodeOptions = String(process.env.NODE_OPTIONS || '').trim();
  const captureRequire = `--require=${CAPTURE_TAP_FILE}`;
  const nodeOptions = existingNodeOptions ? `${existingNodeOptions} ${captureRequire}` : captureRequire;
  try {
    await runCliProcess(['orgs', 'list', '--json'], {
      NODE_OPTIONS: nodeOptions,
      DEVPASS_BRIDGE_CAPTURE_FILE: captureFile,
      DEVPASS_BRIDGE_ACTIVITY_RANGE: ['24h','7d','30d'].includes(String(activityRange)) ? String(activityRange) : '',
    });
    const text = await fs.readFile(captureFile, 'utf8');
    return JSON.parse(text);
  } finally {
    try { await fs.unlink(captureFile); } catch {}
  }
}

async function loadAccountCapture() {
  return cached('accountCapture', async () => captureAccountDetailsViaCliSession());
}

async function cached(name, loader) {
  const ttl = CACHE_TTL[name]
    ?? (name.startsWith('usage:') && name.endsWith(':24h') ? 60_000 : null)
    ?? (name.startsWith('usage:') && name.endsWith(':7d') ? 300_000 : null)
    ?? (name.startsWith('usage:') && name.endsWith(':30d') ? 600_000 : null)
    ?? (name.startsWith('activity:') && name.endsWith(':24h') ? 60_000 : null)
    ?? (name.startsWith('activity:') && name.endsWith(':7d') ? 300_000 : null)
    ?? (name.startsWith('activity:') && name.endsWith(':30d') ? 600_000 : null)
    ?? (name.startsWith('devpassActivity:') && name.endsWith(':24h') ? 60_000 : null)
    ?? (name.startsWith('devpassActivity:') && name.endsWith(':7d') ? 300_000 : null)
    ?? (name.startsWith('devpassActivity:') && name.endsWith(':30d') ? 600_000 : null)
    ?? (name.startsWith('analytics:') ? 60_000 : null)
    ?? (name === 'usageScopes' ? 60_000 : null)
    ?? (name === 'analyticsScopes' ? 60_000 : null)
    ?? (name.startsWith('runway:') ? 300_000 : 30_000);
  const now = Date.now();
  const current = cache.get(name);
  if (current && now - current.at < ttl) {
    cacheStats.hits += 1;
    return current.value;
  }
  if (inFlight.has(name)) {
    cacheStats.joins += 1;
    return inFlight.get(name);
  }

  const gate = circuitBeforeLoad(name);
  if (!gate.allowed) {
    const ageMs = current ? now - current.at : Infinity;
    if (current && name !== 'accountCapture' && ageMs <= CACHE_STALE_MAX_MS) {
      cacheStats.staleFallbacks += 1;
      return staleClone(current.value, ageMs, gate.error);
    }
    throw gate.error;
  }

  cacheStats.misses += 1;
  const promise = (async () => {
    const started = Date.now();
    try {
      const value = await loader();
      const elapsed = Date.now() - started;
      cacheStats.loads += 1;
      cacheStats.totalLoadMs += elapsed;
      cacheStats.lastLoadMs = elapsed;
      cache.set(name, { at: Date.now(), value });
      circuitSuccess(name);
      pruneCache();
      return value;
    } catch (error) {
      cacheStats.errors += 1;
      const circuit = circuitFailure(name, error);
      const ageMs = current ? Date.now() - current.at : Infinity;
      const allowStale = name !== 'accountCapture';
      if (allowStale && current && ageMs <= CACHE_STALE_MAX_MS) {
        cacheStats.staleFallbacks += 1;
        logRateLimited('warn', `stale:${name}`, `${name} refresh failed; serving last good cache (${Math.round(ageMs / 1000)}s old): ${safeMessage(error)}`);
        return staleClone(current.value, ageMs, error);
      }
      if (circuit.state === 'open') {
        logRateLimited('warn', `circuit:${circuit.family}`, `Circuit ${circuit.family} opened after ${circuit.failures} failures (${circuit.lastErrorCode})`, 30_000);
      }
      throw error;
    }
  })();
  inFlight.set(name, promise);
  try { return await promise; }
  finally { inFlight.delete(name); }
}

function firstArray(root, preferred = []) {
  if (Array.isArray(root)) return root;
  if (!root || typeof root !== 'object') return [];
  for (const key of preferred) {
    const value = root?.[key];
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') {
      for (const nested of ['items', 'organizations', 'data', 'results', 'rows']) {
        if (Array.isArray(value[nested])) return value[nested];
      }
    }
  }
  for (const value of Object.values(root)) {
    if (Array.isArray(value) && value.some((x) => x && typeof x === 'object')) return value;
  }
  return [];
}

function pick(obj, keys, fallback = null) {
  for (const key of keys) {
    const parts = key.split('.');
    let value = obj;
    for (const part of parts) value = value?.[part];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return fallback;
}

function finite(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'bigint') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof value !== 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  let text = value.trim();
  if (!text) return null;
  const negativeParens = /^\(.*\)$/.test(text);
  text = text.replace(/[,$€£₩¥]/g, '').trim();
  const match = text.match(/^([-+]?\d*\.?\d+(?:e[-+]?\d+)?)\s*([kmb])?(?:\s*(?:usd|requests?|req|calls?|tokens?|tok))?\s*%?$/i);
  if (!match) {
    const n = Number(text);
    return Number.isFinite(n) ? n : null;
  }
  let n = Number(match[1]);
  if (!Number.isFinite(n)) return null;
  const suffix = String(match[2] || '').toLowerCase();
  if (suffix === 'k') n *= 1_000;
  if (suffix === 'm') n *= 1_000_000;
  if (suffix === 'b') n *= 1_000_000_000;
  return negativeParens ? -Math.abs(n) : n;
}

function normalizeOrganizations(rawOrgs, rawCredits) {
  const rows = firstArray(rawOrgs, ['organizations', 'data', 'items', 'results']);
  const creditRows = firstArray(rawCredits, ['organizations', 'credits', 'data', 'items', 'results']);
  const creditsById = new Map();
  for (const row of creditRows) {
    const id = String(pick(row, ['id', 'organizationId', 'organization_id', 'orgId', 'org_id'], '') || '');
    const amount = finite(pick(row, ['credits', 'balance', 'creditBalance', 'credit_balance', 'remaining', 'amount'], null));
    if (id && amount !== null) creditsById.set(id, amount);
  }

  return rows.map((row) => {
    const id = String(pick(row, ['id', 'organizationId', 'organization_id', 'orgId', 'org_id'], '') || '');
    if (!id) return null;
    const directCredits = finite(pick(row, ['credits', 'balance', 'creditBalance', 'credit_balance', 'remaining'], null));
    return {
      id,
      name: String(pick(row, ['name', 'organizationName', 'organization_name'], id) || id),
      kind: String(pick(row, ['kind', 'type'], 'default') || 'default'),
      status: String(pick(row, ['status'], 'active') || 'active'),
      plan: String(pick(row, ['plan'], 'free') || 'free'),
      credits: directCredits ?? creditsById.get(id) ?? null,
      devPlan: String(pick(row, ['devPlan', 'dev_plan'], 'none') || 'none'),
      devPlanCycle: String(pick(row, ['devPlanCycle', 'dev_plan_cycle'], 'monthly') || 'monthly'),
      devPlanCreditsUsed: finite(pick(row, ['devPlanCreditsUsed', 'dev_plan_credits_used'], null)),
      devPlanCreditsLimit: finite(pick(row, ['devPlanCreditsLimit', 'dev_plan_credits_limit'], null)),
      devPlanPremiumCreditsUsed: finite(pick(row, ['devPlanPremiumCreditsUsed', 'dev_plan_premium_credits_used'], null)),
      devPlanPremiumWeekStart: pick(row, ['devPlanPremiumWeekStart', 'dev_plan_premium_week_start'], null),
      devPlanBillingCycleStart: pick(row, ['devPlanBillingCycleStart', 'dev_plan_billing_cycle_start'], null),
      devPlanExpiresAt: pick(row, ['devPlanExpiresAt', 'dev_plan_expires_at'], null),
      devPlanResetPassesLite: finite(pick(row, ['devPlanResetPassesLite', 'dev_plan_reset_passes_lite'], null)),
      devPlanResetPassesPro: finite(pick(row, ['devPlanResetPassesPro', 'dev_plan_reset_passes_pro'], null)),
      devPlanResetPassesMax: finite(pick(row, ['devPlanResetPassesMax', 'dev_plan_reset_passes_max'], null)),
      devPlanIncludedResetPassesUsed: finite(pick(row, ['devPlanIncludedResetPassesUsed', 'dev_plan_included_reset_passes_used'], null)),
      devPlanPaygEnabled: Boolean(pick(row, ['devPlanPaygEnabled', 'dev_plan_payg_enabled'], false)),
    };
  }).filter(Boolean);
}

function mergeOrganizations(baseRows, richRows) {
  const richById = new Map((richRows || []).map((row) => [row.id, row]));
  const merged = (baseRows || []).map((base) => {
    const rich = richById.get(base.id);
    if (!rich) return base;
    richById.delete(base.id);
    const result = { ...base };
    for (const [key, value] of Object.entries(rich)) {
      if (value !== null && value !== undefined && value !== '') result[key] = value;
    }
    if (rich.credits === null || rich.credits === undefined) result.credits = base.credits;
    return result;
  });
  for (const row of richById.values()) merged.push(row);
  return merged;
}

function hasDevPassCycleDetails(rows) {
  return (rows || []).some((row) =>
    row?.kind === 'devpass' && row?.devPlan && row.devPlan !== 'none' &&
    (row.devPlanBillingCycleStart || row.devPlanExpiresAt)
  );
}


function enrichDevPassFromStatus(rows, payload) {
  const raw = payload?.data ?? payload?.status ?? payload;
  if (!raw || typeof raw !== 'object') return rows;

  const plan = String(pick(raw, ['devPlan', 'dev_plan'], '') || '').toLowerCase();
  const targetIndex = (rows || []).findIndex((row) =>
    row?.kind === 'devpass' && row?.status !== 'deleted' &&
    (!plan || plan === 'none' || row?.devPlan === plan || (row?.devPlan && row.devPlan !== 'none'))
  );
  if (targetIndex < 0) return rows;

  const current = rows[targetIndex];
  const patch = {
    devPlan: plan && plan !== 'none' ? plan : current.devPlan,
    devPlanCycle: String(pick(raw, ['devPlanCycle', 'dev_plan_cycle'], current.devPlanCycle || 'monthly') || current.devPlanCycle || 'monthly'),
    devPlanBillingCycleStart: pick(raw, [
      'devPlanBillingCycleStart', 'dev_plan_billing_cycle_start',
      'billingCycleStart', 'currentPeriodStart', 'current_period_start'
    ], current.devPlanBillingCycleStart),
    devPlanExpiresAt: pick(raw, [
      'devPlanExpiresAt', 'dev_plan_expires_at', 'currentPeriodEnd',
      'current_period_end', 'renewsAt', 'renewAt', 'expiresAt'
    ], current.devPlanExpiresAt),
    devPlanPremiumWeekStart: pick(raw, [
      'devPlanPremiumWeekStart', 'dev_plan_premium_week_start'
    ], current.devPlanPremiumWeekStart),
  };

  const numberFields = {
    devPlanCreditsUsed: ['devPlanCreditsUsed', 'dev_plan_credits_used'],
    devPlanCreditsLimit: ['devPlanCreditsLimit', 'dev_plan_credits_limit'],
    devPlanPremiumCreditsUsed: ['devPlanPremiumCreditsUsed', 'dev_plan_premium_credits_used'],
    devPlanResetPassesLite: ['devPlanResetPassesLite', 'dev_plan_reset_passes_lite'],
    devPlanResetPassesPro: ['devPlanResetPassesPro', 'dev_plan_reset_passes_pro'],
    devPlanResetPassesMax: ['devPlanResetPassesMax', 'dev_plan_reset_passes_max'],
    devPlanIncludedResetPassesUsed: ['devPlanIncludedResetPassesUsed', 'dev_plan_included_reset_passes_used'],
  };
  for (const [key, aliases] of Object.entries(numberFields)) {
    const value = finite(pick(raw, aliases, null));
    if (value !== null) patch[key] = value;
  }

  const next = [...rows];
  next[targetIndex] = { ...current, ...patch };
  return next;
}

function normalizeIndependentDevPassStatus(payload) {
  const raw = payload?.data ?? payload?.status ?? payload;
  if (!raw || typeof raw !== 'object') return null;

  const plan = String(pick(raw, ['devPlan', 'dev_plan', 'plan', 'tier'], '') || '').toLowerCase();
  const cycle = String(pick(raw, ['devPlanCycle', 'dev_plan_cycle', 'cycle'], 'monthly') || 'monthly').toLowerCase();
  const billingCycleStart = pick(raw, [
    'devPlanBillingCycleStart', 'dev_plan_billing_cycle_start',
    'billingCycleStart', 'currentPeriodStart', 'current_period_start'
  ], null);
  const expiresAt = pick(raw, [
    'devPlanExpiresAt', 'dev_plan_expires_at', 'currentPeriodEnd',
    'current_period_end', 'renewsAt', 'renewAt', 'expiresAt'
  ], null);

  // Important: never copy apiKey/session/cookie/auth fields from the status
  // response. organizationId/projectId are non-secret identifiers; projectId
  // is used only to scope the official authenticated /activity read.
  const out = {
    plan: plan || 'none',
    pendingTier: pick(raw, ['devPlanPendingTier', 'dev_plan_pending_tier'], null),
    cycle,
    billingCycleStart,
    expiresAt,
    premiumWeekResetsAt: pick(raw, ['devPlanPremiumWeekResetsAt', 'dev_plan_premium_week_resets_at'], null),
    cancelled: Boolean(pick(raw, ['devPlanCancelled', 'dev_plan_cancelled', 'cancelled'], false)),
    paygEnabled: Boolean(pick(raw, ['devPlanPaygEnabled', 'dev_plan_payg_enabled', 'paygEnabled'], false)),
    hasPersonalOrg: Boolean(pick(raw, ['hasPersonalOrg', 'has_personal_org'], plan && plan !== 'none')),
    hasBillingHistory: Boolean(pick(raw, ['hasBillingHistory', 'has_billing_history'], false)),
    organizationId: String(pick(raw, ['organizationId', 'organization_id', 'orgId', 'org_id'], '') || '') || null,
    projectId: String(pick(raw, ['projectId', 'project_id'], '') || '') || null,
    serviceTier: String(pick(raw, ['devPlanServiceTier', 'dev_plan_service_tier'], 'default') || 'default'),
    routingStrategy: String(pick(raw, ['defaultRoutingStrategy', 'default_routing_strategy'], 'auto') || 'auto'),
    fetchedAt: Date.now(),
    source: 'LLMGateway CLI session · /dev-plans/status',
  };

  const numberFields = {
    creditsUsed: ['devPlanCreditsUsed', 'dev_plan_credits_used', 'creditsUsed'],
    creditsLimit: ['devPlanCreditsLimit', 'dev_plan_credits_limit', 'creditsLimit'],
    creditsRemaining: ['devPlanCreditsRemaining', 'dev_plan_credits_remaining', 'creditsRemaining'],
    premiumCreditsUsed: ['devPlanPremiumCreditsUsed', 'dev_plan_premium_credits_used', 'premiumCreditsUsed'],
    premiumWeeklyLimit: ['devPlanPremiumWeeklyLimit', 'dev_plan_premium_weekly_limit', 'premiumWeeklyLimit'],
    resetPasses: ['devPlanResetPasses', 'dev_plan_reset_passes'],
    includedResetPasses: ['devPlanIncludedResetPasses', 'dev_plan_included_reset_passes'],
    includedResetPassesRemaining: ['devPlanIncludedResetPassesRemaining', 'dev_plan_included_reset_passes_remaining'],
    resetPassPrice: ['devPlanResetPassPrice', 'dev_plan_reset_pass_price'],
    regularCredits: ['regularCredits', 'regular_credits'],
  };
  for (const [key, aliases] of Object.entries(numberFields)) {
    const value = finite(pick(raw, aliases, null));
    if (value !== null) out[key] = value;
  }

  const useful = (out.plan && out.plan !== 'none') || out.organizationId || out.billingCycleStart || out.expiresAt ||
    Object.keys(numberFields).some((key) => out[key] !== undefined);
  return useful ? out : null;
}

async function loadDevPassStatus() {
  return cached('devpassStatus', async () => {
    const captured = await loadAccountCapture();
    const normalized = normalizeIndependentDevPassStatus(captured?.devPlanStatus ?? null);
    if (normalized) return normalized;

    // Compatibility fallback: if a future/older CLI exposes the personal
    // DevPass org in the raw /orgs response, convert that row into the same
    // independent status shape instead of coupling the plugin to org presence.
    const rawRows = normalizeOrganizations(captured?.orgs ?? captured, null);
    const devOrg = rawRows.find((row) => row.kind === 'devpass' && row.status !== 'deleted' && row.devPlan && row.devPlan !== 'none');
    if (devOrg) {
      return {
        plan: devOrg.devPlan,
        cycle: devOrg.devPlanCycle || 'monthly',
        billingCycleStart: devOrg.devPlanBillingCycleStart || null,
        expiresAt: devOrg.devPlanExpiresAt || null,
        premiumWeekStart: devOrg.devPlanPremiumWeekStart || null,
        creditsUsed: devOrg.devPlanCreditsUsed,
        creditsLimit: devOrg.devPlanCreditsLimit,
        premiumCreditsUsed: devOrg.devPlanPremiumCreditsUsed,
        resetPassesLite: devOrg.devPlanResetPassesLite,
        resetPassesPro: devOrg.devPlanResetPassesPro,
        resetPassesMax: devOrg.devPlanResetPassesMax,
        includedResetPassesUsed: devOrg.devPlanIncludedResetPassesUsed,
        paygEnabled: Boolean(devOrg.devPlanPaygEnabled),
        fetchedAt: Date.now(),
        source: 'LLMGateway CLI session · full /orgs fallback',
      };
    }
    throw new Error('DevPass status was not exposed by the authenticated CLI session');
  });
}

function deepFindNumber(root, keys) {
  const wanted = new Set(keys.map((k) => k.toLowerCase()));
  const queue = [root];
  const seen = new Set();
  while (queue.length) {
    const value = queue.shift();
    if (!value || typeof value !== 'object' || seen.has(value)) continue;
    seen.add(value);
    if (!Array.isArray(value)) {
      for (const [key, child] of Object.entries(value)) {
        if (wanted.has(key.toLowerCase())) {
          const n = finite(child);
          if (n !== null) return n;
        }
      }
    }
    for (const child of Object.values(value)) {
      if (child && typeof child === 'object') queue.push(child);
    }
  }
  return null;
}

function deepFindPathNumber(root, paths) {
  const direct = finite(pick(root, paths, null));
  if (direct !== null) return direct;
  return null;
}

function namedTotals(map) {
  let requests = 0;
  let cost = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let totalTokens = 0;
  for (const row of map.values()) {
    requests += finite(row?.requests) ?? 0;
    cost += finite(row?.cost) ?? 0;
    inputTokens += finite(row?.inputTokens) ?? 0;
    outputTokens += finite(row?.outputTokens) ?? 0;
    totalTokens += finite(row?.totalTokens) ?? 0;
  }
  return { requests, cost, inputTokens, outputTokens, totalTokens };
}

function usageMetricValues(row) {
  if (!row || typeof row !== 'object') return {
    inputTokens: 0, outputTokens: 0, totalTokens: 0, cachedTokens: 0,
    cacheWriteTokens: 0, errorCount: 0, cacheCount: 0,
    creditsRequestCount: 0, apiKeysRequestCount: 0, creditsCost: 0, apiKeysCost: 0,
  };
  const number = (keys) => finite(pick(row, keys, null)) ?? 0;
  return {
    inputTokens: number([
      'inputTokens', 'input_tokens', 'promptTokens', 'prompt_tokens',
      'usage.inputTokens', 'usage.input_tokens', 'usage.promptTokens', 'usage.prompt_tokens',
      'tokens.input', 'tokenUsage.input', 'summary.inputTokens', 'totals.inputTokens'
    ]),
    outputTokens: number([
      'outputTokens', 'output_tokens', 'completionTokens', 'completion_tokens',
      'usage.outputTokens', 'usage.output_tokens', 'usage.completionTokens', 'usage.completion_tokens',
      'tokens.output', 'tokenUsage.output', 'summary.outputTokens', 'totals.outputTokens'
    ]),
    totalTokens: number([
      'totalTokens', 'total_tokens', 'usage.totalTokens', 'usage.total_tokens',
      'tokens.total', 'tokenUsage.total', 'summary.totalTokens', 'totals.totalTokens'
    ]),
    cachedTokens: number([
      'cachedTokens', 'cached_tokens', 'usage.cachedTokens', 'usage.cached_tokens',
      'tokens.cached', 'summary.cachedTokens', 'totals.cachedTokens'
    ]),
    cacheWriteTokens: number([
      'cacheWriteTokens', 'cache_write_tokens', 'usage.cacheWriteTokens', 'usage.cache_write_tokens',
      'tokens.cacheWrite', 'summary.cacheWriteTokens', 'totals.cacheWriteTokens'
    ]),
    errorCount: number([
      'errorCount', 'error_count', 'errors', 'failedRequests', 'failed_requests',
      'summary.errorCount', 'totals.errorCount'
    ]),
    cacheCount: number([
      'cacheCount', 'cache_count', 'cachedRequests', 'cached_requests',
      'summary.cacheCount', 'totals.cacheCount'
    ]),
    creditsRequestCount: number([
      'creditsRequestCount', 'credits_request_count', 'creditsRequests', 'credits_requests',
      'summary.creditsRequestCount', 'totals.creditsRequestCount'
    ]),
    apiKeysRequestCount: number([
      'apiKeysRequestCount', 'api_keys_request_count', 'apiKeyRequestCount', 'api_key_request_count',
      'apiKeysRequests', 'api_keys_requests', 'summary.apiKeysRequestCount', 'totals.apiKeysRequestCount'
    ]),
    creditsCost: number([
      'creditsCost', 'credits_cost', 'usage.creditsCost', 'usage.credits_cost',
      'summary.creditsCost', 'totals.creditsCost'
    ]),
    apiKeysCost: number([
      'apiKeysCost', 'api_keys_cost', 'apiKeyCost', 'api_key_cost',
      'usage.apiKeysCost', 'usage.api_keys_cost', 'summary.apiKeysCost', 'totals.apiKeysCost'
    ]),
  };
}

function blankMetrics() {
  return usageMetricValues(null);
}

function addMetrics(target, source) {
  const metrics = source && source.inputTokens !== undefined ? source : usageMetricValues(source);
  for (const key of Object.keys(target)) target[key] += finite(metrics?.[key]) ?? 0;
  return target;
}

function modelRow(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return null;
  const rawName = pick(row, [
    'id', 'model', 'usedModel', 'used_model', 'modelId', 'model_id',
    'name', 'label', 'key', 'group', 'groupName', 'group_name',
    'model.id', 'model.name', 'dimensionValue', 'dimension_value'
  ], null);
  const name = rawName && typeof rawName === 'object'
    ? pick(rawName, ['id', 'name', 'label'], null)
    : rawName;
  if (!name) return null;
  const providerRaw = pick(row, [
    'provider', 'usedProvider', 'used_provider', 'providerName', 'provider_name',
    'model.provider', 'source.provider', 'metadata.provider'
  ], '');
  const provider = String(providerRaw && typeof providerRaw === 'object'
    ? pick(providerRaw, ['id', 'name', 'label'], '')
    : (providerRaw || ''));
  const cost = finite(pick(row, [
    'cost', 'totalCost', 'total_cost', 'spend', 'totalSpend', 'total_spend', 'amount',
    'costUsd', 'cost_usd', 'usdCost', 'usd_cost', 'spendUsd', 'spend_usd',
    'usage.cost', 'usage.totalCost', 'usage.total_cost', 'billing.cost',
    'cost.total', 'cost.usd', 'cost.value', 'summary.cost'
  ], null));
  const requests = finite(pick(row, [
    'requestCount', 'request_count', 'requests', 'totalRequests', 'total_requests', 'count',
    'calls', 'callCount', 'call_count', 'numRequests', 'num_requests',
    'usage.requestCount', 'usage.request_count', 'usage.requests',
    'requests.total', 'summary.requestCount', 'summary.requests'
  ], null));
  const metrics = usageMetricValues(row);
  return {
    name: String(name),
    provider: provider || (String(name).includes('/') ? String(name).split('/')[0] : 'LLMGateway'),
    cost: cost ?? 0,
    requests: requests ?? 0,
    inputTokens: metrics.inputTokens,
    outputTokens: metrics.outputTokens,
    totalTokens: metrics.totalTokens,
  };
}

function addNamed(map, name, requests = 0, cost = 0, metrics = null) {
  const key = String(name || 'Unknown');
  const current = map.get(key) || {
    name: key, requests: 0, cost: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0,
  };
  current.requests += finite(requests) ?? 0;
  current.cost += finite(cost) ?? 0;
  current.inputTokens += finite(metrics?.inputTokens) ?? 0;
  current.outputTokens += finite(metrics?.outputTokens) ?? 0;
  current.totalTokens += finite(metrics?.totalTokens) ?? 0;
  map.set(key, current);
}

function timestampMs(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value < 1e12 ? value * 1000 : value;
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function officialActivityRows(root) {
  if (Array.isArray(root?.activity)) return root.activity;
  if (Array.isArray(root?.data?.activity)) return root.data.activity;
  return [];
}

function genericBreakdownRows(root) {
  const queue = [root];
  const seen = new Set();
  let best = [];
  while (queue.length) {
    const value = queue.shift();
    if (!value || typeof value !== 'object' || seen.has(value)) continue;
    seen.add(value);
    if (Array.isArray(value)) {
      const candidates = value.map(modelRow).filter(Boolean);
      if (candidates.length > best.length) best = candidates;
    }
    for (const child of Object.values(value)) {
      if (child && typeof child === 'object') queue.push(child);
    }
  }
  return best;
}

function normalizeUsageActivity(raw, org = null, range = '24h') {
  const providerMap = new Map();
  const modelMap = new Map();
  const recent = [];
  const rows = officialActivityRows(raw);
  let totalRequests = 0;
  let totalCost = 0;
  const metrics = blankMetrics();

  // Official /activity data is bucketed. Preserve the server aggregate fields
  // and modelBreakdown[] rather than treating buckets as raw prompts.
  if (rows.length) {
    for (const bucket of rows) {
      totalRequests += finite(pick(bucket, [
        'requestCount', 'request_count', 'requests', 'totalRequests', 'total_requests',
        'calls', 'callCount', 'numRequests'
      ], 0)) ?? 0;
      totalCost += finite(pick(bucket, [
        'cost', 'totalCost', 'total_cost', 'spend', 'totalSpend', 'costUsd', 'cost_usd',
        'usage.cost', 'cost.total', 'cost.usd'
      ], 0)) ?? 0;
      addMetrics(metrics, bucket);
      const when = timestampMs(pick(bucket, ['date', 'timestamp', 'time'], null));
      const breakdown = Array.isArray(bucket?.modelBreakdown)
        ? bucket.modelBreakdown
        : (Array.isArray(bucket?.model_breakdown) ? bucket.model_breakdown : []);
      for (const item of breakdown) {
        const parsed = modelRow(item);
        if (!parsed) continue;
        addNamed(modelMap, parsed.name, parsed.requests, parsed.cost, parsed);
        addNamed(providerMap, parsed.provider, parsed.requests, parsed.cost, parsed);
        if (when !== null && (parsed.requests > 0 || parsed.cost > 0 || parsed.totalTokens > 0)) {
          recent.push({
            timestamp: when,
            provider: parsed.provider,
            model: parsed.name,
            cost: parsed.cost,
            requests: parsed.requests,
            inputTokens: parsed.inputTokens,
            outputTokens: parsed.outputTokens,
            totalTokens: parsed.totalTokens,
            organizationId: org?.id || null,
            organizationKind: org?.kind || null,
          });
        }
      }
    }
  } else {
    totalCost = deepFindPathNumber(raw, [
      'totalCost', 'total_cost', 'summary.totalCost', 'summary.total_cost',
      'summary.cost', 'totals.totalCost', 'totals.total_cost', 'totals.cost',
      'aggregate.totalCost', 'aggregate.cost', 'metrics.totalCost', 'metrics.cost',
      'usage.totalCost', 'usage.total_cost', 'usage.cost',
      'cost.total', 'cost.usd', 'cost.value', 'costUsd', 'cost_usd', 'usdCost', 'usd_cost',
      'spend', 'totalSpend', 'total_spend', 'amount'
    ]);
    if (totalCost === null) {
      totalCost = deepFindNumber(raw, [
        'totalCost', 'total_cost', 'costUsd', 'cost_usd', 'usdCost', 'usd_cost',
        'totalSpend', 'total_spend', 'spend'
      ]);
    }
    totalRequests = deepFindPathNumber(raw, [
      'totalRequests', 'total_requests', 'requestCount', 'request_count',
      'summary.totalRequests', 'summary.total_requests', 'summary.requestCount', 'summary.requests',
      'totals.totalRequests', 'totals.total_requests', 'totals.requestCount', 'totals.requests',
      'aggregate.totalRequests', 'aggregate.requestCount', 'aggregate.requests',
      'metrics.totalRequests', 'metrics.requestCount', 'metrics.requests',
      'usage.totalRequests', 'usage.requestCount', 'usage.requests',
      'requests.total', 'calls', 'callCount', 'call_count', 'numRequests', 'num_requests'
    ]);
    if (totalRequests === null) {
      totalRequests = deepFindNumber(raw, [
        'totalRequests', 'total_requests', 'requestCount', 'request_count',
        'numRequests', 'num_requests', 'callCount', 'call_count'
      ]);
    }
    totalCost = totalCost ?? 0;
    totalRequests = totalRequests ?? 0;

    // Some CLI JSON formats place aggregate token/error/cache counters under a
    // summary/totals object instead of on the model rows.
    const aggregateMetricCandidate = raw?.summary ?? raw?.totals ?? raw?.aggregate ?? raw?.metrics ?? raw?.usage ?? raw;
    addMetrics(metrics, aggregateMetricCandidate);

    for (const parsed of genericBreakdownRows(raw)) {
      addNamed(modelMap, parsed.name, parsed.requests, parsed.cost, parsed);
      addNamed(providerMap, parsed.provider, parsed.requests, parsed.cost, parsed);
    }

    const modelTotals = namedTotals(modelMap);
    if (totalRequests <= 0 && modelTotals.requests > 0) totalRequests = modelTotals.requests;
    if (totalCost <= 0 && modelTotals.cost > 0) totalCost = modelTotals.cost;
    if (metrics.inputTokens <= 0 && modelTotals.inputTokens > 0) metrics.inputTokens = modelTotals.inputTokens;
    if (metrics.outputTokens <= 0 && modelTotals.outputTokens > 0) metrics.outputTokens = modelTotals.outputTokens;
    if (metrics.totalTokens <= 0 && modelTotals.totalTokens > 0) metrics.totalTokens = modelTotals.totalTokens;
  }

  const errorRate = totalRequests > 0 ? Math.max(0, metrics.errorCount / totalRequests * 100) : 0;
  const cacheRate = totalRequests > 0 ? Math.max(0, metrics.cacheCount / totalRequests * 100) : 0;
  return {
    __bridgeActivity: true,
    scope: range,
    totalRequests,
    totalCost,
    ...metrics,
    errorRate,
    cacheRate,
    providers: [...providerMap.values()].sort((a, b) => b.cost - a.cost || b.requests - a.requests),
    models: [...modelMap.values()].sort((a, b) => b.cost - a.cost || b.requests - a.requests),
    recent: recent.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 20),
    fetchedAt: Date.now(),
    source: org ? `LLMGateway CLI · usage ${range} · ${org.kind}` : `LLMGateway CLI · usage ${range}`,
  };
}

function needsAggregateUsageFallback(activity) {
  if (!activity) return true;
  const tokens = finite(activity.totalTokens) ?? 0;
  const requests = finite(activity.totalRequests) ?? 0;
  const cost = finite(activity.totalCost) ?? 0;
  // Token usage with zero requests is internally inconsistent. Cost can also be
  // omitted from breakdown JSON, so ask the aggregate CLI view when either is
  // missing while there is real usage.
  return tokens > 0 && (requests <= 0 || cost <= 0);
}

function mergeAggregateUsageTotals(breakdown, aggregate) {
  if (!breakdown) return aggregate;
  if (!aggregate) return breakdown;
  const out = { ...breakdown };
  const preferPositive = (key) => {
    const a = finite(aggregate?.[key]);
    const b = finite(breakdown?.[key]);
    out[key] = a !== null && a > 0 ? a : (b ?? 0);
  };
  for (const key of [
    'totalRequests', 'totalCost', 'inputTokens', 'outputTokens', 'totalTokens',
    'cachedTokens', 'cacheWriteTokens', 'errorCount', 'cacheCount',
    'creditsRequestCount', 'apiKeysRequestCount', 'creditsCost', 'apiKeysCost'
  ]) preferPositive(key);
  out.errorRate = out.totalRequests > 0 ? Math.max(0, (finite(out.errorCount) ?? 0) / out.totalRequests * 100) : 0;
  out.cacheRate = out.totalRequests > 0 ? Math.max(0, (finite(out.cacheCount) ?? 0) / out.totalRequests * 100) : 0;
  if (!(out.providers || []).length && (aggregate.providers || []).length) out.providers = aggregate.providers;
  if (!(out.models || []).length && (aggregate.models || []).length) out.models = aggregate.models;
  if (!(out.recent || []).length && (aggregate.recent || []).length) out.recent = aggregate.recent;
  out.source = `${breakdown.source} + aggregate totals`;
  out.totalsSource = 'aggregate-fallback';
  return out;
}

function mergeUsageActivities(items, range = '24h') {
  const providerMap = new Map();
  const modelMap = new Map();
  const recent = [];
  let totalRequests = 0;
  let totalCost = 0;
  const metrics = blankMetrics();
  for (const item of items || []) {
    if (!item) continue;
    totalRequests += finite(item.totalRequests) ?? 0;
    totalCost += finite(item.totalCost) ?? 0;
    addMetrics(metrics, item);
    for (const row of item.providers || []) addNamed(providerMap, row.name, row.requests, row.cost, row);
    for (const row of item.models || []) addNamed(modelMap, row.name, row.requests, row.cost, row);
    for (const row of item.recent || []) recent.push(row);
  }
  return {
    __bridgeActivity: true,
    scope: range,
    totalRequests,
    totalCost,
    ...metrics,
    errorRate: totalRequests > 0 ? Math.max(0, metrics.errorCount / totalRequests * 100) : 0,
    cacheRate: totalRequests > 0 ? Math.max(0, metrics.cacheCount / totalRequests * 100) : 0,
    providers: [...providerMap.values()].sort((a, b) => b.cost - a.cost || b.requests - a.requests),
    models: [...modelMap.values()].sort((a, b) => b.cost - a.cost || b.requests - a.requests),
    recent: recent.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 20),
    fetchedAt: Date.now(),
    source: `LLMGateway hybrid · DevPass /activity + Credits CLI · ${range}`,
  };
}

async function loadOrgs() {
  return cached('orgs', async () => {
    const [rawOrgs, rawCredits] = await Promise.all([
      runCli(['orgs', 'list', '--json']),
      runCli(['credits', '--json']),
    ]);
    let organizations = normalizeOrganizations(rawOrgs, rawCredits);
    let source = 'LLMGateway CLI';

    // The CLI's public JSON output can intentionally be compact. When DevPass
    // cycle timestamps are omitted, run the same official CLI command with a
    // local fetch tap that records only the successful /orgs RESPONSE body.
    // No request headers, cookies, passwords, or session tokens are recorded or
    // returned by this bridge.
    if (!hasDevPassCycleDetails(organizations)) {
      try {
        const captured = await loadAccountCapture();
        const rawFullOrgs = captured?.orgs ?? captured;
        const richOrganizations = normalizeOrganizations(rawFullOrgs, rawCredits);
        if (richOrganizations.length) organizations = mergeOrganizations(organizations, richOrganizations);
        organizations = enrichDevPassFromStatus(organizations, captured?.devPlanStatus ?? null);
        if (hasDevPassCycleDetails(organizations)) {
          source = captured?.devPlanStatus
            ? 'LLMGateway CLI session · /dev-plans/status'
            : 'LLMGateway CLI session · full /orgs';
        }
      } catch (error) {
        logRateLimited('warn', 'renewal-enrichment', `DevPass renewal enrichment unavailable: ${safeMessage(error)}`);
      }
    }

    if (!organizations.length) throw new Error('No organizations found in CLI output');
    return { organizations, fetchedAt: Date.now(), source };
  });
}

function usageOrganizations(orgData) {
  const rows = orgData?.organizations || [];
  const activeDevPass = rows.filter((row) => row.kind === 'devpass' && row.status !== 'deleted' && row.devPlan && row.devPlan !== 'none');
  const defaults = rows.filter((row) => row.kind === 'default' && row.status !== 'deleted');
  // Keep the dashboard deliberately LLMGateway-only: DevPass plus the regular
  // PAYG/Credits organization. Chat organizations are not queried.
  return [...activeDevPass.slice(0, 1), ...defaults.slice(0, 1)];
}

async function usageForOrg(org, range = '24h') {
  const key = `usage:${org.id}:${range}`;
  return cached(key, async () => {
    const breakdownArgs = ['usage', '--org', org.id, '--by', 'model', '--range', range, '--json'];
    const rawBreakdown = await runCli(breakdownArgs);
    let normalized = normalizeUsageActivity(rawBreakdown, org, range);

    if (needsAggregateUsageFallback(normalized)) {
      try {
        const rawAggregate = await runCli(['usage', '--org', org.id, '--range', range, '--json']);
        const aggregate = normalizeUsageActivity(rawAggregate, org, range);
        normalized = mergeAggregateUsageTotals(normalized, aggregate);
      } catch (error) {
        normalized.partialErrors = [
          ...(Array.isArray(normalized.partialErrors) ? normalized.partialErrors : []),
          `aggregate totals: ${safeMessage(error)}`,
        ];
      }
    }
    return normalized;
  });
}

function creditsUsageOrganization(orgData) {
  const rows = orgData?.organizations || [];
  return rows.find((row) => row.kind === 'default' && row.status !== 'deleted') || null;
}

async function devPassActivityForRange(range = '24h') {
  return cached(`devpassActivity:${range}`, async () => {
    const captured = await captureAccountDetailsViaCliSession(range);
    const status = normalizeIndependentDevPassStatus(captured?.devPlanStatus ?? null);
    const entry = captured?.devpassActivity;
    const rawActivity = entry?.payload ?? entry;
    if (!rawActivity || !officialActivityRows(rawActivity).length) {
      if (!status?.projectId) throw new Error('DevPass projectId unavailable from /dev-plans/status');
      throw new Error(`DevPass /activity ${range} unavailable for the authenticated project`);
    }
    const org = {
      id: status?.organizationId || null,
      name: `DevPass ${String(status?.plan || '').toUpperCase()}`.trim(),
      kind: 'devpass',
      projectId: status?.projectId || null,
    };
    const normalized = normalizeUsageActivity(rawActivity, org, range);
    normalized.usageScope = 'devpass';
    normalized.source = `LLMGateway authenticated session · /activity · DevPass project · ${range}`;
    return normalized;
  });
}

function legacyDevPassUsageOrganization(orgData) {
  const rows = orgData?.organizations || [];
  return rows.find((row) => row.kind === 'devpass' && row.status !== 'deleted' && row.devPlan && row.devPlan !== 'none') || null;
}

async function activityForScope(range = '24h', scope = 'all') {
  const normalizedScope = ['all', 'devpass', 'credits'].includes(scope) ? scope : 'all';
  return cached(`activity:${normalizedScope}:${range}`, async () => {
    const results = [];
    const errors = [];
    let orgData = null;
    let orgLoadError = null;

    const getOrgData = async () => {
      if (orgData) return orgData;
      if (orgLoadError) throw orgLoadError;
      try {
        orgData = await loadOrgs();
        return orgData;
      } catch (error) {
        orgLoadError = error;
        throw error;
      }
    };

    // DevPass Activity is intentionally independent from the public org list.
    // This keeps DevPass analytics alive even if Credits organization discovery
    // is temporarily unavailable.
    if (normalizedScope === 'all' || normalizedScope === 'devpass') {
      try {
        results.push(await devPassActivityForRange(range));
      } catch (error) {
        try {
          const legacyOrg = legacyDevPassUsageOrganization(await getOrgData());
          if (legacyOrg) {
            try { results.push(await usageForOrg(legacyOrg, range)); }
            catch (legacyError) { errors.push(`devpass: ${safeMessage(error)} · legacy: ${safeMessage(legacyError)}`); }
          } else {
            errors.push(`devpass: ${safeMessage(error)}`);
          }
        } catch (orgError) {
          errors.push(`devpass: ${safeMessage(error)} · org fallback: ${safeMessage(orgError)}`);
        }
      }
    }

    if (normalizedScope === 'all' || normalizedScope === 'credits') {
      try {
        const creditsOrg = creditsUsageOrganization(await getOrgData());
        if (creditsOrg) {
          try { results.push(await usageForOrg(creditsOrg, range)); }
          catch (error) { errors.push(`credits: ${safeMessage(error)}`); }
        } else {
          errors.push('credits: default organization unavailable');
        }
      } catch (error) {
        errors.push(`credits: ${safeMessage(error)}`);
      }
    }

    // Legacy unscoped fallback remains combined-only. A partial failure never
    // relabels Credits-only data as DevPass or vice versa.
    if (!results.length && normalizedScope === 'all') {
      try {
        const raw = await runCli(['usage', '--by', 'model', '--range', range, '--json']);
        results.push(normalizeUsageActivity(raw, null, range));
      } catch (error) {
        errors.push(`fallback: ${safeMessage(error)}`);
      }
    }

    if (!results.length) throw new Error(`${normalizedScope} usage unavailable${errors.length ? ` · ${errors.join(' · ')}` : ''}`);
    const merged = mergeUsageActivities(results, range);
    merged.usageScope = normalizedScope;
    merged.source = normalizedScope === 'devpass'
      ? `LLMGateway authenticated session · DevPass /activity · ${range}`
      : normalizedScope === 'credits'
        ? `LLMGateway CLI · Credits usage · ${range}`
        : `LLMGateway hybrid · DevPass /activity + Credits CLI · ${range}`;
    if (errors.length) merged.partialErrors = errors;
    return merged;
  });
}

async function activityForRange(range = '24h') {
  return activityForScope(range, 'all');
}

async function activity() {
  return activityForScope('24h', 'all');
}

async function usageScopes() {
  return cached('usageScopes', async () => {
    const scopes = ['all', 'devpass', 'credits'];
    const settled = await Promise.allSettled(scopes.map((scope) => activityForScope('24h', scope)));
    const values = {};
    const errors = {};
    settled.forEach((result, index) => {
      const scope = scopes[index];
      if (result.status === 'fulfilled') values[scope] = result.value;
      else errors[scope] = safeMessage(result.reason);
    });
    if (!Object.keys(values).length) throw new Error('Usage scopes unavailable');
    return { scopes: values, errors, fetchedAt: Date.now(), source: 'LLMGateway hybrid scoped usage' };
  });
}

async function analyticsForScope(scope = 'all') {
  const normalizedScope = ['all', 'devpass', 'credits'].includes(scope) ? scope : 'all';
  return cached(`analytics:${normalizedScope}`, async () => {
    const ranges = ['24h', '7d', '30d'];
    const settled = await Promise.allSettled(ranges.map((range) => activityForScope(range, normalizedScope)));
    const windows = {};
    const errors = {};
    settled.forEach((result, index) => {
      const range = ranges[index];
      if (result.status === 'fulfilled') windows[range] = result.value;
      else errors[range] = safeMessage(result.reason);
    });
    if (!Object.keys(windows).length) {
      throw new Error(`${normalizedScope} analytics unavailable${Object.keys(errors).length ? ` · ${Object.entries(errors).map(([range, message]) => `${range}: ${message}`).join(' · ')}` : ''}`);
    }
    const seven = windows['7d'] || null;
    const thirty = windows['30d'] || null;
    return {
      scope: normalizedScope,
      windows,
      averages: {
        dailyCost7d: seven ? (finite(seven.totalCost) ?? 0) / 7 : null,
        dailyRequests7d: seven ? (finite(seven.totalRequests) ?? 0) / 7 : null,
        dailyCost30d: thirty ? (finite(thirty.totalCost) ?? 0) / 30 : null,
      },
      errors,
      fetchedAt: Date.now(),
      source: `LLMGateway CLI ${normalizedScope} analytics`,
    };
  });
}

async function analytics() {
  return analyticsForScope('all');
}

async function analyticsScopes() {
  return cached('analyticsScopes', async () => {
    const scopes = ['all', 'devpass', 'credits'];
    const settled = await Promise.allSettled(scopes.map((scope) => analyticsForScope(scope)));
    const values = {};
    const errors = {};
    settled.forEach((result, index) => {
      const scope = scopes[index];
      if (result.status === 'fulfilled') values[scope] = result.value;
      else errors[scope] = safeMessage(result.reason);
    });
    if (!Object.keys(values).length) throw new Error('Analytics scopes unavailable');
    return { scopes: values, errors, fetchedAt: Date.now(), source: 'LLMGateway CLI scoped analytics' };
  });
}

async function runwayFor(orgId) {
  return cached(`runway:${orgId}`, async () => {

      const orgData = await loadOrgs();
      const org = orgData.organizations.find((item) => item.id === orgId) || null;
      const balance = finite(org?.credits);
      let total7d = null;
      try {
        if (org) {
          const usage = await usageForOrg(org, '7d');
          total7d = finite(usage?.totalCost);
        }
      } catch {}
      if (total7d === null) {
        const creditsOnly = await activityForScope('7d', 'credits');
        total7d = finite(creditsOnly?.totalCost);
      }
      const avgDailySpend7d = total7d !== null ? Math.max(0, total7d / 7) : null;
      const runwayDays = balance !== null && avgDailySpend7d && avgDailySpend7d > 0
        ? balance / avgDailySpend7d
        : null;
      return { runwayDays, avgDailySpend7d, approximate: true, fetchedAt: Date.now(), source: 'LLMGateway CLI usage 7d' };
  });
}

function newestCacheAt(match) {
  let newest = null;
  for (const [key, entry] of cache) {
    const ok = typeof match === 'function' ? match(key) : String(key).startsWith(String(match));
    if (!ok) continue;
    const at = Number(entry?.at || 0);
    if (at > 0 && (!newest || at > newest)) newest = at;
  }
  return newest;
}

function moduleMeta(status, family, updatedAt = null, error = null) {
  const circuit = getCircuit(family);
  const circuitState = circuit.state === 'open' && Date.now() >= circuit.openUntil ? 'half-open' : circuit.state;
  const finalStatus = circuitState === 'open' && status === 'error' ? 'open' : status;
  return {
    status: finalStatus,
    stale: status === 'stale',
    updatedAt: updatedAt || circuit.lastSuccessAt || null,
    circuit: circuitState,
    failures: circuit.failures,
    retryInMs: circuitState === 'open' ? Math.max(0, circuit.openUntil - Date.now()) : 0,
    errorCode: error ? classifyError(error) : (circuit.lastErrorCode || null),
  };
}

function valueIsStale(value) {
  if (!value || typeof value !== 'object') return false;
  if (value?._cache?.stale) return true;
  if (value.windows && typeof value.windows === 'object') {
    return Object.values(value.windows).some((item) => item?._cache?.stale);
  }
  return false;
}

function moduleValueStatus(value) {
  if (!value) return 'error';
  return valueIsStale(value) ? 'stale' : 'ok';
}

async function snapshot(profile = 'full') {
  const normalizedProfile = profile === 'light' ? 'light' : 'full';

  // Organization discovery is no longer a hard root dependency. DevPass status
  // and project-scoped Activity can remain useful while Credits/org discovery is
  // stale or temporarily unavailable.
  const orgsResult = await Promise.allSettled([loadOrgs()]);
  const orgs = orgsResult[0].status === 'fulfilled'
    ? orgsResult[0].value
    : { organizations: [], fetchedAt: null, source: 'unavailable' };
  const rows = orgs?.organizations || [];
  const creditsOrg = rows.find((row) => row.kind === 'default' && row.status !== 'deleted' && finite(row.credits) !== null)
    || rows.find((row) => row.kind === 'default' && row.status !== 'deleted')
    || null;

  const jobs = [loadDevPassStatus(), usageScopes()];
  if (normalizedProfile === 'full') {
    jobs.push(creditsOrg ? runwayFor(creditsOrg.id) : Promise.resolve(null), analyticsScopes());
  }
  const settled = await Promise.allSettled(jobs);
  const devpassStatusResult = settled[0];
  const usageScopesResult = settled[1];
  const runwayResult = normalizedProfile === 'full' ? settled[2] : null;
  const analyticsScopesResult = normalizedProfile === 'full' ? settled[3] : null;

  const errors = {};
  if (orgsResult[0].status === 'rejected') errors.organizations = safeMessage(orgsResult[0].reason);

  const devpassStatusValue = devpassStatusResult.status === 'fulfilled' ? devpassStatusResult.value : null;
  const usageScopesValue = usageScopesResult.status === 'fulfilled' ? usageScopesResult.value : null;
  const activityValue = usageScopesValue?.scopes?.all || null;
  const result = {
    ok: true,
    bridgeVersion: VERSION,
    protocolVersion: PROTOCOL_VERSION,
    compatibility: {
      minPluginVersion: MIN_PLUGIN_VERSION,
      recommendedPluginVersion: RECOMMENDED_PLUGIN_VERSION,
    },
    profile: normalizedProfile,
    fetchedAt: Date.now(),
    orgs,
    devpassStatus: devpassStatusValue,
    creditsOrganizationId: creditsOrg?.id || null,
    activity: activityValue,
    usageScopes: usageScopesValue,
  };

  if (devpassStatusResult.status === 'rejected') errors.devpassStatus = safeMessage(devpassStatusResult.reason);
  if (usageScopesResult.status === 'rejected') errors.usage = safeMessage(usageScopesResult.reason);
  if (usageScopesValue?.errors && Object.keys(usageScopesValue.errors).length) errors.usageScopes = usageScopesValue.errors;

  let analyticsScopesValue = null;
  let analyticsValue = null;
  let runwayValue = null;
  if (normalizedProfile === 'full') {
    analyticsScopesValue = analyticsScopesResult.status === 'fulfilled' ? analyticsScopesResult.value : null;
    analyticsValue = analyticsScopesValue?.scopes?.all || null;
    runwayValue = runwayResult.status === 'fulfilled' ? runwayResult.value : null;
    result.analytics = analyticsValue;
    result.analyticsScopes = analyticsScopesValue;
    result.runway = runwayValue;
    if (runwayResult.status === 'rejected') errors.runway = safeMessage(runwayResult.reason);
    if (analyticsScopesResult.status === 'rejected') errors.analytics = safeMessage(analyticsScopesResult.reason);
    if (analyticsScopesValue?.errors && Object.keys(analyticsScopesValue.errors).length) errors.analyticsScopes = analyticsScopesValue.errors;
  }

  const circuitsView = circuitSnapshot();
  result.diagnostics = {
    bridgeVersion: VERSION,
    protocolVersion: PROTOCOL_VERSION,
    cliVersion: CLI_VERSION,
    uptimeSec: Math.floor((Date.now() - STARTED_AT) / 1000),
    snapshotProfile: normalizedProfile,
    cacheEntries: cache.size,
    inFlight: inFlight.size,
    cache: {
      entries: cache.size,
      inFlight: inFlight.size,
      hits: cacheStats.hits,
      misses: cacheStats.misses,
      joins: cacheStats.joins,
      loads: cacheStats.loads,
      errors: cacheStats.errors,
      staleFallbacks: cacheStats.staleFallbacks,
      hitRate: (cacheStats.hits + cacheStats.misses) > 0
        ? cacheStats.hits / (cacheStats.hits + cacheStats.misses) * 100
        : 0,
    },
    circuits: circuitsView,
    circuitStats: {...circuitStats},
    performance: {
      lastLoadMs: cacheStats.lastLoadMs,
      avgLoadMs: cacheStats.loads > 0 ? cacheStats.totalLoadMs / cacheStats.loads : 0,
    },
    cli: {
      concurrency: CLI_CONCURRENCY,
      active: cliStats.active,
      queued: cliStats.queued,
      runs: cliStats.runs,
      maxActive: cliStats.maxActive,
    },
    memory: {
      rssMB: process.memoryUsage().rss / 1024 / 1024,
      heapUsedMB: process.memoryUsage().heapUsed / 1024 / 1024,
    },
    generatedAt: Date.now(),
  };
  result.errors = errors;

  const orgStatus = orgsResult[0].status === 'fulfilled' ? moduleValueStatus(orgs) : 'error';
  const devStatus = devpassStatusResult.status === 'fulfilled' ? moduleValueStatus(devpassStatusValue) : 'error';
  const usageStale = valueIsStale(usageScopesValue);
  result.modules = {
    organizations: moduleMeta(orgStatus, 'organizations', newestCacheAt('orgs'), orgsResult[0].status === 'rejected' ? orgsResult[0].reason : null),
    credits: moduleMeta(creditsOrg ? orgStatus : 'error', 'organizations', newestCacheAt('orgs'), creditsOrg ? null : errors.organizations || 'credits organization unavailable'),
    devpassStatus: moduleMeta(devStatus, 'account', newestCacheAt('devpassStatus'), devpassStatusResult.status === 'rejected' ? devpassStatusResult.reason : null),
    devpassUsage: moduleMeta(usageStale ? 'stale' : moduleValueStatus(usageScopesValue?.scopes?.devpass), 'devpassActivity', newestCacheAt((key) => key.startsWith('devpassActivity:')), usageScopesValue?.errors?.devpass || null),
    creditsUsage: moduleMeta(usageStale ? 'stale' : moduleValueStatus(usageScopesValue?.scopes?.credits), 'creditsUsage', newestCacheAt((key) => key.startsWith('usage:')), usageScopesValue?.errors?.credits || null),
    usage: moduleMeta(usageStale ? 'stale' : (activityValue && usageScopesValue?.errors && Object.keys(usageScopesValue.errors).length ? 'partial' : moduleValueStatus(activityValue)), 'usageScopes', newestCacheAt('usageScopes'), usageScopesResult.status === 'rejected' ? usageScopesResult.reason : null),
  };
  if (normalizedProfile === 'full') {
    result.modules.analytics = moduleMeta(
      valueIsStale(analyticsScopesValue) ? 'stale' : (analyticsValue && analyticsScopesValue?.errors && Object.keys(analyticsScopesValue.errors).length ? 'partial' : moduleValueStatus(analyticsValue)),
      'analytics',
      newestCacheAt('analyticsScopes'),
      analyticsScopesResult.status === 'rejected' ? analyticsScopesResult.reason : null,
    );
    result.modules.runway = moduleMeta(
      runwayResult.status === 'fulfilled' ? moduleValueStatus(runwayValue) : 'error',
      'runway',
      newestCacheAt((key) => key.startsWith('runway:')),
      runwayResult.status === 'rejected' ? runwayResult.reason : null,
    );
  }
  return result;
}

function isAuthorized(req) {
  const provided = String(req.headers['x-devpass-bridge-key'] || '');
  if (!provided || !bridgeToken) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(bridgeToken);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function handle(req, res) {
  const url = new URL(req.url || '/', `http://${HOST}:${PORT}`);
  if (req.method === 'OPTIONS') return json(res, 204, {});

  // Read-only, localhost-only update feed. It exposes only the staged plugin
  // JavaScript and never reads credentials, CLI config, or arbitrary files.
  if (url.pathname === '/plugin/latest' && (req.method === 'GET' || req.method === 'HEAD')) {
    return serveLatestPlugin(req, res);
  }
  if (url.pathname === '/plugin/update-info' && req.method === 'GET') {
    return json(res, 200, await pluginUpdateInfo());
  }

  if (req.method !== 'GET') return json(res, 405, { error: 'GET only' });

  if (url.pathname === '/health') {
    return json(res, 200, { ok: true, status: 'healthy', version: VERSION, protocolVersion: PROTOCOL_VERSION, compatibility: { minPluginVersion: MIN_PLUGIN_VERSION, recommendedPluginVersion: RECOMMENDED_PLUGIN_VERSION }, update: await pluginUpdateInfo(), host: HOST, port: PORT, uptimeSec: Math.floor((Date.now() - STARTED_AT) / 1000), cli: { active: cliStats.active, queued: cliStats.queued }, circuits: { open: Object.values(circuitSnapshot()).filter((row) => row.state === 'open').length } });
  }
  if (!isAuthorized(req)) return json(res, 401, { error: 'Bridge token required' });

  try {
    if (url.pathname === '/snapshot') {
      const profile = url.searchParams.get('profile') === 'light' ? 'light' : 'full';
      return json(res, 200, await snapshot(profile));
    }
    if (url.pathname === '/orgs') return json(res, 200, await loadOrgs());
    if (url.pathname === '/devpass-status') return json(res, 200, await loadDevPassStatus());
    if (url.pathname === '/activity') return json(res, 200, await activity());
    if (url.pathname === '/analytics') return json(res, 200, await analytics());
    if (url.pathname === '/usage-scopes') return json(res, 200, await usageScopes());
    if (url.pathname === '/analytics-scopes') return json(res, 200, await analyticsScopes());
    if (url.pathname === '/v1/summary') return json(res, 200, await snapshot('full'));
    const match = url.pathname.match(/^\/orgs\/([^/]+)\/credits-runway$/);
    if (match) return json(res, 200, await runwayFor(decodeURIComponent(match[1])));
    return json(res, 404, { error: 'Not found' });
  } catch (error) {
    logRateLimited('error', `endpoint:${url.pathname}:${safeMessage(error).slice(0,120)}`, safeMessage(error));
    return json(res, 502, {
      error: 'LLMGateway request failed',
      code: error?.code === 'CIRCUIT_OPEN' ? 'CIRCUIT_OPEN' : classifyError(error),
      message: safeMessage(error),
      retryable: !['AUTH_UNAUTHORIZED','AUTH_FORBIDDEN'].includes(classifyError(error)),
      hint: 'Run: npx @llmgateway/cli auth status',
    });
  }
}

await ensureToken();
const server = http.createServer((req, res) => void handle(req, res));
server.listen(PORT, HOST, () => {
  console.log('');
  console.log(`LLMGateway DevPass Termux Bridge v${VERSION}`);
  console.log(`URL   : http://${HOST}:${PORT}`);
  console.log(`TOKEN : stored securely at ${TOKEN_FILE}`);
  console.log('');
  console.log(`PocketRisu에서 토큰이 필요하면 Termux 로컬에서: cat ${TOKEN_FILE}`);
  console.log('LLMGateway 비밀번호/세션 쿠키/config.json 내용은 붙여넣지 마세요.');
  console.log('종료: Ctrl+C');
});
