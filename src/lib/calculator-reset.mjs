// Clear only working data; registered stocks and confirmed usage records are retained.
export function resetWeighingStockWorkspace(data, allInputs = false) {
  return { ...data, drafts: {}, ...(allInputs ? { delivery: {} } : {}) };
}
