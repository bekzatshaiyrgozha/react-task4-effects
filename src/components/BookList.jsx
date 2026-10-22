function BookList({
  books,
  status,
  error,
  total,
  page,
  totalPages,
  search,
  sort,
  selectedId,
  busyIds,
  onSearchChange,
  onSortChange,
  onPageChange,
  onReload,
  onSelect,
}) {
  let content;

  if (status === "loading") {
    content = (
      <div className="state">
        <span className="spinner" />
        Loading books...
      </div>
    );
  } else if (status === "error") {
    content = (
      <div className="state state-error">
        <p>Could not load books: {error}</p>
        <button className="btn" onClick={onReload}>
          Try again
        </button>
      </div>
    );
  } else if (books.length === 0) {
    content = (
      <div className="state">
        {search.trim()
          ? `No books found for "${search.trim()}"`
          : "The library is empty. Add the first book!"}
      </div>
    );
  } else {
    content = (
      <ul className="book-list">
        {books.map((book) => (
          <li key={book.id}>
            <button
              className={"book-row" + (book.id === selectedId ? " selected" : "")}
              onClick={() => onSelect(book.id)}
            >
              <span className="book-row-text">
                <span className="book-row-title">{book.name}</span>
                <span className="book-row-author">{book.author || "Unknown author"}</span>
              </span>
              {busyIds.includes(book.id) ? (
                <span className="spinner spinner-small" />
              ) : (
                <span className={`badge badge-${book.status || "available"}`}>
                  {book.status || "available"}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Books {status === "success" && <span className="count">{total}</span>}</h2>
        <button className="btn" onClick={onReload}>
          ↻ Reload
        </button>
      </div>

      <div className="filters">
        <input
          type="search"
          placeholder="Search by title or description..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <select value={sort} onChange={(e) => onSortChange(e.target.value)}>
          <option value="name">A → Z</option>
          <option value="name-desc">Z → A</option>
        </select>
      </div>

      {content}

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            ← Prev
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            className="btn"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next →
          </button>
        </div>
      )}
    </section>
  );
}

export default BookList;
