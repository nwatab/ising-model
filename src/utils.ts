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
