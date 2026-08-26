import assert from 'node:assert/strict'
import test from 'node:test'

import { buildAssets } from '../src/assets.mjs'
import { buildSnapshot, semanticIssues } from '../src/lab.mjs'
import { canonicalJson } from '../src/io.mjs'

const baseline = buildSnapshot()
const assets = buildAssets()
const mutate = (callback) => {
  const value = JSON.parse(canonicalJson(baseline))
  callback(value)
  return semanticIssues(value, assets).join('\n')
}

test('semantic guard rejects acoustic, pressure, measured-resonance, and coupling-falsifier drift', () => {
  assert.match(mutate((value) => { value.publication.acousticCouplingModelPresent = true }), /acoustic refusal mismatch/u)
  assert.match(mutate((value) => { value.publication.soundPressurePrediction = true }), /acoustic refusal mismatch/u)
  assert.match(mutate((value) => { value.exhibits[0].resonanceAssessment.measuredResonance = true }), /misrepresented as measured/u)
  assert.match(mutate((value) => { value.exhibits[0].claims.falsifier = 'frequency match is enough' }), /coupling\/damping falsifier missing/u)
})

test('semantic guard rejects type-collapsed tables and refused outputs with fake units', () => {
  assert.match(mutate((value) => { value.exhibits[0].tables = [value.exhibits[0].tables[0]] }), /natural and forced tables not type-separated/u)
  assert.match(mutate((value) => { value.exhibits[0].tables[0].rows[0].push('extra') }), /table row width mismatch/u)
  assert.match(mutate((value) => { value.exhibits[0].derivations.at(-1).unitId = 'dimensionless' }), /refused derivation must have no output unit/u)
  assert.match(mutate((value) => { value.conversionEdges.find((edge) => edge.status === 'no-canonical-conversion').unitsOut = ['hertz'] }), /refusal must produce no unit/u)
})

test('semantic guard rejects asset, source, unit, and audio-policy drift', () => {
  assert.match(mutate((value) => { value.assets[0].byteReceipt = 'sha256:0000000000000000000000000000000000000000000000000000000000000000' }), /byte receipt mismatch/u)
  assert.match(mutate((value) => { value.sources[0].url = 'http://example.com' }), /source URL allowlist mismatch/u)
  assert.match(mutate((value) => { value.exhibits[0].quantities[0].unitId = 'vibes' }), /unregistered quantity unit/u)
  assert.match(mutate((value) => { value.publication.pageLoadAudioRequest = 'YES' }), /audio activation boundary mismatch/u)
})
