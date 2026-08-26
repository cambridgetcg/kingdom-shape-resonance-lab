import { canonicalJson, sha256Bytes } from './io.mjs'

const SAMPLE_RATE = 8000
const FRAME_COUNT = 4000
const PCM_SCALE = 32768

function esc(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}

function svg(title, description, body, width = 960, height = 540) {
  const styles = `
    .bg{fill:#0e1017}.panel{fill:#171b26;stroke:#465168;stroke-width:1.5}.ink{fill:#f4efe3}.muted{fill:#a8b0c1}.cyan{stroke:#74d7dd;fill:none}.gold{stroke:#e6b85c;fill:none}.rose{stroke:#e68aa3;fill:none}.green{stroke:#8bd3a8;fill:none}.line{stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.thin{stroke-width:1.5}.node{fill:#171b26;stroke:#74d7dd;stroke-width:3}.on{fill:#e6b85c;stroke:#f4efe3;stroke-width:1}.off{fill:#272d3c;stroke:#667089;stroke-width:1}.label{font:600 18px ui-monospace,SFMono-Regular,Consolas,monospace}.small{font:14px ui-monospace,SFMono-Regular,Consolas,monospace}.title{font:700 26px ui-serif,Georgia,serif}.eq{font:17px ui-monospace,SFMono-Regular,Consolas,monospace}`
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title desc" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><title id="title">${esc(title)}</title><desc id="desc">${esc(description)}</desc><style>${styles}</style><rect class="bg" width="${width}" height="${height}"/>${body}</svg>\n`, 'utf8')
}

function polyline(points, className) {
  return `<polyline class="${className}" points="${points.map(([x, y]) => `${x},${y}`).join(' ')}"/>`
}

function circlePoint(index, count, cx, cy, radius) {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count
  return [Number((cx + radius * Math.cos(angle)).toFixed(3)), Number((cy + radius * Math.sin(angle)).toFixed(3))]
}

function graphToHzSvg() {
  const nodes = [100, 220, 340, 460].map((x, index) => `<circle class="node" cx="${x}" cy="155" r="22"/><text class="small ink" x="${x}" y="161" text-anchor="middle">${index}</text>`).join('')
  const edges = [100, 220, 340].map((x) => `<line class="cyan line" x1="${x + 22}" y1="155" x2="${x + 98}" y2="155"/>`).join('')
  const bars = [0, 97.448, 180.063, 235.263].map((value, index) => {
    const height = value * 0.75
    const x = 625 + index * 74
    return `<rect x="${x}" y="${430 - height}" width="38" height="${height}" fill="${index === 0 ? '#667089' : '#e6b85c'}"/><text class="small ink" x="${x + 19}" y="454" text-anchor="middle">${index}</text>`
  }).join('')
  return svg('Graph to hertz: a physical bridge is required', 'A four-node path graph feeds a declared equal-mass equal-spring model. The dimensionless Laplacian spectrum becomes angular frequency only after stiffness and mass are supplied. The zero eigenvalue remains a rigid translation mode.', `
    <text class="title ink" x="50" y="54">P₄ graph ≠ hertz</text><text class="small muted" x="50" y="82">Topology first; units arrive with M and K.</text>
    <rect class="panel" x="48" y="105" width="458" height="155" rx="16"/>${edges}${nodes}
    <text class="eq ink" x="78" y="225">Lλ: 0, 2−√2, 2, 2+√2</text>
    <path class="gold line" d="M280 286 H560"/><path fill="#e6b85c" d="M560 286 l-14 -8 v16 z"/>
    <text class="eq ink" x="250" y="326">K=kL, M=mI</text><text class="eq ink" x="205" y="356">ωᵢ=√((k/m)λᵢ), fᵢ=ωᵢ/(2π)</text>
    <rect class="panel" x="590" y="105" width="322" height="390" rx="16"/><text class="label ink" x="620" y="144">physical f (Hz)</text>${bars}
    <text class="small muted" x="620" y="478">mode 0: rigid, not a tone</text>`)
}

