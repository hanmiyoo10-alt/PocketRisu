#!/usr/bin/env node
'use strict';

const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const HOST = '127.0.0.1';
const PORT = Number(process.env.LOCAL_BRIDGE_PORT || 39118);
const HOME = process.env.HOME || process.cwd();
const SNAPSHOT_FILE = process.env.LOCAL_USAGE_SNAPSHOT_FILE
  || path.join(HOME, 'PocketRisu', 'local_usage_snapshot.json');
const TOKEN_FILE = process.env.LOCAL_BRIDGE_TOKEN_FILE
  || path.join(HOME, 'PocketRisu', '.local_usage_bridge_token');

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function loadOrCreateToken() {
  const envToken = String(process.env.LOCAL_BRIDGE_TOKEN || '').trim();
  if (envToken) {
    ensureDir(TOKEN_FILE);
    fs.writeFileSync(TOKEN_FILE, envToken + '\n', { encoding: 'utf8', mode: 0o600 });
    try { fs.chmodSync(TOKEN_FILE, 0o600); } catch (_) {}
    return envToken;
  }

  try {
    const saved = fs.readFileSync(TOKEN_FILE, 'utf8').trim();
    if (saved) return saved;
  } catch (_) {}

  const created = crypto.randomBytes(18).toString('base64url');
  ensureDir(TOKEN_FILE);
  fs.writeFileSync(TOKEN_FILE, created + '\n', { encoding: 'utf8', mode: 0o600 });
  try { fs.chmodSync(TOKEN_FILE, 0o600); } catch (_) {}
  return created;
}

const TOKEN = loadOrCreateToken();

function ensureSnapshotFile() {
  if (fs.existsSync(SNAPSHOT_FILE)) return;
  ensureDir(SNAPSHOT_FILE);
  const sample = {
    protocolVersion: 1,
    source: 'Local JSON Adapter',
    usage: {
      monthly: { label: '월간', used: 0, limit: 0, remaining: 0, percent: 0, todayUsed: 0, resetAt: null },
      weekly: { label: '주간', used: 0, limit: 0, remaining: 0, percent: 0, todayUsed: 0, resetAt: null },
      credits: { label: 'Credits', balance: 0, todayUsed: 0 },
      activity: { requests24h: 0, cost24h: 0, totalTokens24h: 0, errorRate24h: 0 }
    },
    health: { status: 'ok' }
  };
  fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(sample, null, 2), 'utf8');
}

function readSnapshot() {
  ensureSnapshotFile();
  const parsed = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf8'));
  if (!parsed || typeof parsed !== 'object') throw new Error('snapshot root must be an object');
  if (!parsed.usage || typeof parsed.usage !== 'object') throw new Error('snapshot.usage must be an object');

  return {
    ...parsed,
    protocolVersion: Number(parsed.protocolVersion || 1),
    fetchedAt: Number(parsed.fetchedAt || Date.now()),
    source: String(parsed.source || 'Local JSON Adapter'),
    health: {
      ...(parsed.health && typeof parsed.health === 'object' ? parsed.health : {}),
      status: String(parsed?.health?.status || 'ok'),
      adapter: 'local-json-v1',
      file: path.basename(SNAPSHOT_FILE)
    }
  };
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Local-Bridge-Key');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.headers['x-local-bridge-key'] !== TOKEN) {
    res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'invalid bridge token' }));
    return;
  }

  if (req.method === 'GET' && req.url === '/snapshot') {
    try {
      const snapshot = readSnapshot();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(snapshot));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: `snapshot read failed: ${error.message}` }));
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: 'not found' }));
});

server.listen(PORT, HOST, () => {
  ensureSnapshotFile();
  console.log(`[Local JSON Bridge] http://${HOST}:${PORT}`);
  console.log(`[Local JSON Bridge] TOKEN=${TOKEN}`);
  console.log(`[Local JSON Bridge] TOKEN_FILE=${TOKEN_FILE}`);
  console.log(`[Local JSON Bridge] SNAPSHOT=${SNAPSHOT_FILE}`);
  console.log('[Local JSON Bridge] persistent token enabled');
});
