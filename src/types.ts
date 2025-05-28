export type SimulationResultOnDisk = {
  lattice: string;
  beta_j: number;
  beta_h: number;
  beta_energy: number;
  magnetization: number;
  stdev_beta_energy: number;
  stdev_magnetization: number;
  sweeps: number;
  compress: string;
  lattice_size: number;
};
