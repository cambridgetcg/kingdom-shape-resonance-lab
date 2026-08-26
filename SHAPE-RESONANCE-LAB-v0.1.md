# Shape & Resonance Lab 01 v0.1

**What can a shape sing?**

**Phase 0 · Static · Synthetic · Draft**

## The boundary in one sentence

Shape defines model-dependent possibilities and excitation selects motion; acoustic coupling would be required for a physical sound-pressure prediction, while this release provides declared sonification only; people and cultures may make music.

The publication is a finite mathematical instrument. It contains no observation, recording, microphone, upload, participant, personal data, live input, runtime synthesis, autoplay, tracking, physical acoustic prediction, health or healing claim, consciousness claim, sacred-geometry claim, cultural ranking, or authority. Exact text has not been separately human-reviewed.

## The typed chain

```text
geometry + topology + metric + boundary + material
  -> declared operator
  -> eigenmodes and multiplicities
  -> excitation + damping
  -> structural motion + Mechanical energy balance
  -> [acoustic coupling would be required] OR [declared sonification]
  -> finite audio signal
  -> separately bounded musical / perceptual / cultural interpretation
```

An arrow is never automatic. The public snapshot types each conversion as exact mathematics, physical model, numerical approximation, declared sonification, perceptual hypothesis, cultural interpretation, or no canonical conversion.

## Exhibit 1 — A graph needs a physical bridge

For the path graph $P_4$, the combinatorial Laplacian eigenvalues are

\[
0,\quad 2-\sqrt2,\quad 2,\quad 2+\sqrt2.
\]

They are dimensionless. The lab separately declares equal point masses and springs,

\[
M=mI,\qquad K=kL,\qquad m=0.01\,\mathrm{kg},\quad k=6400\,\mathrm{N/m},
\]

so that

\[
K\phi_i=\omega_i^2M\phi_i,
\qquad
\omega_i=\sqrt{(k/m)\lambda_i},
\qquad
f_i=\frac{\omega_i}{2\pi}.
\]

The zero eigenvalue is a rigid translation and is not sonified as a tone.

### A genuine driven-model resonance criterion

Natural-frequency coincidence is not called resonance by itself. For the normalized $\lambda=2$ mode

\[
\phi=\tfrac12[1,-1,-1,1]^T,
\]

the lab declares the zero-net-spatial-force drive $f(t)=F_0\phi\cos\Omega t$. Its component sum is zero, while its modal generalized-force amplitude is nonzero:

\[
Q_0=\phi^Tf_0=F_0=0.1\,\mathrm N,
\qquad Q(t)=Q_0\cos\Omega t.
\]

With damping ratio $\zeta=0.05$, the scalar mode is

\[
m\ddot\eta+c\dot\eta+2k\eta=Q_0\cos\Omega t,
\qquad c=2\zeta m\omega_n.
\]

Its steady-state displacement amplitude and phase lag are

\[
A(\Omega)=\frac{|Q_0|}{\sqrt{(2k-m\Omega^2)^2+(c\Omega)^2}},
\qquad
\delta(\Omega)=\operatorname{atan2}(c\Omega,2k-m\Omega^2).
\]

The displacement peak occurs at

\[
\Omega_r=\omega_n\sqrt{1-2\zeta^2},
\]

while phase quadrature occurs at $\Omega=\omega_n$. They are close for weak damping but are not identical. The record marks a deterministic synthetic response peak and phase crossing; it locks `physicalExperimentPerformed` and `measuredResonance` to false.

The coupling falsifier is direct: for an orthogonal drive, $Q_0=\phi^Tf_0=0$, matching $\Omega=\omega_n$ does not excite that mode. With zero damping, exact-frequency forcing has no bounded steady-state amplitude.

### Mechanical energy balance

For this scalar mode,

\[
E=T+V=\tfrac12m\dot\eta^2+\tfrac12k\lambda\eta^2,
\qquad
\frac{dE}{dt}=\dot\eta Q_0\cos\Omega t-c\dot\eta^2.
\]

These are kinetic energy, elastic potential energy, total mechanical energy, forcing power, and damping power. PCM code, loudness, emotion, value, and metaphorical “energy” are not terms in this balance.

## Exhibit 2 — Same string, different boundary

For $L=1\,\mathrm m$ and $c=100\,\mathrm{m/s}$:

- fixed–fixed: $f_n=nc/(2L)=50n\,\mathrm{Hz}$;
- fixed–free: $f_n=(2n-1)c/(4L)=25(2n-1)\,\mathrm{Hz}$.

