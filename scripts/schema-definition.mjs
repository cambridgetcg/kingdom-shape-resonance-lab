const text = (minimum = 1, maximum = 4096, extra = {}) => ({ type: 'string', minLength: minimum, maxLength: maximum, ...extra })
const integer = (minimum = 0, maximum = Number.MAX_SAFE_INTEGER) => ({ type: 'integer', minimum, maximum })
const number = (minimum = -1e15, maximum = 1e15) => ({ type: 'number', minimum, maximum })
const bool = () => ({ type: 'boolean' })
const nullableText = (maximum = 4096) => ({ type: ['string', 'null'], minLength: 1, maxLength: maximum })
const nullableNumber = () => ({ type: ['number', 'null'], minimum: -1e15, maximum: 1e15 })
const array = (items, minimum = 0, maximum = 256, uniqueItems = false) => ({ type: 'array', minItems: minimum, maxItems: maximum, uniqueItems, items })
const object = (properties) => ({ type: 'object', additionalProperties: false, required: Object.keys(properties), properties })
const nullableObject = (properties) => ({ type: ['object', 'null'], additionalProperties: false, required: Object.keys(properties), properties })
const ref = (name) => ({ $ref: `#/$defs/${name}` })

const receipt = object({
  path: text(1, 256),
  byteLength: integer(1, 4 * 1024 * 1024),
  byteReceipt: text(71, 71, { pattern: '^sha256:[0-9a-f]{64}$' }),
  canonicalReceipt: text(71, 71, { pattern: '^sha256:[0-9a-f]{64}$' }),
})

const audioMetadata = object({
  semanticType: { const: 'DECLARED-SONIFICATION' },
  container: { const: 'RIFF/WAVE' },
  encoding: { const: 'PCM signed integer' },
  channels: { const: 1 },
  sampleRate: { const: 8000 },
  bitDepth: { const: 16 },
  frameCount: { const: 4000 },
  durationSeconds: { const: 0.5 },
  endianness: { const: 'little-endian' },
  pcmByteReceipt: text(71, 71, { pattern: '^sha256:[0-9a-f]{64}$' }),
  peakAbsoluteCode: integer(0, 32768),
  peakFractionOfFullScale: number(0, 1),
  storedMinimumCode: integer(-32768, 32767),
  storedMaximumCode: integer(-32768, 32767),
  preClampPeakAbsoluteCode: integer(0, 1_000_000),
  clippedSampleCount: integer(0, 4000),
  storedPcmWithinRange: bool(),
  normalization: { const: 'NONE' },
  clipping: bool(),
  generator: text(1, 256),
  sourceFixtureCanonicalReceipt: text(71, 71, { pattern: '^sha256:[0-9a-f]{64}$' }),
  frequencyScale: text(1, 2048),
  timeScale: text(1, 512),
  amplitudeScale: text(1, 1024),
  spectralCaveat: text(1, 1024),
  playbackPolicy: { const: 'USER_INITIATED_SAME_ORIGIN_GET_ONLY' },
  nonAudioEquivalent: text(1, 1024),
})

const resonanceAssessment = nullableObject({
  forcingDeclared: bool(),
  couplingDeclared: bool(),
  dampingDeclared: bool(),
  responseObservable: text(1, 256),
  sweepDeclared: bool(),
  analyticPeakDriveRatio: text(1, 256),
  syntheticResponsePeakDetected: bool(),
  phaseCriterion: text(1, 512),
  phaseCriterionSatisfied: bool(),
  modelResonanceCriterionSatisfied: bool(),
  physicalExperimentPerformed: bool(),
  measuredResonance: bool(),
  explanation: text(1, 1024),
})

