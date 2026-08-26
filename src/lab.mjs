import { join } from 'node:path'

import { buildAssets, parsePcm16Wav } from './assets.mjs'
import {
  ROOT,
  SCHEMA_PATH,
  canonicalJson,
  normalizeJson,
  readBoundedBytes,
  readJson,
  sha256Bytes,
  sha256Json,
} from './io.mjs'

const CONFIG_PATH = join(ROOT, 'data', 'config.json')
const SOURCES_PATH = join(ROOT, 'data', 'sources.json')
const AUTHORIZATION_PATH = join(ROOT, 'PUBLICATION-AUTHORIZATION.md')

// Rotated only after the complete candidate is independently reviewed.
const EXPECTED_INPUTS = Object.freeze({
  configByte: 'sha256:a14b220ef3101af8e32cfd1b71d8196fd525a589f79307f568a3b7c749ae50cc',
  configCanonical: 'sha256:1d13027fad679a19e2ff150cb8c5412f43c8a2244789ab40ff0cdfd1dcbc9afe',
  sourcesByte: 'sha256:10bcaf4d16954692b193a799efea55aabd5e4a7c6f02ba696f6e78b26c9dae6d',
  sourcesCanonical: 'sha256:307d09b62bbae02abcbd25e9584e9a549eb553d7594fdc1afa4270df52de047e',
})
const EXPECTED_SCHEMA = Object.freeze({
  byte: 'sha256:2cafa97ce9ed61e622ac6a4514a27627bda56f4f3131f0373c9a624b19c5e24f',
  canonical: 'sha256:0ace0b29bd30405be01268a138174299ffd67c346c89540c5dc1286e4b2e157c',
})
const EXPECTED_OUTPUTS = Object.freeze({
  bytes: Object.freeze({
    'assets/boundary-variants.svg': 'sha256:cea637613481cfd12acd90e7d566b5047e7cbf92ce3d4c5db940acaf2bc1d3fa',
    'assets/cospectral-graphs.svg': 'sha256:5c3c2fd4c247af368ba5ec79e7d680680cc2d5441c1453cec5ed188b57cc64df',
    'assets/graph-to-hz.svg': 'sha256:c3403024102d8e79863234f7b639665e5f5b193d8562f9b9a2557f9971c80185',
    'assets/membrane-plate.svg': 'sha256:a756ed02202ce19b4d8a01a52f000c0fd889f010e67aa9c4719dd7e327c6a4bc',
    'assets/musical-geometry.svg': 'sha256:19333d74272c52c89e649a1dfc5a35e2ee6c1c3e3826c577b1744d6455d71dea',
    'assets/phase-magnitude.svg': 'sha256:692a5be2735a6ea3d5c0cff594e7c8d05207f228d8ffac2e43126c59a6d14a8a',
    'assets/rhythm-cycle.svg': 'sha256:f6c11ea61f7fa2b9cb21b43aa6d49c4ce1173765dd1726bbb8365447eab5b343',
    'assets/square-degeneracy.svg': 'sha256:d2bdfcbf2ba7e5a5121787912244b5efe7df2f384960a524138b743f6a759009',
    'audio/graph-modes.wav': 'sha256:7ce6187a0396e7108102e4dffa8a8ae26b090f8bd3d67de37312c96dd7c5f556',
    'audio/phase-forward.wav': 'sha256:157389bd7321f81c47a870d4895ddf4ae8c824f87baee8af03bfa769428f57b5',
    'audio/phase-reversed.wav': 'sha256:db2a43b42f37c6feb3876bb085e2868f68d976e904fc4110a82ef0e4199638f4',
    'output-manifest.json': 'sha256:5ba0003cdf59397fd52ba04d3be8f258d9504e5daff22fbc860482fc5e517780',
    'shape-resonance-lab.json': 'sha256:55de5a53270b7b2f58f088ad169fa2f76f5f7136132448be73498018cce044a3',
  }),
  snapshotCanonical: 'sha256:5887f9444ebbbb707b4b6b7d6177339572ee770ee8e51e263f983267844a3b75',
  manifestCanonical: 'sha256:f5a0badf8d5cbaab93ad3e0409bdba9e95b20441c3a571aff654654e75856054',
})

function rounded(value, digits = 9) {
  return Number(value.toFixed(digits))
}

function quantity(id, label, exactValue, approximateValue, unitId, status, note) {
  return { id, label, exactValue, approximateValue, unitId, status, note }
}

function derivation(id, expression, status, assumptions, result, unitId, caveat) {
  return { id, expression, status, assumptions, result, unitId, caveat }
}

function model(systemKind, geometry, topology, metric, boundaryConditions, material, operator, excitation, damping, acousticCoupling, sonification) {
  return { systemKind, geometry, topology, metric, boundaryConditions, material, operator, excitation, damping, acousticCoupling, sonification }
}

function claims(claim, nonClaims, falsifier, scope) {
  return { claim, nonClaims, falsifier, scope }
}

function exhibit(id, ordinal, title, question, domain, fixtureModel, quantities, derivations, tables, claimSet, visualAssetPath, audioAssetPaths, sourceIds, accessibilitySummary, resonanceAssessment = null) {
  return { id, ordinal, title, question, domain, model: fixtureModel, quantities, derivations, tables, claims: claimSet, visualAssetPath, audioAssetPaths, sourceIds, accessibilitySummary, resonanceAssessment }
}

