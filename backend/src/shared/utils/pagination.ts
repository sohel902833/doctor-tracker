export type PaginationQuery = { page: number; limit: number };

export type PaginationMeta = PaginationQuery & {
  total: number;
  totalPages: number;
};

export const getSkip = ({ page, limit }: PaginationQuery) =>
  (page - 1) * limit;

export const buildPaginationMeta = (
  { page, limit }: PaginationQuery,
  total: number,
): PaginationMeta => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});