function boundarySvg() {
  const fixedFixed = []
  const fixedFree = []
  for (let index = 0; index <= 32; index += 1) {
    const x = 90 + index * 12
    fixedFixed.push([x, Number((170 - 55 * Math.sin(index * Math.PI / 32)).toFixed(2))])
    fixedFree.push([x, Number((390 - 55 * Math.sin(index * Math.PI / 64)).toFixed(2))])
  }
  return svg('Same string, different boundary', 'Two ideal strings have the same length and wave speed. Fixed-fixed boundaries admit a 50 hertz fundamental; fixed-free boundaries admit a 25 hertz fundamental and odd harmonics.', `
    <text class="title ink" x="50" y="54">Boundary conditions select the family</text>
    <rect class="panel" x="48" y="92" width="864" height="175" rx="16"/><text class="label ink" x="74" y="128">fixed—fixed</text>${polyline(fixedFixed, 'cyan line')}<line class="rose line" x1="88" y1="112" x2="88" y2="228"/><line class="rose line" x1="476" y1="112" x2="476" y2="228"/><text class="eq ink" x="560" y="166">fₙ = nc/(2L)</text><text class="small muted" x="560" y="198">50, 100, 150, 200 Hz</text>
    <rect class="panel" x="48" y="307" width="864" height="175" rx="16"/><text class="label ink" x="74" y="343">fixed—free</text>${polyline(fixedFree, 'gold line')}<line class="rose line" x1="88" y1="327" x2="88" y2="443"/><circle class="on" cx="476" cy="390" r="6"/><text class="eq ink" x="560" y="381">fₙ = (2n−1)c/(4L)</text><text class="small muted" x="560" y="413">25, 75, 125, 175 Hz</text>`)
}

function membranePlateSvg() {
  const grid = (x, y, color, vertical, horizontal) => {
    let result = `<rect x="${x}" y="${y}" width="250" height="250" fill="#11151f" stroke="${color}" stroke-width="3"/>`
    for (let i = 1; i < vertical; i += 1) result += `<line x1="${x + i * 250 / vertical}" y1="${y}" x2="${x + i * 250 / vertical}" y2="${y + 250}" stroke="${color}" stroke-width="2" stroke-dasharray="7 7"/>`
    for (let i = 1; i < horizontal; i += 1) result += `<line x1="${x}" y1="${y + i * 250 / horizontal}" x2="${x + 250}" y2="${y + i * 250 / horizontal}" stroke="${color}" stroke-width="2" stroke-dasharray="7 7"/>`
    return result
  }
  return svg('Same square outline, different operator', 'A membrane and a simply supported thin plate share a one-metre square outline and sinusoidal mode labels, but their operators and frequency scalings differ: the membrane uses the Laplacian and the plate uses the biharmonic operator.', `
    <text class="title ink" x="50" y="54">Outline alone does not fix vibration</text>
    <text class="label ink" x="82" y="105">membrane Δ</text>${grid(70, 125, '#74d7dd', 2, 1)}<text class="eq ink" x="58" y="412">ωₘₙ=(cπ/a)√(m²+n²)</text><text class="small muted" x="86" y="444">scales with √(m²+n²)</text>
    <text class="label ink" x="602" y="105">plate Δ²</text>${grid(590, 125, '#e6b85c', 2, 1)}<text class="eq ink" x="543" y="412">ωₘₙ=(π²/a²)√(D/ρh)(m²+n²)</text><text class="small muted" x="610" y="444">scales with (m²+n²)</text>
    <path class="rose line" d="M400 248 H560"/><path fill="#e68aa3" d="M560 248 l-14 -8 v16 z"/><text class="small ink" x="480" y="230" text-anchor="middle">same outline</text><text class="small muted" x="480" y="278" text-anchor="middle">different physics</text>`)
}

