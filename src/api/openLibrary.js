// Public API: Open Library (https://openlibrary.org/developers/api).
// No keys, no auth — safe to keep in the shared service-worker cache.
// The service worker answers with a saved copy when the network is down
// and marks it with the "x-sw-cache: hit" header.

import { markOffline } from "../pwa/pwa";

const BASE_URL = "https://openlibrary.org";
const SEARCH_FIELDS = "key,title,author_name,first_publish_year,cover_i,edition_count,language";

export class ApiError extends Error {
  constructor(message, { offline = false, status = 0 } = {}) {
    super(message);
    this.name = "ApiError";
    this.offline = offline;
    this.status = status;
  }
}

async function request(path) {
  let response;

  try {
    response = await fetch(BASE_URL + path);
  } catch {
    markOffline();
    throw new ApiError("No internet connection", { offline: true });
  }

  if (!response.ok) {
    const offline = response.headers.get("x-sw-offline") === "1";
    if (offline) markOffline();
    throw new ApiError(
      offline ? "You are offline and this data was not saved yet" : `Server error (${response.status})`,
      { offline, status: response.status },
    );
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new ApiError("The server sent an invalid answer");
  }

  const fromCache = response.headers.get("x-sw-cache") === "hit";
  const cachedAt = Number(response.headers.get("sw-cached-at")) || null;

  return { data, fromCache, cachedAt };
}

// Parameters are always added in the same order -> same URL -> same cache entry.
export async function searchWorks({ query, page = 1, limit = 12 }) {
  const params = new URLSearchParams({
    q: query,
    page: String(page),
    limit: String(limit),
    fields: SEARCH_FIELDS,
  });

  const result = await request(`/search.json?${params}`);
  const docs = Array.isArray(result.data.docs) ? result.data.docs : [];

  return {
    ...result,
    data: {
      total: result.data.numFound ?? docs.length,
      totalPages: Math.max(1, Math.ceil((result.data.numFound ?? docs.length) / limit)),
      works: docs.map(toWorkSummary),
    },
  };
}

export async function getWork(workId) {
  if (!/^OL\d+W$/.test(workId)) {
    throw new ApiError("Wrong book id", { status: 404 });
  }

  const result = await request(`/works/${workId}.json`);
  const work = result.data;

  return {
    ...result,
    data: {
      id: workId,
      title: work.title || "Untitled",
      description: readText(work.description),
      subjects: Array.isArray(work.subjects) ? work.subjects.slice(0, 12) : [],
      places: Array.isArray(work.subject_places) ? work.subject_places.slice(0, 6) : [],
      firstPublished: work.first_publish_date || null,
      coverId: Array.isArray(work.covers) ? work.covers.find((id) => id > 0) ?? null : null,
      authorKeys: Array.isArray(work.authors)
        ? work.authors.map((item) => item?.author?.key).filter(Boolean).slice(0, 3)
        : [],
    },
  };
}

export async function getAuthor(authorKey) {
  const result = await request(`${authorKey}.json`);
  return { ...result, data: { key: authorKey, name: result.data.name || "Unknown author" } };
}

export function coverUrl(coverId, size = "M") {
  return coverId ? `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg` : null;
}

function toWorkSummary(doc) {
  return {
    id: String(doc.key || "").replace("/works/", ""),
    title: doc.title || "Untitled",
    authors: Array.isArray(doc.author_name) ? doc.author_name.slice(0, 2) : [],
    year: doc.first_publish_year ?? null,
    coverId: doc.cover_i ?? null,
    editions: doc.edition_count ?? 0,
    languages: Array.isArray(doc.language) ? doc.language.slice(0, 3) : [],
  };
}

function readText(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value.value === "string") return value.value;
  return "";
}
