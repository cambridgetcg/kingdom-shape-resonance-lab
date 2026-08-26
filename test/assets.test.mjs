import assert from 'node:assert/strict'
import test from 'node:test'

import { buildAssets, parsePcm16Wav } from '../src/assets.mjs'
import { sha256Bytes } from '../src/io.mjs'

const first = buildAssets()
const second = buildAssets()

test('asset inventory and regeneration are byte deterministic', () => {
  assert.equal(first.size, 11)
  assert.deepEqual([...first.keys()], [...second.keys()])
  for (const [path, asset] of first) assert.equal(sha256Bytes(asset.bytes), sha256Bytes(second.get(path).bytes), path)
  assert.equal([...first.keys()].filter((path) => path.endsWith('.svg')).length, 8)
  assert.equal([...first.keys()].filter((path) => path.endsWith('.wav')).length, 3)
})

test('SVGs are inert UTF-8 images with title and description', () => {
  for (const [path, asset] of first) {
    if (!path.endsWith('.svg')) continue
    const source = new TextDecoder('utf-8', { fatal: true }).decode(asset.bytes)
    assert.match(source, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" role="img"/u, path)
    assert.match(source, /<title id="title">[^<]+<\/title><desc id="desc">[^<]+<\/desc>/u, path)
    assert.doesNotMatch(source, /<(?:script|foreignObject|image|use|a)\b/iu, path)
    assert.doesNotMatch(source, /\bon[a-z]+\s*=|\bhref\s*=|data:/iu, path)
  }
})

test('WAVs use the exact closed RIFF PCM16 layout and match metadata', () => {
  for (const [path, asset] of first) {
    if (!path.endsWith('.wav')) continue
    const parsed = parsePcm16Wav(asset.bytes)
    assert.equal(parsed.sampleRate, 8000, path)
    assert.equal(parsed.channels, 1, path)
    assert.equal(parsed.bitDepth, 16, path)
    assert.equal(parsed.frameCount, 4000, path)
    assert.equal(asset.bytes.byteLength, 8044, path)
    assert.equal(sha256Bytes(parsed.pcmBytes), asset.metadata.pcmByteReceipt, path)
    assert.equal(asset.metadata.durationSeconds, 0.5, path)
    assert.equal(asset.metadata.clippedSampleCount, 0, path)
    assert.equal(asset.metadata.clipping, false, path)
    assert.equal(asset.metadata.storedPcmWithinRange, true, path)
    assert.match(asset.metadata.spectralCaveat, /not (?:the )?complete/iu, path)
  }
})

test('WAV parser rejects unknown layout, trailing data, corrupt length, and block alignment', () => {
  const original = first.get('audio/graph-modes.wav').bytes
  const mutate = (offset, write) => {
    const copy = Buffer.from(original)
    write(copy, offset)
    return copy
  }
  assert.throws(() => parsePcm16Wav(mutate(0, (copy) => copy.write('RIFX', 0, 'ascii'))), /unsupported WAV layout/u)
  assert.throws(() => parsePcm16Wav(Buffer.concat([original, Buffer.from([0])])), /length fields mismatch/u)
  assert.throws(() => parsePcm16Wav(mutate(40, (copy) => copy.writeUInt32LE(2, 40))), /length fields mismatch/u)
  assert.throws(() => parsePcm16Wav(mutate(32, (copy) => copy.writeUInt16LE(4, 32))), /block alignment/u)
  assert.throws(() => parsePcm16Wav(mutate(28, (copy) => copy.writeUInt32LE(1, 28))), /rate or block alignment/u)
  assert.throws(() => parsePcm16Wav(mutate(24, (copy) => copy.writeUInt32LE(0, 24))), /rate or block alignment/u)
  assert.throws(() => parsePcm16Wav(mutate(36, (copy) => copy.write('JUNK', 36, 'ascii'))), /unsupported WAV layout/u)
})

test('phase WAVs are unequal exact cyclic reversals', () => {
  const forward = parsePcm16Wav(first.get('audio/phase-forward.wav').bytes).samples
  const reversed = parsePcm16Wav(first.get('audio/phase-reversed.wav').bytes).samples
  let unequal = 0
  for (let index = 0; index < forward.length; index += 1) {
    const expected = index === 0 ? forward[0] : forward[forward.length - index]
    assert.equal(reversed[index], expected, `sample ${index}`)
    if (forward[index] !== reversed[index]) unequal += 1
  }
  assert.ok(unequal > 0)
})

test('graph sonification distinguishes physical targets from quantized carriers and spectrum', () => {
  const metadata = first.get('audio/graph-modes.wav').metadata
  assert.match(metadata.frequencyScale, /Physical modal targets/u)
  assert.match(metadata.frequencyScale, /actual digital carrier fundamentals/u)
  assert.match(metadata.frequencyScale, /errors/u)
  assert.match(metadata.spectralCaveat, /odd harmonics/u)
  assert.match(metadata.spectralCaveat, /window leakage/u)
  assert.equal(metadata.preClampPeakAbsoluteCode, metadata.peakAbsoluteCode)
})
