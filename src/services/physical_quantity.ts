import { BOLTZMANN_CONSTANT, CRITICAL_BETA_J } from "@/constants";

/**
 * β_c J = J/k_B T_c = 0.221654 at critical point.
 * For any given T, βJ = J / k_B T = 0.221654 * (T_c / T)
 * Throws an error if T is not greater than 0 K.
 * This function does not handle J < 0. To handle J < 0,
 * multiply the result by -1.
 * @param T Temperature in Kelvin
 * @param Tc Critical temperature in Kelvin
 * @return βJ value
 */
export function getBetaJ(T: number, Tc: number) {
  if (T <= 0) {
    throw new Error("Temperature must be greater than 0 K");
  }
  const betaJ = CRITICAL_BETA_J * (Tc / T);
  return betaJ;
}

export function getkT(betaJ: number) {
  // J/kT_{c} = CRITICAL_POINT
  // kT = J /beta_j ( ∵ beta_j = J / kT )
  //    = CRITICAL_POINT kTc /beta_j ( ∵ J = kT_{c} CRITICAL_POINT )
  const kT = (CRITICAL_BETA_J * BOLTZMANN_CONSTANT) / betaJ;
  return kT;
}