function degeneracySvg() {
  return svg('Square symmetry creates a degenerate eigenspace', 'The square membrane modes labelled one-two and two-one share one eigenvalue. Rotating any orthonormal basis within their two-dimensional eigenspace produces another valid basis; the individual basis vectors are not canonical.', `
    <text class="title ink" x="50" y="54">Equal eigenvalue; noncanonical basis</text>
    <g transform="translate(80 125)"><rect width="220" height="220" class="panel"/><line x1="110" y1="0" x2="110" y2="220" class="cyan line"/><text class="label ink" x="110" y="260" text-anchor="middle">φ₁₂</text></g>
    <g transform="translate(370 125)"><rect width="220" height="220" class="panel"/><line x1="0" y1="110" x2="220" y2="110" class="gold line"/><text class="label ink" x="110" y="260" text-anchor="middle">φ₂₁</text></g>
    <g transform="translate(660 125)"><rect width="220" height="220" class="panel"/><line x1="0" y1="220" x2="220" y2="0" class="rose line"/><line x1="0" y1="0" x2="220" y2="220" class="green thin"/><text class="label ink" x="110" y="260" text-anchor="middle">rotated basis</text></g>
    <text class="eq ink" x="480" y="438" text-anchor="middle">λ₁₂ = λ₂₁ = 5π²/a²</text><text class="small muted" x="480" y="473" text-anchor="middle">symmetry fixes the eigenspace, not one privileged pair of arrows</text>`)
}

function graphGroup(x, edges, positions, color) {
  const lines = edges.map(([a, b]) => `<line x1="${x + positions[a][0]}" y1="${positions[a][1]}" x2="${x + positions[b][0]}" y2="${positions[b][1]}" stroke="${color}" stroke-width="3"/>`).join('')
  const nodes = positions.map(([px, py], index) => `<circle cx="${x + px}" cy="${py}" r="18" fill="#171b26" stroke="#f4efe3" stroke-width="2"/><text class="small ink" x="${x + px}" y="${py + 5}" text-anchor="middle">${index}</text>`).join('')
  return lines + nodes
}

function cospectralSvg() {
  const a = [[0, 2], [0, 3], [0, 4], [0, 5], [1, 4], [1, 5], [2, 3]]
  const b = [[0, 2], [0, 4], [0, 5], [1, 2], [1, 4], [1, 5], [2, 3]]
  const pos = [[160, 135], [160, 330], [50, 220], [80, 75], [270, 75], [270, 270]]
  return svg('Different connected graphs, identical Laplacian spectrum', 'Two connected six-vertex graphs have different degree multisets and therefore are non-isomorphic, yet their combinatorial Laplacian characteristic polynomials and spectra are exactly equal.', `
    <text class="title ink" x="50" y="54">Spectrum does not identify this graph</text><text class="label ink" x="210" y="96">A</text><text class="label ink" x="690" y="96">B</text>
    ${graphGroup(50, a, pos, '#74d7dd')}${graphGroup(530, b, pos, '#e6b85c')}
    <text class="small muted" x="210" y="495" text-anchor="middle">degrees 2,2,2,2,2,4</text><text class="small muted" x="690" y="495" text-anchor="middle">degrees 1,2,2,3,3,3</text>
    <text class="eq ink" x="480" y="522" text-anchor="middle">det(tI−L)=t(t−2)(t−3)²(t²−6t+4)</text>`)
}

function phaseSvg() {
  const forward = [[80, 185], [120, 185], [130, 130], [140, 185], [210, 185], [220, 155], [230, 185], [330, 185], [340, 110], [350, 185], [470, 185]]
  const reverse = forward.map(([x, y]) => [550 + (470 - x), y + 210])
  return svg('Same discrete Fourier magnitude, different phase and waveform', 'A real finite PCM sequence and its cyclic time reversal have exactly equal discrete Fourier magnitudes. Their Fourier phases are negated and the sample order differs. The two WAVs are declared sonifications, not acoustic measurements.', `
    <text class="title ink" x="50" y="54">Magnitude alone loses phase</text><text class="label ink" x="72" y="108">x[n]</text>${polyline(forward, 'cyan line')}<line class="thin" stroke="#667089" x1="75" y1="185" x2="480" y2="185"/>
    <text class="label ink" x="552" y="318">x[(−n) mod N]</text>${polyline(reverse, 'gold line')}<line class="thin" stroke="#667089" x1="550" y1="395" x2="955" y2="395"/>
    <text class="eq ink" x="480" y="255" text-anchor="middle">Y[k]=conj(X[k])  ⇒  |Y[k]|=|X[k]|</text><text class="small muted" x="480" y="285" text-anchor="middle">exact for a real sequence; PCM order and phases still differ</text>`)
}

