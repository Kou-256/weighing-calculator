export const DEFAULT_CONCENTRATION_STEP = "0.01";

export function validConcentrationStep(value) {
  return /^\d+(?:\.\d{1,8})?$/.test(String(value)) && Number(value) > 0 && Number(value) <= 100;
}

export function concentrationPrecision(step, decimalPlaces) {
  return Math.max(decimalPlaces, (String(step).split(".")[1] || "").length);
}

export function shiftConcentration(value, step, direction, decimalPlaces) {
  const safeStep = validConcentrationStep(step) ? step : DEFAULT_CONCENTRATION_STEP;
  const precision = concentrationPrecision(safeStep, decimalPlaces);
  const factor = 10 ** precision;
  const next = Math.min(100, Math.max(0, Number(value || 0) + Number(safeStep) * direction));
  return (Math.round((next + Number.EPSILON) * factor) / factor).toFixed(precision);
}
