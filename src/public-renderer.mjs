const PROTOCOL = 'kingdom.shape-resonance-lab-public-snapshot/0.1'
const ASSET_PREFIX = 'https://thekingdom.dev/labs/shape-resonance/'
const ASSET_ALLOWLIST = new Set([
  'https://thekingdom.dev/labs/shape-resonance/assets/boundary-variants.svg',
  'https://thekingdom.dev/labs/shape-resonance/assets/cospectral-graphs.svg',
  'https://thekingdom.dev/labs/shape-resonance/assets/graph-to-hz.svg',
  'https://thekingdom.dev/labs/shape-resonance/assets/membrane-plate.svg',
  'https://thekingdom.dev/labs/shape-resonance/assets/musical-geometry.svg',
  'https://thekingdom.dev/labs/shape-resonance/assets/phase-magnitude.svg',
  'https://thekingdom.dev/labs/shape-resonance/assets/rhythm-cycle.svg',
  'https://thekingdom.dev/labs/shape-resonance/assets/square-degeneracy.svg',
  'https://thekingdom.dev/labs/shape-resonance/audio/graph-modes.wav',
  'https://thekingdom.dev/labs/shape-resonance/audio/phase-forward.wav',
  'https://thekingdom.dev/labs/shape-resonance/audio/phase-reversed.wav',
])
const SOURCE_ALLOWLIST = new Set([
  'https://ocw.mit.edu/courses/2-003sc-engineering-dynamics-fall-2011/resources/lecture-24-modal-analysis-orthogonality-mass-stiffness-damping-matrix/',
  'https://ocw.mit.edu/courses/18-303-linear-partial-differential-equations-fall-2006/resources/waveeqni/',
  'https://web.math.ucsb.edu/~grigoryan/124A/lecs/lec7.pdf',
  'https://ntrs.nasa.gov/citations/19700009156',
  'https://www.math.ucdavis.edu/~saito/courses/ACHA.READ.F03/kac-drum.pdf',
  'https://arxiv.org/abs/math/9207215',
  'https://www.physics.ucla.edu/research/imaging/Publications/pdf/josa_1998_15.pdf',
  'https://doi.org/10.1126/science.1126287',
  'https://pubmed.ncbi.nlm.nih.gov/18420928/',
  'https://www.archive.bridgesmathart.org/2005/bridges2005-47.html',
  'https://pmc.ncbi.nlm.nih.gov/articles/PMC7032667/',
  'https://mcdermottlab.mit.edu/papers/McDermott_etal_2016_consonance.pdf',
  'https://www.damtp.cam.ac.uk/user/gold/pdfs/teaching/old_literature/Faraday1831.pdf',
  'https://pubmed.ncbi.nlm.nih.gov/5831012/',
])

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
}

