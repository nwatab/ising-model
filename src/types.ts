export type PhaseDiagramEntry = {
  j2OverJ1: number;
  tStar: number;
  jSign: 1 | -1;
  M: number;
  M_AFM: number;
};

export type PhaseDiagramData = {
  N: number;
  j2OverJ1Values: number[];
  tStarValues: number[];
  entries: PhaseDiagramEntry[];
};

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