function p4Exhibit() {
  const k = 6400
  const m = 0.01
  const scale = Math.sqrt(k / m)
  const eigenvalues = [0, 2 - Math.SQRT2, 2, 2 + Math.SQRT2]
  const exactEigenvalues = ['0', '2-sqrt(2)', '2', '2+sqrt(2)']
  const exactOmega = ['0', '800*sqrt(2-sqrt(2))', '800*sqrt(2)', '800*sqrt(2+sqrt(2))']
  const rows = eigenvalues.map((lambda, index) => {
    const omega = scale * Math.sqrt(lambda)
    const frequency = omega / (2 * Math.PI)
    return [String(index), exactEigenvalues[index], exactOmega[index], omega.toFixed(9), frequency.toFixed(9), index === 0 ? 'rigid translation; excluded from audio' : 'elastic mode; included in declared sonification']
  })

  const lambda = 2
  const naturalOmega = Math.sqrt(k * lambda / m)
  const naturalHz = naturalOmega / (2 * Math.PI)
  const zeta = 0.05
  const modalDamping = 2 * zeta * m * naturalOmega
  const forceAmplitude = 0.1
  const peakRatio = Math.sqrt(1 - 2 * zeta ** 2)
  const peakOmega = naturalOmega * peakRatio
  const displacementAmplitude = (ratio) => forceAmplitude / Math.sqrt((k * lambda - m * (naturalOmega * ratio) ** 2) ** 2 + (modalDamping * naturalOmega * ratio) ** 2)
  const phaseDegrees = (ratio) => Math.atan2(modalDamping * naturalOmega * ratio, k * lambda - m * (naturalOmega * ratio) ** 2) * 180 / Math.PI
  const sweepRatios = [0.5, 0.8, 0.95, peakRatio, 1, 1.05, 1.2, 1.5]
  const sweepRows = sweepRatios.map((ratio) => [
    ratio === peakRatio ? 'sqrt(1-2*zeta^2)' : ratio.toFixed(6),
    (naturalHz * ratio).toFixed(9),
    displacementAmplitude(ratio).toExponential(9),
    phaseDegrees(ratio).toFixed(6),
    ratio === peakRatio ? 'analytic displacement peak' : ratio === 1 ? 'natural-frequency phase crossing' : 'sweep point',
  ])

  return exhibit(
    'graph-to-hz-driven-resonance', 1, 'A graph needs a physical bridge—and resonance needs a drive',
    'When does a dimensionless graph mode acquire hertz, and when may a model call its response resonant?',
    'spectral mechanics and forced linear response',
    model(
      'four-degree-of-freedom equal-mass equal-spring chain',
      'Four indexed displacement coordinates q0..q3; no ambient spatial embedding is required.',
      'Path graph P4 with edges (0,1), (1,2), (2,3).',
      'Graph Laplacian is dimensionless; displacement coordinates use metres after the physical-model declaration.',
      ['Free rigid translation is retained as mode 0.', 'No external endpoint anchoring is present.'],
      'M=mI with m=0.01 kg; K=kL with k=6400 N/m.',
      'K phi = omega^2 M phi; driven mode phi=[1,-1,-1,1]/2 has Laplacian eigenvalue 2.',
      'Synthetic force f(t)=F0*phi*cos(Omega*t), F0=0.1 N; this has net spatial force zero and instantaneous modal force Q(t)=phi^T f(t)=Q0*cos(Omega*t), with nonzero amplitude Q0=F0.',
      'Driven mode uses damping ratio zeta=0.05 and modal c=2*zeta*m*omega_n. The audio mix uses a separate integer fade envelope, not this physical damping.',
      'NONE. Acoustic radiation, medium impedance, receiver position, and sound pressure are not modelled; they would be required for a physical audio prediction.',
      'Three non-rigid modal frequencies control integer triangle oscillators in graph-modes.wav. This authored mapping is not radiated sound.',
    ),
    [
      quantity('spring-stiffness', 'Equal spring stiffness k', '6400', 6400, 'newton-per-metre', 'physical-model', 'Introduces force-per-displacement units.'),
      quantity('point-mass', 'Equal point mass m', '0.01', 0.01, 'kilogram', 'physical-model', 'Introduces inertia.'),
      quantity('driven-natural-angular-frequency', 'Driven mode natural angular frequency', '800*sqrt(2)', rounded(naturalOmega), 'radian-per-second', 'physical-model', 'For the normalized lambda=2 eigenvector.'),
      quantity('driven-natural-frequency', 'Driven mode natural frequency', '400*sqrt(2)/pi', rounded(naturalHz), 'hertz', 'numerical-approximation', 'Cycles per second obtained by exact division by 2π before numerical display.'),
      quantity('force-amplitude', 'Aligned modal force amplitude F0=Q0', '0.1', 0.1, 'newton', 'physical-model', 'The vector f0=F0*phi has zero component sum while generalized-force amplitude Q0=phi^T f0=F0 is nonzero.'),
      quantity('modal-damping', 'Driven modal damping coefficient', '2*0.05*0.01*800*sqrt(2)', rounded(modalDamping), 'newton-second-per-metre', 'physical-model', 'Viscous modal damping c=2*zeta*m*omega_n.'),
      quantity('peak-drive-ratio', 'Displacement-response peak ratio Omega_peak/omega_n', 'sqrt(1-2*zeta^2)=sqrt(0.995)', rounded(peakRatio), 'dimensionless', 'exact-mathematical', 'Valid for zeta<1/sqrt(2).'),
      quantity('peak-displacement', 'Steady-state modal displacement amplitude at analytic peak', null, rounded(displacementAmplitude(peakRatio), 12), 'metre', 'numerical-approximation', 'Synthetic model response, not a measurement.'),
    ],
    [
      derivation('laplacian-to-physical-operator', 'K=kL and M=mI', 'physical-model', ['equal masses', 'equal springs', 'small linear displacement'], 'omega_i=sqrt((k/m)*lambda_i)', 'radian-per-second', 'Without k and m, lambda has no hertz interpretation.'),
      derivation('angular-to-cyclic-frequency', 'f_i=omega_i/(2*pi)', 'exact-mathematical', ['second is the time unit'], 'modal cycles per second', 'hertz', 'A numerical decimal uses pi approximation only for display.'),
      derivation('driven-steady-state-response', 'A(Omega)=Q0/sqrt((k*lambda-m*Omega^2)^2+(c*Omega)^2)', 'physical-model', ['linear time-invariant mode', 'harmonic forcing Q(t)=Q0*cos(Omega*t)', 'steady state'], 'displacement amplitude sweep', 'metre', 'The sweep is calculated; no experiment or measurement occurred.'),
      derivation('driven-phase', 'delta(Omega)=atan2(c*Omega,k*lambda-m*Omega^2)', 'physical-model', ['same driven scalar mode'], 'phase lag crosses 90 degrees at Omega=omega_n', 'dimensionless', 'Phase angle is displayed in degrees, not a unit of energy or frequency.'),
      derivation('orthogonal-drive-falsifier', 'Q=phi^T f0=0 for any drive vector orthogonal to phi', 'exact-mathematical', ['linear modal projection', 'zero initial response in this mode'], 'no forced response in the lambda=2 mode even when Omega=omega_n', 'newton', 'Frequency proximity without nonzero coupling is insufficient; this is why the aligned drive is called zero-net-spatial-force, not net-zero modal drive.'),
      derivation('mechanical-energy-balance', 'd((1/2)m*eta_dot^2+(1/2)k*lambda*eta^2)/dt = eta_dot*Q0*cos(Omega*t)-c*eta_dot^2', 'physical-model', ['scalar lambda=2 modal equation', 'instantaneous Q(t)=Q0*cos(Omega*t)', 'c nonnegative'], 'instantaneous forcing power minus damping power', 'watt', 'This is a model balance, not an observed ledger.'),
      derivation('structure-to-sound-pressure', 'structural motion -> acoustic pressure', 'no-canonical-conversion', ['no radiation or propagation model supplied'], 'REFUSED', 'not-applicable', 'The release supplies declared sonification only.'),
    ],
    [
      { caption: 'Natural modes of the declared P4 mass-spring model', columns: ['mode', 'Laplacian eigenvalue', 'exact omega rad/s', 'approx omega rad/s', 'approx frequency Hz', 'classification'], rows },
      { caption: 'Forced damped lambda=2 steady-state displacement response', columns: ['drive ratio Omega/omega_n', 'drive frequency Hz', 'displacement amplitude m', 'phase lag degrees', 'marker'], rows: sweepRows },
    ],
    claims(
      'A graph spectrum acquires angular-frequency units only through a declared M,K physical model. Under the separately declared force, coupling, damping, response observable, and sweep, the lambda=2 scalar model has an analytic displacement-response peak and a 90-degree phase crossing.',
      ['The graph alone does not contain hertz.', 'A natural frequency match alone is not called resonance.', 'The synthetic peak is not a physical observation.', 'The WAV is not an acoustic-pressure prediction.', 'PCM amplitude is not mechanical energy.'],
      'Changing m, k, boundary anchoring, damping, drive shape, or response observable changes the modal frequencies or response peak. An orthogonal drive has Q=0 and produces no forced response in this mode even at omega_n; with c=0, exact-frequency forcing has no bounded steady-state amplitude.',
      'Finite, linear, equal-mass, equal-spring synthetic model only.',
    ),
    'assets/graph-to-hz.svg', ['audio/graph-modes.wav'], ['mit-modal-analysis'],
    'The diagram and table expose the P4 topology, exact dimensionless spectrum, M and K bridge, zero rigid mode, modal frequencies, driven sweep, phase crossing, and sonification refusal boundary.',
    {
      forcingDeclared: true,
      couplingDeclared: true,
      dampingDeclared: true,
      responseObservable: 'steady-state modal displacement amplitude and phase lag',
      sweepDeclared: true,
      analyticPeakDriveRatio: 'sqrt(1-2*zeta^2)',
      syntheticResponsePeakDetected: true,
      phaseCriterion: 'phase lag equals 90 degrees at Omega=omega_n and the analytic amplitude peak lies below omega_n for zeta=0.05',
      phaseCriterionSatisfied: true,
      modelResonanceCriterionSatisfied: true,
      physicalExperimentPerformed: false,
      measuredResonance: false,
      explanation: 'The label applies only to the deterministic damped-forced model calculation; no physical system was driven or measured.',
    },
  )
}

