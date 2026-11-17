import { describe, it, expect } from 'vitest';
import { parsePagination, MAX_PAGE_SIZE } from '../src/utils/pagination.js';

describe('parsePagination', () => {
  it('uses defaults when params are missing', () => {
    expect(parsePagination({})).toEqual({ page: 1, limit: 50 });
  });
  it('parses valid values', () => {
    expect(parsePagination({ page: '3', limit: '25' })).toEqual({ page: 3, limit: 25 });
  });
  it('falls back on invalid, zero or negative values', () => {
    expect(parsePagination({ page: 'abc', limit: '-5' })).toEqual({ page: 1, limit: 50 });
    expect(parsePagination({ page: '0', limit: '0' })).toEqual({ page: 1, limit: 50 });
  });
  it('caps the page size', () => {
    expect(parsePagination({ limit: '999999' }).limit).toBe(MAX_PAGE_SIZE);
  });
});
