export type PhaseDiagramEntry = {
  j2OverJ1: number;
  tStar: number;
  jSign: 1 | -1;
  M: number;
  M_AFM: number;
  M_stripe: number;
};

export type PhaseDiagramData = {
  N: number;
  j2OverJ1Values: number[];
  tStarValues: number[];
  entries: PhaseDiagramEntry[];
};