function assertRecord(value, label) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${label} must be an object`)
  return value
}

function assertArray(value, label, minimum = 0, maximum = 256) {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum) throw new TypeError(`${label} has invalid cardinality`)
  return value
}

function safeAssetUrl(value) {
  if (typeof value !== 'string' || !value.startsWith(ASSET_PREFIX)) throw new TypeError('asset URL is outside the reviewed same-origin family')
  const parsed = new URL(value)
  if (parsed.origin !== 'https://thekingdom.dev' || parsed.username !== '' || parsed.password !== '' || parsed.search !== '' || parsed.hash !== '') throw new TypeError('asset URL is not an exact public locator')
  if (!/^\/labs\/shape-resonance\/(?:assets\/[a-z0-9-]+\.svg|audio\/[a-z0-9-]+\.wav)$/u.test(parsed.pathname)) throw new TypeError('asset URL path is not in the reviewed media family')
  if (!ASSET_ALLOWLIST.has(parsed.href)) throw new TypeError('asset URL is outside the exact reviewed media allowlist')
  return parsed.href
}

function safeHttpsUrl(value) {
  const parsed = new URL(value)
  if (parsed.protocol !== 'https:' || parsed.username !== '' || parsed.password !== '') throw new TypeError('source URL must be an unauthenticated HTTPS locator')
  if (!SOURCE_ALLOWLIST.has(parsed.href)) throw new TypeError('source URL is outside the exact reviewed source allowlist')
  return parsed.href
}

function list(items) {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
}

function renderTable(table) {
  const columns = assertArray(table.columns, 'table columns', 1, 16)
  const rows = assertArray(table.rows, 'table rows', 1, 128)
  for (const row of rows) if (!Array.isArray(row) || row.length !== columns.length) throw new TypeError('table row width mismatch')
  return `<div class="table-wrap"><table><caption>${escapeHtml(table.caption)}</caption><thead><tr>${columns.map((column) => `<th scope="col">${escapeHtml(column)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell, index) => index === 0 ? `<th scope="row">${escapeHtml(cell)}</th>` : `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`
}

function renderDerivations(items) {
  return `<div class="table-wrap"><table><caption>Typed derivations, assumptions, results, and caveats</caption><thead><tr><th scope="col">Bridge</th><th scope="col">Expression</th><th scope="col">Status</th><th scope="col">Assumptions</th><th scope="col">Result / unit</th><th scope="col">Caveat</th></tr></thead><tbody>${items.map((item) => `<tr><th scope="row">${escapeHtml(item.id)}</th><td><code>${escapeHtml(item.expression)}</code></td><td>${escapeHtml(item.status)}</td><td>${list(item.assumptions)}</td><td>${escapeHtml(item.result)} / ${escapeHtml(item.unitId)}</td><td>${escapeHtml(item.caveat)}</td></tr>`).join('')}</tbody></table></div>`
}

function renderQuantity(item) {
  const value = item.exactValue ?? (item.approximateValue === null ? 'not supplied' : String(item.approximateValue))
  const approximate = item.approximateValue === null ? '' : `<span class="approx">approx. ${escapeHtml(item.approximateValue)}</span>`
  return `<tr><th scope="row">${escapeHtml(item.label)}</th><td><code>${escapeHtml(value)}</code> ${approximate}</td><td>${escapeHtml(item.unitId)}</td><td>${escapeHtml(item.status)}</td><td>${escapeHtml(item.note)}</td></tr>`
}

function renderExhibit(item, assetByPath) {
  const visual = assetByPath.get(item.visualAssetPath)
  if (visual === undefined || visual.role !== 'static-diagram') throw new TypeError(`${item.id}: missing reviewed diagram`)
  const imageUrl = safeAssetUrl(visual.publicUrl)
  const audio = item.audioAssetPaths.map((path) => {
    const asset = assetByPath.get(path)
    if (asset === undefined || asset.role !== 'declared-sonification') throw new TypeError(`${item.id}: missing reviewed WAV`)
    const url = safeAssetUrl(asset.publicUrl)
    return `<li><a href="${escapeHtml(url)}" type="audio/wav" download data-declared-sonification="true">${escapeHtml(asset.title)} — declared sonification WAV, mono PCM16, 8000 Hz, 0.5 seconds; access on reader activation</a><p>${escapeHtml(asset.accessibilityText)}</p><dl><dt>File byte receipt</dt><dd><code>${escapeHtml(asset.byteReceipt)}</code></dd><dt>PCM byte receipt</dt><dd><code>${escapeHtml(asset.audio.pcmByteReceipt)}</code></dd><dt>Time scale</dt><dd>${escapeHtml(asset.audio.timeScale)}</dd><dt>Amplitude scale</dt><dd>${escapeHtml(asset.audio.amplitudeScale)}</dd><dt>Stored PCM min / max</dt><dd>${escapeHtml(asset.audio.storedMinimumCode)} / ${escapeHtml(asset.audio.storedMaximumCode)}</dd><dt>Pre-clamp peak / clipped samples</dt><dd>${escapeHtml(asset.audio.preClampPeakAbsoluteCode)} / ${escapeHtml(asset.audio.clippedSampleCount)}</dd><dt>Normalization / stored PCM in range</dt><dd>${escapeHtml(asset.audio.normalization)} / ${escapeHtml(asset.audio.storedPcmWithinRange)}</dd></dl><p><strong>Carrier/sampling declaration:</strong> ${escapeHtml(asset.audio.frequencyScale)}</p><p><strong>Spectrum caveat:</strong> ${escapeHtml(asset.audio.spectralCaveat)}</p><p><strong>Complete non-audio equivalent:</strong> ${escapeHtml(asset.audio.nonAudioEquivalent)}</p></li>`
  }).join('')
  const resonance = item.resonanceAssessment === null ? '' : `<section class="resonance"><h4>Driven-model resonance assessment</h4><dl><dt>Observable</dt><dd>${escapeHtml(item.resonanceAssessment.responseObservable)}</dd><dt>Peak</dt><dd>${escapeHtml(item.resonanceAssessment.analyticPeakDriveRatio)}; synthetic peak detected: ${escapeHtml(item.resonanceAssessment.syntheticResponsePeakDetected)}</dd><dt>Phase criterion</dt><dd>${escapeHtml(item.resonanceAssessment.phaseCriterion)}</dd><dt>Model criterion</dt><dd>${escapeHtml(item.resonanceAssessment.modelResonanceCriterionSatisfied)}</dd><dt>Physical experiment / measured resonance</dt><dd>${escapeHtml(item.resonanceAssessment.physicalExperimentPerformed)} / ${escapeHtml(item.resonanceAssessment.measuredResonance)}</dd></dl><p>${escapeHtml(item.resonanceAssessment.explanation)}</p></section>`
  return `<article id="${escapeHtml(item.id)}"><p class="ordinal">Exhibit ${escapeHtml(item.ordinal)} · ${escapeHtml(item.domain)}</p><h3>${escapeHtml(item.title)}</h3><p class="question">${escapeHtml(item.question)}</p><figure><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(visual.accessibilityText)}" loading="lazy" decoding="async"><figcaption>${escapeHtml(item.accessibilitySummary)}</figcaption></figure><details><summary>Declared model</summary><dl><dt>System</dt><dd>${escapeHtml(item.model.systemKind)}</dd><dt>Geometry</dt><dd>${escapeHtml(item.model.geometry)}</dd><dt>Topology</dt><dd>${escapeHtml(item.model.topology)}</dd><dt>Metric</dt><dd>${escapeHtml(item.model.metric)}</dd><dt>Boundary</dt><dd>${list(item.model.boundaryConditions)}</dd><dt>Material</dt><dd>${escapeHtml(item.model.material)}</dd><dt>Operator</dt><dd>${escapeHtml(item.model.operator)}</dd><dt>Excitation</dt><dd>${escapeHtml(item.model.excitation)}</dd><dt>Damping</dt><dd>${escapeHtml(item.model.damping)}</dd><dt>Acoustic coupling</dt><dd>${escapeHtml(item.model.acousticCoupling)}</dd><dt>Sonification</dt><dd>${escapeHtml(item.model.sonification)}</dd></dl></details><h4>Quantities</h4><div class="table-wrap"><table><caption>Declared exact values, approximations, units, and statuses</caption><thead><tr><th scope="col">Quantity</th><th scope="col">Value</th><th scope="col">Unit</th><th scope="col">Status</th><th scope="col">Meaning</th></tr></thead><tbody>${item.quantities.map(renderQuantity).join('')}</tbody></table></div><h4>Derivations and refused bridges</h4>${renderDerivations(item.derivations)}${item.tables.map(renderTable).join('')}<h4>Claim</h4><p>${escapeHtml(item.claims.claim)}</p><h4>Does not claim</h4>${list(item.claims.nonClaims)}<h4>Falsifier / counterexample</h4><p>${escapeHtml(item.claims.falsifier)}</p><p><strong>Scope:</strong> ${escapeHtml(item.claims.scope)}</p>${resonance}${audio === '' ? '' : `<section><h4>Optional declared sonifications</h4><p>No audio is requested on page load. Each ordinary same-origin WAV link makes a request only if a reader activates it; the browser may download, open, or play the file. The page has no embedded audio control. WAV access is never an acoustic prediction.</p><ul>${audio}</ul></section>`}</article>`
}

