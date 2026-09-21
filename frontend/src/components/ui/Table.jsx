import './Table.css';

export function Table({
  columns = [],
  data = [],
  keyField = 'id',
  onRowClick,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  loading = false,
  emptyMessage = 'No data available',
  className = '',
  renderRow,
  striped = true,
  hoverable = true,
}) {
  return (
    <div className={`table-wrapper ${className}`}>
      <div className="table-container" role="region" aria-label="Data table" tabIndex={0}>
        <table className={`table ${striped ? 'table--striped' : ''} ${hoverable ? 'table--hoverable' : ''}`}>
          <thead>
            <tr>
              {selectable && (
                <th className="table__th table__th--checkbox" scope="col">
                  <input
                    type="checkbox"
                    className="table__select-all"
                    checked={data.length > 0 && data.every((row) => selectedRows.includes(row[keyField]))}
                    indeterminate={data.length > 0 && data.some((row) => selectedRows.includes(row[keyField])) && !data.every((row) => selectedRows.includes(row[keyField]))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onSelectionChange?.(data.map((row) => row[keyField]));
                      } else {
                        onSelectionChange?.([]);
                      }
                    }}
                    aria-label="Select all rows"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="table__th"
                  scope="col"
                  style={{ width: col.width, textAlign: col.align }}
                >
                  <div className="table__th-content">
                    <span>{col.header}</span>
                    {col.sortable && <span className="table__sort-icon" aria-hidden="true">↕</span>}
                  </div>
                </th>
              ))}
              {onRowClick && !renderRow && (
                <th className="table__th table__th--actions" scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0) + (onRowClick && !renderRow ? 1 : 0)} className="table__loading">
                  <div className="table__loading-content">
                    <span className="inline-spinner" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <circle className="inline-spinner__track" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2" />
                        <circle className="inline-spinner__indicator" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4 31.4" />
                      </svg>
                    </span>
                    <span>Loading...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0) + (onRowClick && !renderRow ? 1 : 0)} className="table__empty">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => {
                const rowKey = row[keyField];
                const isSelected = selectedRows.includes(rowKey);

                return (
                  <tr
                    key={rowKey}
                    className={`table__tr ${isSelected ? 'table__tr--selected' : ''} ${onRowClick ? 'table__tr--clickable' : ''}`}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    data-row-key={rowKey}
                  >
                    {selectable && (
                      <td className="table__td table__td--checkbox">
                        <input
                          type="checkbox"
                          className="table__row-select"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            const newSelection = isSelected
                              ? selectedRows.filter((id) => id !== rowKey)
                              : [...selectedRows, rowKey];
                            onSelectionChange?.(newSelection);
                          }}
                          aria-label={`Select row ${rowIndex + 1}`}
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className="table__td"
                        style={{ textAlign: col.align }}
                      >
                        {col.render ? col.render(row, rowIndex) : row[col.key]}
                      </td>
                    ))}
                    {onRowClick && !renderRow && (
                      <td className="table__td table__td--actions">
                        <button
                          type="button"
                          className="icon-btn icon-btn--ghost icon-btn--sm"
                          onClick={(e) => { e.stopPropagation(); onRowClick(row); }}
                          aria-label={`View details for ${row.title || rowKey}`}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {renderRow && (
        <div className="table-cards" role="list" aria-label="Data cards">
          {data.map((row, index) => (
            <div key={row[keyField]} className="table-card" role="listitem">
              {renderRow(row, index)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Pagination({
  currentPage = 1,
  totalPages = 1,
  pageSize = 20,
  totalItems = 0,
  onPageChange,
  onPageSizeChange,
  className = '',
  showPageSize = true,
}) {
  if (totalPages <= 1) return null;

  const pages = [];
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <nav className={`pagination ${className}`} aria-label="Pagination">
      <div className="pagination__info">
        Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalItems)} of {totalItems} results
      </div>
      <div className="pagination__controls">
        {showPageSize && (
          <div className="pagination__page-size">
            <label htmlFor="page-size" className="visually-hidden">Items per page</label>
            <select
              id="page-size"
              value={pageSize}
              onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
              className="pagination__select"
              aria-label="Items per page"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        )}
        <div className="pagination__pages">
          <button
            type="button"
            className="icon-btn icon-btn--ghost icon-btn--sm pagination__btn"
            onClick={() => onPageChange?.(1)}
            disabled={currentPage === 1}
            aria-label="First page"
            aria-disabled={currentPage === 1}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polyline points="11 17 6 12 11 7" />
              <polyline points="18 17 13 12 18 7" />
            </svg>
          </button>
          <button
            type="button"
            className="icon-btn icon-btn--ghost icon-btn--sm pagination__btn"
            onClick={() => onPageChange?.(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Previous page"
            aria-disabled={currentPage === 1}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          {startPage > 1 && (
            <>
              <button
                type="button"
                className="pagination__page-btn"
                onClick={() => onPageChange?.(1)}
                aria-label="Page 1"
              >
                1
              </button>
              {startPage > 2 && <span className="pagination__ellipsis" aria-hidden="true">…</span>}
            </>
          )}
          {pages.map((page) => (
            <button
              key={page}
              type="button"
              className={`pagination__page-btn ${page === currentPage ? 'pagination__page-btn--active' : ''}`}
              onClick={() => onPageChange?.(page)}
              aria-label={`Page ${page}`}
              aria-current={page === currentPage ? 'page' : undefined}
            >
              {page}
            </button>
          ))}
          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && <span className="pagination__ellipsis" aria-hidden="true">…</span>}
              <button
                type="button"
                className="pagination__page-btn"
                onClick={() => onPageChange?.(totalPages)}
                aria-label={`Page ${totalPages}`}
              >
                {totalPages}
              </button>
            </>
          )}
          <button
            type="button"
            className="icon-btn icon-btn--ghost icon-btn--sm pagination__btn"
            onClick={() => onPageChange?.(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="Next page"
            aria-disabled={currentPage === totalPages}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <button
            type="button"
            className="icon-btn icon-btn--ghost icon-btn--sm pagination__btn"
            onClick={() => onPageChange?.(totalPages)}
            disabled={currentPage === totalPages}
            aria-label="Last page"
            aria-disabled={currentPage === totalPages}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polyline points="13 17 18 12 13 7" />
              <polyline points="6 17 11 12 6 7" />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
}