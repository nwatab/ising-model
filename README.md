# J₁-J₂ Ising Model Interactive Visualization

An interactive browser-based simulation and visualization tool for the J₁-J₂ Ising model. Metropolis Monte Carlo runs in real time via WebAssembly — no server required.

## Physics

### Hamiltonian

$$
H = -J_1 \sum_{\langle ij \rangle} s_i s_j
    - J_2 \sum_{\langle\langle ij \rangle\rangle} s_i s_j
    - h \sum_i s_i
$$

**Lattice:** 2D square or 3D simple-cubic with periodic boundary conditions. Sites are indexed by $i$ with integer coordinates $i_\alpha \in \{0, \dots, L-1\}$ in each spatial dimension.

| Symbol | Domain | Meaning |
| ------ | ------ | ------- |
| $s_i$ | $\{-1, +1\}$ | Ising spin on site $i$ |
| $\langle ij \rangle$ | NN pairs (each counted once in the sum) | Coordination $z_1 = 4$ (2D square), $6$ (3D SC) |
| $\langle\langle ij \rangle\rangle$ | NNN pairs (face-diagonal, each counted once) | Coordination $z_2 = 4$ (2D square), $12$ (3D SC) |
| $J_1$ | $\mathbb{R}$ | NN coupling. $J_1 > 0$: FM, $J_1 < 0$: AFM. The UI parameterization $T^* = k_B T/\lvert J_1\rvert$ excludes $J_1 = 0$. |
| $J_2$ | $\mathbb{R}$ | NNN coupling. Frustration arises when $J_2 < 0$ (NNN-AFM) competes with NN ordering; see "Frustration boundaries" below for the classical critical lines. |
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

| Quantity            | 2D square              | 3D simple-cubic      |
| ------------------- | ---------------------- | -------------------- |
| T\*\_c (J₂ = h = 0) | 2.2692 (Onsager exact) | 4.5115 (MC estimate) |
| K_c                 | 0.4407                 | 0.2217               |
| Universality class  | 2D Ising               | 3D Ising             |

### Frustration boundaries (T = 0, h = 0)

The classical FM↔stripe and Néel↔stripe transitions occur at different J₂/\|J₁\| values depending on dimension and on the sign of J₁:

| Regime                        | 2D square       | 3D simple-cubic     |
| ----------------------------- | --------------- | ------------------- |
| FM J₁ (>0) + AFM J₂ → stripe  | \|J₂/J₁\| = 1/2 | **\|J₂/J₁\| = 1/4** |
| AFM J₁ (<0) + AFM J₂ → stripe | \|J₂/J₁\| = 1/2 | \|J₂/J₁\| = 1/2     |

Near these boundaries the ground-state manifold is highly degenerate; Metropolis dynamics equilibrates very slowly and the simulation may freeze into mismatched domains.

### Critical slowing down

Near $T^*_c$, the relaxation time scales as $\tau \sim L^z$ with $z \approx 2.04$ for Metropolis local updates. For $L = 128$ this gives $\tau \sim 10^4$ MCS. Within shorter runs, the displayed ξ and C_v reflect **non-equilibrium coarsening** rather than true equilibrium values — observable as drifting M_Néel and ξ. This is a feature, not a bug: the simulation faithfully exhibits one of the central phenomena of continuous phase transitions.

## Architecture

```
Browser
──────────────────
Random initial configuration
     ↓
WASM Metropolis (Rust)
     ↓
React UI visualization
```

| Layer              | Technology                     |
| ------------------ | ------------------------------ |
| In-browser compute | Rust → WebAssembly (wasm-pack) |
| UI                 | React                          |
| Hosting            | Vercel (static export)         |

**WASM is essential, not optional.** Near the critical point, autocorrelation times diverge and the 10–100× speed advantage over pure JS is directly perceptible — without it, equilibrating L = 128 in real time is unusable.

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
