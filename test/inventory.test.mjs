import assert from 'node:assert/strict'
import { lstatSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import test from 'node:test'

import { ROOT } from '../src/io.mjs'

const EXPECTED = [
  '.github/workflows/validate.yml', '.gitignore', 'AGENTS.md', 'NOTICE.md', 'PUBLICATION-AUTHORIZATION.md', 'README.md', 'SHAPE-RESONANCE-LAB-v0.1.md',
  'data/config.json', 'data/sources.json', 'package.json',
  'public/assets/boundary-variants.svg', 'public/assets/cospectral-graphs.svg', 'public/assets/graph-to-hz.svg', 'public/assets/membrane-plate.svg',
  'public/assets/musical-geometry.svg', 'public/assets/phase-magnitude.svg', 'public/assets/rhythm-cycle.svg', 'public/assets/square-degeneracy.svg',
  'public/audio/graph-modes.wav', 'public/audio/phase-forward.wav', 'public/audio/phase-reversed.wav', 'public/output-manifest.json', 'public/shape-resonance-lab.json',
  'schemas/v0.1/public-snapshot.schema.json', 'scripts/schema-definition.mjs',
  'src/assets.mjs', 'src/cli.mjs', 'src/io.mjs', 'src/lab.mjs', 'src/public-renderer.mjs', 'src/schema-validator.mjs',
  'test/assets.test.mjs', 'test/contracts.test.mjs', 'test/inventory.test.mjs', 'test/io.test.mjs', 'test/math.test.mjs', 'test/mutations.test.mjs', 'test/schema.test.mjs',
]

function walk(directory, result = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === '.git') continue
    const path = join(directory, entry.name)
    const status = lstatSync(path)
    assert.equal(status.isSymbolicLink(), false, `symlink forbidden: ${path}`)
    if (status.isDirectory()) walk(path, result)
    else {
      assert.equal(status.isFile(), true, `non-regular member forbidden: ${path}`)
      result.push(relative(ROOT, path))
    }
  }
  return result
}

test('repository inventory is exact, regular, and dependency-free', () => {
  assert.deepEqual(walk(ROOT).sort(), [...EXPECTED].sort())
  assert.equal(EXPECTED.some((path) => path.startsWith('node_modules/')), false)
  const packageJson = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
  assert.equal(Object.hasOwn(packageJson, 'dependencies'), false)
  assert.equal(Object.hasOwn(packageJson, 'devDependencies'), false)
})
