export const temperatures = [
  800, 850, 900, 950, 1000, 1050, 1100, 1150, 1200,
] as const; // for classic Tsing model, βJ << 1. So T >> 0.22 Tc.
export const beta_hs = [0, 0.2, 0.4, 0.6] as const;
// j1j2ratio = J2/J1.
// Note:
//   #the most nearest  = 2(3, 1) = 6
//   #2nd order nearest = 2^2(3, 2) = 12
export const j2j1ratio = [-1, -0.5, 0, 0.5, 1] as const;
export const j2j1ratioAmp = 1;
export const j2j1ratioStep = 0.5;
export const CRITICAL_TEMP = 1000;

/**
 * deprecated. for wolff simulation
 */
export const CRITICAL_BETA_J = 0.221654;
