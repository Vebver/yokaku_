import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

function AdminPagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  label = "items",
  onPageChange,
}) {
  const pageCount = totalPages || 1;
  const firstItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const lastItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="admin-pagination mt-4 px-3 d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
      <span className="small text-muted">
        Showing <strong>{firstItem}</strong> to <strong>{lastItem}</strong>{" "}
        of <strong>{totalItems}</strong> {label}
      </span>
      <nav aria-label={`${label} pagination`}>
        <ul className="pagination pagination-sm mb-0 shadow-sm border rounded bg-white overflow-hidden">
          <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
            <button
              type="button"
              className="page-link border-0 px-3 py-2"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
          </li>
          <li className="page-item disabled">
            <span className="page-link border-0 text-dark fw-bold px-3 py-2 bg-white">
              Page {currentPage} of {pageCount}
            </span>
          </li>
          <li
            className={`page-item ${currentPage >= totalPages || totalPages === 0 ? "disabled" : ""}`}
          >
            <button
              type="button"
              className="page-link border-0 px-3 py-2"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || totalPages === 0}
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}

export default AdminPagination;