function boundaryExhibit() {
  const fixedFixed = [1, 2, 3, 4].map((n) => [String(n), `${n}*c/(2L)`, String(50 * n)])
  const fixedFree = [1, 2, 3, 4].map((n) => [String(n), `(2*${n}-1)*c/(4L)`, String(25 * (2 * n - 1))])
  return exhibit(
    'same-string-different-boundary', 2, 'Same ideal string, different boundary family',
    'Can equal length and wave speed still produce different allowed frequencies?', 'one-dimensional wave equation',
    model('ideal taut string', 'Interval x in [0,1 m].', 'One connected one-dimensional interval.', 'Euclidean length L=1 m.', ['Variant A: u(0,t)=u(L,t)=0.', 'Variant B: u(0,t)=0 and spatial derivative ux(L,t)=0.'], 'Wave speed c=100 m/s is held equal; density and tension are represented only through c.', 'u_tt=c^2 u_xx', 'Natural-mode eigenproblem only; no forcing.', 'No damping.', 'NONE; transverse string motion is not converted to pressure.', 'NONE.'),
    [quantity('string-length', 'Length L', '1', 1, 'metre', 'physical-model', 'Held equal.'), quantity('wave-speed', 'Wave speed c', '100', 100, 'metre-per-second', 'physical-model', 'Held equal.')],
    [derivation('fixed-fixed-family', 'f_n=n*c/(2L)', 'exact-mathematical', ['Dirichlet at both ends'], 'integer harmonic family', 'hertz', 'Ideal linear string.'), derivation('fixed-free-family', 'f_n=(2n-1)*c/(4L)', 'exact-mathematical', ['Dirichlet at x=0', 'Neumann at x=L'], 'odd-quarter-wave family', 'hertz', 'Ideal linear string.')],
    [{ caption: 'First four allowed frequencies', columns: ['boundary', 'n', 'exact expression', 'frequency Hz'], rows: [...fixedFixed.map((row) => ['fixed-fixed', ...row]), ...fixedFree.map((row) => ['fixed-free', ...row])] }],
    claims('Boundary conditions select different admissible mode families even when interval length and wave speed are equal.', ['This is not a measured string.', 'Equal outline and material summary do not erase boundary conditions.', 'No acoustic output is predicted.'], 'Replacing the fixed-free derivative condition with a second fixed displacement condition returns the fixed-fixed family.', 'Ideal one-dimensional small-displacement wave equation.'),
    'assets/boundary-variants.svg', [], ['mit-wave-equation', 'ucsb-energy-method'], 'Two text-labelled frequency families and four exact table rows per boundary provide the nonvisual equivalent.',
  )
}

function membranePlateExhibit() {
  const modes = [[1, 1], [1, 2], [2, 2]]
  const rows = []
  for (const [m, n] of modes) {
    const sum = m * m + n * n
    const membrane = 50 * Math.sqrt(sum)
    const plate = 5 * Math.PI * sum
    rows.push([`(${m},${n})`, String(sum), `50*sqrt(${sum})`, membrane.toFixed(9), `5*pi*${sum}`, plate.toFixed(9)])
  }
  return exhibit(
    'same-square-different-operator', 3, 'A membrane and a plate are not one square-shaped instrument',
    'Does a shared square outline determine the frequency law?', 'partial differential operators on a square',
    model('ideal membrane compared with simply supported thin plate', 'Both domains are a one-metre square.', 'Both domains are simply connected.', 'Euclidean metric with side a=1 m.', ['Membrane displacement zero on boundary.', 'Plate fixture uses the simply supported sinusoidal eigenfamily.'], 'Membrane wave speed c=100 m/s; plate beta=sqrt(D/(rho*h))=10 m^2/s. These illustrative parameters are not claimed to describe one material.', 'Membrane: -Delta. Plate: Delta^2 in the declared thin-plate model.', 'Natural-mode comparison only.', 'No damping.', 'NONE; no radiation or pressure model.', 'NONE.'),
    [quantity('square-side', 'Square side a', '1', 1, 'metre', 'physical-model', 'Held equal as outline only.'), quantity('membrane-wave-speed', 'Membrane c', '100', 100, 'metre-per-second', 'physical-model', 'Membrane parameter.'), quantity('plate-beta', 'Plate sqrt(D/(rho*h))', '10', 10, 'square-metre-per-second', 'physical-model', 'Thin-plate parameter.')],
    [derivation('membrane-frequency', 'f_mn=(c/(2a))*sqrt(m^2+n^2)', 'physical-model', ['ideal membrane', 'fixed displacement boundary'], 'square-root spectral scaling', 'hertz', 'Not a plate law.'), derivation('plate-frequency', 'f_mn=(pi*beta/(2a^2))*(m^2+n^2)', 'physical-model', ['Kirchhoff-Love thin plate', 'simply supported fixture'], 'linear-in-eigenvalue scaling', 'hertz', 'Not a membrane law.')],
    [{ caption: 'Selected square mode labels under two operators', columns: ['mode', 'm^2+n^2', 'membrane exact Hz', 'membrane approx Hz', 'plate exact Hz', 'plate approx Hz'], rows }],
    claims('The same outline and even the same sinusoidal labels can sit under different operators and frequency scalings.', ['The chosen parameters do not assert identical material.', 'A square silhouette does not identify an object as a membrane or plate.', 'No sound-pressure field is produced.'], 'Changing the operator from -Delta to Delta^2 changes sqrt(m^2+n^2) scaling to (m^2+n^2) scaling under the declared models.', 'Comparison of two ideal linear PDE fixtures.'),
    'assets/membrane-plate.svg', [], ['mit-wave-equation', 'nasa-vibration-plates'], 'The table states both exact laws and selected numerical values; the diagram labels the operators and shared outline.',
  )
}

function degeneracyExhibit() {
  return exhibit(
    'square-symmetry-degeneracy', 4, 'Square symmetry fixes an eigenspace, not one privileged basis',
    'What does a repeated eigenvalue leave undetermined?', 'symmetry and eigenspace geometry',
    model('ideal fixed-boundary square membrane', 'Square [0,a] by [0,a], a=1 m.', 'Simply connected domain.', 'Euclidean square metric.', ['Dirichlet displacement boundary.'], 'Uniform ideal membrane represented by constant c; frequency value is not needed here.', '-Delta with phi_mn=sin(m*pi*x/a) sin(n*pi*y/a)', 'Natural eigenproblem only.', 'No damping.', 'NONE.', 'NONE.'),
    [quantity('degenerate-spatial-eigenvalue', 'Shared spatial eigenvalue lambda_12=lambda_21', '5*pi^2/a^2', rounded(5 * Math.PI ** 2), 'inverse-square-metre', 'numerical-approximation', 'Multiplicity two on the perfect square.'), quantity('eigenspace-dimension', 'Eigenspace dimension', '2', 2, 'dimensionless', 'exact-mathematical', 'Spanned by phi_12 and phi_21.')],
    [derivation('basis-rotation', 'psi_1=cos(theta)*phi_12+sin(theta)*phi_21; psi_2=-sin(theta)*phi_12+cos(theta)*phi_21', 'exact-mathematical', ['orthonormal starting basis', 'same repeated eigenvalue'], 'another orthonormal eigenbasis for every theta', 'dimensionless', 'A perturbation or measurement convention may select a basis, but the unperturbed operator does not.')],
    [{ caption: 'One repeated square-membrane eigenspace', columns: ['member', 'formula', 'eigenvalue', 'canonical?'], rows: [['phi_12', 'sin(pi*x/a) sin(2*pi*y/a)', '5*pi^2/a^2', 'no; basis member'], ['phi_21', 'sin(2*pi*x/a) sin(pi*y/a)', '5*pi^2/a^2', 'no; basis member'], ['rotated pair', 'orthogonal theta rotation', 'same', 'no; equally valid basis']] }],
    claims('A repeated eigenvalue identifies a multidimensional invariant subspace; it does not canonically name individual basis vectors inside that subspace.', ['The perfect square is an ideal symmetry.', 'A rendered nodal pattern is not the only possible observed combination.', 'Degeneracy does not imply mystical balance or aesthetic value.'], 'Any nontrivial orthogonal rotation of phi_12 and phi_21 gives a different basis with the same eigenvalue, directly refuting basis uniqueness.', 'Exact square symmetry under the declared membrane operator.'),
    'assets/square-degeneracy.svg', [], ['mit-wave-equation'], 'Three labelled panels show two conventional basis members and one rotated basis; equations and noncanonical status are tabulated.',
  )
}

