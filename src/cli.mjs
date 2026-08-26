#!/usr/bin/env node

import { lstatSync, readdirSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { schemaDefinition } from '../scripts/schema-definition.mjs'
import { EXPECTED_OUTPUTS, buildProducts, inputReceiptIssues, semanticIssues } from './lab.mjs'
import {
  MANIFEST_PATH,
  PUBLIC_FILES,
  ROOT,
  SCHEMA_PATH,
  canonicalJson,
  parseJsonBytes,
  prettyCanonicalJson,
  readBoundedBytes,
  sha256Bytes,
  sha256Json,
  writePublicFile,
  writeSchemaFile,
} from './io.mjs'
import { loadSchema, schemaIssues, validateAgainstSchema } from './schema-validator.mjs'

const GUIDE_PATH = join(ROOT, 'SHAPE-RESONANCE-LAB-v0.1.md')
const RENDERER_PATH = join(ROOT, 'src', 'public-renderer.mjs')
const AUTHORIZATION_PATH = join(ROOT, 'PUBLICATION-AUTHORIZATION.md')

function artifact(path, publicUrl, role, mediaType, bytes, canonicalReceipt = null) {
  return { path, publicUrl, role, mediaType, byteLength: bytes.byteLength, byteReceipt: sha256Bytes(bytes), canonicalReceipt, immutable: true }
}

function outputManifest(snapshot, snapshotBytes, assets, schema, schemaBytes) {
  const guideBytes = readBoundedBytes(GUIDE_PATH, 256 * 1024)
  const rendererBytes = readBoundedBytes(RENDERER_PATH, 256 * 1024)
  const authorizationBytes = readBoundedBytes(AUTHORIZATION_PATH, 128 * 1024)
  const records = [
    artifact('public/shape-resonance-lab.json', snapshot.routes.canonicalSnapshot, 'public-snapshot', 'application/json', snapshotBytes, sha256Json(snapshot)),
    artifact('schemas/v0.1/public-snapshot.schema.json', snapshot.routes.schema, 'public-schema', 'application/schema+json', schemaBytes, sha256Json(schema)),
    artifact('SHAPE-RESONANCE-LAB-v0.1.md', snapshot.routes.guide, 'human-guide', 'text/markdown; charset=utf-8', guideBytes),
    artifact('src/public-renderer.mjs', 'https://github.com/cambridgetcg/kingdom-shape-resonance-lab/blob/v0.1.0/src/public-renderer.mjs', 'authorized-renderer', 'text/javascript; charset=utf-8', rendererBytes),
    artifact('PUBLICATION-AUTHORIZATION.md', snapshot.publication.authorization.url, 'publication-authorization', 'text/markdown; charset=utf-8', authorizationBytes),
    ...[...assets.entries()].sort(([left], [right]) => left.localeCompare(right, 'en')).map(([path, value]) => {
      const record = snapshot.assets.find((entry) => entry.path === path)
      return artifact(`public/${path}`, record.publicUrl, record.role, record.mediaType, value.bytes)
    }),
  ]
  const manifestUrl = snapshot.receipts.outputManifestUrl
  const family = [snapshot.routes.human, snapshot.routes.mutableAlias, snapshot.routes.canonicalSnapshot, snapshot.routes.schema, snapshot.routes.guide, manifestUrl, ...snapshot.assets.map((item) => item.publicUrl)]
  return {
    protocol: 'kingdom.shape-resonance-lab-output-manifest/0.1',
    producerProtocol: snapshot.protocol,
    producerVersion: snapshot.version,
    producerTag: snapshot.routes.intendedProducerTag,
    asOf: snapshot.asOf,
    nextReviewDue: snapshot.nextReviewDue,
    authorship: snapshot.authorship,
    manifestPath: 'public/output-manifest.json',
    manifestPublicUrl: manifestUrl,
    selfReceiptExcludedReason: 'A byte sequence cannot contain its own cryptographic receipt without self-reference; release tests freeze the manifest byte receipt externally.',
    coreRoutes: snapshot.routes,
    publicationAuthorization: snapshot.publication.authorization,
    acousticBoundary: { acousticCouplingModelPresent: false, soundPressurePrediction: false, wavSemanticType: 'DECLARED-SONIFICATION' },
    audioRequestPolicy: {
      pageLoadAudioRequest: snapshot.publication.pageLoadAudioRequest,
      playback: snapshot.publication.audioPlayback,
      embeddedAudioControls: snapshot.publication.embeddedAudioControls,
      audioAccess: snapshot.publication.audioAccess,
      autoplay: snapshot.publication.autoplay,
      sameOriginGet: snapshot.publication.userInitiatedSameOriginAudioGet,
      externalRequest: snapshot.publication.externalAudioRequest,
    },
    externalNavigationPolicy: {
      pageLoadExternalRequest: snapshot.publication.pageLoadExternalRequest,
      embeddedThirdPartyResource: snapshot.publication.embeddedThirdPartyResource,
      readerActivatedSourceNavigation: snapshot.publication.readerActivatedSourceNavigation,
      sourceLinkRel: 'noreferrer',
    },
    sourceAllowlist: snapshot.sources.map((source) => source.url),
    artifactCount: records.length,
    artifacts: records,
    retirementFamilyUrls: family,
    immutableArtifactsRemainHistorical: true,
    mutableRetirementRule: snapshot.publication.overdueMutablePublicationRule,
  }
}

function candidate({ enforceReceipts = true } = {}) {
  const schema = loadSchema()
  const schemaBytes = readBoundedBytes(SCHEMA_PATH)
  const schemaContract = schemaIssues(schema)
  if (schemaContract.length > 0) throw new Error(`schema contract failed:\n${schemaContract.join('\n')}`)
  const { assets, snapshot } = buildProducts({ enforceReceipts })
  const semantic = semanticIssues(snapshot, assets)
  if (semantic.length > 0) throw new Error(`semantic contract failed:\n${semantic.join('\n')}`)
  const validation = validateAgainstSchema(snapshot, schema)
  if (validation.length > 0) throw new Error(`snapshot schema failed:\n${validation.join('\n')}`)
  const snapshotBytes = Buffer.from(prettyCanonicalJson(snapshot), 'utf8')
  const manifest = outputManifest(snapshot, snapshotBytes, assets, schema, schemaBytes)
  const manifestBytes = Buffer.from(prettyCanonicalJson(manifest), 'utf8')
  const files = new Map()
  for (const [path, value] of assets) files.set(path, value.bytes)
  files.set('shape-resonance-lab.json', snapshotBytes)
  files.set('output-manifest.json', manifestBytes)
  if (enforceReceipts) {
    const receiptIssues = []
    for (const [path, expected] of Object.entries(EXPECTED_OUTPUTS.bytes)) {
      const bytes = files.get(path)
      if (bytes === undefined || sha256Bytes(bytes) !== expected) receiptIssues.push(`${path}: exact output byte receipt mismatch`)
    }
    if (files.size !== Object.keys(EXPECTED_OUTPUTS.bytes).length) receiptIssues.push('exact output receipt inventory mismatch')
    if (sha256Json(snapshot) !== EXPECTED_OUTPUTS.snapshotCanonical) receiptIssues.push('snapshot canonical receipt mismatch')
    if (sha256Json(manifest) !== EXPECTED_OUTPUTS.manifestCanonical) receiptIssues.push('manifest canonical receipt mismatch')
    if (receiptIssues.length > 0) throw new Error(receiptIssues.join('\n'))
  }
  return { schema, schemaBytes, assets, snapshot, snapshotBytes, manifest, manifestBytes, files }
}

function walkFiles(directory, base = directory, result = []) {
  for (const name of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, name.name)
    const status = lstatSync(path)
    if (status.isSymbolicLink()) throw new Error(`symbolic link forbidden: ${path}`)
    if (status.isDirectory()) walkFiles(path, base, result)
    else if (status.isFile()) result.push(relative(base, path))
    else throw new Error(`non-regular output forbidden: ${path}`)
  }
  return result
}

