import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { searchWorks } from "../api/openLibrary";
import BookCover from "../components/BookCover";
import CachedNotice from "../components/CachedNotice";
import { checkConnection } from "../pwa/pwa";

const SUGGESTIONS = ["Abai", "Tolkien", "Dostoevsky", "JavaScript", "History of Kazakhstan", "Harry Potter"];
const DEFAULT_QUERY = "Tolkien";
const PAGE_SIZE = 12;

function DiscoverPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q")?.trim() || DEFAULT_QUERY;
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const [input, setInput] = useState(query);
  const [status, setStatus] = useState("loading"); // loading | success | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [reloadCount, setReloadCount] = useState(0);

  // keep the input in sync when the user goes back/forward in history
  useEffect(() => {
    setInput(query);
  }, [query]);

  useEffect(() => {
    let ignore = false;

    setStatus("loading");
    setError(null);

    searchWorks({ query, page, limit: PAGE_SIZE })
      .then((response) => {
        if (ignore) return;
        setResult(response);
        setStatus("success");
      })
      .catch((err) => {
        if (ignore) return;
        setError(err);
        setStatus("error");
      });

    return () => {
      ignore = true;
    };
  }, [query, page, reloadCount]);

  function goTo(nextQuery, nextPage = 1) {
    const params = new URLSearchParams({ q: nextQuery });
    if (nextPage > 1) params.set("page", String(nextPage));
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleSubmit(e) {
    e.preventDefault();
    const value = input.trim();
    if (value) goTo(value);
  }

  async function handleRetry() {
    await checkConnection();
    setReloadCount((count) => count + 1);
  }

  const works = result?.data.works ?? [];
  const totalPages = Math.min(result?.data.totalPages ?? 1, 50);

  let content;

  if (status === "loading") {
    content = (
      <div className="card-grid" aria-busy="true" aria-label="Loading books">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="work-card skeleton" />
        ))}
      </div>
    );
  } else if (status === "error") {
    content = (
      <div className={`state ${error?.offline ? "" : "state-error"}`}>
        <p className="state-title">{error?.offline ? "📡 You are offline" : "Could not load books"}</p>
        <p>
          {error?.offline
            ? `Results for "${query}" were not saved on this device yet. Try a search you made before, or reconnect.`
            : error?.message}
        </p>
        <button className="btn btn-primary" onClick={handleRetry}>
          Retry connection
        </button>
      </div>
    );
  } else if (works.length === 0) {
    content = <div className="state">Nothing found for &quot;{query}&quot;. Try another search.</div>;
  } else {
    content = (
      <ul className="card-grid">
        {works.map((work) => (
          <li key={work.id}>
            <Link className="work-card" to={`/discover/${work.id}`}>
              <BookCover coverId={work.coverId} title={work.title} />
              <span className="work-card-body">
                <span className="work-card-title">{work.title}</span>
                <span className="work-card-meta">{work.authors.join(", ") || "Unknown author"}</span>
                <span className="work-card-meta">
                  {work.year ? `First published ${work.year}` : "Year unknown"}
                  {work.editions ? ` · ${work.editions} editions` : ""}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Discover books</h1>
          <p className="subtitle">Search millions of books from the public Open Library API.</p>
        </div>
      </div>

      <section className="panel">
        <form className="search-form" onSubmit={handleSubmit} role="search">
          <label className="visually-hidden" htmlFor="discover-search">
            Search books
          </label>
          <input
            id="discover-search"
            type="search"
            placeholder="Title, author or subject..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            enterKeyHint="search"
          />
          <button className="btn btn-primary" type="submit" disabled={!input.trim()}>
            Search
          </button>
        </form>

        <div className="chips" aria-label="Suggestions">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className={"chip" + (suggestion === query ? " chip-active" : "")}
              onClick={() => goTo(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>

        {status === "success" && result.fromCache && <CachedNotice cachedAt={result.cachedAt} />}

        {status === "success" && (
          <p className="results-count">
            {result.data.total.toLocaleString()} results for <strong>&quot;{query}&quot;</strong>
          </p>
        )}

        {content}

        {status === "success" && totalPages > 1 && (
          <div className="pagination">
            <button className="btn" disabled={page <= 1} onClick={() => goTo(query, page - 1)}>
              ← Prev
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button className="btn" disabled={page >= totalPages} onClick={() => goTo(query, page + 1)}>
              Next →
            </button>
          </div>
        )}
      </section>
    </>
  );
}

export default DiscoverPage;
