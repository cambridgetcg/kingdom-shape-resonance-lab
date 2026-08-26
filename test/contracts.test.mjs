import assert from 'node:assert/strict'
import { lstatSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

import { candidate, checkPublic } from '../src/cli.mjs'
import { buildAssets } from '../src/assets.mjs'
import { EXPECTED_INPUTS, EXPECTED_OUTPUTS, EXPECTED_SCHEMA, buildSnapshot, loadInputs, semanticIssues } from '../src/lab.mjs'
import { PUBLIC_FILES, ROOT, canonicalJson, parseJsonBytes, readBoundedBytes, sha256Bytes, sha256Json } from '../src/io.mjs'
import { renderShapeResonanceLab } from '../src/public-renderer.mjs'

const snapshot = buildSnapshot()
const assets = buildAssets()

test('reviewed input, schema, and output receipts are frozen exactly', () => {
  assert.deepEqual(loadInputs({ enforceReceipts: true }).observed, EXPECTED_INPUTS)
  assert.equal(snapshot.receipts.schema.byteReceipt, EXPECTED_SCHEMA.byte)
  assert.equal(snapshot.receipts.schema.canonicalReceipt, EXPECTED_SCHEMA.canonical)
  const value = candidate({ enforceReceipts: true })
  for (const [path, receipt] of Object.entries(EXPECTED_OUTPUTS.bytes)) assert.equal(sha256Bytes(value.files.get(path)), receipt, path)
  assert.equal(sha256Json(value.snapshot), EXPECTED_OUTPUTS.snapshotCanonical)
  assert.equal(sha256Json(value.manifest), EXPECTED_OUTPUTS.manifestCanonical)
})

test('complete semantic contract passes and mandatory negative boundaries remain explicit', () => {
  assert.deepEqual(semanticIssues(snapshot, assets), [])
  assert.equal(snapshot.exhibits.length, 8)
  assert.equal(snapshot.assets.length, 11)
  assert.equal(snapshot.conversionEdges.filter((edge) => edge.status === 'no-canonical-conversion').length, 6)
  assert.equal(snapshot.publication.acousticCouplingModelPresent, false)
  assert.equal(snapshot.publication.soundPressurePrediction, false)
  assert.equal(snapshot.publication.pageLoadExternalRequest, 'NONE')
  assert.equal(snapshot.publication.readerActivatedSourceNavigation, 'MAY_REQUEST_NAMED_EXTERNAL_ORIGIN')
  assert.equal(snapshot.publication.embeddedAudioControls, 'NONE')
  assert.equal(snapshot.publication.audioAccess, 'READER_ACTIVATED_SAME_ORIGIN_LINK_ONLY')
})

test('source firewall is an exact fourteen-URL HTTPS allowlist without retained bodies or inferred rights', () => {
  assert.equal(snapshot.sources.length, 14)
  assert.equal(new Set(snapshot.sources.map((source) => source.url)).size, 14)
  assert.ok(snapshot.sources.every((source) => source.url.startsWith('https://')))
  assert.deepEqual({
    bodyRetained: snapshot.sourceFirewall.bodyRetained,
    bodyReceiptPresent: snapshot.sourceFirewall.bodyReceiptPresent,
    exactTextReviewed: snapshot.sourceFirewall.exactTextReviewed,
    licenceOrReuseInferred: snapshot.sourceFirewall.licenceOrReuseInferred,
    currentnessInferred: snapshot.sourceFirewall.currentnessInferred,
    endorsementInferred: snapshot.sourceFirewall.endorsementInferred,
    authorityInferred: snapshot.sourceFirewall.authorityInferred,
  }, { bodyRetained: false, bodyReceiptPresent: false, exactTextReviewed: false, licenceOrReuseInferred: false, currentnessInferred: false, endorsementInferred: false, authorityInferred: false })
  assert.match(snapshot.sourceFirewall.note, /activating a source link may navigate/u)
})

test('publication authorization is exact, narrow, and receipted in the snapshot', () => {
  const path = join(ROOT, snapshot.publication.authorization.path)
  const bytes = readBoundedBytes(path, 128 * 1024)
  assert.equal(snapshot.publication.authorization.byteLength, bytes.byteLength)
  assert.equal(snapshot.publication.authorization.byteReceipt, sha256Bytes(bytes))
  assert.match(Buffer.from(bytes).toString('utf8'), /exact independently reviewed v0\.1 release bytes/u)
  assert.match(Buffer.from(bytes).toString('utf8'), /excludes modification/u)
  assert.match(snapshot.authorship, /Maintainer-authorized assisted construction/u)
})

test('public renderer exposes full semantic parity without scripts, forms, inline audio, or unescaped text', () => {
  const html = renderShapeResonanceLab(snapshot)
  for (const exhibit of snapshot.exhibits) assert.match(html, new RegExp(`id="${exhibit.id}"`, 'u'))
  assert.match(html, /Typed derivations, assumptions, results, and caveats/u)
  assert.match(html, /Model-scoped energy and power terms/u)
  assert.match(html, /Source orientation links/u)
  assert.equal((html.match(/type="audio\/wav" download/gu) ?? []).length, 3)
  assert.equal((html.match(/rel="noreferrer"/gu) ?? []).length, 14)
  assert.match(html, /PCM byte receipt/u)
  assert.match(html, /Pre-clamp peak \/ clipped samples/u)
  assert.doesNotMatch(html, /<audio\b|<script\b|<form\b/iu)

  const hostile = JSON.parse(canonicalJson(snapshot))
  hostile.title = '<script>alert(1)</script>'
  hostile.sources[0].title = '<img src=x onerror=alert(1)>'
  const escaped = renderShapeResonanceLab(hostile)
  assert.doesNotMatch(escaped, /<script>alert|<img src=x/iu)
  assert.match(escaped, /&lt;script&gt;alert/u)
  assert.match(escaped, /&lt;img src=x onerror=alert/u)
})

test('renderer rejects external media, unsafe source schemes, and duplicate asset paths', () => {
  const external = JSON.parse(canonicalJson(snapshot))
  external.assets[0].publicUrl = 'https://example.com/hostile.svg'
  assert.throws(() => renderShapeResonanceLab(external), /outside the reviewed same-origin family/u)
  const scheme = JSON.parse(canonicalJson(snapshot))
  scheme.sources[0].url = 'javascript:alert(1)'
  assert.throws(() => renderShapeResonanceLab(scheme), /HTTPS locator|reviewed source allowlist/u)
  const otherHttps = JSON.parse(canonicalJson(snapshot))
  otherHttps.sources[0].url = 'https://example.com/'
  assert.throws(() => renderShapeResonanceLab(otherHttps), /reviewed source allowlist/u)
  const duplicate = JSON.parse(canonicalJson(snapshot))
  duplicate.assets[1].path = duplicate.assets[0].path
  assert.throws(() => renderShapeResonanceLab(duplicate), /duplicate asset path/u)
})

test('output manifest receipts every non-self artifact and includes the full retirement family', () => {
  const value = candidate()
  assert.equal(value.manifest.artifactCount, 16)
  assert.equal(value.manifest.artifacts.length, 16)
  assert.equal(new Set(value.manifest.artifacts.map((item) => item.path)).size, 16)
  assert.ok(value.manifest.retirementFamilyUrls.includes(value.manifest.manifestPublicUrl))
  assert.equal(value.manifest.retirementFamilyUrls.length, 17)
  assert.equal(value.manifest.sourceAllowlist.length, 14)
  for (const record of value.manifest.artifacts) {
    let bytes
    if (record.path === 'public/shape-resonance-lab.json') bytes = value.snapshotBytes
    else if (record.path.startsWith('public/')) bytes = value.assets.get(record.path.slice('public/'.length)).bytes
    else bytes = readBoundedBytes(join(ROOT, record.path), 4 * 1024 * 1024)
    assert.equal(record.byteLength, bytes.byteLength, record.path)
    assert.equal(record.byteReceipt, sha256Bytes(bytes), record.path)
    if (record.canonicalReceipt !== null) assert.equal(record.canonicalReceipt, sha256Json(parseJsonBytes(bytes)), record.path)
  }
})

test('checked public files match a fresh candidate and contain no symlinks or undeclared members', () => {
  const value = candidate()
  assert.deepEqual(checkPublic(value), [])
  const walk = (directory, prefix = '') => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    assert.equal(lstatSync(path).isSymbolicLink(), false, path)
    const relative = prefix === '' ? entry.name : `${prefix}/${entry.name}`
    return entry.isDirectory() ? walk(path, relative) : [relative]
  })
  assert.deepEqual(walk(join(ROOT, 'public')).sort(), [...PUBLIC_FILES].sort())
})

test('guide preserves energy-force time dependence and has no known broken math literals', () => {
  const guide = readFileSync(join(ROOT, 'SHAPE-RESONANCE-LAB-v0.1.md'), 'utf8')
  assert.match(guide, /Q_0\\cos\\Omega t-c\\dot\\eta\^2/u)
  for (const broken of ['(P_4)', '(lambda=2)', '(zeta=0.05)', '(L=1', '(phi_{12})', '(x[n])', '(L_1)', '(mathbb Z']) assert.equal(guide.includes(broken), false, broken)
  assert.match(guide, /not identical and differ at one or more indices/u)
  assert.match(guide, /reader activates an orientation link/u)
})