function checkPublic(candidateValue) {
  const issues = []
  let observed = []
  try { observed = walkFiles(join(ROOT, 'public')).sort() } catch (error) {
    if (error?.code !== 'ENOENT') throw error
    issues.push('public output directory missing')
  }
  if (canonicalJson(observed) !== canonicalJson([...PUBLIC_FILES].sort())) issues.push('public output inventory mismatch')
  for (const path of PUBLIC_FILES) {
    try {
      const bytes = readBoundedBytes(join(ROOT, 'public', path), 4 * 1024 * 1024)
      const expected = candidateValue.files.get(path)
      if (expected === undefined || !Buffer.from(bytes).equals(Buffer.from(expected))) issues.push(`${path}: generated bytes differ`)
    } catch (error) {
      issues.push(`${path}: ${error.message}`)
    }
  }
  return issues
}

function build() {
  const value = candidate()
  for (const path of PUBLIC_FILES.filter((path) => path !== 'shape-resonance-lab.json' && path !== 'output-manifest.json')) writePublicFile(path, value.files.get(path))
  writePublicFile('shape-resonance-lab.json', value.snapshotBytes)
  writePublicFile('output-manifest.json', value.manifestBytes)
  return value
}

function validate() {
  const value = candidate()
  const receipts = inputReceiptIssues()
  if (receipts.length > 0) throw new Error(receipts.join('\n'))
  return value
}