function musicalSvg() {
  const points = Array.from({ length: 12 }, (_, index) => circlePoint(index, 12, 255, 290, 165))
  const nodes = points.map(([x, y], index) => `<circle cx="${x}" cy="${y}" r="${[0, 4, 7].includes(index) ? 14 : 9}" class="${[0, 4, 7].includes(index) ? 'on' : 'off'}"/><text class="small ink" x="${x}" y="${y + 5}" text-anchor="middle">${index}</text>`).join('')
  return svg('12-TET pitch class and a declared voice-leading metric', 'The left circle represents pitch classes modulo twelve with C major highlighted. The right panel shows one minimal L1 semitone voice-leading from C major to E minor under declared octave, permutation, and register conventions. It is a Western 12-TET model, not a universal geometry of music.', `
    <text class="title ink" x="50" y="54">Musical geometry begins with conventions</text>${nodes}<text class="label ink" x="255" y="505" text-anchor="middle">C major {0,4,7} in Z₁₂</text>
    <rect class="panel" x="520" y="120" width="390" height="330" rx="16"/><text class="label ink" x="555" y="160">voice leading</text>
    <text class="eq ink" x="565" y="220">C4 (0)  →  B3 (−1)</text><text class="eq ink" x="565" y="270">E4 (4)  →  E4 (4)</text><text class="eq ink" x="565" y="320">G4 (7)  →  G4 (7)</text><path class="gold line" d="M565 355 H850"/><text class="eq ink" x="565" y="400">L1 distance = 1 st</text><text class="small muted" x="555" y="430">one metric, not a preference score</text>`)
}

function rhythmSvg() {
  const ring = (cx, onsets, color) => Array.from({ length: 16 }, (_, index) => {
    const [x, y] = circlePoint(index, 16, cx, 290, 155)
    return `<circle cx="${x}" cy="${y}" r="${onsets.includes(index) ? 13 : 8}" fill="${onsets.includes(index) ? color : '#272d3c'}" stroke="#f4efe3" stroke-width="1"/><text class="small ink" x="${x}" y="${y + 5}" text-anchor="middle">${index}</text>`
  }).join('')
  return svg('Five onsets on a sixteen-step cycle', 'Two sixteen-step cyclic patterns contain five onsets. The Euclidean example has cyclic gaps three, three, three, three, four; the clustered contrast has gaps one, one, one, one, twelve. Even distribution is a declared combinatorial property, not aesthetic superiority.', `
    <text class="title ink" x="50" y="54">Equal count; different cyclic spacing</text>${ring(250, [0, 3, 6, 9, 12], '#e6b85c')}${ring(710, [0, 1, 2, 3, 4], '#e68aa3')}
    <text class="label ink" x="250" y="495" text-anchor="middle">E(5,16): 3,3,3,3,4</text><text class="label ink" x="710" y="495" text-anchor="middle">cluster: 1,1,1,1,12</text>`)
}

function triangleFromPhase(phase) {
  const top = phase >>> 16
  return top < 32768 ? top * 2 - 32768 : 98303 - top * 2
}

function wavFromPcm16(samples, sampleRate = SAMPLE_RATE) {
  if (!(samples instanceof Int16Array)) throw new TypeError('samples must be Int16Array')
  const dataLength = samples.length * 2
  const bytes = Buffer.alloc(44 + dataLength)
  bytes.write('RIFF', 0, 'ascii')
  bytes.writeUInt32LE(36 + dataLength, 4)
  bytes.write('WAVE', 8, 'ascii')
  bytes.write('fmt ', 12, 'ascii')
  bytes.writeUInt32LE(16, 16)
  bytes.writeUInt16LE(1, 20)
  bytes.writeUInt16LE(1, 22)
  bytes.writeUInt32LE(sampleRate, 24)
  bytes.writeUInt32LE(sampleRate * 2, 28)
  bytes.writeUInt16LE(2, 32)
  bytes.writeUInt16LE(16, 34)
  bytes.write('data', 36, 'ascii')
  bytes.writeUInt32LE(dataLength, 40)
  for (let index = 0; index < samples.length; index += 1) bytes.writeInt16LE(samples[index], 44 + index * 2)
  return bytes
}

