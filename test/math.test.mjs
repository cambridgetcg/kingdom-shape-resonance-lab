import assert from 'node:assert/strict'
import test from 'node:test'

import { buildSnapshot, laplacianCharacteristicCoefficients } from '../src/lab.mjs'

const snapshot = buildSnapshot()
const byId = new Map(snapshot.exhibits.map((item) => [item.id, item]))

test('P4 spectrum has a rigid zero mode and the declared physical frequencies', () => {
  const item = byId.get('graph-to-hz-driven-resonance')
  const rows = item.tables[0].rows
  assert.deepEqual(rows.map((row) => row[1]), ['0', '2-sqrt(2)', '2', '2+sqrt(2)'])
  assert.equal(rows[0][5], 'rigid translation; excluded from audio')
  const expected = [0, 97.44953584044326, 180.06326323142122, 235.26399107296115]
  rows.forEach((row, index) => assert.ok(Math.abs(Number(row[4]) - expected[index]) < 1e-9))
})

test('driven response separates analytic displacement peak from phase quadrature', () => {
  const item = byId.get('graph-to-hz-driven-resonance')
  const rows = item.tables[1].rows
  const peak = rows.find((row) => row[4] === 'analytic displacement peak')
  const quadrature = rows.find((row) => row[4] === 'natural-frequency phase crossing')
  assert.equal(peak[0], 'sqrt(1-2*zeta^2)')
  assert.ok(Number(peak[1]) < Number(quadrature[1]))
  assert.ok(Number(peak[2]) > Number(quadrature[2]))
  assert.equal(Number(quadrature[3]), 90)
  assert.ok(Number(peak[3]) < 90)
  assert.match(item.claims.falsifier, /Q=0/u)
  assert.match(item.claims.falsifier, /no bounded steady-state amplitude/u)
  assert.equal(item.resonanceAssessment.physicalExperimentPerformed, false)
  assert.equal(item.resonanceAssessment.measuredResonance, false)
})

test('string boundary families are exact and unequal', () => {
  const rows = byId.get('same-string-different-boundary').tables[0].rows
  assert.deepEqual(rows.filter((row) => row[0] === 'fixed-fixed').map((row) => row[3]), ['50', '100', '150', '200'])
  assert.deepEqual(rows.filter((row) => row[0] === 'fixed-free').map((row) => row[3]), ['25', '75', '125', '175'])
})

test('membrane and plate frequency scalings compute independently', () => {
  const rows = byId.get('same-square-different-operator').tables[0].rows
  assert.ok(Math.abs(Number(rows[0][3]) - 50 * Math.sqrt(2)) < 1e-9)
  assert.ok(Math.abs(Number(rows[0][5]) - 10 * Math.PI) < 1e-9)
  assert.ok(Math.abs(Number(rows[2][3]) / Number(rows[0][3]) - 2) < 1e-9)
  assert.equal(Number((Number(rows[2][5]) / Number(rows[0][5])).toFixed(8)), 4)
})

test('square degeneracy retains multiplicity and refuses a canonical basis', () => {
  const item = byId.get('square-symmetry-degeneracy')
  assert.equal(item.quantities.find((value) => value.id === 'eigenspace-dimension').approximateValue, 2)
  assert.match(item.derivations[0].result, /every theta/u)
  assert.match(item.claims.falsifier, /orthogonal rotation/u)
})

test('cospectral graph pair recomputes exact coefficients and non-isomorphism witness', () => {
  const graphA = [[0, 2], [0, 3], [0, 4], [0, 5], [1, 4], [1, 5], [2, 3]]
  const graphB = [[0, 2], [0, 4], [0, 5], [1, 2], [1, 4], [1, 5], [2, 3]]
  const expected = [1, -14, 73, -176, 192, -72, 0]
  assert.deepEqual(laplacianCharacteristicCoefficients(6, graphA), expected)
  assert.deepEqual(laplacianCharacteristicCoefficients(6, graphB), expected)
  assert.notDeepEqual([2, 2, 2, 2, 2, 4], [1, 2, 2, 3, 3, 3])
  assert.match(byId.get('finite-laplacian-cospectral-counterexample').claims.scope, /Finite combinatorial Laplacian only/u)
})

test('phase, chord, and rhythm fixtures state exact bounded invariants', () => {
  const phase = byId.get('same-magnitude-different-phase')
  assert.match(phase.derivations[0].result, /\|Y\[k\]\|=\|X\[k\]\|/u)
  const chord = byId.get('twelve-tet-voice-leading-geometry')
  assert.equal(chord.quantities.find((item) => item.id === 'voice-leading-distance').approximateValue, 1)
  assert.equal(chord.derivations.at(-1).status, 'no-canonical-conversion')
  const rhythm = byId.get('cyclic-rhythm-spacing')
  assert.equal(rhythm.quantities.find((item) => item.id === 'euclidean-gap-variance').exactValue, '4/25')
  assert.equal(rhythm.quantities.find((item) => item.id === 'cluster-gap-variance').exactValue, '484/25')
})
