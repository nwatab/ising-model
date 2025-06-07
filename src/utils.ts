/**
 * represent mean and error in  [coefficient, errorCoefficient, exponent]
 * - |value| < 1e3 : exponent = 0
 * - |value| >= 1e3: exponent = floor(log10(|value|))
 *
 * @param {number} value  mean
 * @param {number} error  error
 * @param {number} [threshold=1e3]  threshold to switch to scientific notation (default 10^3)
 * @returns {[number, number, number]} [coefficient, errorCoefficient, exponent]
 */
export function decomposeToScientific(
  value: number,
  error: number,
  threshold: number = 1e3
) {
  const absValue = Math.abs(value);
  // 閾値未満はそのまま、以上は指数を計算
  const exponent = absValue < threshold ? 0 : Math.floor(Math.log10(absValue));
  const power = Math.pow(10, exponent);
  const coefficient = value / power;
  const errorCoefficient = error / power;
  return [coefficient, errorCoefficient, exponent];
}

export function calcMeanAndStdev(values: number[]) {
  if (values.length === 0) {
    throw new Error(
      "Cannot calculate mean and standard deviation of an empty array"
    );
  }

  const mean = values.reduce((acc, v) => acc + v, 0) / values.length;

  // For Ising model time evolution statistics, use sample standard deviation (n-1)
  if (values.length === 1) {
    // Single sample: standard deviation is undefined, return 0
    return [mean, 0];
  }

  const stdev = Math.sqrt(
    values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (values.length - 1)
  );
  return [mean, stdev];
}
