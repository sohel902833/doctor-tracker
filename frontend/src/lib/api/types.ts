/** The shape every backend response has. */
export type FieldErrors = Record<string, string>;

export type ApiResponse<T> = {
  success: boolean;
  status: number;
  message: string;
  data: T | null;
  errors: FieldErrors | null;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type Paginated<T> = { items: T[]; meta: PaginationMeta };

/** Query string values; empty values are dropped before sending. */
export type QueryParams = Record<
  string,
  string | number | boolean | null | undefined
>;