function matrixMultiply(left, right) {
  const n = left.length
  return Array.from({ length: n }, (_, row) => Array.from({ length: n }, (_, column) => {
    let sum = 0n
    for (let inner = 0; inner < n; inner += 1) sum += left[row][inner] * right[inner][column]
    return sum
  }))
}

export function laplacianCharacteristicCoefficients(vertexCount, edges) {
  const adjacency = Array.from({ length: vertexCount }, () => Array(vertexCount).fill(0n))
  for (const [left, right] of edges) {
    if (!Number.isSafeInteger(left) || !Number.isSafeInteger(right) || left < 0 || right < 0 || left >= vertexCount || right >= vertexCount || left === right) throw new TypeError('invalid simple-graph edge')
    if (adjacency[left][right] !== 0n) throw new TypeError('duplicate simple-graph edge')
    adjacency[left][right] = 1n
    adjacency[right][left] = 1n
  }
  const laplacian = adjacency.map((row, index) => row.map((value, column) => index === column ? row.reduce((sum, item) => sum + item, 0n) : -value))
  let power = laplacian.map((row) => [...row])
  const traces = []
  for (let exponent = 1; exponent <= vertexCount; exponent += 1) {
    if (exponent > 1) power = matrixMultiply(power, laplacian)
    traces.push(power.reduce((sum, row, index) => sum + row[index], 0n))
  }
  const coefficients = [1n]
  for (let order = 1; order <= vertexCount; order += 1) {
    let sum = 0n
    for (let index = 1; index <= order; index += 1) sum += coefficients[order - index] * traces[index - 1]
    if (sum % BigInt(order) !== 0n) throw new Error('characteristic coefficient lost integrality')
    coefficients.push(-sum / BigInt(order))
  }
  return coefficients.map(Number)
}

function graphDegrees(vertexCount, edges) {
  const degrees = Array(vertexCount).fill(0)
  for (const [left, right] of edges) { degrees[left] += 1; degrees[right] += 1 }
  return degrees.sort((a, b) => a - b)
}

function graphConnected(vertexCount, edges) {
  const neighbours = Array.from({ length: vertexCount }, () => [])
  for (const [left, right] of edges) { neighbours[left].push(right); neighbours[right].push(left) }
  const seen = new Set([0])
  const queue = [0]
  while (queue.length > 0) for (const next of neighbours[queue.shift()]) if (!seen.has(next)) { seen.add(next); queue.push(next) }
  return seen.size === vertexCount
}

function cospectralExhibit() {
  const graphA = [[0, 2], [0, 3], [0, 4], [0, 5], [1, 4], [1, 5], [2, 3]]
  const graphB = [[0, 2], [0, 4], [0, 5], [1, 2], [1, 4], [1, 5], [2, 3]]
  const coefficientsA = laplacianCharacteristicCoefficients(6, graphA)
  const coefficientsB = laplacianCharacteristicCoefficients(6, graphB)
  const degreesA = graphDegrees(6, graphA)
  const degreesB = graphDegrees(6, graphB)
  if (canonicalJson(coefficientsA) !== canonicalJson(coefficientsB) || canonicalJson(coefficientsA) !== canonicalJson([1, -14, 73, -176, 192, -72, 0])) throw new Error('cospectral fixture polynomial mismatch')
  if (canonicalJson(degreesA) === canonicalJson(degreesB) || !graphConnected(6, graphA) || !graphConnected(6, graphB)) throw new Error('cospectral fixture non-isomorphism witness mismatch')
  return exhibit(
    'finite-laplacian-cospectral-counterexample', 5, 'Different connected graphs can share one Laplacian spectrum',
    'Does an exact spectrum uniquely identify every finite connected graph?', 'finite inverse spectral counterexample',
    model('pair of finite connected simple graphs', 'Six labelled vertices in each drawing; drawing coordinates carry no metric meaning.', 'Graph A and Graph B use explicitly listed edge sets.', 'Combinatorial adjacency only; no edge lengths.', ['Combinatorial Laplacian L=D-A.', 'No continuum boundary.'], 'No mass, stiffness, or acoustic material is assigned.', 'Combinatorial Laplacian and det(tI-L).', 'No excitation.', 'No damping.', 'NONE.', 'NONE.'),
    [quantity('shared-polynomial', 'Shared characteristic polynomial', 't(t-2)(t-3)^2(t^2-6t+4)', null, 'dimensionless', 'exact-mathematical', 'Coefficient vector [1,-14,73,-176,192,-72,0].'), quantity('shared-spectrum', 'Shared sorted Laplacian spectrum', '[0,3-sqrt(5),2,3,3,3+sqrt(5)]', null, 'dimensionless', 'exact-mathematical', 'Eigenvalue 3 has multiplicity two.'), quantity('degree-witness-a', 'Graph A sorted degrees', '[2,2,2,2,2,4]', null, 'dimensionless', 'exact-mathematical', 'Degree multiset is an isomorphism invariant.'), quantity('degree-witness-b', 'Graph B sorted degrees', '[1,2,2,3,3,3]', null, 'dimensionless', 'exact-mathematical', 'Different from Graph A.')],
    [derivation('exact-characteristic-polynomial', 'Faddeev-LeVerrier over BigInt traces of L^k', 'exact-mathematical', ['finite simple graph', 'integer combinatorial Laplacian'], JSON.stringify(coefficientsA), 'dimensionless', 'The producer recomputes both graphs independently.'), derivation('non-isomorphism-witness', 'degreeMultiset(A) != degreeMultiset(B)', 'exact-mathematical', ['graph isomorphisms preserve degrees'], 'graphs are non-isomorphic', 'dimensionless', 'This witness does not depend on drawing layout.')],
    [{ caption: 'Exact finite counterexample data', columns: ['graph', 'edges', 'sorted degrees', 'connected', 'det(tI-L) coefficients'], rows: [['A', JSON.stringify(graphA), JSON.stringify(degreesA), 'true', JSON.stringify(coefficientsA)], ['B', JSON.stringify(graphB), JSON.stringify(degreesB), 'true', JSON.stringify(coefficientsB)]] }],
    claims('The pair falsifies the universal proposition that a connected finite simple graph is uniquely determined by its combinatorial-Laplacian spectrum.', ['It does not claim these graphs are planar drums.', 'It does not assign hertz or sound.', 'It does not prove every inverse spectral problem is non-unique.'], 'Equal exact characteristic polynomials establish equal spectra, while unequal degree multisets prove non-isomorphism.', 'Finite combinatorial Laplacian only; Kac and Gordon-Webb-Wolpert are separate continuum context links.'),
    'assets/cospectral-graphs.svg', [], ['kac-shape-drum', 'gww-isospectral-drums'], 'Both edge lists, degree witnesses, coefficient vectors, factorization, and spectrum are provided as text and machine data.',
  )
}

