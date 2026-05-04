# J₁-J₂ Ising Model Interactive Visualization

An interactive browser-based simulation and visualization tool for the J₁-J₂ Ising model. Metropolis Monte Carlo runs in real time via WebAssembly — no server required.

## Physics

### Hamiltonian

$$
H = -J_1 \sum_{\langle ij \rangle} s_i s_j
    - J_2 \sum_{\langle\langle ij \rangle\rangle} s_i s_j
    - h \sum_i s_i
$$

**Lattice:** 3D simple-cubic with periodic boundary conditions. Sites are indexed by $i$ with integer coordinates $(i_x, i_y, i_z) \in \{0, \dots, L-1\}^3$.

| Symbol | Domain | Meaning |
| ------ | ------ | ------- |
| $s_i$ | $\{-1, +1\}$ | Ising spin on site $i$ |
| $\langle ij \rangle$ | NN pairs (each counted once) | Coordination $z_1 = 6$ |
| $\langle\langle ij \rangle\rangle$ | NNN pairs (face-diagonal, each counted once) | Coordination $z_2 = 12$ |
| $J_1$ | $\mathbb{R}$ | NN coupling. $J_1 > 0$: FM, $J_1 < 0$: AFM. The UI parameterization $T^* = k_B T/\lvert J_1\rvert$ excludes $J_1 = 0$. |
| $J_2$ | $\mathbb{R}$ | NNN coupling. Frustration arises when $J_2 < 0$ competes with NN ordering; see "Frustration boundaries" below for the classical critical lines. |
| $h$ | $\mathbb{R}$ | Uniform external field, in the same energy units as $J_1$ |

### Canonical ensemble

Configurations are sampled from the Boltzmann distribution

$$
P(\{s\}) = \frac{1}{Z} \exp(-\beta H), \qquad \beta = \frac{1}{k_B T}.
$$

Temperature enters here — not in $H$ itself.

### Simulation coordinates

The Metropolis acceptance ratio depends only on the combination $\beta H$,
so the core stores temperature-absorbed couplings:

$$
K_1 \equiv \beta J_1, \qquad
K_2 \equiv \beta J_2, \qquad
\tilde h \equiv \beta h.
$$

In these variables the Boltzmann weight reads

$$
-\beta H = K_1 \sum_{\langle ij \rangle} s_i s_j
         + K_2 \sum_{\langle\langle ij \rangle\rangle} s_i s_j
         + \tilde h \sum_i s_i,
$$

which is what the WASM kernel actually evaluates.

### Parameter space

The simulation core operates in **(K₁, K₂, h̃)** space — Metropolis acceptance probabilities are computed in these coordinates.

| Symbol | Definition        | Meaning                                                  |
| ------ | ----------------- | -------------------------------------------------------- |
| K₁     | βJ₁ (= J₁ / k_BT) | Nearest-neighbour coupling (positive: FM, negative: AFM) |
| K₂     | βJ₂               | Next-nearest-neighbour coupling                          |
| h̃      | βh                | Dimensionless external field                             |

The high-temperature limit collapses to the single point K₁ = K₂ = h̃ = 0 regardless of the sign of J₁ — this is what makes (K₁, K₂, h̃) the natural simulation coordinates.

### UI parameters

| UI variable         | Definition                              | Control          |
| ------------------- | --------------------------------------- | ---------------- |
| T\* = k_BT / \|J₁\| | Reduced temperature (always positive)   | Log-scale slider |
| J₁_sign ∈ {+1, −1}  | FM / AFM toggle                         | Radio buttons    |
| h ∈ [−2, +2]        | External field (units of \|J₁\|)        | Slider           |
| J₂                  | Next-nearest coupling (units of \|J₁\|) | Slider           |

Conversion from UI to simulation core:

$$
K_1 = \frac{\mathrm{sign}(J_1)}{T^{\ast}}, \qquad
K_2 = K_1 \cdot \frac{J_2}{J_1}, \qquad
\tilde{h} = \frac{h}{T^{\ast}}
$$

### Critical points

| Quantity | Value |
| -------- | ----- |
| $T^*_c$ at $J_2 = h = 0$ | 4.5115 (MC estimate)[^onsager] |
| $K_c$ | 0.2217 |
| Universality class | 3D Ising |

[^onsager]: For the 2D square lattice, Onsager (1944) gave the exact closed-form solution $T^*_c = 2/\ln(1+\sqrt{2}) \approx 2.2692$. No analogous closed-form solution is known in 3D; the value above is a high-precision Monte Carlo estimate.

