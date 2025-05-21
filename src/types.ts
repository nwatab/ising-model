export type SimulationResultOnDisk = {
  lattice: string;
  betaJ: number;
  betaH: number;
  energy: number;
  magnetization: number;
  stdev_energy: number;
  stdev_magnetization: number;
  sweeps: number;
  compress: string;
  lattice_size: number;
};
