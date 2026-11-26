const CURRENT_YEAR = new Date().getFullYear();

export function archiveYearOptions(startYear = 1900, endYear = CURRENT_YEAR): number[] {
  const safeStart = Math.max(1900, startYear);
  const safeEnd = Math.max(safeStart, endYear);
  return Array.from({ length: safeEnd - safeStart + 1 }, (_, index) => safeEnd - index);
}
