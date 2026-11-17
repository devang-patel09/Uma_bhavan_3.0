export const MAX_PAGE_SIZE = 1000;

/** Parses ?page=&limit= query params into safe positive integers. */
export function parsePagination(
  query: Record<string, unknown>,
  defaultLimit = 50
): { page: number; limit: number } {
  const toInt = (v: unknown) => {
    const n = typeof v === 'string' ? parseInt(v, 10) : NaN;
    return Number.isFinite(n) ? n : NaN;
  };
  const rawPage = toInt(query.page);
  const rawLimit = toInt(query.limit);
  const page = rawPage >= 1 ? rawPage : 1;
  const limit = rawLimit >= 1 ? Math.min(rawLimit, MAX_PAGE_SIZE) : defaultLimit;
  return { page, limit };
}
