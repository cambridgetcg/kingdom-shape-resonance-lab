import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ROOT,
  assertNoSymlinkComponents,
  canonicalJson,
  parseJsonBytes,
  readBoundedBytes,
  sha256Json,
  writeAllBytes,
  writePublicFile,
} from '../src/io.mjs'

const bytes = (value) => Buffer.from(value, 'utf8')

test('strict JSON accepts an object and canonicalises to null prototypes', () => {
  const value = parseJsonBytes(bytes('{"z":1,"a":{"b":2}}'))
  assert.equal(Object.getPrototypeOf(value), null)
  assert.equal(Object.getPrototypeOf(value.a), null)
  assert.equal(canonicalJson(value), '{"a":{"b":2},"z":1}')
})

test('decoded duplicate keys, prototype keys, unsafe integers, trailing data, and invalid UTF-8 are rejected', () => {
  assert.throws(() => parseJsonBytes(bytes('{"a":1,"a":2}')), /duplicate decoded/u)
  assert.throws(() => parseJsonBytes(bytes('{"a":1,"\\u0061":2}')), /duplicate decoded/u)
  for (const key of ['__proto__', 'constructor', 'prototype']) assert.throws(() => parseJsonBytes(bytes(`{"${key}":1}`)), /forbidden prototype key/u)
  assert.throws(() => parseJsonBytes(bytes('{"n":9007199254740992}')), /unsafe JSON integer/u)
  assert.throws(() => parseJsonBytes(bytes('{} false')), /trailing data/u)
  assert.throws(() => parseJsonBytes(Buffer.from([0x7b, 0x22, 0x78, 0x22, 0x3a, 0xff, 0x7d])), /encoded data was not valid|UTF-8/iu)
})

test('lone surrogate scalars and structural-limit attacks are rejected', () => {
  assert.throws(() => parseJsonBytes(bytes('{"x":"\\ud800"}')), /unpaired Unicode surrogate/u)
  assert.doesNotThrow(() => parseJsonBytes(bytes('{"x":"\\ud83d\\ude02"}')))
  assert.throws(() => parseJsonBytes(bytes(`${'['.repeat(50)}0${']'.repeat(50)}`)), /nesting exceeds/u)
  assert.throws(() => parseJsonBytes(bytes('[1,2,3]'), 'small', { depth: 4, nodes: 2, collectionItems: 10, stringCodePoints: 10 }), /node count exceeds/u)
  assert.throws(() => parseJsonBytes(bytes('{"x":"abcd"}'), 'small', { depth: 4, nodes: 10, collectionItems: 10, stringCodePoints: 3 }), /code-point bound/u)
})

test('canonical receipts are injective around absent and hostile prototype-shaped members', () => {
  const clean = { a: 1 }
  const hostile = Object.create(null)
  hostile.a = 1
  hostile.__proto__ = 2
  assert.throws(() => sha256Json(hostile), /forbidden prototype key/u)
  assert.equal(sha256Json(clean), 'sha256:015abd7f5cc57a2dd94b7590f04ad8084273905ee33ec5cebeae62276a97f862')
})

test('bounded reads cannot escape the repository', () => {
  assert.throws(() => readBoundedBytes('/etc/hosts'), /inside the repository/u)
  assert.throws(() => readBoundedBytes(ROOT), /inside the repository|regular file/u)
})

test('symlink path components are rejected before writes', () => {
  const ordinary = { isSymbolicLink: () => false, isDirectory: () => true, isFile: () => false }
  const symlink = { isSymbolicLink: () => true, isDirectory: () => false, isFile: () => false }
  const target = `${ROOT}public/shape-resonance-lab.json`
  assert.throws(() => assertNoSymlinkComponents(target, false, (path) => path.endsWith('/public') ? symlink : ordinary), /symbolic-link/u)
})

test('short writes are completed and zero-progress writes fail closed', () => {
  const chunks = []
  let calls = 0
  assert.equal(writeAllBytes(7, bytes('abcd'), (_descriptor, value, offset) => {
    calls += 1
    chunks.push(value[offset])
    return 1
  }), 4)
  assert.equal(calls, 4)
  assert.deepEqual(chunks, [...bytes('abcd')])
  assert.throws(() => writeAllBytes(7, bytes('x'), () => 0), /zero progress/u)
})

test('fixed-path atomic writer performs fsync, close, and rename, and cleans after failure', () => {
  const calls = []
  writePublicFile('shape-resonance-lab.json', bytes('{}'), {
    openSync: () => { calls.push('open'); return 9 },
    writeSync: (_fd, _value, _offset, length) => { calls.push('write'); return length },
    fsyncSync: () => calls.push('fsync'),
    closeSync: () => calls.push('close'),
    renameSync: () => calls.push('rename'),
    unlinkSync: () => calls.push('unlink'),
  })
  assert.deepEqual(calls, ['open', 'write', 'fsync', 'close', 'rename'])
  const failed = []
  assert.throws(() => writePublicFile('shape-resonance-lab.json', bytes('{}'), {
    openSync: () => 9,
    writeSync: (_fd, _value, _offset, length) => length,
    fsyncSync: () => {},
    closeSync: () => failed.push('close'),
    renameSync: () => { throw new Error('rename denied') },
    unlinkSync: () => failed.push('unlink'),
  }), /rename denied/u)
  assert.deepEqual(failed, ['close', 'unlink'])
  assert.throws(() => writePublicFile('../escape.json', bytes('{}')), /undeclared public output/u)
})
