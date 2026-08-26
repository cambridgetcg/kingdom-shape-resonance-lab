import assert from 'node:assert/strict'
import test from 'node:test'

import { schemaDefinition } from '../scripts/schema-definition.mjs'
import { buildSnapshot } from '../src/lab.mjs'
import { SCHEMA_PATH, canonicalJson, prettyCanonicalJson, readBoundedBytes, sha256Bytes, sha256Json } from '../src/io.mjs'
import { loadSchema, schemaIssues, validateAgainstSchema } from '../src/schema-validator.mjs'

const schema = loadSchema()
const snapshot = buildSnapshot()

test('checked-in schema exactly matches its deterministic definition', () => {
  const bytes = readBoundedBytes(SCHEMA_PATH)
  assert.equal(Buffer.from(bytes).toString('utf8'), prettyCanonicalJson(schemaDefinition()))
  assert.equal(sha256Json(schema), sha256Json(schemaDefinition()))
  assert.match(sha256Bytes(bytes), /^sha256:[0-9a-f]{64}$/u)
})

test('schema is closed Draft 2020-12 and snapshot validates', () => {
  assert.deepEqual(schemaIssues(schema), [])
  assert.deepEqual(validateAgainstSchema(snapshot, schema), [])
})

test('every object schema is closed and every property required', () => {
  const visit = (node) => {
    if (node === null || typeof node !== 'object' || Array.isArray(node)) return
    const types = Array.isArray(node.type) ? node.type : [node.type]
    if (types.includes('object')) {
      assert.equal(node.additionalProperties, false)
      assert.deepEqual([...node.required].sort(), Object.keys(node.properties).sort())
    }
    for (const value of Object.values(node)) visit(value)
  }
  visit(schema)
})

test('schema rejects added, missing, wrong-state, malformed table, and wrong-cardinality data', () => {
  const mutate = (callback) => {
    const value = JSON.parse(canonicalJson(snapshot))
    callback(value)
    return validateAgainstSchema(value, schema)
  }
  assert.match(mutate((value) => { value.extra = true }).join('\n'), /additional property forbidden/u)
  assert.match(mutate((value) => { delete value.boundary }).join('\n'), /required property missing/u)
  assert.match(mutate((value) => { value.state = 'SEALED' }).join('\n'), /declared constant/u)
  assert.match(mutate((value) => { value.exhibits[0].tables[0].rows[0] = Array(17).fill('x') }).join('\n'), /too many items/u)
  assert.match(mutate((value) => { value.sources.pop() }).join('\n'), /too few items/u)
})

test('schema validator rejects unsupported vocabulary and open object mutations', () => {
  const keyword = JSON.parse(canonicalJson(schema))
  keyword.properties.title.anyOf = [{ const: 'x' }]
  assert.match(schemaIssues(keyword).join('\n'), /unsupported schema keyword/u)
  const open = JSON.parse(canonicalJson(schema))
  open.$defs.unit.additionalProperties = true
  assert.match(schemaIssues(open).join('\n'), /must be closed/u)
})
