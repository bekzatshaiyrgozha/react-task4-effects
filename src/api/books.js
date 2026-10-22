import { createItem, updateItem } from "./fakeApi";

// createItem from the fake API saves only name and description,
// so right after creating I save the other fields with updateItem.
export async function createBook(book) {
  const created = await createItem({
    name: book.name,
    description: book.description,
  });

  return updateItem(created.id, book);
}