Holding length and wave speed equal does not hold the admissible mode family equal.

## Exhibit 3 — Same square, different operator

For a square membrane,

\[
\omega_{mn}=\frac{c\pi}{a}\sqrt{m^2+n^2}.
\]

For the declared simply supported thin plate,

\[
\omega_{mn}=\frac{\pi^2}{a^2}\sqrt{\frac{D}{\rho h}}(m^2+n^2).
\]

The outline and sinusoidal labels may match while the operator and spectral scaling do not.

## Exhibit 4 — Symmetry and degeneracy

On the exact square, $\phi_{12}$ and $\phi_{21}$ share $5\pi^2/a^2$. Any orthogonal rotation of this pair is another valid eigenbasis. The operator fixes the two-dimensional eigenspace, not one canonical pair of rendered patterns.

## Exhibit 5 — A finite isospectral counterexample

Two connected non-isomorphic six-vertex graphs are included with exact edge lists. Both combinatorial Laplacians have

\[
\det(tI-L)=t(t-2)(t-3)^2(t^2-6t+4),
\]

and spectrum

\[
[0,3-\sqrt5,2,3,3,3+\sqrt5].
\]

Their degree multisets differ: $[2,2,2,2,2,4]$ versus $[1,2,2,3,3,3]$, proving non-isomorphism. This falsifies unique reconstruction for finite combinatorial-Laplacian spectra. It does not identify either graph with a drum or a sound.

## Exhibit 6 — Same magnitude, different phase

For a real finite sequence $x[n]$, define its cyclic reversal $y[n]=x[-n\bmod N]$. Then

\[
Y[k]=\overline{X[k]},\qquad |Y[k]|=|X[k]|.
\]

The two PCM blocks are not identical and differ at one or more indices, yet they have exactly equal DFT magnitudes. Their WAVs use triangle carriers and finite envelopes: the listed rates are carrier fundamentals, not complete spectra. Odd harmonics, sidebands, and finite-window leakage remain present.

## Exhibit 7 — Musical geometry begins with conventions

The fixture chooses Western 12-tone equal temperament, octave equivalence modulo 12, chord permutation equivalence, registered octave representatives, and an $L_1$ voice-leading metric. Under those choices, C major $[0,4,7]$ to E minor $[-1,4,7]$ has motion vector $[-1,0,0]$ and distance one semitone.

That distance is not consonance, preference, emotion, quality, or a universal geometry of music.

## Exhibit 8 — Rhythm on a cycle

Both subsets of $\mathbb Z_{16}$ contain five onsets:

- $E(5,16)=[0,3,6,9,12]$, cyclic gaps $[3,3,3,3,4]$, variance $4/25$;
- clustered contrast $[0,1,2,3,4]$, gaps $[1,1,1,1,12]$, variance $484/25$.

Evenness is a declared combinatorial property, not a claim of cultural authenticity, musical superiority, or universality.

## Audio contract

The three WAVs are mono, 8000 Hz, signed 16-bit little-endian PCM, 4000 frames, and 0.5 seconds. They are generated with integer sample arithmetic and no clock, randomness, network, recording, sample library, or normalization. Each asset record supplies the exact byte and PCM receipts, peak, pre-clamp peak, clipped-sample count, format, source-fixture receipt, frequency/time/amplitude scaling, and spectral caveat.

No audio is requested on page load. A public page may expose an ordinary same-origin WAV link only; after a reader activates it, the browser may download, open, or play the file. There is no embedded audio control and no guaranteed page-managed playback. Every equation, table, schedule, claim, non-claim, and counterexample has a complete non-audio representation.

## Sources and rights

Fourteen external URLs are orientation only. No source body or body hash is retained, and no external resource is embedded or requested on page load. If a reader activates an orientation link, the browser may navigate to and request that named external origin under its own policies. A title, publisher, URL, or checked-on date does not establish exact-text review, currentness, endorsement, licence, reuse permission, or authority.

This repository is unlicensed by default. `PUBLICATION-AUTHORIZATION.md` grants a narrow, file-scoped permission to mirror exact independently reviewed v0.1 bytes at the declared KINGDOM routes. It is not a general reuse licence.

## Lifecycle

The snapshot is as of `2026-08-26`; its next review is due `2027-08-26`. Immutable bytes remain historical. After that date the active page, mutable alias, and discovery cannot be rebuilt or redeployed without a reviewed replacement or explicit full mutable retirement. The immutable route does not self-withhold based on reader time.
