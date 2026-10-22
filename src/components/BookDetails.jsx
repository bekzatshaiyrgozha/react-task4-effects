function BookDetails({ status, book, error, isBusy, onRetry, onToggleStatus, onEdit, onDelete }) {
  if (status === "idle") {
    return (
      <section className="panel details">
        <div className="state">👈 Select a book to see its details</div>
      </section>
    );
  }

  if (status === "loading") {
    return (
      <section className="panel details">
        <div className="state">
          <span className="spinner" />
          Loading details...
        </div>
      </section>
    );
  }

  if (status === "error") {
    return (
      <section className="panel details">
        <div className="state state-error">
          <p>Could not load details: {error}</p>
          <button className="btn" onClick={onRetry}>
            Try again
          </button>
        </div>
      </section>
    );
  }

  const isAvailable = book.status !== "borrowed";

  return (
    <section className="panel details">
      <div className="details-top">
        <div>
          <h2>{book.name}</h2>
          <p className="details-author">{book.author || "Unknown author"}</p>
        </div>
        <span className={`badge badge-${isAvailable ? "available" : "borrowed"}`}>
          {isAvailable ? "available" : "borrowed"}
        </span>
      </div>

      <p className="details-description">{book.description}</p>

      <dl className="fields">
        <div>
          <dt>ID</dt>
          <dd>#{book.id}</dd>
        </div>
        <div>
          <dt>Genre</dt>
          <dd>{book.genre || "—"}</dd>
        </div>
        <div>
          <dt>Year</dt>
          <dd>{book.year || "—"}</dd>
        </div>
        <div>
          <dt>Language</dt>
          <dd>{book.language || "—"}</dd>
        </div>
        <div>
          <dt>Shelf</dt>
          <dd>{book.shelf || "—"}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{isAvailable ? "On the shelf" : "Someone has it"}</dd>
        </div>
      </dl>

      <div className="actions">
        <button className="btn btn-primary" disabled={isBusy} onClick={onToggleStatus}>
          {isBusy ? "Saving..." : isAvailable ? "📖 Borrow" : "↩ Return"}
        </button>
        <button className="btn" disabled={isBusy} onClick={onEdit}>
          ✏️ Edit
        </button>
        <button className="btn btn-danger" disabled={isBusy} onClick={onDelete}>
          🗑 Delete
        </button>
      </div>
    </section>
  );
}

export default BookDetails;
