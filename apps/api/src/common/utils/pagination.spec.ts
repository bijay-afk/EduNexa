import { describe, expect, it } from 'vitest';
import { buildPagination } from './pagination';

describe('buildPagination', () => {
  it('computes pages and preserves items', () => {
    const items = [1, 2, 3];
    const result = buildPagination(items, 23, { page: 2, limit: 10 });
    expect(result.items).toEqual([1, 2, 3]);
    expect(result.meta).toEqual({ page: 2, limit: 10, total: 23, totalPages: 3 });
  });

  it('returns 0 total pages for empty set', () => {
    const result = buildPagination([], 0, { page: 1, limit: 20 });
    expect(result.meta.totalPages).toBe(0);
  });

  it('rounds partial pages up', () => {
    const result = buildPagination([], 11, { page: 1, limit: 10 });
    expect(result.meta.totalPages).toBe(2);
  });
});