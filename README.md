# 3D Ising Model Simulation

This project provides an interactive web-based simulation of the 3D Ising model, a mathematical model in statistical mechanics used to study phase transitions and critical phenomena in ferromagnetic materials.

## Features

- Interactive 3D visualization of the Ising model
- Precomputed simulation results for efficient rendering
- Adjustable temperature parameter ($T\[\mathrm{K}]$
  ), including near the critical point ($k_{\mathrm B}T/J \approx 4.5$)
- Adjustable external magnetic field ($h/k_{\mathrm B}T$)
- Interactive visualization of a 2D slice through the 3D lattice
- Real-time energy and magnetization measurements

## Physics Background

The Ising model represents a lattice of spins that can be in one of two states: up (+1) or down (-1). Each spin interacts with its nearest neighbors. The Hamiltonian (energy) of the system is given by:

```math
H = -J \sum_{\langle i, j\rangle} s_{i} s_{j} - h \sum_{i} s_{i}
```

Where:

- $${\langle i, j\rangle} $$ is the nearest neighboring pairs
- $$J \in \mathbb{R}$$ is the coupling constant between neighboring spins
- $$h \in \mathbb{R}$$ is the external magnetic field
- $$s_{i} \in \lbrace-1, 1\rbrace$$ is the spin at site $i$

The simulation uses the Metropolis algorithm to sample configurations according to the Boltzmann distribution. The dimensionless parameters used are:

- $$\beta J$$ $$(=J/k_{\mathrm B}T)$$: Coupling strength divided by temperature
- $$\beta h$$ $$(=h/k_{\mathrm B}T)$$: Field strength divided by temperature

## Development

First, install dependencies, run the simulation to generate data, and start the development server:

```bash
# Install dependencies
pnpm install

# Run simulation with optional lattice size parameter
# Default is N=32 if not specified. It may take a time.
pnpm run simulate --N=32  # N=4, 8, 16, 32, 64, 128...

# Start the development server
pnpm run dev
```

results is compressed and saved in the `/data` directory.

Open [http://localhost:3000](http://localhost:3000) with your browser to see and interact with the simulation.

## Implementation Details

The simulation:

- Critical temperature $T_{c}$ is set to $1000\\mathrm{K}$ by default, which is configurable at `config.ts`
- Uses a configurable N×N×N cubic lattice with periodic boundary conditions (default N=32)
- Implements the Metropolis Monte Carlo algorithm for spin updates
- Sweeps from high temperature to low temperature (exploring paramagnetic to ferromagnetic or antiferromagnetic phase transitions), from low external field to high external field (exploring field-driven ordering effects)
- Visualizes a 2D slice of the 3D lattice
- Updates the display every 200×N³ attempted spin flips
- Compresses and stores results using Run-Length Encoding (RLE) for ferromagnetism or deflate compression for antiferromagnetism
- The simulation uses positive external field values ($h > 0$), as a negative field effect can be equivalently realized by flipping all spins ($s_i \mapsto -s_i$ for all $i$) due to the $\mathbb{Z}_2$ symmetry of the Ising model

## Interpreting the Results

The simulation generates data for different temperature and external field values:

- At high temperatures ($J/k_BT$ close to 0), spins are mostly random
- As temperature decreases, spins begin to align, showing domains of similar orientation
- Near the critical temperature, you'll observe large fluctuating domains and critical slowing down
- Below the critical temperature, the system exhibits spontaneous magnetization
- The external field ($h/k_BT$) biases the system toward alignment with the field direction

## License

[MIT](https://choosealicense.com/licenses/mit/)
