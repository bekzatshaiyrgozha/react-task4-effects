import { useState } from "react";
import { coverUrl } from "../api/openLibrary";

// crossOrigin="anonymous" -> a normal CORS response the service worker can cache
// (an "opaque" no-cors image would cost a lot of storage quota).
function BookCover({ coverId, title, size = "M", className = "" }) {
  const [failed, setFailed] = useState(false);
  const src = coverUrl(coverId, size);

  if (!src || failed) {
    return (
      <div className={`cover cover-empty ${className}`} aria-hidden="true">
        <span>{(title || "?").slice(0, 1).toUpperCase()}</span>
      </div>
    );
  }

  return (
    <img
      className={`cover ${className}`}
      src={src}
      alt={`Cover of ${title}`}
      loading="lazy"
      crossOrigin="anonymous"
      onError={() => setFailed(true)}
    />
  );
}

export default BookCover;