function phaseExhibit() {
  const bursts = [[200, 400, 80, 10000, 0], [900, 550, 50, 7500, 7], [1700, 300, 40, 12000, 13], [2800, 600, 32, 9000, 3]]
  return exhibit(
    'same-magnitude-different-phase', 6, 'Equal Fourier magnitude does not recover sample order',
    'Can two different real finite waveforms have exactly equal DFT magnitudes?', 'finite discrete Fourier phase counterexample',
    model('two finite mono PCM16 sequences', 'A 4000-index discrete time cycle.', 'Cyclic group Z_4000 for the DFT theorem.', 'Uniform sample interval 1/8000 second.', ['Cyclic reversal fixes n=0 and maps n to N-n for 1<=n<N.'], 'Synthetic integer sample codes only; no medium or transducer.', 'N-point discrete Fourier transform.', 'Four deterministic integer-triangle tone bursts create x; y is its exact cyclic reversal.', 'The 80-frame edge envelope is authored digital amplitude shaping, not mechanical damping.', 'NONE; PCM codes are not pressure.', 'Both files are declared sonifications of a finite exact sequence relation.'),
    [quantity('sample-rate', 'Sample rate', '8000', 8000, 'hertz', 'declared-sonification', 'Digital sampling convention.'), quantity('frame-count', 'Frames per file', '4000', 4000, 'sample', 'exact-mathematical', 'Duration 0.5 second.'), quantity('reversal-relation', 'Real cyclic reversal', 'y[0]=x[0]; y[n]=x[N-n]', null, 'dimensionless', 'exact-mathematical', 'Ensures Y[k]=conj(X[k]).')],
    [derivation('reversal-dft', 'Y[k]=sum_n x[-n] exp(-i2*pi*k*n/N)=conj(X[k]) for real x', 'exact-mathematical', ['finite real sequence', 'cyclic indexing'], '|Y[k]|=|X[k]| for every k', 'dimensionless', 'The theorem concerns the finite PCM sequence, not an analogue signal outside the file.'), derivation('pcm-to-pressure', 'PCM16 code -> pascal', 'no-canonical-conversion', ['no calibration, transducer, gain, or acoustic model'], 'REFUSED', 'not-applicable', 'Playback hardware may produce sound, but the artifact predicts no pressure field.')],
    [{ caption: 'Exact forward-sequence burst schedule; reverse file is cyclic sample reversal', columns: ['start sample', 'length samples', 'triangle period samples', 'target peak PCM code', 'phase offset samples', 'carrier Hz'], rows: bursts.map(([start, length, period, peak, offset]) => [String(start), String(length), String(period), String(peak), String(offset), String(8000 / period)]) }],
    claims('For a real sequence, cyclic time reversal conjugates every DFT coefficient, preserving every magnitude while changing phases and, for this nonsymmetric fixture, sample order.', ['Magnitude equality does not imply equal waveform.', 'Different waveform does not guarantee a universal perceptual difference.', 'The files are not recordings or physical-acoustic predictions.'], 'The producer verifies the two PCM blocks are unequal and satisfy y[n]=x[-n mod N] sample by sample; the displayed algebra then forces magnitude equality.', 'Finite N=4000 real PCM sequence and its cyclic DFT.'),
    'assets/phase-magnitude.svg', ['audio/phase-forward.wav', 'audio/phase-reversed.wav'], ['miao-fourier-phase'], 'The full event schedule, reversal equation, WAV format metadata, PCM receipts, and waveform-order distinction remain available without playback.',
  )
}

function musicalGeometryExhibit() {
  return exhibit(
    'twelve-tet-voice-leading-geometry', 7, 'Chord geometry starts by declaring equivalences and a metric',
    'What does a one-semitone path mean, and what does it not mean?', 'bounded mathematical music theory',
    model('12-tone equal-temperament pitch-class and registered voice-leading fixture', 'Pitch classes form Z_12; registered pitches are integer semitone coordinates.', 'Octave equivalence maps p to p mod 12; chord order is quotiented by permutation only for pitch-class sets.', 'Voice-leading distance is the minimum L1 sum of absolute registered semitone moves under declared bijections and octave representatives.', ['Source chord C major uses registered [0,4,7].', 'Target E minor may use registered [-1,4,7], whose pitch classes are [11,4,7].'], 'No instrument, tuning drift, timbre, listener, or culture is represented beyond the named Western 12-TET convention.', 'Finite quotient and assignment search.', 'No physical excitation.', 'No damping.', 'NONE.', 'NONE; the geometry is shown, not sounded.'),
    [quantity('octave-size', 'Octave size in this convention', '12', 12, 'semitone-12tet', 'exact-mathematical', 'Defines p~p+12.'), quantity('voice-leading-distance', 'Declared minimum L1 path', '|0-(-1)|+|4-4|+|7-7|=1', 1, 'semitone-12tet', 'exact-mathematical', 'C major [0,4,7] to E minor [-1,4,7].')],
    [derivation('pitch-to-pitch-class', 'pc(p)=p mod 12', 'exact-mathematical', ['12-TET convention'], 'cyclic pitch-class coordinate', 'cycle-index', 'Other tuning systems require another space.'), derivation('voice-leading-distance', 'min over declared bijections and octave representatives of sum_i |p_i-q_sigma(i)|', 'exact-mathematical', ['equal cardinality', 'L1 metric', 'registered target representatives permitted'], 'distance 1 for the fixture', 'semitone-12tet', 'Another equivalence relation or metric can change the result.'), derivation('distance-to-preference', 'short voice-leading distance -> preferred or consonant', 'no-canonical-conversion', ['no listener, context, style, timbre, or task supplied'], 'REFUSED', 'not-applicable', 'Mathematical proximity is not an aesthetic verdict.')],
    [{ caption: 'One declared minimal voice leading', columns: ['source voice', 'target representative', 'signed move st', 'absolute move st'], rows: [['C4 / 0', 'B3 / -1', '-1', '1'], ['E4 / 4', 'E4 / 4', '0', '0'], ['G4 / 7', 'G4 / 7', '0', '0'], ['total', 'under declared bijection', 'vector [-1,0,0]', '1']] }],
    claims('Chord and voice-leading geometry is well-defined only after equivalence relations, register choices, and a metric are declared.', ['The L1 distance is not consonance, quality, emotion, or preference.', '12-TET is not a universal tuning system.', 'A short path does not make a progression culturally neutral.'], 'Changing the metric, tuning lattice, chord equivalence, cardinality rule, or register window can change the nearest path.', 'One explicit Western 12-TET equal-cardinality L1 convention.'),
    'assets/musical-geometry.svg', [], ['tymoczko-chord-geometry', 'callender-generalized-voice-leading', 'consonance-models-review', 'mcdermott-cultural-variation', 'plomp-levelt-critical-bandwidth'], 'Pitch classes, registered representatives, every voice move, total distance, and the refusal to infer preference are tabulated.',
  )
}