export function schemaDefinition() {
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://thekingdom.dev/schemas/shape-resonance-lab/0.1.json',
    title: 'KINGDOM Shape & Resonance Lab 01 public snapshot v0.1',
    description: 'Closed deterministic static synthetic models, counterexamples, diagrams, and declared sonifications.',
    type: 'object',
    additionalProperties: false,
    required: [
      'protocol', 'labId', 'version', 'title', 'subtitle', 'phase', 'state', 'asOf', 'nextReviewDue', 'authorship',
      'routes', 'boundary', 'publication', 'receipts', 'conversionStatuses', 'unitRegister', 'mechanicalEnergyBalance',
      'conversionEdges', 'sourceFirewall', 'sources', 'exhibits', 'assets', 'limitations',
    ],
    properties: {
      protocol: { const: 'kingdom.shape-resonance-lab-public-snapshot/0.1' },
      labId: { const: 'shape-resonance-lab-01' },
      version: { const: '0.1.0' },
      title: { const: 'What can a shape sing?' },
      subtitle: text(1, 256),
      phase: { const: '0-static-synthetic' },
      state: { const: 'DRAFT' },
      asOf: text(10, 10, { format: 'date' }),
      nextReviewDue: text(10, 10, { format: 'date' }),
      authorship: text(1, 512),
      routes: object({
        human: text(1, 256, { format: 'uri' }),
        mutableAlias: text(1, 256, { format: 'uri' }),
        canonicalSnapshot: text(1, 256, { format: 'uri' }),
        schema: text(1, 256, { format: 'uri' }),
        guide: text(1, 256, { format: 'uri' }),
        intendedProducerTag: text(1, 256, { format: 'uri' }),
      }),
      boundary: object({
        oneSentence: text(1, 1024),
        physicalChain: array(text(1, 128), 8, 8, true),
        included: array(text(1, 512), 1, 32, true),
        excluded: array(text(1, 512), 1, 32, true),
        categorySeparations: array(text(1, 512), 1, 32, true),
      }),
      publication: object({
        producerNetwork: { const: 'NONE' },
        pageLoadExternalRequest: { const: 'NONE' },
        embeddedThirdPartyResource: { const: 'NONE' },
        readerActivatedSourceNavigation: { const: 'MAY_REQUEST_NAMED_EXTERNAL_ORIGIN' },
        pageLoadAudioRequest: { const: 'NONE' },
        userInitiatedSameOriginAudioGet: { const: 'PERMITTED_FOR_DECLARED_WAV_ONLY' },
        externalAudioRequest: { const: 'NONE' },
        audioPlayback: { const: 'USER_INITIATED_PLAYBACK_ONLY' },
        embeddedAudioControls: { const: 'NONE' },
        audioAccess: { const: 'READER_ACTIVATED_SAME_ORIGIN_LINK_ONLY' },
        autoplay: { const: 'NONE' },
        audioSemantics: { const: 'DECLARED-SONIFICATION' },
        personalData: { const: 'NONE' },
        authorityEffects: { const: 'NONE' },
        licence: { const: 'UNLICENSED' },
        authorization: object({
          path: { const: 'PUBLICATION-AUTHORIZATION.md' },
          url: { const: 'https://github.com/cambridgetcg/kingdom-shape-resonance-lab/blob/v0.1.0/PUBLICATION-AUTHORIZATION.md' },
          byteLength: integer(1, 131072),
          byteReceipt: text(71, 71, { pattern: '^sha256:[0-9a-f]{64}$' }),
          scope: text(1, 512),
        }),
        acousticCouplingModelPresent: { const: false },
        soundPressurePrediction: { const: false },
        immutableArtifactsRemainHistorical: { const: true },
        overdueMutablePublicationRule: text(1, 1024),
      }),
      receipts: object({
        inputs: array(receipt, 2, 2, true),
        schema: receipt,
        outputReceiptLocation: { const: 'public/output-manifest.json' },
        outputManifestUrl: { const: 'https://thekingdom.dev/labs/shape-resonance/output-manifest.json' },
        note: text(1, 512),
      }),
      conversionStatuses: array({ enum: ['exact-mathematical', 'physical-model', 'numerical-approximation', 'declared-sonification', 'perceptual-hypothesis', 'cultural-interpretation', 'no-canonical-conversion'] }, 7, 7, true),
      unitRegister: array(ref('unit'), 1, 32, true),
      mechanicalEnergyBalance: object({ title: { const: 'Mechanical energy balance' }, entries: array(ref('energyEntry'), 6, 6, true), invariant: text(1, 1024) }),
      conversionEdges: array(ref('conversionEdge'), 1, 32, true),
      sourceFirewall: ref('sourceFirewall'),
      sources: array(ref('source'), 14, 14, true),
      exhibits: array(ref('exhibit'), 8, 8, true),
      assets: array(ref('asset'), 11, 11, true),
      limitations: array(text(1, 1024), 5, 16, true),
    },
    $defs: {
      unit: object({ id: text(1, 64), symbol: text(1, 32), dimension: text(1, 128), meaning: text(1, 512) }),
      energyEntry: object({ id: text(1, 64), expression: text(1, 256), unitId: text(1, 64), scope: text(1, 512) }),
      conversionEdge: object({
        id: text(1, 96), from: text(1, 128), to: text(1, 128),
        status: { enum: ['exact-mathematical', 'physical-model', 'numerical-approximation', 'declared-sonification', 'perceptual-hypothesis', 'cultural-interpretation', 'no-canonical-conversion'] },
        operation: text(1, 1024), preserves: array(text(1, 256), 0, 32, true), doesNotPreserve: array(text(1, 256), 0, 32, true),
        unitsIn: array(text(1, 64), 0, 16, true), unitsOut: array(text(1, 64), 0, 16, true),
      }),
      sourceFirewall: object({
        mode: { const: 'URL_ONLY_ORIENTATION' }, bodyRetained: { const: false }, bodyReceiptPresent: { const: false }, exactTextReviewed: { const: false },
        licenceOrReuseInferred: { const: false }, currentnessInferred: { const: false }, endorsementInferred: { const: false }, authorityInferred: { const: false }, note: text(1, 1024),
      }),
      source: object({ id: text(1, 96), title: text(1, 512), publisher: text(1, 256), sourceClass: text(1, 96), url: text(1, 512, { format: 'uri' }), checkedOn: text(10, 10, { format: 'date' }), scope: text(1, 1024) }),
      model: object({
        systemKind: text(1, 512), geometry: text(1, 1024), topology: text(1, 1024), metric: text(1, 1024), boundaryConditions: array(text(1, 1024), 1, 16, true),
        material: text(1, 1024), operator: text(1, 1024), excitation: text(1, 1024), damping: text(1, 1024), acousticCoupling: text(1, 1024), sonification: text(1, 1024),
      }),
      quantity: object({
        id: text(1, 96), label: text(1, 256), exactValue: nullableText(1024), approximateValue: nullableNumber(), unitId: text(1, 64),
        status: { enum: ['exact-mathematical', 'physical-model', 'numerical-approximation', 'declared-sonification', 'perceptual-hypothesis', 'cultural-interpretation', 'no-canonical-conversion'] }, note: text(1, 1024),
      }),
      derivation: object({
        id: text(1, 96), expression: text(1, 2048),
        status: { enum: ['exact-mathematical', 'physical-model', 'numerical-approximation', 'declared-sonification', 'perceptual-hypothesis', 'cultural-interpretation', 'no-canonical-conversion'] },
        assumptions: array(text(1, 512), 1, 32, true), result: text(1, 1024), unitId: text(1, 64), caveat: text(1, 1024),
      }),
      table: object({ caption: text(1, 512), columns: array(text(1, 256), 1, 16, true), rows: array(array(text(0, 4096), 1, 16, false), 1, 128, false) }),
      claims: object({ claim: text(1, 2048), nonClaims: array(text(1, 1024), 1, 32, true), falsifier: text(1, 2048), scope: text(1, 1024) }),
      exhibit: object({
        id: text(1, 96), ordinal: integer(1, 8), title: text(1, 512), question: text(1, 1024), domain: text(1, 256), model: ref('model'),
        quantities: array(ref('quantity'), 1, 32, true), derivations: array(ref('derivation'), 1, 32, true), tables: array(ref('table'), 1, 4, true), claims: ref('claims'),
        visualAssetPath: text(1, 256), audioAssetPaths: array(text(1, 256), 0, 3, true), sourceIds: array(text(1, 96), 1, 14, true), accessibilitySummary: text(1, 2048), resonanceAssessment,
      }),
      asset: object({
        path: text(1, 256), publicUrl: text(1, 512, { format: 'uri' }), mediaType: { enum: ['image/svg+xml', 'audio/wav'] }, role: { enum: ['static-diagram', 'declared-sonification'] },
        byteLength: integer(1, 4 * 1024 * 1024), byteReceipt: text(71, 71, { pattern: '^sha256:[0-9a-f]{64}$' }), semanticType: { enum: ['STATIC-DIAGRAM', 'DECLARED-SONIFICATION'] },
        title: text(1, 512), accessibilityText: text(1, 2048), externalReferences: bool(), scripts: bool(), audio: { type: ['object', 'null'], additionalProperties: false, required: audioMetadata.required, properties: audioMetadata.properties },
      }),
    },
  }
}
