import { readdirSync } from 'node:fs'
import { dirname } from 'node:path'

import { SCHEMA_PATH, canonicalJson, readJson } from './io.mjs'

const SCHEMA_ID = 'https://thekingdom.dev/schemas/shape-resonance-lab/0.1.json'
const MAX_SCHEMA_DEPTH = 64
const SUPPORTED_KEYWORDS = new Set([
  '$defs', '$id', '$ref', '$schema', 'additionalProperties', 'const', 'description', 'enum', 'format', 'items',
  'maxItems', 'maxLength', 'maximum', 'minItems', 'minLength', 'minimum', 'pattern', 'properties', 'required', 'title', 'type', 'uniqueItems',
])
const SUPPORTED_TYPES = new Set(['array', 'boolean', 'integer', 'null', 'number', 'object', 'string'])
const SUPPORTED_FORMATS = new Set(['date', 'uri'])

function equal(left, right) {
  try { return canonicalJson(left) === canonicalJson(right) } catch { return false }
}

function typeMatches(value, type) {
  if (type === 'null') return value === null
  if (type === 'array') return Array.isArray(value)
  if (type === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value)
  if (type === 'integer') return Number.isSafeInteger(value)
  if (type === 'number') return typeof value === 'number' && Number.isFinite(value)
  return typeof value === type
}

function pointer(root, reference) {
  if (!reference.startsWith('#/')) throw new Error(`unsupported schema reference ${reference}`)
  let value = root
  for (const raw of reference.slice(2).split('/')) {
    const key = raw.replaceAll('~1', '/').replaceAll('~0', '~')
    if (value === null || typeof value !== 'object' || !Object.hasOwn(value, key)) throw new Error(`unresolved schema reference ${reference}`)
    value = value[key]
  }
  return value
}

function validDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value)
  if (match === null) return false
  const instant = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  return instant.getUTCFullYear() === Number(match[1]) && instant.getUTCMonth() === Number(match[2]) - 1 && instant.getUTCDate() === Number(match[3])
}

function formatMatches(value, format) {
  if (format === 'date') return validDate(value)
  if (format === 'uri') {
    try { return new URL(value).protocol === 'https:' } catch { return false }
  }
  return false
}

function resolveRef(reference, root) {
  if (reference.startsWith('#/')) return pointer(root, reference)
  if (reference === SCHEMA_ID) return root
  if (reference.startsWith(`${SCHEMA_ID}#/`)) return pointer(root, reference.slice(SCHEMA_ID.length))
  throw new Error(`external or unresolved schema reference ${reference}`)
}

function walk(value, schema, path, root, depth) {
  if (depth > MAX_SCHEMA_DEPTH) return [`${path}: schema depth exceeded`]
  if (schema === null || typeof schema !== 'object' || Array.isArray(schema)) return [`${path}: invalid schema node`]
  if (typeof schema.$ref === 'string') return walk(value, resolveRef(schema.$ref, root), path, root, depth + 1)
  const issues = []
  if (Object.hasOwn(schema, 'const') && !equal(value, schema.const)) issues.push(`${path}: must equal declared constant`)
  if (Array.isArray(schema.enum) && !schema.enum.some((entry) => equal(entry, value))) issues.push(`${path}: value outside enum`)
  const types = schema.type === undefined ? [] : Array.isArray(schema.type) ? schema.type : [schema.type]
  if (types.length > 0 && !types.some((type) => typeMatches(value, type))) {
    issues.push(`${path}: expected ${types.join('|')}`)
    return issues
  }
  if (typeof value === 'string') {
    const length = [...value].length
    if (schema.minLength !== undefined && length < schema.minLength) issues.push(`${path}: string too short`)
    if (schema.maxLength !== undefined && length > schema.maxLength) issues.push(`${path}: string too long`)
    if (schema.pattern !== undefined && !new RegExp(schema.pattern, 'u').test(value)) issues.push(`${path}: pattern mismatch`)
    if (schema.format !== undefined && !formatMatches(value, schema.format)) issues.push(`${path}: ${schema.format} format mismatch`)
  }
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) issues.push(`${path}: below minimum`)
    if (schema.maximum !== undefined && value > schema.maximum) issues.push(`${path}: above maximum`)
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) issues.push(`${path}: too few items`)
    if (schema.maxItems !== undefined && value.length > schema.maxItems) issues.push(`${path}: too many items`)
    if (schema.uniqueItems === true) {
      const encoded = value.map((entry) => canonicalJson(entry))
      if (new Set(encoded).size !== encoded.length) issues.push(`${path}: items must be unique`)
    }
    if (schema.items !== undefined) value.forEach((entry, index) => issues.push(...walk(entry, schema.items, `${path}/${index}`, root, depth + 1)))
  }
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const properties = schema.properties ?? {}
    for (const key of schema.required ?? []) if (!Object.hasOwn(value, key)) issues.push(`${path}/${key}: required property missing`)
    for (const [key, child] of Object.entries(value)) {
      if (Object.hasOwn(properties, key)) issues.push(...walk(child, properties[key], `${path}/${key}`, root, depth + 1))
      else if (schema.additionalProperties === false) issues.push(`${path}/${key}: additional property forbidden`)
      else issues.push(`${path}/${key}: fail-closed schema has no member contract`)
    }
  }
  return issues
}

