"use client";

import { useState, useEffect, useRef } from "react";

// Constants
const N = 32; // Size of the lattice (N x N x N)
const TOTAL_FLIPS = Math.pow(N, 5);
const RENDER_INTERVAL = 200; // Every 200 * N^3 flips

// Interface for simulation parameters using dimensionless quantities
interface SimulationParams {
  betaJ: number; // J/kBT - dimensionless coupling
  betaH: number; // h/kBT - dimensionless field
}

const ScientificNotation: React.FC<{
  value: number;
  precision?: number;
}> = ({ value, precision = 2 }) => {
  const [coefficient, exponent] = value.toExponential(precision).split("e");
  const formattedExponent = exponent.replace("+", "");

  return (
    <span>
      {coefficient} × 10<sup>{formattedExponent}</sup>
    </span>
  );
};

export default function Home() {
  // State for simulation parameters
  const [params, setParams] = useState<SimulationParams>({
    betaJ: 0.2216544, // J/kBT ≈ 0.44 at critical point (kBT/J ≈ 4.51)
    betaH: 0.0, // h/kBT - default dimensionless field
  });

  // State for running status
  const [isRunning, setIsRunning] = useState(false);

  // State for display
  const [flipCount, setFlipCount] = useState(0);
  const [energy, setEnergy] = useState(0);
  const [magnetization, setMagnetization] = useState(0);

  // Canvas ref for rendering
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Animation frame request ID ref
  const requestIdRef = useRef<number | null>(null);

  // Refs to hold the current state for the animation loop
  const latticeRef = useRef<Int8Array>(new Int8Array(N * N * N));
  const paramsRef = useRef<SimulationParams>(params);
  const flipCountRef = useRef<number>(0);
  const isRunningRef = useRef<boolean>(false);

  // Helper function to get 3D array index
  const getIndex = (x: number, y: number, z: number): number => {
    // Apply periodic boundary conditions
    const nx = ((x % N) + N) % N;
    const ny = ((y % N) + N) % N;
    const nz = ((z % N) + N) % N;
    return nz * N * N + ny * N + nx;
  };

  // Initialize the lattice randomly
  const initializeLattice = (): Int8Array => {
    const newLattice = new Int8Array(N * N * N);
    for (let i = 0; i < N * N * N; i++) {
      newLattice[i] = Math.random() < 0.5 ? 1 : -1;
    }
    return newLattice;
  };

  // Calculate energy of a single spin
  const calculateSpinEnergy = (
    lat: Int8Array,
    x: number,
    y: number,
    z: number
  ): number => {
    const idx = getIndex(x, y, z);
    const spin = lat[idx];
    const neighbors = [
      lat[getIndex(x + 1, y, z)],
      lat[getIndex(x - 1, y, z)],
      lat[getIndex(x, y + 1, z)],
      lat[getIndex(x, y - 1, z)],
      lat[getIndex(x, y, z + 1)],
      lat[getIndex(x, y, z - 1)],
    ];

    // Calculate energy using dimensionless parameters
    // E = -J * sum(s_i * s_j) - h * s_i
    // => βE = -(J/kBT) * sum(s_i * s_j) - (h/kBT) * s_i
    let energy = 0;
    for (const neighbor of neighbors) {
      energy -= paramsRef.current.betaJ * spin * neighbor;
    }
    energy -= paramsRef.current.betaH * spin;

    return energy;
  };

  // Calculate total energy of the system
  const calculateTotalEnergy = (lat: Int8Array): number => {
    let totalEnergy = 0;

    for (let z = 0; z < N; z++) {
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          // Count only half the bonds to avoid double-counting
          const spin = lat[getIndex(x, y, z)];
          const rightNeighbor = lat[getIndex(x + 1, y, z)];
          const downNeighbor = lat[getIndex(x, y + 1, z)];
          const backNeighbor = lat[getIndex(x, y, z + 1)];

          totalEnergy -= paramsRef.current.betaJ * spin * rightNeighbor;
          totalEnergy -= paramsRef.current.betaJ * spin * downNeighbor;
          totalEnergy -= paramsRef.current.betaJ * spin * backNeighbor;
          totalEnergy -= paramsRef.current.betaH * spin;
        }
      }
    }

    return totalEnergy;
  };

  // Calculate total magnetization
  const calculateMagnetization = (lat: Int8Array): number => {
    let magnetization = 0;
    for (let i = 0; i < lat.length; i++) {
      magnetization += lat[i];
    }
    return magnetization / lat.length;
  };

  // Simulation step - try to flip N^3 spins
  const simulationStep = () => {
    if (!isRunningRef.current) return;

    const currentLattice = latticeRef.current;
    const flipsPerStep = N * N * N;

    for (let i = 0; i < flipsPerStep; i++) {
      // Randomly select a site
      const x = Math.floor(Math.random() * N);
      const y = Math.floor(Math.random() * N);
      const z = Math.floor(Math.random() * N);
      const idx = getIndex(x, y, z);

      // Calculate energy change if we flip this spin
      const oldEnergy = calculateSpinEnergy(currentLattice, x, y, z);
      currentLattice[idx] *= -1; // Flip the spin
      const newEnergy = calculateSpinEnergy(currentLattice, x, y, z);
      const deltaEnergy = newEnergy - oldEnergy;

      // Metropolis algorithm
      // Since we're using dimensionless energies (βE), the probability is just exp(-ΔE)
      const acceptProbability = Math.exp(-deltaEnergy);
      if (deltaEnergy > 0 && Math.random() > acceptProbability) {
        // Reject the move
        currentLattice[idx] *= -1; // Flip back
      }
    }

    flipCountRef.current += flipsPerStep;

    // Update state periodically for rendering
    if (
      flipCountRef.current % RENDER_INTERVAL === 0 ||
      flipCountRef.current >= TOTAL_FLIPS
    ) {
      setFlipCount(flipCountRef.current);
      setEnergy(calculateTotalEnergy(currentLattice));
      setMagnetization(calculateMagnetization(currentLattice));
      renderLattice();
    }

    // Continue the simulation loop if not finished
    if (flipCountRef.current < TOTAL_FLIPS && isRunningRef.current) {
      requestIdRef.current = requestAnimationFrame(simulationStep);
    } else if (flipCountRef.current >= TOTAL_FLIPS) {
      setIsRunning(false);
      isRunningRef.current = false;
    }
  };

  // Render the lattice slice to canvas
  const renderLattice = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cellSize = Math.min(width, height) / N;

    ctx.clearRect(0, 0, width, height);

    // Draw the lattice slice at z = N/2
    const z = Math.floor(N / 2);

    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const idx = getIndex(x, y, z);
        const spin = latticeRef.current[idx];

        // Color: red for up, blue for down
        ctx.fillStyle = spin > 0 ? "red" : "blue";

        // Draw the cell
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);

        // Draw cell border
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }
  };

  // Start the simulation
  const startSimulation = () => {
    if (isRunning) return;

    // Initialize or reset
    const newLattice = initializeLattice();
    latticeRef.current = newLattice;
    paramsRef.current = params;
    flipCountRef.current = 0;
    isRunningRef.current = true;

    setFlipCount(0);
    setIsRunning(true);
    setEnergy(calculateTotalEnergy(newLattice));
    setMagnetization(calculateMagnetization(newLattice));

    // Start the animation loop
    if (requestIdRef.current !== null) {
      cancelAnimationFrame(requestIdRef.current);
    }
    requestIdRef.current = requestAnimationFrame(simulationStep);
  };

  // Stop the simulation
  const stopSimulation = () => {
    isRunningRef.current = false;
    setIsRunning(false);

    if (requestIdRef.current !== null) {
      cancelAnimationFrame(requestIdRef.current);
      requestIdRef.current = null;
    }
  };

  // Handle parameter changes
  const handleParamChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setParams((prev) => ({
      ...prev,
      [name]: parseFloat(value),
    }));
  };

  // Initialize on mount
  useEffect(() => {
    const newLattice = initializeLattice();
    latticeRef.current = newLattice;
    setEnergy(calculateTotalEnergy(newLattice));
    setMagnetization(calculateMagnetization(newLattice));

    // Initial render
    renderLattice();

    // Clean up on unmount
    return () => {
      if (requestIdRef.current !== null) {
        cancelAnimationFrame(requestIdRef.current);
      }
    };
  }, []);

  // Update refs when state changes
  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  // Update canvas size on window resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Make canvas fill the screen while keeping aspect ratio
      const parent = canvas.parentElement;
      if (!parent) return;

      const size = Math.min(parent.clientWidth, parent.clientHeight);

      canvas.width = size;
      canvas.height = size;

      renderLattice();
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Format percentage completion
  const completionPercent = Math.min(
    100,
    Math.floor((flipCount / TOTAL_FLIPS) * 100)
  );

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-gray-900 text-white p-4">
      {/* Control panel */}
      <div className="fixed top-4 left-4 bg-gray-800 p-4 rounded-lg shadow-lg z-10 w-64">
        <h1 className="text-xl font-bold mb-4">3D Ising Model</h1>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              J/k<sub>B</sub>T: {params.betaJ.toFixed(3)}
            </label>
            <input
              type="range"
              name="betaJ"
              min="-1"
              max="1"
              step="0.01"
              value={params.betaJ}
              onChange={handleParamChange}
              disabled={isRunning}
              className="w-full"
            />
            <div className="text-xs text-gray-400">(Critical point ≈ 0.22)</div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              h/k<sub>B</sub>T: {params.betaH.toFixed(3)}
            </label>
            <input
              type="range"
              name="betaH"
              min="-1"
              max="1"
              step="0.01"
              value={params.betaH}
              onChange={handleParamChange}
              disabled={isRunning}
              className="w-full"
            />
          </div>

          <div className="flex space-x-2">
            {!isRunning ? (
              <button
                onClick={startSimulation}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded"
              >
                Run
              </button>
            ) : (
              <button
                onClick={stopSimulation}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded"
              >
                Stop
              </button>
            )}
          </div>

          {isRunning && (
            <div>
              <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full"
                  style={{ width: `${completionPercent}%` }}
                ></div>
              </div>
              <div className="text-xs mt-1 text-center">
                {completionPercent}% - <ScientificNotation value={flipCount} />{" "}
                / <ScientificNotation value={TOTAL_FLIPS} /> flips
              </div>
            </div>
          )}

          <div className="text-sm">
            <div>Sliced at: z = {Math.floor(N / 2)}</div>
            <div>Energy (βE): {energy.toFixed(2)}</div>
            <div>Magnetization: {magnetization.toFixed(3)}</div>
          </div>
        </div>
      </div>

      {/* Canvas container */}
      <div className="flex-1 flex items-center justify-center">
        <canvas ref={canvasRef} className="border border-gray-700 rounded" />
      </div>
    </div>
  );
}
