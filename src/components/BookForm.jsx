import { useEffect, useState } from "react";

const GENRES = [
  "Novel",
  "Novella",
  "Historical novel",
  "Dystopia",
  "Essay",
  "History",
  "Psychology",
  "Self-help",
  "Programming",
  "Poetry",
];

function BookForm({ mode, book, saving, onSave, onCancel }) {
  const [values, setValues] = useState({
    name: book?.name ?? "",
    author: book?.author ?? "",
    genre: book?.genre ?? "",
    year: book?.year ?? "",
    language: book?.language ?? "",
    shelf: book?.shelf ?? "",
    description: book?.description ?? "",
  });
  const [formError, setFormError] = useState("");

  // close the form with Escape
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && !saving) onCancel();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [saving, onCancel]);

  function handleChange(e) {
    const { name, value } = e.target;
    setValues((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();

    const year = Number(values.year);
    const thisYear = new Date().getFullYear();

    if (!values.name.trim() || !values.author.trim()) {
      setFormError("Title and author are required");
      return;
    }
    if (!Number.isInteger(year) || year < 1000 || year > thisYear) {
      setFormError(`Year must be a number from 1000 to ${thisYear}`);
      return;
    }

    setFormError("");

    const data = {
      name: values.name.trim(),
      author: values.author.trim(),
      genre: values.genre.trim(),
      year,
      language: values.language.trim(),
      shelf: values.shelf.trim().toUpperCase(),
      description: values.description.trim(),
    };

    // a new book is always on the shelf
    if (mode === "create") data.status = "available";

    onSave(data);
  }

  return (
    <div className="overlay" onClick={() => !saving && onCancel()}>
      <form className="modal" onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}>
        <h2>{mode === "create" ? "Add a new book" : "Edit book"}</h2>

        <label>
          Title *
          <input name="name" value={values.name} onChange={handleChange} autoFocus />
        </label>

        <label>
          Author *
          <input name="author" value={values.author} onChange={handleChange} />
        </label>

        <div className="form-row">
          <label>
            Genre
            <input name="genre" list="genres" value={values.genre} onChange={handleChange} />
            <datalist id="genres">
              {GENRES.map((genre) => (
                <option key={genre} value={genre} />
              ))}
            </datalist>
          </label>

          <label>
            Year *
            <input name="year" type="number" value={values.year} onChange={handleChange} />
          </label>
        </div>

        <div className="form-row">
          <label>
            Language
            <input name="language" value={values.language} onChange={handleChange} />
          </label>

          <label>
            Shelf
            <input
              name="shelf"
              placeholder="e.g. A-1"
              value={values.shelf}
              onChange={handleChange}
            />
          </label>
        </div>

        <label>
          Description
          <textarea
            name="description"
            rows="3"
            value={values.description}
            onChange={handleChange}
          />
        </label>

        {formError && <p className="form-error">{formError}</p>}

        <div className="actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
          <button type="button" className="btn" disabled={saving} onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default BookForm;
