import { useEffect, useState } from "react";
import { Link } from "react-router";
import { getItemsList } from "../api/fakeApi";
import { getServiceWorkerVersion } from "../pwa/pwa";

const CACHE_LABELS = {
  shell: "App shell (precached)",
  pages: "Visited pages",
  static: "Images, icons, fonts",
  api: "Open Library data",
};

function formatBytes(bytes) {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function readCaches() {
  if (!("caches" in window)) return [];
  const names = (await caches.keys()).filter((name) => name.startsWith("mini-library"));
  return Promise.all(
    names.map(async (name) => {
      const cache = await caches.open(name);
      const keys = await cache.keys();
      const type = name.split("-")[2];
      return { name, label: CACHE_LABELS[type] || name, entries: keys.length, runtime: type === "api" || type === "static" };
    }),
  );
}

function DashboardPage() {
  const [status, setStatus] = useState("loading");
  const [books, setBooks] = useState([]);
  const [error, setError] = useState("");
  const [reloadCount, setReloadCount] = useState(0);

  const [cacheInfo, setCacheInfo] = useState({ caches: [], usage: 0, quota: 0, version: null, loaded: false });
  const [cacheReload, setCacheReload] = useState(0);

  useEffect(() => {
    let ignore = false;
    setStatus("loading");

    getItemsList("?page=1&limit=1000&sort=name")
      .then((result) => {
        if (ignore) return;
        setBooks(result.data);
        setStatus("success");
      })
      .catch((err) => {
        if (ignore) return;
        setError(err.message);
        setStatus("error");
      });

    return () => {
      ignore = true;
    };
  }, [reloadCount]);

  useEffect(() => {
    let ignore = false;

    Promise.all([
      readCaches(),
      navigator.storage?.estimate?.() ?? Promise.resolve({}),
      getServiceWorkerVersion(),
    ])
      .then(([cacheList, estimate, version]) => {
        if (ignore) return;
        setCacheInfo({
          caches: cacheList,
          usage: estimate.usage || 0,
          quota: estimate.quota || 0,
          version,
          loaded: true,
        });
      })
      .catch(() => {
        if (!ignore) setCacheInfo((info) => ({ ...info, loaded: true }));
      });

    return () => {
      ignore = true;
    };
  }, [cacheReload]);

  async function clearRuntimeCaches() {
    const runtime = cacheInfo.caches.filter((cache) => cache.runtime);
    await Promise.all(runtime.map((cache) => caches.delete(cache.name)));
    setCacheReload((count) => count + 1);
  }

  const total = books.length;
  const borrowed = books.filter((book) => book.status === "borrowed").length;
  const available = total - borrowed;
  const genres = Object.entries(
    books.reduce((acc, book) => {
      const genre = book.genre || "No genre";
      acc[genre] = acc[genre] || { total: 0, borrowed: 0 };
      acc[genre].total += 1;
      if (book.status === "borrowed") acc[genre].borrowed += 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1].total - a[1].total);
  const borrowedBooks = books.filter((book) => book.status === "borrowed");

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p className="subtitle">Library statistics and offline storage.</p>
        </div>
        <button className="btn" onClick={() => setReloadCount((count) => count + 1)}>
          ↻ Refresh
        </button>
      </div>

      {status === "loading" && (
        <section className="panel">
          <div className="state">
            <span className="spinner" />
            Loading statistics...
          </div>
        </section>
      )}

      {status === "error" && (
        <section className="panel">
          <div className="state state-error">
            <p>Could not load statistics: {error}</p>
            <button className="btn" onClick={() => setReloadCount((count) => count + 1)}>
              Try again
            </button>
          </div>
        </section>
      )}

      {status === "success" && (
        <>
          <div className="stats">
            <div className="stat">
              <span className="stat-label">Books</span>
              <span className="stat-value">{total}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Available</span>
              <span className="stat-value stat-ok">{available}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Borrowed</span>
              <span className="stat-value stat-warn">{borrowed}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Genres</span>
              <span className="stat-value">{genres.length}</span>
            </div>
          </div>

          <div className="dashboard-grid">
            <section className="panel">
              <div className="panel-head">
                <h2>Books by genre</h2>
              </div>
              {genres.length === 0 ? (
                <div className="state">No books yet.</div>
              ) : (
                <ul className="bars">
                  {genres.map(([genre, info]) => (
                    <li key={genre}>
                      <div className="bar-label">
                        <span>{genre}</span>
                        <span className="muted">
                          {info.total} {info.borrowed > 0 && `· ${info.borrowed} borrowed`}
                        </span>
                      </div>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${(info.total / total) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="panel">
              <div className="panel-head">
                <h2>Borrowed now</h2>
                <span className="count">{borrowedBooks.length}</span>
              </div>
              {borrowedBooks.length === 0 ? (
                <div className="state">Every book is on the shelf.</div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Author</th>
                      <th>Shelf</th>
                      <th>Year</th>
                    </tr>
                  </thead>
                  <tbody>
                    {borrowedBooks.map((book) => (
                      <tr key={book.id}>
                        <td data-label="Title">
                          <Link to={`/?book=${book.id}`}>{book.name}</Link>
                        </td>
                        <td data-label="Author">{book.author || "—"}</td>
                        <td data-label="Shelf">{book.shelf || "—"}</td>
                        <td data-label="Year">{book.year || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>
        </>
      )}

      <section className="panel storage-panel">
        <div className="panel-head">
          <h2>Offline storage</h2>
          <button className="btn btn-small" onClick={() => setCacheReload((count) => count + 1)}>
            ↻
          </button>
        </div>

        {!cacheInfo.loaded ? (
          <div className="state">
            <span className="spinner" />
          </div>
        ) : cacheInfo.caches.length === 0 ? (
          <p className="muted">
            No caches yet. The service worker runs in the production build (deployed site or <code>npm run preview</code>).
          </p>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th>Cache</th>
                  <th>Name</th>
                  <th>Entries</th>
                </tr>
              </thead>
              <tbody>
                {cacheInfo.caches.map((cache) => (
                  <tr key={cache.name}>
                    <td data-label="Cache">{cache.label}</td>
                    <td data-label="Name">
                      <code>{cache.name}</code>
                    </td>
                    <td data-label="Entries">{cache.entries}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="muted storage-meta">
              Used {formatBytes(cacheInfo.usage)}
              {cacheInfo.quota ? ` of ${formatBytes(cacheInfo.quota)}` : ""}
              {cacheInfo.version ? ` · app version ${cacheInfo.version}` : ""}. Runtime caches are limited to 80
              images and 60 API answers.
            </p>
            <button className="btn btn-danger" onClick={clearRuntimeCaches}>
              Clear saved images and API data
            </button>
          </>
        )}
      </section>
    </>
  );
}

export default DashboardPage;
