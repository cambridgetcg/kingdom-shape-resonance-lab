import { createHash } from 'node:crypto'
import {
  closeSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeSync,
} from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = fileURLToPath(new URL('../', import.meta.url))
export const MAX_JSON_BYTES = 1024 * 1024
export const JSON_LIMITS = Object.freeze({ depth: 48, nodes: 50_000, collectionItems: 10_000, stringCodePoints: 16_384 })

export const PUBLIC_FILES = Object.freeze([
  'assets/boundary-variants.svg',
  'assets/cospectral-graphs.svg',
  'assets/graph-to-hz.svg',
  'assets/membrane-plate.svg',
  'assets/musical-geometry.svg',
  'assets/phase-magnitude.svg',
  'assets/rhythm-cycle.svg',
  'assets/square-degeneracy.svg',
  'audio/graph-modes.wav',
  'audio/phase-forward.wav',
  'audio/phase-reversed.wav',
  'output-manifest.json',
  'shape-resonance-lab.json',
])
export const SNAPSHOT_PATH = join(ROOT, 'public', 'shape-resonance-lab.json')
export const MANIFEST_PATH = join(ROOT, 'public', 'output-manifest.json')
export const SCHEMA_PATH = join(ROOT, 'schemas', 'v0.1', 'public-snapshot.schema.json')

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

function normalized(value, seen = new Set()) {
  if (value === null || typeof value === 'boolean') return value
  if (typeof value === 'string') {
    for (let index = 0; index < value.length; index += 1) {
      const unit = value.charCodeAt(index)
      if (unit >= 0xD800 && unit <= 0xDFFF) {
        if (unit <= 0xDBFF && index + 1 < value.length) {
          const next = value.charCodeAt(index + 1)
          if (next >= 0xDC00 && next <= 0xDFFF) { index += 1; continue }
        }
        throw new TypeError('unpaired Unicode surrogate')
      }
    }
    return value
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('non-finite JSON number')
    if (Number.isInteger(value) && !Number.isSafeInteger(value)) throw new TypeError('unsafe JSON integer')
    return Object.is(value, -0) ? 0 : value
  }
  if (typeof value !== 'object') throw new TypeError('unsupported JSON value')
  if (seen.has(value)) throw new TypeError('cyclic JSON value')
  seen.add(value)
  try {
    if (Array.isArray(value)) return value.map((item) => normalized(item, seen))
    const prototype = Object.getPrototypeOf(value)
    if (prototype !== Object.prototype && prototype !== null) throw new TypeError('JSON object has an unsafe prototype')
    const result = Object.create(null)
    for (const key of Object.keys(value).sort()) {
      if (FORBIDDEN_KEYS.has(key)) throw new TypeError(`forbidden prototype key ${JSON.stringify(key)}`)
      if (value[key] === undefined) throw new TypeError('undefined JSON member')
      result[key] = normalized(value[key], seen)
    }
    return result
  } finally {
    seen.delete(value)
  }
}

export function normalizeJson(value) {
  return normalized(value)
}

export function canonicalJson(value) {
  return JSON.stringify(normalized(value))
}

export function prettyCanonicalJson(value) {
  return `${JSON.stringify(normalized(value), null, 2)}\n`
}

