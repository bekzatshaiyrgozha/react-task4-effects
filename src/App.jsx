import { useEffect, useState } from "react";
import { getItemsList, getItem, updateItem, deleteItem } from "./api/fakeApi";
import { createBook } from "./api/books";
import { API_CONFIG } from "./api/settings";
import BookList from "./components/BookList";
import BookDetails from "./components/BookDetails";
import BookForm from "./components/BookForm";
import "./App.css";

const PAGE_SIZE = 5;

function App() {
  // ----- list -----
  const [books, setBooks] = useState([]);
  const [listStatus, setListStatus] = useState("loading"); // loading | error | success
  const [listError, setListError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name");
  const [reloadCount, setReloadCount] = useState(0);

  // ----- details -----
  const [selectedId, setSelectedId] = useState(null);
  const [details, setDetails] = useState(null);
  const [detailsStatus, setDetailsStatus] = useState("idle"); // idle | loading | error | success
  const [detailsError, setDetailsError] = useState("");
  const [detailsReloadCount, setDetailsReloadCount] = useState(0);

  // ----- actions -----
  const [busyIds, setBusyIds] = useState([]); // books that have a request in progress
  const [form, setForm] = useState(null); // null | { mode: "create" } | { mode: "edit", book }
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { type: "success" | "error", text }

  // Load the list every time page, search, sort change or Reload is pressed
  useEffect(() => {
    let ignore = false;

    setListStatus("loading");
    setListError("");

    const query = new URLSearchParams({
      page,
      limit: PAGE_SIZE,
      sort,
      search: search.trim(),
    });

    getItemsList("?" + query.toString())
      .then((result) => {
        if (ignore) return; // an old request, the user already wants something else

        setBooks(result.data);
        setTotal(result.total);
        setTotalPages(result.totalPages);
        setListStatus("success");

        // e.g. the last book on the last page was deleted
        if (result.totalPages > 0 && page > result.totalPages) {
          setPage(result.totalPages);
        }
      })
      .catch((error) => {
        if (ignore) return;
        setListError(error.message);
        setListStatus("error");
      });

    return () => {
      ignore = true;
    };
  }, [page, search, sort, reloadCount]);

  // Load details of the selected book
  useEffect(() => {
    if (selectedId === null) {
      setDetails(null);
      setDetailsStatus("idle");
      return;
    }

    let ignore = false;

    setDetails(null);
    setDetailsStatus("loading");
    setDetailsError("");

    getItem(selectedId)
      .then((book) => {
        if (ignore) return; // user switched to another book, don't show old details
        setDetails(book);
        setDetailsStatus("success");
      })
      .catch((error) => {
        if (ignore) return;
        setDetailsError(error.message);
        setDetailsStatus("error");
      });

    return () => {
      ignore = true;
    };
  }, [selectedId, detailsReloadCount]);

  // Hide the message after 3 seconds
  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(() => setMessage(null), 3000);

    return () => clearTimeout(timer);
  }, [message]);

  function startBusy(id) {
    setBusyIds((current) => [...current, id]);
  }

  function stopBusy(id) {
    setBusyIds((current) => current.filter((busyId) => busyId !== id));
  }

  function reloadList() {
    setReloadCount((count) => count + 1);
  }

  function handleSearchChange(value) {
    setSearch(value);
    setPage(1);
  }

  function handleSortChange(value) {
    setSort(value);
    setPage(1);
  }

  async function handleToggleStatus() {
    // Remember the book at the moment of the click.
    // The user can select another book while we wait for the API.
    const id = details.id;
    const name = details.name;
    const newStatus = details.status === "available" ? "borrowed" : "available";

    if (busyIds.includes(id)) return;
    startBusy(id);

    try {
      const updated = await updateItem(id, { status: newStatus });

      // update details only if this book is still open
      setDetails((current) => (current && current.id === id ? updated : current));
      setBooks((current) =>
        current.map((book) => (book.id === id ? updated : book)),
      );
      setMessage({ type: "success", text: `"${name}" is now ${newStatus}` });
    } catch (error) {
      setMessage({ type: "error", text: `"${name}" was not updated: ${error.message}` });
    } finally {
      stopBusy(id);
    }
  }

  async function handleDelete() {
    const id = details.id;
    const name = details.name;

    if (busyIds.includes(id)) return;
    if (!window.confirm(`Delete "${name}"?`)) return;

    startBusy(id);

    try {
      await deleteItem(id);
      setSelectedId((current) => (current === id ? null : current));
      setMessage({ type: "success", text: `"${name}" was deleted` });
      reloadList();
    } catch (error) {
      setMessage({ type: "error", text: `"${name}" was not deleted: ${error.message}` });
    } finally {
      stopBusy(id);
    }
  }

  async function handleSave(values) {
    setSaving(true);

    if (form.mode === "create") {
      try {
        const created = await createBook(values);
        setForm(null);
        setSelectedId(created.id);
        setMessage({ type: "success", text: `"${created.name}" was added` });
      } catch (error) {
        setMessage({ type: "error", text: `Book was not saved: ${error.message}` });
      } finally {
        setSaving(false);
        reloadList();
      }
      return;
    }

    const id = form.book.id;
    startBusy(id);

    try {
      const updated = await updateItem(id, values);
      setForm(null);
      setDetails((current) => (current && current.id === id ? updated : current));
      setMessage({ type: "success", text: `"${updated.name}" was updated` });
      reloadList();
    } catch (error) {
      setMessage({ type: "error", text: `Changes were not saved: ${error.message}` });
    } finally {
      setSaving(false);
      stopBusy(id);
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>📚 Mini Library</h1>
          <p className="subtitle">Task 4 · Async React: Effects &amp; API</p>
        </div>
        <button className="btn btn-primary" onClick={() => setForm({ mode: "create" })}>
          + Add book
        </button>
      </header>

      <main className="layout">
        <BookList
          books={books}
          status={listStatus}
          error={listError}
          total={total}
          page={page}
          totalPages={totalPages}
          search={search}
          sort={sort}
          selectedId={selectedId}
          busyIds={busyIds}
          onSearchChange={handleSearchChange}
          onSortChange={handleSortChange}
          onPageChange={setPage}
          onReload={reloadList}
          onSelect={setSelectedId}
        />

        <BookDetails
          status={detailsStatus}
          book={details}
          error={detailsError}
          isBusy={details !== null && busyIds.includes(details.id)}
          onRetry={() => setDetailsReloadCount((count) => count + 1)}
          onToggleStatus={handleToggleStatus}
          onEdit={() => setForm({ mode: "edit", book: details })}
          onDelete={handleDelete}
        />
      </main>

      <footer className="footer">
        Fake API: delay {API_CONFIG.minDelay}–{API_CONFIG.maxDelay} ms, error chance{" "}
        {API_CONFIG.errorChance * 100}%
      </footer>

      {form && (
        <BookForm
          key={form.mode === "edit" ? form.book.id : "new"}
          mode={form.mode}
          book={form.book}
          saving={saving}
          onSave={handleSave}
          onCancel={() => setForm(null)}
        />
      )}

      {message && <div className={`toast toast-${message.type}`}>{message.text}</div>}
    </div>
  );
}

export default App;