function rhythmExhibit() {
  return exhibit(
    'cyclic-rhythm-spacing', 8, 'Equal onset count does not imply equal spacing—or musical rank',
    'How can five onsets be compared on a sixteen-step cycle?', 'finite cyclic rhythm geometry',
    model('two onset subsets of Z_16', 'Sixteen equally spaced positions on a displayed circle.', 'Cyclic residue classes modulo 16.', 'Clockwise cyclic gap length in integer steps.', ['Rotation begins at onset 0 for display.', 'Wraparound gap is included.'], 'No performer, tempo, accent, duration, timbre, movement, or musical culture is encoded.', 'Cyclic difference and population variance of five gap lengths.', 'No excitation.', 'No damping.', 'NONE.', 'NONE.'),
    [quantity('onset-count', 'Onsets in each pattern', '5', 5, 'dimensionless', 'exact-mathematical', 'Cardinality held equal.'), quantity('euclidean-gap-variance', 'Population variance of gaps [3,3,3,3,4]', '4/25', 0.16, 'dimensionless', 'exact-mathematical', 'Mean gap 16/5.'), quantity('cluster-gap-variance', 'Population variance of gaps [1,1,1,1,12]', '484/25', 19.36, 'dimensionless', 'exact-mathematical', 'Mean gap 16/5.')],
    [derivation('onsets-to-gaps', 'sorted cyclic differences including wraparound', 'exact-mathematical', ['Z_16 cycle', 'start at onset 0'], 'E gaps [3,3,3,3,4]; cluster gaps [1,1,1,1,12]', 'cycle-index', 'Rotation changes the sequence start but not the gap multiset.'), derivation('evenness-to-aesthetic', 'lower gap variance -> musically better or universal', 'no-canonical-conversion', ['no listening, culture, metre, accent, or task model'], 'REFUSED', 'not-applicable', 'Even spacing is a combinatorial property only.')],
    [{ caption: 'Two five-onset subsets of Z_16', columns: ['pattern', 'onset set', 'cyclic gaps', 'gap variance', 'interpretation'], rows: [['Euclidean fixture E(5,16)', '[0,3,6,9,12]', '[3,3,3,3,4]', '4/25', 'more even under declared gap variance'], ['clustered contrast', '[0,1,2,3,4]', '[1,1,1,1,12]', '484/25', 'less even under declared gap variance']] }],
    claims('A cyclic onset set can be compared by exact gap structure under a declared convention.', ['Lower gap variance is not a universal quality score.', 'This fixture does not identify one pattern as traditional to a specific culture.', 'Onset geometry omits accent, tempo, embodiment, and interpretation.'], 'Both patterns have five onsets yet have unequal exact gap variances, while neither arithmetic result supplies an aesthetic ordering.', 'Finite Z_16 onset-only comparison.'),
    'assets/rhythm-cycle.svg', [], ['toussaint-euclidean-rhythms', 'mcdermott-cultural-variation'], 'Both onset sets, all cyclic gaps, exact variances, and the no-aesthetic-conversion boundary are provided in text.',
  )
}

function conversionEdges() {
  return [
    { id: 'specification-to-operator', from: 'geometry-topology-metric-boundary-material', to: 'declared-operator', status: 'physical-model', operation: 'Choose a model class and its operator from all declared structural inputs.', preserves: ['declared units', 'boundary assumptions'], doesNotPreserve: ['unmodelled material detail', 'real-world validity'], unitsIn: ['metre', 'kilogram', 'newton-per-metre'], unitsOut: [] },
    { id: 'operator-to-eigenmodes', from: 'declared-operator', to: 'eigenmodes', status: 'exact-mathematical', operation: 'Solve the finite or analytic eigenproblem under its assumptions.', preserves: ['operator spectrum', 'multiplicity'], doesNotPreserve: ['canonical basis inside a degenerate eigenspace'], unitsIn: [], unitsOut: ['dimensionless', 'inverse-square-metre', 'radian-per-second'] },
    { id: 'bare-graph-to-hertz', from: 'dimensionless-graph-laplacian', to: 'hertz', status: 'no-canonical-conversion', operation: 'REFUSED unless mass and stiffness or another dimensional physical bridge are declared.', preserves: [], doesNotPreserve: ['units', 'physical interpretation'], unitsIn: ['dimensionless'], unitsOut: [] },
    { id: 'graph-physical-bridge', from: 'P4-plus-M-plus-K', to: 'modal-angular-frequency', status: 'physical-model', operation: 'omega_i=sqrt((k/m)*lambda_i) for the equal model.', preserves: ['mode ordering under positive common k/m'], doesNotPreserve: ['actual object validity'], unitsIn: ['dimensionless', 'kilogram', 'newton-per-metre'], unitsOut: ['radian-per-second'] },
    { id: 'angular-to-cyclic-frequency', from: 'radian-per-second', to: 'hertz', status: 'exact-mathematical', operation: 'f=omega/(2*pi).', preserves: ['time scale'], doesNotPreserve: ['phase', 'amplitude'], unitsIn: ['radian-per-second'], unitsOut: ['hertz'] },
    { id: 'motion-to-pressure', from: 'structural-motion', to: 'sound-pressure', status: 'no-canonical-conversion', operation: 'REFUSED: v0.1 supplies no acoustic coupling, propagation medium, receiver, or pressure calibration.', preserves: [], doesNotPreserve: ['radiation efficiency', 'spatial pressure', 'hearing conditions'], unitsIn: ['metre', 'metre-per-second'], unitsOut: [] },
    { id: 'mode-to-pcm', from: 'selected-modal-frequency', to: 'PCM16', status: 'declared-sonification', operation: 'Map selected frequencies to deterministic integer triangle phase accumulators.', preserves: ['declared target-frequency ordering'], doesNotPreserve: ['waveform shape', 'physical amplitude', 'mechanical energy', 'acoustic pressure'], unitsIn: ['hertz'], unitsOut: ['pcm16'] },
    { id: 'mechanical-energy-to-amplitude', from: 'joule', to: 'PCM16', status: 'no-canonical-conversion', operation: 'REFUSED: no calibration maps mechanical energy to sample code.', preserves: [], doesNotPreserve: ['SI energy', 'loudness', 'pressure'], unitsIn: ['joule'], unitsOut: [] },
    { id: 'frequency-structure-to-consonance', from: 'frequency-relations', to: 'perceived-consonance', status: 'no-canonical-conversion', operation: 'REFUSED in this artifact; any perceptual hypothesis would require declared stimuli, listeners, tasks, models, and contexts.', preserves: [], doesNotPreserve: ['culture', 'preference', 'meaning'], unitsIn: ['hertz'], unitsOut: [] },
    { id: 'pitch-to-voice-leading', from: '12TET-registered-chords', to: 'L1-voice-leading-distance', status: 'exact-mathematical', operation: 'Minimize registered semitone motion under the declared equivalences and metric.', preserves: ['declared pitch-class membership'], doesNotPreserve: ['timbre', 'style', 'preference'], unitsIn: ['semitone-12tet'], unitsOut: ['semitone-12tet'] },
    { id: 'voice-leading-to-preference', from: 'L1-voice-leading-distance', to: 'aesthetic-preference', status: 'no-canonical-conversion', operation: 'REFUSED without a contextual perceptual and cultural study.', preserves: [], doesNotPreserve: ['listener response', 'culture', 'aesthetic value'], unitsIn: ['semitone-12tet'], unitsOut: [] },
    { id: 'onsets-to-cyclic-gaps', from: 'Z16-onset-set', to: 'cyclic-gap-sequence', status: 'exact-mathematical', operation: 'Take sorted cyclic differences including wraparound.', preserves: ['onset count', 'cycle length'], doesNotPreserve: ['accent', 'tempo', 'performance'], unitsIn: ['cycle-index'], unitsOut: ['cycle-index'] },
    { id: 'evenness-to-musical-rank', from: 'cyclic-gap-variance', to: 'musical-quality', status: 'no-canonical-conversion', operation: 'REFUSED: arithmetic evenness is not a cultural or aesthetic ranking.', preserves: [], doesNotPreserve: ['meaning', 'embodiment', 'preference'], unitsIn: ['dimensionless'], unitsOut: [] },
  ]
}

function assetUrl(path) {
  return `https://thekingdom.dev/labs/shape-resonance/${path}`
}

