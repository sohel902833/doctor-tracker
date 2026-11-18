/** Escapes user input so it can be used safely inside a RegExp. */
export const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** { $or: [{ name: /term/i }, { email: /term/i }] } for a simple search box. */
export const buildSearchFilter = (search: string | undefined, fields: string[]) => {
  if (!search) return {};

  const pattern = new RegExp(escapeRegex(search), "i");
  return { $or: fields.map((field) => ({ [field]: pattern })) };
};

/** { createdAt: { $gte: from, $lte: to } } — only the bounds that were given. */
export const buildDateRangeFilter = (
  field: string,
  from?: Date,
  to?: Date,
) => {
  if (!from && !to) return {};

  return {
    [field]: {
      ...(from && { $gte: from }),
      ...(to && { $lte: to }),
    },
  };
};