function graphPcm() {
  const scale = 800
  const frequencies = [
    scale * Math.sqrt(2 - Math.SQRT2) / (2 * Math.PI),
    scale * Math.SQRT2 / (2 * Math.PI),
    scale * Math.sqrt(2 + Math.SQRT2) / (2 * Math.PI),
  ]
  const increments = frequencies.map((frequency) => Math.round(frequency * 2 ** 32 / SAMPLE_RATE))
  const phases = [0, 0, 0]
  const weights = [12, 9, 7]
  const samples = new Int16Array(FRAME_COUNT)
  let preClampPeakAbsoluteCode = 0
  let clippedSampleCount = 0
  for (let index = 0; index < samples.length; index += 1) {
    let mixed = 0
    for (let mode = 0; mode < phases.length; mode += 1) {
      phases[mode] = (phases[mode] + increments[mode]) >>> 0
      mixed += triangleFromPhase(phases[mode]) * weights[mode]
    }
    let value = Math.trunc(mixed / 32)
    const fade = Math.min(index + 1, samples.length - index, 320)
    value = Math.trunc(value * fade / 320)
    preClampPeakAbsoluteCode = Math.max(preClampPeakAbsoluteCode, Math.abs(value))
    if (value < -32768 || value > 32767) clippedSampleCount += 1
    samples[index] = Math.max(-32768, Math.min(32767, value))
  }
  return { samples, frequencies, increments, preClampPeakAbsoluteCode, clippedSampleCount }
}

const BURSTS = Object.freeze([
  { start: 200, length: 400, period: 80, peak: 10_000, phaseOffset: 0 },
  { start: 900, length: 550, period: 50, peak: 7_500, phaseOffset: 7 },
  { start: 1700, length: 300, period: 40, peak: 12_000, phaseOffset: 13 },
  { start: 2800, length: 600, period: 32, peak: 9_000, phaseOffset: 3 },
])

function phasePcm() {
  const forward = new Int16Array(FRAME_COUNT)
  for (const burst of BURSTS) {
    for (let offset = 0; offset < burst.length; offset += 1) {
      const cycle = (offset + burst.phaseOffset) % burst.period
      const half = burst.period / 2
      const triangleNumerator = cycle < half ? -half + 2 * cycle : 3 * half - 2 * cycle
      const edge = Math.min(offset + 1, burst.length - offset, 80)
      const envelopeNumerator = Math.min(edge, 80)
      forward[burst.start + offset] = Math.trunc(triangleNumerator * burst.peak * envelopeNumerator / (half * 80))
    }
  }
  const reversed = new Int16Array(FRAME_COUNT)
  reversed[0] = forward[0]
  for (let index = 1; index < FRAME_COUNT; index += 1) reversed[index] = forward[FRAME_COUNT - index]
  return { forward, reversed }
}

function pcmBytes(samples) {
  const bytes = Buffer.alloc(samples.length * 2)
  for (let index = 0; index < samples.length; index += 1) bytes.writeInt16LE(samples[index], index * 2)
  return bytes
}

function sampleBounds(samples) {
  let minimum = 32767
  let maximum = -32768
  let absolute = 0
  for (const sample of samples) {
    minimum = Math.min(minimum, sample)
    maximum = Math.max(maximum, sample)
    absolute = Math.max(absolute, Math.abs(sample))
  }
  return { minimum, maximum, absolute }
}