function publicAssetRecords(assets) {
  const audioTitles = {
    'audio/graph-modes.wav': ['P4 non-rigid modal sonification', 'A half-second integer-triangle mix controlled by the three non-rigid frequencies of the declared P4 mass-spring model.'],
    'audio/phase-forward.wav': ['Forward finite phase fixture', 'A half-second schedule of four integer-triangle tone bursts.'],
    'audio/phase-reversed.wav': ['Cyclically reversed phase fixture', 'The exact cyclic sample reversal of phase-forward.wav; its DFT magnitudes are equal and phases conjugated.'],
  }
  return [...assets.entries()].sort(([left], [right]) => left.localeCompare(right, 'en')).map(([path, asset]) => {
    const isAudio = path.endsWith('.wav')
    const [title, accessibilityText] = isAudio ? audioTitles[path] : [asset.metadata.title, asset.metadata.accessibilityText]
    return {
      path,
      publicUrl: assetUrl(path),
      mediaType: isAudio ? 'audio/wav' : 'image/svg+xml',
      role: isAudio ? 'declared-sonification' : 'static-diagram',
      byteLength: asset.bytes.byteLength,
      byteReceipt: sha256Bytes(asset.bytes),
      semanticType: asset.metadata.semanticType,
      title,
      accessibilityText,
      externalReferences: isAudio ? false : asset.metadata.externalReferences,
      scripts: isAudio ? false : asset.metadata.scripts,
      audio: isAudio ? asset.metadata : null,
    }
  })
}

export function loadInputs({ enforceReceipts = false } = {}) {
  const configBytes = readBoundedBytes(CONFIG_PATH)
  const sourcesBytes = readBoundedBytes(SOURCES_PATH)
  const config = readJson(CONFIG_PATH)
  const sources = readJson(SOURCES_PATH)
  const observed = {
    configByte: sha256Bytes(configBytes),
    configCanonical: sha256Json(config),
    sourcesByte: sha256Bytes(sourcesBytes),
    sourcesCanonical: sha256Json(sources),
  }
  if (enforceReceipts && canonicalJson(observed) !== canonicalJson(EXPECTED_INPUTS)) throw new Error('exact input receipt mismatch')
  return { config, sources, configBytes, sourcesBytes, observed }
}

function inputReceipts(inputs) {
  return [
    { path: 'data/config.json', byteLength: inputs.configBytes.byteLength, byteReceipt: inputs.observed.configByte, canonicalReceipt: inputs.observed.configCanonical },
    { path: 'data/sources.json', byteLength: inputs.sourcesBytes.byteLength, byteReceipt: inputs.observed.sourcesByte, canonicalReceipt: inputs.observed.sourcesCanonical },
  ]
}

export function buildSnapshot({ enforceReceipts = false, schemaBytes = readBoundedBytes(SCHEMA_PATH) } = {}) {
  const inputs = loadInputs({ enforceReceipts })
  const assets = buildAssets()
  const authorizationBytes = readBoundedBytes(AUTHORIZATION_PATH, 128 * 1024)
  const schema = readJson(SCHEMA_PATH)
  if (enforceReceipts && (sha256Bytes(schemaBytes) !== EXPECTED_SCHEMA.byte || sha256Json(schema) !== EXPECTED_SCHEMA.canonical)) throw new Error('exact schema receipt mismatch')
  const exhibits = [p4Exhibit(), boundaryExhibit(), membranePlateExhibit(), degeneracyExhibit(), cospectralExhibit(), phaseExhibit(), musicalGeometryExhibit(), rhythmExhibit()]
  const sourceIds = new Set(inputs.sources.sources.map((source) => source.id))
  for (const item of exhibits) for (const sourceId of item.sourceIds) if (!sourceIds.has(sourceId)) throw new Error(`${item.id}: missing source ${sourceId}`)
  return normalizeJson({
    protocol: inputs.config.protocol,
    labId: inputs.config.labId,
    version: inputs.config.version,
    title: inputs.config.title,
    subtitle: inputs.config.subtitle,
    phase: inputs.config.phase,
    state: inputs.config.state,
    asOf: inputs.config.asOf,
    nextReviewDue: inputs.config.nextReviewDue,
    authorship: inputs.config.authorship,
    routes: inputs.config.routes,
    boundary: inputs.config.boundary,
    publication: {
      ...inputs.config.outputPolicy,
      authorization: {
        path: 'PUBLICATION-AUTHORIZATION.md',
        url: 'https://github.com/cambridgetcg/kingdom-shape-resonance-lab/blob/v0.1.0/PUBLICATION-AUTHORIZATION.md',
        byteLength: authorizationBytes.byteLength,
        byteReceipt: sha256Bytes(authorizationBytes),
        scope: 'Exact independently reviewed v0.1 release bytes at declared KINGDOM routes only.',
      },
      acousticCouplingModelPresent: false,
      soundPressurePrediction: false,
      immutableArtifactsRemainHistorical: true,
      overdueMutablePublicationRule: 'After nextReviewDue, the active page, mutable alias, and discovery may not be rebuilt or redeployed without a reviewed replacement or explicit full mutable retirement. Immutable bytes do not self-withhold by wall clock.',
    },
    receipts: {
      inputs: inputReceipts(inputs),
      schema: { path: 'schemas/v0.1/public-snapshot.schema.json', byteLength: schemaBytes.byteLength, byteReceipt: sha256Bytes(schemaBytes), canonicalReceipt: sha256Json(schema) },
      outputReceiptLocation: 'public/output-manifest.json',
      outputManifestUrl: 'https://thekingdom.dev/labs/shape-resonance/output-manifest.json',
      note: 'The output manifest receipts the snapshot, schema, guide, renderer, diagrams, and WAVs without self-reference.',
    },
    conversionStatuses: inputs.config.conversionStatuses,
    unitRegister: inputs.config.unitRegister,
    mechanicalEnergyBalance: {
      title: 'Mechanical energy balance',
      entries: inputs.config.energyRegister,
      invariant: 'Every energy or power term is tied to the declared mechanical model and an SI unit; PCM amplitude, loudness, feeling, value, and metaphor are excluded.',
    },
    conversionEdges: conversionEdges(),
    sourceFirewall: inputs.sources.firewall,
    sources: inputs.sources.sources,
    exhibits,
    assets: publicAssetRecords(assets),
    limitations: [
      'All fixtures are finite, deterministic, synthetic, idealized, and Phase 0.',
      'No acoustic coupling or sound-pressure model is present; every WAV is declared sonification.',
      'The producer and page load make no network request and embed no third-party resource. A reader may separately activate a same-origin WAV link or an external source-orientation link; the latter may navigate to and request the named origin under its policies.',
      'No mathematical quantity is interpreted as healing, consciousness, sacred geometry, cosmic order, universal harmony, cultural rank, or authority.',
      'Numerical displays do not replace exact expressions, assumptions, units, source code, or falsifiers.',
    ],
  })
}

export function buildProducts({ enforceReceipts = false } = {}) {
  const assets = buildAssets()
  const snapshot = buildSnapshot({ enforceReceipts })
  return { assets, snapshot }
}

export function inputReceiptIssues() {
  const observed = loadInputs({ enforceReceipts: false }).observed
  const issues = canonicalJson(observed) === canonicalJson(EXPECTED_INPUTS) ? [] : ['exact input receipt mismatch']
  const schemaBytes = readBoundedBytes(SCHEMA_PATH)
  const schema = readJson(SCHEMA_PATH)
  if (sha256Bytes(schemaBytes) !== EXPECTED_SCHEMA.byte || sha256Json(schema) !== EXPECTED_SCHEMA.canonical) issues.push('exact schema receipt mismatch')
  return issues
}

