"use client";

import { useEffect, useState } from "react";
import { studentDocumentFields } from "../../../../lib/student-documents";
import type { StudentDocumentNumbers } from "../../../../lib/student-documents";
import { useRecoverableAction } from "../../../recoverable-action";
import { saveStudentDocuments } from "../actions";

export function StudentDocumentsForm({ studentId, numbers }: { studentId: string; numbers: StudentDocumentNumbers }) {
  const [state, submission, pending] = useRecoverableAction(saveStudentDocuments.bind(null, studentId), {});
  const [values, setValues] = useState(numbers);

  useEffect(() => {
    if (state.saved) setValues(state.saved);
  }, [state.saved]);

  const saved = state.saved ?? numbers;
  const changed = studentDocumentFields.some(({ name }) => (values[name] ?? "") !== (saved[name] ?? ""));

  return <form className="request-form" {...submission}>
    <h3>Учебные документы</h3>
    {studentDocumentFields.map(({ name, label }) => {
      const error = state.field === name && state.error;
      return <label className="field" key={name}>{label}
        <input name={name} value={values[name] ?? ""} onChange={event => {
          const value = event.currentTarget.value;
          setValues(current => ({ ...current, [name]: value }));
        }} maxLength={24} autoComplete="off" autoCapitalize="characters" spellCheck={false}
          disabled={pending} aria-invalid={error ? true : undefined} aria-describedby={error ? "student-documents-error" : undefined} />
      </label>;
    })}
    {state.error && <p id="student-documents-error" className="form-error" role="alert">{state.error}</p>}
    {state.saved && !changed && <p role="status">Номера документов сохранены.</p>}
    <button className="secondary" disabled={pending || !changed}>
      {pending ? "Сохраняем…" : "Сохранить номера"}
    </button>
  </form>;
}
