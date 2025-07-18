export type SimulationResultOnDisk = {
  lattice: string;
  beta_j: number;
  beta_h: number;
  beta_energies: number[];
  magnetizations: number[];
  sweeps: number;
  compress: string;
  lattice_size: number;
};