export function renderShapeResonanceLab(snapshot) {
  assertRecord(snapshot, 'snapshot')
  if (snapshot.protocol !== PROTOCOL) throw new TypeError('unsupported shape-resonance snapshot protocol')
  if (snapshot.state !== 'DRAFT' || snapshot.phase !== '0-static-synthetic') throw new TypeError('unexpected publication state')
  const exhibits = assertArray(snapshot.exhibits, 'exhibits', 8, 8)
  const assets = assertArray(snapshot.assets, 'assets', 11, 11)
  const assetByPath = new Map(assets.map((asset) => [asset.path, assertRecord(asset, 'asset')]))
  if (assetByPath.size !== assets.length) throw new TypeError('duplicate asset path')
  if (snapshot.publication.pageLoadAudioRequest !== 'NONE' || snapshot.publication.audioPlayback !== 'USER_INITIATED_PLAYBACK_ONLY' || snapshot.publication.embeddedAudioControls !== 'NONE' || snapshot.publication.audioAccess !== 'READER_ACTIVATED_SAME_ORIGIN_LINK_ONLY' || snapshot.publication.autoplay !== 'NONE') throw new TypeError('audio request boundary mismatch')
  const refused = snapshot.conversionEdges.filter((edge) => edge.status === 'no-canonical-conversion')
  if (refused.length < 1) throw new TypeError('conversion refusals missing')
  const body = exhibits.map((item) => renderExhibit(assertRecord(item, 'exhibit'), assetByPath)).join('')
  const energyRows = snapshot.mechanicalEnergyBalance.entries.map((entry) => `<tr><th scope="row">${escapeHtml(entry.id)}</th><td><code>${escapeHtml(entry.expression)}</code></td><td>${escapeHtml(entry.unitId)}</td><td>${escapeHtml(entry.scope)}</td></tr>`).join('')
  const sourceRows = snapshot.sources.map((source) => `<li><a href="${escapeHtml(safeHttpsUrl(source.url))}" rel="noreferrer">${escapeHtml(source.title)}</a> — ${escapeHtml(source.publisher)}; ${escapeHtml(source.sourceClass)}. ${escapeHtml(source.scope)}</li>`).join('')
  return `<section class="shape-resonance-lab" data-protocol="${PROTOCOL}"><header><p class="eyebrow">Shape &amp; Resonance Lab 01 · ${escapeHtml(snapshot.phase)} · ${escapeHtml(snapshot.state)}</p><h1>${escapeHtml(snapshot.title)}</h1><p class="subtitle">${escapeHtml(snapshot.subtitle)}</p><p>${escapeHtml(snapshot.boundary.oneSentence)}</p><p><strong>As of:</strong> ${escapeHtml(snapshot.asOf)} · <strong>Next review due:</strong> ${escapeHtml(snapshot.nextReviewDue)}</p><p>${escapeHtml(snapshot.authorship)}</p></header><aside aria-labelledby="separations"><h2 id="separations">Category separations</h2>${list(snapshot.boundary.categorySeparations)}</aside><section aria-labelledby="energy"><h2 id="energy">${escapeHtml(snapshot.mechanicalEnergyBalance.title)}</h2><p>${escapeHtml(snapshot.mechanicalEnergyBalance.invariant)}</p><div class="table-wrap"><table><caption>Model-scoped energy and power terms</caption><thead><tr><th scope="col">Term</th><th scope="col">Expression</th><th scope="col">Unit</th><th scope="col">Scope</th></tr></thead><tbody>${energyRows}</tbody></table></div></section><section aria-labelledby="refusals"><h2 id="refusals">No canonical conversion</h2>${refused.map((edge) => `<article><h3>${escapeHtml(edge.from)} → ${escapeHtml(edge.to)}</h3><p>${escapeHtml(edge.operation)}</p></article>`).join('')}</section><section aria-labelledby="exhibits"><h2 id="exhibits">Eight finite exhibits</h2>${body}</section><section aria-labelledby="sources"><h2 id="sources">Source orientation links</h2><p>${escapeHtml(snapshot.sourceFirewall.note)}</p><p>No source is embedded or requested on page load. Each external HTTPS link carries <code>rel=noreferrer</code>; activating one may navigate to and request that named origin under its own policies.</p><ul>${sourceRows}</ul></section><footer><h2>Limits</h2>${list(snapshot.limitations)}<p>Immutable artifacts remain historical. The active page and mutable alias follow the review and retirement rule in the snapshot.</p></footer></section>`
}

export const PUBLIC_RENDERER_CONTRACT = Object.freeze({
  protocol: PROTOCOL,
  functionName: 'renderShapeResonanceLab',
  output: 'escaped HTML fragment with no script, no form, no autoplay, and no page-load audio request',
  mediaActivation: 'ordinary same-origin WAV anchors only; no embedded audio control; request occurs only when a reader activates a link and the browser may download, open, or play it',
})