export function semanticIssues(snapshot, assets = buildAssets()) {
  const issues = []
  const issue = (condition, message) => { if (!condition) issues.push(message) }
  const expectedExhibits = [
    'graph-to-hz-driven-resonance', 'same-string-different-boundary', 'same-square-different-operator', 'square-symmetry-degeneracy',
    'finite-laplacian-cospectral-counterexample', 'same-magnitude-different-phase', 'twelve-tet-voice-leading-geometry', 'cyclic-rhythm-spacing',
  ]
  issue(canonicalJson(snapshot.exhibits.map((item) => item.id)) === canonicalJson(expectedExhibits), 'exhibit inventory or order mismatch')
  issue(snapshot.assets.length === 11 && assets.size === 11, 'asset cardinality mismatch')
  issue(snapshot.publication.acousticCouplingModelPresent === false && snapshot.publication.soundPressurePrediction === false, 'acoustic refusal mismatch')
  issue(snapshot.publication.pageLoadAudioRequest === 'NONE' && snapshot.publication.audioPlayback === 'USER_INITIATED_PLAYBACK_ONLY', 'audio activation boundary mismatch')
  issue(snapshot.mechanicalEnergyBalance.title === 'Mechanical energy balance', 'mechanical energy balance title mismatch')
  issue(!canonicalJson(snapshot).includes('Energy Ledger'), 'forbidden Energy Ledger naming present')
  const statuses = new Set(snapshot.conversionStatuses)
  const units = new Set(snapshot.unitRegister.map((unit) => unit.id))
  issue(units.has('not-applicable'), 'refused conversion unit missing')
  for (const edge of snapshot.conversionEdges) {
    issue(statuses.has(edge.status), `${edge.id}: undeclared conversion status`)
    for (const unit of [...edge.unitsIn, ...edge.unitsOut]) issue(units.has(unit), `${edge.id}: unregistered edge unit ${unit}`)
    if (edge.status === 'no-canonical-conversion') issue(edge.unitsOut.length === 0 && /REFUSED/u.test(edge.operation), `${edge.id}: refusal must produce no unit and say REFUSED`)
  }
  const assetByPath = new Map(snapshot.assets.map((asset) => [asset.path, asset]))
  issue(assetByPath.size === snapshot.assets.length, 'duplicate public asset path')
  for (const item of snapshot.exhibits) {
    issue(assetByPath.has(item.visualAssetPath), `${item.id}: visual asset missing`)
    for (const path of item.audioAssetPaths) issue(assetByPath.get(path)?.role === 'declared-sonification', `${item.id}: audio asset mismatch`)
    for (const quantity of item.quantities) {
      issue(units.has(quantity.unitId), `${item.id}/${quantity.id}: unregistered quantity unit`)
      issue(statuses.has(quantity.status), `${item.id}/${quantity.id}: unregistered quantity status`)
    }
    for (const step of item.derivations) {
      issue(units.has(step.unitId), `${item.id}/${step.id}: unregistered derivation unit`)
      issue(statuses.has(step.status), `${item.id}/${step.id}: unregistered derivation status`)
      if (step.status === 'no-canonical-conversion') issue(step.unitId === 'not-applicable' && step.result === 'REFUSED', `${item.id}/${step.id}: refused derivation must have no output unit`)
    }
    for (const table of item.tables) for (const row of table.rows) issue(row.length === table.columns.length, `${item.id}: table row width mismatch`)
    issue(/NONE|would be required|not converted|not modelled|no radiation/iu.test(item.model.acousticCoupling), `${item.id}: acoustic-coupling absence not explicit`)
  }
  const resonance = snapshot.exhibits.filter((item) => item.resonanceAssessment !== null)
  issue(resonance.length === 1, 'exactly one driven resonance assessment required')
  if (resonance.length === 1) {
    const assessment = resonance[0].resonanceAssessment
    issue(assessment.forcingDeclared && assessment.couplingDeclared && assessment.dampingDeclared && assessment.sweepDeclared, 'driven resonance declarations incomplete')
    issue(assessment.syntheticResponsePeakDetected && assessment.phaseCriterionSatisfied && assessment.modelResonanceCriterionSatisfied, 'driven resonance model criterion incomplete')
    issue(assessment.physicalExperimentPerformed === false && assessment.measuredResonance === false, 'synthetic resonance misrepresented as measured')
    issue(resonance[0].tables.length === 2 && resonance[0].tables[0].columns.includes('Laplacian eigenvalue') && resonance[0].tables[1].columns.includes('displacement amplitude m'), 'natural and forced tables not type-separated')
    issue(resonance[0].claims.falsifier.includes('Q=0') && resonance[0].claims.falsifier.includes('no bounded steady-state amplitude'), 'resonance coupling/damping falsifier missing')
  }
  for (const [path, generated] of assets) {
    const record = assetByPath.get(path)
    issue(record !== undefined, `${path}: asset record missing`)
    if (record === undefined) continue
    issue(record.byteLength === generated.bytes.byteLength && record.byteReceipt === sha256Bytes(generated.bytes), `${path}: byte receipt mismatch`)
    issue(record.publicUrl === assetUrl(path), `${path}: public URL mismatch`)
    if (path.endsWith('.svg')) {
      let source = ''
      try { source = new TextDecoder('utf-8', { fatal: true }).decode(generated.bytes) } catch { issues.push(`${path}: invalid UTF-8`) }
      issue(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/u.test(source), `${path}: SVG root mismatch`)
      issue(/<title id="title">/u.test(source) && /<desc id="desc">/u.test(source), `${path}: SVG title/desc missing`)
      issue(!/<(?:script|foreignObject|image|use|a)\b/iu.test(source), `${path}: active or linking SVG element forbidden`)
      issue(!/\bon[a-z]+\s*=/iu.test(source) && !/\bhref\s*=/iu.test(source) && !/data:/iu.test(source), `${path}: active SVG attribute or data URL forbidden`)
    } else {
      const wav = parsePcm16Wav(generated.bytes)
      issue(wav.sampleRate === record.audio.sampleRate && wav.frameCount === record.audio.frameCount && sha256Bytes(wav.pcmBytes) === record.audio.pcmByteReceipt, `${path}: RIFF/PCM metadata mismatch`)
      let minimum = 32767
      let maximum = -32768
      let absolute = 0
      for (const sample of wav.samples) {
        minimum = Math.min(minimum, sample)
        maximum = Math.max(maximum, sample)
        absolute = Math.max(absolute, Math.abs(sample))
      }
      issue(absolute === record.audio.peakAbsoluteCode && minimum === record.audio.storedMinimumCode && maximum === record.audio.storedMaximumCode && record.audio.storedPcmWithinRange === true, `${path}: stored PCM bounds mismatch`)
      issue(record.audio.clipping === (record.audio.clippedSampleCount > 0), `${path}: clipping audit mismatch`)
      issue(/not the complete|not complete spectra|not complete WAV spectrum/iu.test(record.audio.spectralCaveat), `${path}: complete-spectrum refusal missing`)
    }
  }
  const forward = parsePcm16Wav(assets.get('audio/phase-forward.wav').bytes).samples
  const reversed = parsePcm16Wav(assets.get('audio/phase-reversed.wav').bytes).samples
  let difference = false
  for (let index = 0; index < forward.length; index += 1) {
    if (forward[index] !== reversed[index]) difference = true
    const expected = index === 0 ? forward[0] : forward[forward.length - index]
    issue(reversed[index] === expected, `phase reversal mismatch at sample ${index}`)
  }
  issue(difference, 'phase fixture waveforms must differ')
  const urls = snapshot.sources.map((source) => source.url)
  issue(urls.length === 14 && new Set(urls).size === 14 && urls.every((url) => url.startsWith('https://')), 'source URL allowlist mismatch')
  issue(Object.values(snapshot.sourceFirewall).filter((value) => value === true).length === 0, 'source firewall positive inference present')
  return issues
}

export { EXPECTED_INPUTS, EXPECTED_OUTPUTS, EXPECTED_SCHEMA }
