# 3D Ising Model Simulation

This project provides an interactive web-based simulation of the 3D Ising model, a mathematical model in statistical mechanics used to study phase transitions and critical phenomena in ferromagnetic materials.

## Features

- Real-time 3D Ising model simulation with visualization
- Adjustable temperature ($J/k_{B}T$) parameter, including near the critical point ($\approx 0.22$)
- Adjustable external magnetic field ($$h/k_{B}T$$)
- Interactive visualization of a 2D slice through the 3D lattice
- Real-time energy and magnetization measurements

## Physics Background

The Ising model represents a lattice of spins that can be in one of two states: up (+1) or down (-1). Each spin interacts with its nearest neighbors. The Hamiltonian (energy) of the system is given by:

```math
H = -J \sum_{nearest\; i, j} s_{i} s_{j} - h \sum_{i} s_{i}
```

Where:

- $$J \in \mathbb{R}$$ is the coupling constant between neighboring spins
- $$h \in \mathbb{R}$$ is the external magnetic field
- $$s_{i} \in \lbrace-1, 1\rbrace$$ is the spin at site $i$

The simulation uses the Metropolis algorithm to sample configurations according to the Boltzmann distribution. The dimensionless parameters used are:

- $$\beta J$$ $$(J/k_{B}T)$$: Coupling strength divided by temperature
- $$\beta h$$ $$(h/k_{B}T)$$: Field strength divided by temperature

## Setup

First, install dependencies and run the development server:

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see and interact with the simulation.

## Implementation Details

The simulation:

- Uses a 32×32×32 cubic lattice with periodic boundary conditions
- Implements the Metropolis Monte Carlo algorithm for spin updates
- Visualizes a central 2D slice of the 3D lattice
- Updates the display every 200×N³ attempted spin flips
- Runs until 32⁵ (~33.5 million) total spin flips are attempted

## License

[MIT](https://choosealicense.com/licenses/mit/)
