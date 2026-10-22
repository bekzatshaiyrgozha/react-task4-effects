# Mini Library — Task 4 (Async React: Effects & API)

A small library app built with React + Vite on top of the provided
[fake API](https://github.com/leravanna/fake-api) (Promises, random delays, random errors, `localStorage`).

## Features

- Book list loaded with `useEffect` (search, sort A→Z / Z→A, pagination)
- Click a book → its details are loaded asynchronously with `getItem(id)`
- Every book has 8 fields: title, description, author, genre, year, language, shelf, status
- Create, Edit, Delete books
- **Borrow / Return** action — updates the selected book through the API
- Loading, error (with "Try again"), empty and success states
- Reload button for the list
- Responsive layout (works on phone)

## How async problems are solved

| Problem | Solution |
|---|---|
| Race conditions (fast switching between books) | Every effect has an `ignore` flag. The cleanup sets `ignore = true`, so an old response is never shown. |
| Stale closures (Borrow / Return) | The book `id` is saved at the moment of the click. After the response, state is updated with functional `setState` and only if `current.id === id`. |
| Conflicting actions | While a book has a request in progress, its id is in `busyIds` and its buttons are disabled. |
| Cleanup | `ignore` flags for requests, `clearTimeout` for the toast, `removeEventListener` for the Escape key in the form. |

## Restrictions followed

- Only `useState` and `useEffect`, no custom hooks, no debouncing
- No fetching libraries
- Components never touch `localStorage` — only the fake API does
- `fakeApi.js` is not changed. Because `createItem` saves only `name` and `description`,
  `src/api/books.js` creates the item and then saves the other fields with `updateItem`.

## Run locally

```bash
npm install
npm run dev
```

Network settings (delay, error chance) are in `src/api/settings.js`.
To reset the data, delete the `library-books-data` key in DevTools → Application → Local Storage.
# react-task4-effects