function printOverview(value) {
  const audio = value.snapshot.assets.filter((asset) => asset.role === 'declared-sonification')
  process.stdout.write(`${prettyCanonicalJson({
    protocol: value.snapshot.protocol,
    state: value.snapshot.state,
    asOf: value.snapshot.asOf,
    nextReviewDue: value.snapshot.nextReviewDue,
    exhibitCount: value.snapshot.exhibits.length,
    conversionRefusalCount: value.snapshot.conversionEdges.filter((edge) => edge.status === 'no-canonical-conversion').length,
    diagramCount: value.snapshot.assets.filter((asset) => asset.role === 'static-diagram').length,
    wavCount: audio.length,
    wavFrames: audio.map((asset) => asset.audio.frameCount),
    acousticCouplingModelPresent: value.snapshot.publication.acousticCouplingModelPresent,
    soundPressurePrediction: value.snapshot.publication.soundPressurePrediction,
    modelResonanceCriterionSatisfied: value.snapshot.exhibits[0].resonanceAssessment.modelResonanceCriterionSatisfied,
    measuredResonance: value.snapshot.exhibits[0].resonanceAssessment.measuredResonance,
    snapshotByteReceipt: sha256Bytes(value.snapshotBytes),
    snapshotCanonicalReceipt: sha256Json(value.snapshot),
    manifestByteReceipt: sha256Bytes(value.manifestBytes),
  })}`)
}

function usage() {
  process.stderr.write('usage: kingdom-shape-resonance-lab <validate|build|check|schema|overview>\n')
  process.exitCode = 2
}

function main(command = process.argv[2]) {
  try {
    if (command === 'schema') {
      const bytes = Buffer.from(prettyCanonicalJson(schemaDefinition()), 'utf8')
      writeSchemaFile(bytes)
      process.stdout.write(`wrote schemas/v0.1/public-snapshot.schema.json ${sha256Bytes(bytes)}\n`)
    } else if (command === 'build') {
      const value = build()
      process.stdout.write(`wrote ${PUBLIC_FILES.length} fixed public files; snapshot ${sha256Bytes(value.snapshotBytes)}\n`)
    } else if (command === 'validate') {
      const value = validate()
      process.stdout.write(`valid ${value.snapshot.exhibits.length} exhibits, ${value.snapshot.assets.length} assets\n`)
    } else if (command === 'check') {
      const value = validate()
      const issues = checkPublic(value)
      if (issues.length > 0) throw new Error(issues.join('\n'))
      process.stdout.write(`checked ${PUBLIC_FILES.length} byte-identical public files\n`)
    } else if (command === 'overview') {
      printOverview(validate())
    } else usage()
  } catch (error) {
    process.stderr.write(`${error.stack ?? error}\n`)
    process.exitCode = 1
  }
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()

export { candidate, checkPublic, main, outputManifest }