function schemaContractIssues(schema, path = '$', issues = [], root = schema) {
  if (schema === null || typeof schema !== 'object' || Array.isArray(schema) || Object.keys(schema).length === 0) {
    issues.push(`${path}: schema node must be a non-empty object`)
    return issues
  }
  for (const key of Object.keys(schema)) if (!SUPPORTED_KEYWORDS.has(key)) issues.push(`${path}/${key}: unsupported schema keyword`)
  if (typeof schema.$ref === 'string') {
    if (Object.keys(schema).length !== 1) issues.push(`${path}: $ref siblings forbidden`)
    try { resolveRef(schema.$ref, root) } catch (error) { issues.push(`${path}/$ref: ${error.message}`) }
    return issues
  }
  const types = schema.type === undefined ? [] : Array.isArray(schema.type) ? schema.type : [schema.type]
  if (schema.type !== undefined && (types.length === 0 || new Set(types).size !== types.length || types.some((type) => !SUPPORTED_TYPES.has(type)))) issues.push(`${path}/type: unsupported or duplicate type`)
  if (schema.format !== undefined && !SUPPORTED_FORMATS.has(schema.format)) issues.push(`${path}/format: unsupported format`)
  if (schema.enum !== undefined && (!Array.isArray(schema.enum) || schema.enum.length === 0 || new Set(schema.enum.map((entry) => canonicalJson(entry))).size !== schema.enum.length)) issues.push(`${path}/enum: invalid enum`)
  if (types.includes('object')) {
    if (schema.additionalProperties !== false) issues.push(`${path}: object schema must be closed`)
    if (schema.properties === null || typeof schema.properties !== 'object' || Array.isArray(schema.properties)) issues.push(`${path}/properties: required map missing`)
    if (!Array.isArray(schema.required) || new Set(schema.required).size !== schema.required.length) issues.push(`${path}/required: unique required array missing`)
    if (schema.properties && Array.isArray(schema.required) && canonicalJson(Object.keys(schema.properties).sort()) !== canonicalJson([...schema.required].sort())) issues.push(`${path}: every declared property must be required`)
  }
  if (types.includes('array') && (schema.items === null || typeof schema.items !== 'object' || Array.isArray(schema.items))) issues.push(`${path}/items: array item schema missing`)
  if (schema.$id !== undefined && path !== '$') issues.push(`${path}/$id: nested identity forbidden`)
  if (schema.$schema !== undefined && path !== '$') issues.push(`${path}/$schema: nested dialect forbidden`)
  if (schema.properties) for (const [key, child] of Object.entries(schema.properties)) schemaContractIssues(child, `${path}/properties/${key}`, issues, root)
  if (schema.items) schemaContractIssues(schema.items, `${path}/items`, issues, root)
  if (schema.$defs) for (const [key, child] of Object.entries(schema.$defs)) schemaContractIssues(child, `${path}/$defs/${key}`, issues, root)
  return issues
}

export function loadSchema() {
  const inventory = readdirSync(dirname(SCHEMA_PATH)).filter((name) => name.endsWith('.json')).sort()
  if (canonicalJson(inventory) !== canonicalJson(['public-snapshot.schema.json'])) throw new Error('schema inventory must contain exactly public-snapshot.schema.json')
  return readJson(SCHEMA_PATH)
}

export function schemaIssues(schema = loadSchema()) {
  const issues = schemaContractIssues(schema)
  if (schema.$schema !== 'https://json-schema.org/draft/2020-12/schema') issues.push('$/$schema: Draft 2020-12 required')
  if (schema.$id !== SCHEMA_ID) issues.push('$/$id: public schema identity mismatch')
  return issues
}

export function validateAgainstSchema(value, schema = loadSchema()) {
  const contract = schemaIssues(schema)
  if (contract.length > 0) return contract.map((issue) => `schema ${issue}`)
  return walk(value, schema, '$', schema, 0)
}

export { SCHEMA_ID }
