import type { PaginationMeta } from '@edunexa/types';

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface Paginated<T> {
  items: T[];
  meta: PaginationMeta;
}

/** Helper that produces Prisma skip/take plus a stable meta object (spec §58). */
export function buildPagination<T>(
  items: T[],
  total: number,
  { page, limit }: PaginationOptions,
): Paginated<T> {
  return {
    items,
    meta: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}