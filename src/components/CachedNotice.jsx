function formatTime(timestamp) {
  if (!timestamp) return null;
  return new Date(timestamp).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Shown when the data on the screen came from the service-worker cache.
function CachedNotice({ cachedAt }) {
  const time = formatTime(cachedAt);

  return (
    <div className="cached-notice" role="status">
      <span aria-hidden="true">💾</span>
      <span>
        You are viewing <strong>saved data</strong>
        {time ? ` from ${time}` : ""}. It will refresh when the connection is back.
      </span>
    </div>
  );
}

export default CachedNotice;
