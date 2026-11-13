import { useState } from "react";
import type { FormEvent } from "react";
import { localDate, shelves, validateBook } from "../lib/books";
import type { Book, BookFields, BookInput, FieldErrors } from "../lib/books";
import { Icon } from "./visuals";

const fieldLabels = {
  title: "Title", author: "Author", status: "Reading status", page: "Current page",
  totalPages: "Total pages", chapter: "Chapter or bookmark", lastRead: "Last reading date", notes: "Personal notes",
};

export function BookForm({ book, progressOnly = false, busy, onSave, cancel }: {
  book?: Book;
  progressOnly?: boolean;
  busy: boolean;
  onSave: (fields: BookFields) => void;
  cancel: string;
}) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const today = localDate(new Date());

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const input = Object.fromEntries(Object.keys(fieldLabels).map((field) => [
      field, String(data.get(field) ?? book?.[field as keyof BookFields] ?? ""),
    ])) as BookInput;
    if (!input.status) input.status = "want";
    if (progressOnly) input.lastRead = today;
    const result = validateBook(input, today);
    if ("errors" in result) {
      setErrors(result.errors);
      const first = Object.keys(result.errors)[0];
      form.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setErrors({});
    onSave(result.value);
  }

  function field(name: Exclude<keyof BookFields, "status" | "notes">, type = "text", maxLength?: number, placeholder?: string) {
    return <label className="field">
      <span>{fieldLabels[name]} {name !== "title" && name !== "author" && <small>Optional</small>}</span>
      <input name={name} type={type} inputMode={name === "page" || name === "totalPages" ? "numeric" : undefined}
        defaultValue={book?.[name]} maxLength={maxLength} max={type === "date" ? today : undefined}
        placeholder={placeholder} required={name === "title" || name === "author"}
        aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `error-${name}` : undefined} />
      {errors[name] && <span className="field-error" id={`error-${name}`}>{errors[name]}</span>}
    </label>;
  }

  return <form onSubmit={submit} noValidate className="panel book-form">
    {!progressOnly && <>
      <div className="form-grid">{field("title", "text", 120)}{field("author", "text", 100)}</div>
      <label className="field"><span>Reading status</span>
        <select name="status" defaultValue={book?.status ?? "want"} aria-invalid={Boolean(errors.status)} aria-describedby={errors.status ? "error-status" : undefined}>
          {shelves.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
        </select>
        {errors.status && <span className="field-error" id="error-status">{errors.status}</span>}
      </label>
    </>}
    <div className="form-grid">{field("page", "text", 16, "e.g. 86")}{field("chapter", "text", 80, "e.g. Chapter 4")}</div>
    {!progressOnly && <div className="form-grid">{field("totalPages", "text", 16, "e.g. 320")}{field("lastRead", "date")}</div>}
    <label className="field">
      <span>Personal notes <small>Optional</small></span>
      <textarea name="notes" rows={4} maxLength={5000} defaultValue={book?.notes}
        placeholder="What would help you remember where you left off?"
        aria-invalid={Boolean(errors.notes)} aria-describedby={errors.notes ? "error-notes" : undefined} />
      {errors.notes && <span className="field-error" id="error-notes">{errors.notes}</span>}
    </label>
    {Object.keys(errors).length > 0 && <p className="field-error" role="alert">Check the highlighted fields and try again.</p>}
    <div className="flex flex-wrap items-center gap-3">
      <button type="submit" className="button primary" disabled={busy}>{busy ? "Saving…" : progressOnly ? "Save reading session" : "Save book"}</button>
      <a className="button secondary" href={cancel}><Icon name="back" size={16} /> Cancel</a>
    </div>
  </form>;
}
