// lib/inventory/pagination-helper.ts
const ALLOWED_SIZES = [10, 20, 30, 50, 100, 200];

export function parsePaginationParams(searchParams: {
  page?: string;
  pageSize?: string;
}) {
  const rawPage = Number(searchParams.page);
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;

  const rawSize = Number(searchParams.pageSize);
  const pageSize = ALLOWED_SIZES.includes(rawSize) ? rawSize : 20;

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}
