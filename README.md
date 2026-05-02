# J₁-J₂ Ising Model Interactive Visualization

An interactive browser-based simulation and visualization tool for the J₁-J₂ Ising model. Metropolis Monte Carlo runs in real time via WebAssembly, with no server required.

## Physics

### Hamiltonian

```
βH = −K₁ Σ_{⟨ij⟩} sᵢsⱼ − K₂ Σ_{⟪ij⟫} sᵢsⱼ − h̃ Σᵢ sᵢ
```

- sᵢ ∈ {+1, −1} (Ising spins)
- ⟨ij⟩: nearest-neighbour pairs, ⟪ij⟫: next-nearest-neighbour pairs
- Periodic boundary conditions

### Parameter space

The simulation core operates in **(K₁, K₂, h̃)** space — Metropolis acceptance probabilities are computed here.

| Symbol | Definition | Meaning |
|--------|-----------|---------|
| K₁ | βJ₁ = J₁ / k_BT | Nearest-neighbour coupling (positive: FM, negative: AFM) |
| K₂ | βJ₂ | Next-nearest-neighbour coupling |
| h̃ | βh | Dimensionless external field |

The high-temperature limit is the single point K₁ = K₂ = h̃ = 0, regardless of the sign of J₁.

### UI parameters

| UI variable | Definition | Control |
|-------------|-----------|---------|
| T* = k_BT / \|J₁\| | Reduced temperature (always positive) | Log-scale slider |
| J₁_sign ∈ {+1, −1} | FM / AFM toggle | Radio buttons |
| h | External field | Slider |
| J₂ | Next-nearest coupling | Slider |

Conversion from UI to simulation core:
```
K₁ = J₁_sign / T*
K₂ = K₁ · (J₂ / J₁)
h̃  = h / T*
```

### Critical point

| Quantity | 2D square lattice | 3D simple-cubic lattice |
|----------|------------------|------------------------|
| T*_c | 2.269 (Onsager exact) | ≈ 4.51 |
| K_c | 0.4407 | 0.2217 |
| Frustration boundary | J₂/J₁ ≈ 0.5 | J₂/J₁ ≈ 0.5 |

### Critical slowing down

Near the critical temperature ($T^\ast_c \approx 4.51$ for 3D Ising), the system's relaxation time scales as $\tau \sim L^z$ with $z \approx 2$ for Metropolis dynamics. For $L = 128$, this means $\tau \sim 10^4$ MCS. Within shorter runs, the displayed $\xi$ and $C_v$ reflect non-equilibrium coarsening rather than true equilibrium values — observable as time-varying $M_\text{Néel}$ and $\xi$. This is a feature, not a bug: the simulation faithfully demonstrates one of the central phenomena of phase transitions.

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

| Layer | Technology |
|-------|-----------|
| In-browser compute | Rust → WebAssembly (wasm-pack) |
| UI | React |
| Hosting | Vercel (static export) |

**WASM is essential, not optional**: near the critical point, correlation times diverge and the 10–100× speed advantage over pure JS is directly perceptible.

## Development

```bash
pnpm install
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Rebuilding WASM

```bash
cd ising-core
wasm-pack build --target web --out-dir ../public/wasm
```

## License

[MIT](https://choosealicense.com/licenses/mit/)