function wavMetadata(samples, fixture, frequencyScale, amplitudeScale, spectralCaveat, audit = {}) {
  const raw = pcmBytes(samples)
  const bounds = sampleBounds(samples)
  return {
    semanticType: 'DECLARED-SONIFICATION',
    container: 'RIFF/WAVE',
    encoding: 'PCM signed integer',
    channels: 1,
    sampleRate: SAMPLE_RATE,
    bitDepth: 16,
    frameCount: samples.length,
    durationSeconds: samples.length / SAMPLE_RATE,
    endianness: 'little-endian',
    pcmByteReceipt: sha256Bytes(raw),
    peakAbsoluteCode: bounds.absolute,
    peakFractionOfFullScale: Number((bounds.absolute / PCM_SCALE).toFixed(9)),
    storedMinimumCode: bounds.minimum,
    storedMaximumCode: bounds.maximum,
    preClampPeakAbsoluteCode: audit.preClampPeakAbsoluteCode ?? bounds.absolute,
    clippedSampleCount: audit.clippedSampleCount ?? 0,
    storedPcmWithinRange: bounds.minimum >= -32768 && bounds.maximum <= 32767,
    normalization: 'NONE',
    clipping: (audit.clippedSampleCount ?? 0) > 0,
    generator: 'kingdom-shape-resonance-lab integer-pcm/0.1',
    sourceFixtureCanonicalReceipt: sha256Bytes(Buffer.from(canonicalJson(fixture), 'utf8')),
    frequencyScale,
    timeScale: '1 sample = 1/8000 second; 4000 frames = 0.5 second',
    amplitudeScale,
    spectralCaveat,
    playbackPolicy: 'USER_INITIATED_SAME_ORIGIN_GET_ONLY',
    nonAudioEquivalent: 'The public snapshot contains the complete schedule, equations, units, tables, and relation that generated this file.',
  }
}

export function parsePcm16Wav(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < 46 || bytes.byteLength > 1024 * 1024) throw new TypeError('bounded WAV bytes required')
  const buffer = Buffer.from(bytes)
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE' || buffer.toString('ascii', 12, 16) !== 'fmt ' || buffer.toString('ascii', 36, 40) !== 'data') throw new TypeError('unsupported WAV layout')
  if (buffer.readUInt32LE(16) !== 16 || buffer.readUInt16LE(20) !== 1 || buffer.readUInt16LE(22) !== 1 || buffer.readUInt16LE(34) !== 16) throw new TypeError('WAV must be mono PCM16')
  const sampleRate = buffer.readUInt32LE(24)
  if (sampleRate < 1 || buffer.readUInt32LE(28) !== sampleRate * 2 || buffer.readUInt16LE(32) !== 2) throw new TypeError('WAV rate or block alignment mismatch')
  const dataLength = buffer.readUInt32LE(40)
  if (dataLength + 44 !== buffer.length || dataLength % 2 !== 0 || buffer.readUInt32LE(4) + 8 !== buffer.length) throw new TypeError('WAV length fields mismatch')
  const samples = new Int16Array(dataLength / 2)
  for (let index = 0; index < samples.length; index += 1) samples[index] = buffer.readInt16LE(44 + index * 2)
  return { sampleRate, bitDepth: 16, channels: 1, frameCount: samples.length, samples, pcmBytes: buffer.subarray(44) }
}

