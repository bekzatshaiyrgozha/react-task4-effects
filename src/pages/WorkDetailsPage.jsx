import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { getAuthor, getWork } from "../api/openLibrary";
import { createBook } from "../api/books";
import BookCover from "../components/BookCover";
import CachedNotice from "../components/CachedNotice";

function parseYear(text) {
  const match = String(text || "").match(/\d{4}/);
  return match ? Number(match[0]) : null;
}

function WorkDetailsPage() {
  const { workId } = useParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState("loading"); // loading | success | error
  const [work, setWork] = useState(null);
  const [authors, setAuthors] = useState([]);
  const [fromCache, setFromCache] = useState(false);
  const [cachedAt, setCachedAt] = useState(null);
  const [error, setError] = useState(null);
  const [reloadCount, setReloadCount] = useState(0);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved | error

  useEffect(() => {
    let ignore = false;

    setStatus("loading");
    setError(null);
    setAuthors([]);
    setSaveState("idle");

    async function load() {
      try {
        const result = await getWork(workId);
        if (ignore) return;

        setWork(result.data);
        setFromCache(result.fromCache);
        setCachedAt(result.cachedAt);
        setStatus("success");

        // authors are extra info: if they fail, the page still works
        const authorResults = await Promise.allSettled(result.data.authorKeys.map((key) => getAuthor(key)));
        if (ignore) return;
        setAuthors(
          authorResults.filter((item) => item.status === "fulfilled").map((item) => item.value.data.name),
        );
        if (authorResults.some((item) => item.status === "fulfilled" && item.value.fromCache)) {
          setFromCache(true);
        }
      } catch (err) {
        if (ignore) return;

        // Navigation cannot be completed offline -> show the offline page.
        if (err.offline) {
          window.location.replace(`/offline?from=${encodeURIComponent(window.location.pathname)}`);
          return;
        }
        setError(err);
        setStatus("error");
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, [workId, reloadCount]);

  async function handleAddToLibrary() {
    setSaveState("saving");
    try {
      const created = await createBook({
        name: work.title,
        author: authors.join(", ") || "Unknown author",
        genre: work.subjects[0] || "",
        year: parseYear(work.firstPublished) || "",
        language: "",
        shelf: "",
        description: work.description.slice(0, 400) || `Added from Open Library (${work.id}).`,
        status: "available",
      });
      setSaveState("saved");
      setTimeout(() => navigate(`/?book=${created.id}`), 600);
    } catch {
      setSaveState("error");
    }
  }

  if (status === "loading") {
    return (
      <section className="panel">
        <div className="state">
          <span className="spinner" />
          Loading book...
        </div>
      </section>
    );
  }

  if (status === "error") {
    return (
      <section className="panel">
        <div className="state state-error">
          <p className="state-title">Could not load this book</p>
          <p>{error?.message}</p>
          <div className="actions actions-center">
            <button className="btn btn-primary" onClick={() => setReloadCount((count) => count + 1)}>
              Try again
            </button>
            <Link className="btn" to="/discover">
              Back to search
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <button type="button" className="back-link" onClick={() => navigate(-1)}>
        ← Back
      </button>

      {fromCache && <CachedNotice cachedAt={cachedAt} />}

      <article className="panel work-details">
        <BookCover coverId={work.coverId} title={work.title} size="L" className="work-details-cover" />

        <div className="work-details-body">
          <h1>{work.title}</h1>
          <p className="details-author">{authors.length ? authors.join(", ") : "Author info is loading or unknown"}</p>

          <dl className="fields">
            <div>
              <dt>First published</dt>
              <dd>{work.firstPublished || "—"}</dd>
            </div>
            <div>
              <dt>Open Library ID</dt>
              <dd>{work.id}</dd>
            </div>
          </dl>

          <p className="details-description">{work.description || "No description in Open Library."}</p>

          {work.subjects.length > 0 && (
            <>
              <h2 className="section-title">Subjects</h2>
              <ul className="tags">
                {work.subjects.map((subject) => (
                  <li key={subject}>{subject}</li>
                ))}
              </ul>
            </>
          )}

          {work.places.length > 0 && (
            <>
              <h2 className="section-title">Places</h2>
              <ul className="tags">
                {work.places.map((place) => (
                  <li key={place}>{place}</li>
                ))}
              </ul>
            </>
          )}

          <div className="actions">
            <button
              className="btn btn-primary"
              onClick={handleAddToLibrary}
              disabled={saveState === "saving" || saveState === "saved"}
            >
              {saveState === "saving" ? "Adding..." : saveState === "saved" ? "✓ Added" : "+ Add to my library"}
            </button>
            <a
              className="btn"
              href={`https://openlibrary.org/works/${work.id}`}
              target="_blank"
              rel="noreferrer"
            >
              Open on openlibrary.org ↗
            </a>
          </div>
          {saveState === "error" && <p className="form-error">Could not add the book. Please try again.</p>}
        </div>
      </article>
    </>
  );
}

export default WorkDetailsPage;