export function sha256Bytes(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`
}

export function sha256Json(value) {
  return sha256Bytes(Buffer.from(canonicalJson(value), 'utf8'))
}

export function insideRoot(path) {
  const rel = relative(ROOT, resolve(path))
  return rel !== '' && rel !== '..' && !rel.startsWith(`..${sep}`) && !rel.includes(`${sep}..${sep}`)
}

export function assertNoSymlinkComponents(path, allowMissingLeaf = false, statReader = lstatSync) {
  const absolute = resolve(path)
  if (!insideRoot(absolute)) throw new RangeError('path must be a file inside the repository')
  const rootStatus = statReader(ROOT)
  if (rootStatus.isSymbolicLink() || !rootStatus.isDirectory()) throw new TypeError('repository root must be a real directory')
  let current = ROOT
  const pieces = relative(ROOT, absolute).split(sep)
  for (let index = 0; index < pieces.length; index += 1) {
    current = join(current, pieces[index])
    const leaf = index === pieces.length - 1
    try {
      const status = statReader(current)
      if (status.isSymbolicLink()) throw new TypeError('symbolic-link path components are forbidden')
      if (!leaf && !status.isDirectory()) throw new TypeError('path ancestor must be a directory')
      if (leaf && !status.isFile() && !(allowMissingLeaf && status.isDirectory())) throw new TypeError('input must be a regular file')
    } catch (error) {
      if (error?.code === 'ENOENT' && allowMissingLeaf) return
      throw error
    }
  }
}

export function readBoundedBytes(path, maximum = MAX_JSON_BYTES) {
  const absolute = resolve(path)
  if (!insideRoot(absolute)) throw new RangeError('bundled input must remain inside the repository')
  assertNoSymlinkComponents(absolute)
  const status = statSync(absolute)
  if (!status.isFile()) throw new TypeError('input must be a regular file')
  if (status.size < 1 || status.size > maximum) throw new RangeError(`file size outside 1..${maximum} bytes`)
  return readFileSync(absolute)
}

function scanStrictJson(text, limits) {
  let position = 0
  let nodes = 0
  const fail = (message) => { throw new SyntaxError(`${message} at character ${position}`) }
  const whitespace = () => { while (position < text.length && /[ \t\r\n]/u.test(text[position])) position += 1 }
  const stringToken = () => {
    if (text[position] !== '"') fail('expected JSON string')
    const start = position
    position += 1
    while (position < text.length) {
      const character = text[position]
      if (character === '"') {
        position += 1
        const decoded = JSON.parse(text.slice(start, position))
        for (let index = 0; index < decoded.length; index += 1) {
          const unit = decoded.charCodeAt(index)
          if (unit >= 0xD800 && unit <= 0xDFFF) {
            if (unit <= 0xDBFF && index + 1 < decoded.length) {
              const next = decoded.charCodeAt(index + 1)
              if (next >= 0xDC00 && next <= 0xDFFF) { index += 1; continue }
            }
            fail('unpaired Unicode surrogate')
          }
        }
        if ([...decoded].length > limits.stringCodePoints) fail('JSON string exceeds code-point bound')
        return decoded
      }
      if (character === '\\') {
        position += 1
        if (position >= text.length) fail('unterminated JSON escape')
        if (text[position] === 'u') {
          if (!/^[0-9a-fA-F]{4}$/u.test(text.slice(position + 1, position + 5))) fail('invalid Unicode escape')
          position += 4
        } else if (!/["\\/bfnrt]/u.test(text[position])) fail('invalid JSON escape')
      } else if (character.codePointAt(0) < 0x20) fail('control character in JSON string')
      position += 1
    }
    fail('unterminated JSON string')
  }
  const value = (depth) => {
    if (depth > limits.depth) fail(`JSON nesting exceeds ${limits.depth}`)
    nodes += 1
    if (nodes > limits.nodes) fail(`JSON node count exceeds ${limits.nodes}`)
    whitespace()
    const character = text[position]
    if (character === '{') return object(depth + 1)
    if (character === '[') return array(depth + 1)
    if (character === '"') { stringToken(); return }
    for (const literal of ['true', 'false', 'null']) {
      if (text.startsWith(literal, position)) { position += literal.length; return }
    }
    const token = text.slice(position).match(/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/u)?.[0]
    if (token !== undefined) { position += token.length; return }
    fail('invalid JSON value')
  }
  const array = (depth) => {
    position += 1
    whitespace()
    if (text[position] === ']') { position += 1; return }
    let count = 0
    while (true) {
      count += 1
      if (count > limits.collectionItems) fail(`JSON array exceeds ${limits.collectionItems} items`)
      value(depth)
      whitespace()
      if (text[position] === ']') { position += 1; return }
      if (text[position] !== ',') fail('expected comma or closing bracket')
      position += 1
    }
  }
  const object = (depth) => {
    position += 1
    whitespace()
    if (text[position] === '}') { position += 1; return }
    const keys = new Set()
    while (true) {
      if (keys.size >= limits.collectionItems) fail(`JSON object exceeds ${limits.collectionItems} properties`)
      whitespace()
      const key = stringToken()
      if (keys.has(key)) fail(`duplicate decoded JSON object key ${JSON.stringify(key)}`)
      if (FORBIDDEN_KEYS.has(key)) fail(`forbidden prototype key ${JSON.stringify(key)}`)
      keys.add(key)
      whitespace()
      if (text[position] !== ':') fail('expected colon')
      position += 1
      value(depth)
      whitespace()
      if (text[position] === '}') { position += 1; return }
      if (text[position] !== ',') fail('expected comma or closing brace')
      position += 1
    }
  }
  whitespace()
  value(0)
  whitespace()
  if (position !== text.length) fail('trailing data after JSON value')
}

export function parseJsonBytes(bytes, label = 'JSON', limits = JSON_LIMITS) {
  if (!(bytes instanceof Uint8Array)) throw new TypeError(`${label} must be bytes`)
  if (bytes.byteLength < 1 || bytes.byteLength > MAX_JSON_BYTES) throw new RangeError(`${label} byte length is outside bounds`)
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  scanStrictJson(text, limits)
  const value = JSON.parse(text)
  if (value === null || typeof value !== 'object') throw new TypeError(`${label} must contain an object or array`)
  return normalized(value)
}

export function readJson(path, maximum = MAX_JSON_BYTES) {
  return parseJsonBytes(readBoundedBytes(path, maximum), path)
}

export function writeAllBytes(descriptor, bytes, writer = writeSync) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < 1) throw new TypeError('output bytes must be non-empty')
  let offset = 0
  while (offset < bytes.byteLength) {
    const written = writer(descriptor, bytes, offset, bytes.byteLength - offset)
    if (!Number.isSafeInteger(written) || written < 1 || written > bytes.byteLength - offset) throw new Error('write made invalid or zero progress')
    offset += written
  }
  return offset
}

function atomicWrite(path, bytes, allowed, operations = {}) {
  const absolute = resolve(path)
  if (!allowed.has(absolute)) throw new RangeError('generated path is outside the fixed output inventory')
  assertNoSymlinkComponents(absolute, true)
  mkdirSync(dirname(absolute), { recursive: true })
  assertNoSymlinkComponents(absolute, true)
  const temporary = `${absolute}.${process.pid}.tmp`
  const open = operations.openSync ?? openSync
  const write = operations.writeSync ?? writeSync
  const sync = operations.fsyncSync ?? fsyncSync
  const close = operations.closeSync ?? closeSync
  const rename = operations.renameSync ?? renameSync
  const unlink = operations.unlinkSync ?? unlinkSync
  let descriptor
  try {
    descriptor = open(temporary, 'wx', 0o600)
    writeAllBytes(descriptor, bytes, write)
    sync(descriptor)
    const complete = descriptor
    descriptor = undefined
    close(complete)
    rename(temporary, absolute)
  } catch (error) {
    if (descriptor !== undefined) {
      try { close(descriptor) } catch {}
    }
    try { unlink(temporary) } catch (cleanup) {
      if (cleanup?.code !== 'ENOENT') error.cleanupError = cleanup
    }
    throw error
  }
}

const PUBLIC_ALLOWED = new Set(PUBLIC_FILES.map((path) => join(ROOT, 'public', path)))
const SCHEMA_ALLOWED = new Set([SCHEMA_PATH])

export function writePublicFile(relativePath, bytes, operations = {}) {
  if (!PUBLIC_FILES.includes(relativePath)) throw new RangeError('undeclared public output')
  atomicWrite(join(ROOT, 'public', relativePath), bytes, PUBLIC_ALLOWED, operations)
}

export function writeSchemaFile(bytes, operations = {}) {
  atomicWrite(SCHEMA_PATH, bytes, SCHEMA_ALLOWED, operations)
}
