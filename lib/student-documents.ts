import { z } from "zod";

export const studentDocumentFields = [
  { name: "studentNumber", label: "Номер студенческого билета" },
  { name: "recordBookNumber", label: "Номер зачётной книжки" },
] as const;

const number = z.string().trim().toUpperCase();

export const studentCardNumber = number.regex(
  /^[A-ZА-ЯЁ0-9][A-ZА-ЯЁ0-9-]{5,23}$/,
  "Номер студенческого должен содержать от 6 до 24 букв, цифр или дефисов.",
);

const recordBookNumber = number.regex(
  /^[A-ZА-ЯЁ0-9][A-ZА-ЯЁ0-9-]{0,23}$/,
  "Укажите до 24 букв, цифр или дефисов. Номер должен начинаться с буквы или цифры.",
);

function optionalNumber(schema: z.ZodString) {
  return z.preprocess(
    value => typeof value === "string" && !value.trim() ? null : value ?? null,
    schema.nullable(),
  );
}

export const studentDocumentNumbers = z.object({
  studentNumber: optionalNumber(studentCardNumber),
  recordBookNumber: optionalNumber(recordBookNumber),
});

export type StudentDocumentNumbers = z.infer<typeof studentDocumentNumbers>;
