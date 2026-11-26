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
        .update(`${header}.${payload}`)
        .digest('base64url')
    return `${header}.${payload}.${sig}`
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
            throw new Error(`server exited early\nstdout:\n${stdout}\nstderr:\n${stderr}`)
        }
        try {
            const res = await fetch(`${base}/api/test_auth`)
            if (res.ok) return
        } catch {}
        await new Promise(resolve => setTimeout(resolve, 100))
    }
    throw new Error(`server did not start\nstdout:\n${stdout}\nstderr:\n${stderr}`)
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
        'x-session-id': 'preset-lazy-integration',
        'x-user-active': 'true',
    }
}

async function startServer() {
    port = await reservePort()
    base = `http://127.0.0.1:${port}`
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

    const sessionRes = await fetch(`${base}/api/session`, {
        method: 'POST',
        headers: authHeaders(),
    })
    expect(sessionRes.status).toBe(200)
    const setCookie = sessionRes.headers.get('set-cookie') ?? ''
    sessionCookie = setCookie.split(';')[0]
    expect(sessionCookie.startsWith('risu-session=')).toBe(true)
}

async function writeDb(db: any) {
    const res = await fetch(`${base}/api/write`, {
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
    const res = await fetch(`${base}/api/read`, {
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
    const res = await fetch(`${base}/api/db/flush`, {
        method: 'POST',
        headers: { cookie: sessionCookie },
    })
    expect(res.status).toBe(200)
}

function preset(id: string, name: string, prompt: string) {
    return {
        id,
        name,
        mainPrompt: prompt,
        temperature: 71,
        regex: [{ id: `regex-${id}`, pattern: prompt }],
        image: `image-${id}`,
        folderId: `folder-${id}`,
    }
}

function seedShape() {
    return {
        botPresetsId: 0,
        botPresets: [
            preset('active', 'Active', 'active-body'),
            preset('inactive', 'Inactive', 'inactive-secret-body'),
            preset('other', 'Other', 'other-secret-body'),
        ],
        characters: [],
        modules: [],
        plugins: [],
    }
}

beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'preset-lazy-integration-'))
    await startServer()
    await writeDb(seedShape())
})

afterEach(async () => {
    await stopServer()
    fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('prompt preset lazy hydration server integration', () => {
    it('serves only the active preset full and hydrates an inactive preset by id', async () => {
        const client = await readClientDb()

        expect(client.botPresets[0].mainPrompt).toBe('active-body')
        expect(client.botPresets[0]._presetStub).toBeUndefined()
        expect(client.botPresets[1]).toMatchObject({
            id: 'inactive',
            name: 'Inactive',
            image: 'image-inactive',
            folderId: 'folder-inactive',
            _presetStub: true,
        })
        expect(client.botPresets[1].mainPrompt).toBeUndefined()
        expect(client.botPresets[2]._presetStub).toBe(true)

        const res = await fetch(`${base}/api/preset-content/${encodeURIComponent('inactive')}`, {
            headers: authHeaders(),
        })
        expect(res.status).toBe(200)
        const hydrated = utils.normalizeJSON(await utils.decodeRisuSave(Buffer.from(await res.arrayBuffer())))
        expect(hydrated).toMatchObject({
            id: 'inactive',
            mainPrompt: 'inactive-secret-body',
            regex: [{ id: 'regex-inactive', pattern: 'inactive-secret-body' }],
        })
    })

    it('serves a newer full preset from dbCache before background persist commits', async () => {
        const client = await readClientDb()
        const expectedHash = utils.calculateHash(client).toString(16)
        const livePreset = preset('inactive', 'Inactive live', 'new-live-body')

        const patchRes = await fetch(`${base}/api/patch`, {
            method: 'POST',
            headers: {
                ...authHeaders(),
                'file-path': hexKey('database/database.bin'),
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                expectedHash,
                patch: [{ op: 'replace', path: '/botPresets/1', value: livePreset }],
            }),
        })
        expect(patchRes.status).toBe(200)

        const res = await fetch(`${base}/api/preset-content/inactive`, {
            headers: authHeaders(),
        })
        expect(res.status).toBe(200)
        const hydrated = utils.normalizeJSON(await utils.decodeRisuSave(Buffer.from(await res.arrayBuffer())))
        expect(hydrated.name).toBe('Inactive live')
        expect(hydrated.mainPrompt).toBe('new-live-body')
    })

    it('preserves inactive full bodies when a stub metadata patch is persisted', async () => {
        const client = await readClientDb()
        const expectedHash = utils.calculateHash(client).toString(16)

        const res = await fetch(`${base}/api/patch`, {
            method: 'POST',
            headers: {
                ...authHeaders(),
                'file-path': hexKey('database/database.bin'),
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                expectedHash,
                patch: [
                    { op: 'replace', path: '/botPresets/1/name', value: 'Inactive renamed' },
                    { op: 'replace', path: '/botPresets/1/folderId', value: null },
                ],
            }),
        })
        expect(res.status).toBe(200)
        await flushDb()

        const disk = await diskDb()
        expect(disk.botPresets[1].name).toBe('Inactive renamed')
        expect(disk.botPresets[1].folderId).toBeNull()
        expect(disk.botPresets[1].mainPrompt).toBe('inactive-secret-body')
        expect(disk.botPresets[1].regex).toEqual([{ id: 'regex-inactive', pattern: 'inactive-secret-body' }])
        expect(disk.botPresets[1]._presetStub).toBeUndefined()
    })

    it('preserves inactive full bodies through a full-write fallback carrying stubs', async () => {
        const client = await readClientDb()
        client.botPresets[2].name = 'Other renamed'
        client.botPresets[2].image = null

        await writeDb(client)

        const disk = await diskDb()
        expect(disk.botPresets[2].name).toBe('Other renamed')
        expect(disk.botPresets[2].image).toBeNull()
        expect(disk.botPresets[2].mainPrompt).toBe('other-secret-body')
        expect(disk.botPresets[2].regex).toEqual([{ id: 'regex-other', pattern: 'other-secret-body' }])
        expect(disk.botPresets[2]._presetStub).toBeUndefined()

        const nextClient = await readClientDb()
        expect(nextClient.botPresets[2]._presetStub).toBe(true)
        expect(nextClient.botPresets[2].mainPrompt).toBeUndefined()
    })
})
