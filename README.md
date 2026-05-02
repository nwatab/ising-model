# J₁-J₂ Ising Model Interactive Visualization

An interactive browser-based simulation and visualization tool for the J₁-J₂ Ising model. Metropolis Monte Carlo runs in real time via WebAssembly — no server required.

## Physics

### Hamiltonian

$$
\beta H = -K_1 \sum_{\langle ij \rangle} s_i s_j
       - K_2 \sum_{\langle\langle ij \rangle\rangle} s_i s_j
       - \tilde{h} \sum_i s_i
$$

- sᵢ ∈ {+1, −1} (Ising spins)
- ⟨ij⟩: nearest-neighbour pairs; ⟪ij⟫: next-nearest-neighbour pairs
- Periodic boundary conditions
- **N ≡ Lᵈ**: total number of sites (L = linear size, d = spatial dimension)

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
| h                   | External field (units of \|J₁\|)        | Slider           |
| J₂                  | Next-nearest coupling (units of \|J₁\|) | Slider           |

Conversion from UI to simulation core:

$$
K_1 = \frac{\mathrm{sign}(J_1)}{T^*}, \qquad
K_2 = K_1 \cdot \frac{J_2}{J_1}, \qquad
\tilde{h} = \frac{h}{T^*}
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