### Frustration boundaries (T = 0, h = 0)

The classical FM↔stripe and Néel↔stripe transitions occur at different $|J_2/J_1|$ values depending on the sign of $J_1$:

| Regime | Boundary |
| ------ | -------- |
| FM $J_1$ ($> 0$) + AFM $J_2$ → stripe | $|J_2/J_1| = 1/4$ |
| AFM $J_1$ ($< 0$) + AFM $J_2$ → stripe | $|J_2/J_1| = 1/2$ |

The asymmetry between the two regimes is a feature of the 3D simple-cubic lattice.[^2d-frustration] Near these boundaries the ground-state manifold is highly degenerate; Metropolis dynamics equilibrates very slowly and the simulation may freeze into mismatched domains.

[^2d-frustration]: In the 2D square lattice both boundaries coincide at $|J_2/J_1| = 1/2$ by sublattice symmetry: the transformation $s_i \to (-1)^{i_x + i_y} s_i$ maps FM↔Néel while preserving the stripe state. The 3D analog $s_i \to (-1)^{i_x + i_y + i_z} s_i$ does not preserve the cubic stripe state, hence the splitting.

### Critical slowing down

Near $T^*_c$, the relaxation time scales as $\tau \sim L^z$ with $z \approx 2.04$ for Metropolis local updates. For $L = 128$ this gives $\tau \sim 10^4$ MCS. Within shorter runs, the displayed $\xi$ and $C_v$ reflect **non-equilibrium coarsening** rather than true equilibrium values — observable as drift in $\xi$ and in the regime-appropriate order parameter[^order-parameter]. This is a feature, not a bug: the simulation faithfully exhibits one of the central phenomena of continuous phase transitions.

[^order-parameter]: The order parameter depends on the ground state of the regime: uniform magnetization $M = N^{-1}\sum_i s_i$ in the FM regime ($J_1 > 0$, $|J_2| \lesssim J_1/4$); staggered magnetization $M_\text{Néel} = N^{-1}\sum_i (-1)^{i_x + i_y + i_z} s_i$ in the Néel AFM regime ($J_1 < 0$, $|J_2| \lesssim |J_1|/2$); and stripe-pattern order parameters at modulation wavevectors $(\pi, \pi, 0)$ etc. in the frustrated regions beyond those boundaries.

## Architecture

```
Browser
──────────────────
First load (and on J₁ sign flip):  random spin configuration  sᵢ ∈ {±1}
     ↓
WASM Metropolis (Rust)  ◄── spin state persists across (T*, J₂, h) changes;
     ↓                       only the couplings (K₁, K₂, h̃) are updated
React UI visualization
```

| Layer              | Technology                     |
| ------------------ | ------------------------------ |
| In-browser compute | Rust → WebAssembly (wasm-pack) |
| UI                 | React                          |
| Hosting            | Vercel (static export)         |

**WASM is essential, not optional.** Near the critical point, autocorrelation times diverge and the 10–100× speed advantage over pure JS is directly perceptible — without it, equilibrating $L = 128$ in real time is unusable.

### State inheritance across parameter changes

The spin array is initialized randomly only on first load. On any subsequent change of $T^*$, $J_2$, or $h$ — i.e. any continuous parameter within the same $J_1$ sign — the current spin configuration is reused as-is and Metropolis simply continues from it under the new couplings. **The $J_1$ sign toggle (FM ↔ AFM) is the one exception: it triggers a fresh random re-initialization**, because the FM and AFM regimes have disjoint ground-state manifolds and inheriting one as a warm-start for the other would systematically bias the early dynamics.

This split policy has three consequences:

1. **Visual continuity within each $J_1$ branch.** Domain structures evolve smoothly as the user moves through $(T^*, J_2, h)$ space, instead of jumping back to a featureless random state on every slider tick.
2. **Quasi-static sweep physics.** The trajectory through parameter space mimics a slow physical sweep, so phenomena like hysteresis loops near phase boundaries are naturally reproduced rather than averaged out.
3. **No hidden cost amortization.** The user sees the actual relaxation toward equilibrium under the new parameters; there is no off-screen "re-equilibration" step that would obscure how slow the dynamics really are near $T^*_c$ or in frustrated regions. After a $J_1$ sign flip in particular, the user observes the full coarsening process from a random start.

## Development

```bash
pnpm install
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Rebuilding WASM

```bash
cd ising-core
wasm-pack build --target web --out-dir ../public/wasm
```

## License

[MIT](https://choosealicense.com/licenses/mit/)
