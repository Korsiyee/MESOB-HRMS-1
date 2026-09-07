const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function parsePagination({ page, pageSize, maxPageSize } = {}) {
  const resolvedMax = Number(maxPageSize) || MAX_PAGE_SIZE;
  const parsedPage = Number(page) || 1;
  const parsedSize = Number(pageSize) || DEFAULT_PAGE_SIZE;
  const normalizedPage = parsedPage > 0 ? parsedPage : 1;
  const normalizedSize = Math.min(Math.max(parsedSize, 1), resolvedMax);
  const offset = (normalizedPage - 1) * normalizedSize;

  return {
    page: normalizedPage,
    pageSize: normalizedSize,
    offset,
    limit: normalizedSize,
  };
}

module.exports = {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  parsePagination,
};