export function buildAssets() {
  const result = new Map()
  const addSvg = (path, title, description, bytes) => result.set(path, { bytes, metadata: { semanticType: 'STATIC-DIAGRAM', title, accessibilityText: description, externalReferences: false, scripts: false } })
  addSvg('assets/graph-to-hz.svg', 'Graph to hertz: a physical bridge is required', 'P4 gains angular frequency units only after mass and stiffness are declared; its zero eigenvalue is a rigid mode.', graphToHzSvg())
  addSvg('assets/boundary-variants.svg', 'Same string, different boundary', 'Fixed-fixed and fixed-free ideal strings with the same length and wave speed have different allowed frequency families.', boundarySvg())
  addSvg('assets/membrane-plate.svg', 'Same square outline, different operator', 'A membrane Laplacian and a plate biharmonic operator assign different frequency scaling to the same square outline.', membranePlateSvg())
  addSvg('assets/square-degeneracy.svg', 'Square symmetry creates a degenerate eigenspace', 'Modes one-two and two-one span one two-dimensional eigenspace; an individual basis inside it is not canonical.', degeneracySvg())
  addSvg('assets/cospectral-graphs.svg', 'Different graphs, identical Laplacian spectrum', 'Two connected non-isomorphic six-vertex graphs have the same exact combinatorial-Laplacian characteristic polynomial.', cospectralSvg())
  addSvg('assets/phase-magnitude.svg', 'Same Fourier magnitude, different phase and waveform', 'A real sequence and its cyclic reversal have exactly equal DFT magnitudes and conjugate phases.', phaseSvg())
  addSvg('assets/musical-geometry.svg', '12-TET pitch class and a declared voice-leading metric', 'Pitch-class and voice-leading geometry under explicit Western 12-TET, octave, permutation, register, and L1 conventions.', musicalSvg())
  addSvg('assets/rhythm-cycle.svg', 'Five onsets on a sixteen-step cycle', 'A Euclidean spacing and a clustered spacing have equal onset count but different cyclic gap sequences.', rhythmSvg())

  const graph = graphPcm()
  const graphFixture = { sampleRate: SAMPLE_RATE, frameCount: FRAME_COUNT, model: 'P4 equal-mass equal-spring', kNewtonPerMetre: 6400, mKilogram: 0.01, oscillator: 'integer 32-bit phase-accumulator triangle', increments: graph.increments, weights: [12, 9, 7], fadeFrames: 320 }
  const graphBytes = wavFromPcm16(graph.samples)
  result.set('audio/graph-modes.wav', {
    bytes: graphBytes,
    metadata: wavMetadata(graph.samples, graphFixture, `Physical modal targets f=ω/(2π): ${graph.frequencies.map((value) => value.toFixed(9)).join(', ')} Hz. Integer phase increments ${graph.increments.join(', ')} produce actual digital carrier fundamentals ${graph.increments.map((increment) => (increment * SAMPLE_RATE / 2 ** 32).toFixed(9)).join(', ')} Hz, with errors ${graph.increments.map((increment, index) => (increment * SAMPLE_RATE / 2 ** 32 - graph.frequencies[index]).toExponential(3)).join(', ')} Hz. This is a sonification, not radiated pressure.`, 'Weighted PCM triangle codes 12:9:7 divided by 32 with a 320-frame integer fade; PCM code is dimensionless and not joules or pascals.', 'The three listed values are carrier fundamentals, not the complete WAV spectrum. Triangle oscillators add odd harmonics; finite duration and the 320-frame envelope add window leakage and sidebands.', { preClampPeakAbsoluteCode: graph.preClampPeakAbsoluteCode, clippedSampleCount: graph.clippedSampleCount }),
  })

  const phase = phasePcm()
  const phaseFixture = { sampleRate: SAMPLE_RATE, frameCount: FRAME_COUNT, relation: 'y[0]=x[0]; y[n]=x[N-n] for 1<=n<N', bursts: BURSTS }
  const forwardBytes = wavFromPcm16(phase.forward)
  const reverseBytes = wavFromPcm16(phase.reversed)
  const frequencyScale = `Each integer-triangle burst period maps to sampleRate/period: ${BURSTS.map((burst) => `${SAMPLE_RATE / burst.period} Hz`).join(', ')}. These are authored digital carriers, not physical modes.`
  const phaseSpectralCaveat = 'The listed rates are carrier fundamentals, not complete spectra. Triangle carriers contain odd harmonics and each finite 80-frame edge envelope produces sidebands and finite-window leakage.'
  result.set('audio/phase-forward.wav', { bytes: forwardBytes, metadata: wavMetadata(phase.forward, phaseFixture, frequencyScale, 'Each burst declares an integer peak PCM code and an 80-frame linear edge envelope; no normalization.', phaseSpectralCaveat) })
  result.set('audio/phase-reversed.wav', { bytes: reverseBytes, metadata: wavMetadata(phase.reversed, phaseFixture, frequencyScale, 'Exact cyclic sample reversal of phase-forward.wav; no normalization. DFT phases conjugate while magnitudes remain equal.', phaseSpectralCaveat) })
  return result
}
