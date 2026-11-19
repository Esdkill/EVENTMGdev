"use server";

import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createTemporaryPassword } from "../../../lib/student-access";
import { studentDocumentFields, studentDocumentNumbers } from "../../../lib/student-documents";
import type { StudentDocumentNumbers } from "../../../lib/student-documents";
import { db } from "../../../lib/db";
import { fullName } from "../../../lib/person-name";
import { groupCode } from "../../../lib/study-groups";
import { getRequestViewer } from "../../../lib/viewer";

const fields = z.object({
  lastName: z.string({ error: "Введите фамилию." }).trim().min(1, "Введите фамилию.").max(50, "Фамилия должна содержать до 50 символов."),
  firstName: z.string({ error: "Введите имя." }).trim().min(1, "Введите имя.").max(50, "Имя должно содержать до 50 символов."),
  patronymic: z.string({ error: "Введите отчество." }).trim().min(1, "Введите отчество.").max(50, "Отчество должно содержать до 50 символов."),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9._]{2,29}$/, "Логин: 3–30 латинских букв, цифр, точек или подчёркиваний"),
  faculty: z.string().trim().min(1, "Укажите факультет").max(100),
  program: z.string().trim().min(1, "Укажите направление").max(100),
  group: groupCode,
  year: z.coerce.number().int().min(1).max(6),
});

type FormError = { error?: string; field?: string };
type State = FormError & { credentials?: { username: string; password: string } };

function fieldError(error: z.ZodError): FormError {
  const issue = error.issues[0];
  return { error: issue.message, field: String(issue.path[0]) };
}

function isUniqueConflict(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

async function documentConflict(numbers: StudentDocumentNumbers, exceptUser?: string) {
  const candidates = studentDocumentFields.flatMap(({ name }) => numbers[name] ? [{ [name]: numbers[name] }] : []);
  if (!candidates.length) return;
  const assigned = await db.studentProfile.findMany({
    where: { OR: candidates, ...(exceptUser ? { userId: { not: exceptUser } } : {}) },
    select: { studentNumber: true, recordBookNumber: true },
  });
  const conflict = studentDocumentFields.find(({ name }) => numbers[name] && assigned.some(person => person[name] === numbers[name]));
  if (conflict) return { error: `${conflict.label} уже указан у другого студента.`, field: conflict.name };
}

export async function createStudent(_previous: State, form: FormData): Promise<State> {
  const viewer = await getRequestViewer();
  if (!viewer) redirect("/");
  if (viewer?.role !== "staff") return { error: "Действие доступно сотруднику деканата." };

  const values = Object.fromEntries(form);
  const parsed = fields.safeParse(values);
  if (!parsed.success) return fieldError(parsed.error);
  const numbers = studentDocumentNumbers.safeParse(values);
  if (!numbers.success) return fieldError(numbers.error);
  const { username, ...profile } = parsed.data;
  const name = fullName(profile);
  const id = randomUUID();
  const { password, expiresAt } = createTemporaryPassword();
  const hash = await hashPassword(password);
  try {
    await db.$transaction([
      db.studyGroup.createMany({ data: [{ code: profile.group }], skipDuplicates: true }),
      db.user.create({
        data: {
          id, name, username, displayUsername: username, email: `${username}@deanery.example`,
          role: "student", mustChangePassword: true, temporaryPasswordExpiresAt: expiresAt,
          studentProfile: { create: { ...profile, ...numbers.data } },
          accounts: { create: { id: randomUUID(), accountId: id, providerId: "credential", password: hash } },
        },
      }),
    ]);
  } catch (error) {
    if (isUniqueConflict(error)) {
      return await documentConflict(numbers.data) ?? { error: "Этот логин уже используется.", field: "username" };
    }
    throw error;
  }

  revalidatePath("/staff/students");
  revalidatePath("/staff/schedule");
  revalidatePath("/staff/announcements");
  return { credentials: { username, password } };
}

type GroupState = { error?: string; created?: string };

export async function createGroup(_previous: GroupState, form: FormData): Promise<GroupState> {
  const viewer = await getRequestViewer();
  if (!viewer) redirect("/");
  if (viewer?.role !== "staff") return { error: "Действие доступно сотруднику деканата." };
  const parsed = groupCode.safeParse(form.get("code"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { count } = await db.studyGroup.createMany({ data: [{ code: parsed.data }], skipDuplicates: true });
  if (count === 0) return { error: "Группа с таким кодом уже есть." };
  revalidatePath("/staff/students");
  revalidatePath("/staff/schedule");
  return { created: parsed.data };
}

type AccessState = { error?: string; revoked?: boolean; credentials?: { password: string; expiresAt: string } };

export async function updateStudentAccess(studentId: string, _previous: AccessState, form: FormData): Promise<AccessState> {
  const viewer = await getRequestViewer();
  if (viewer?.role !== "staff") return { error: "Действие доступно сотруднику деканата." };
  const operation = form.get("operation");
  if (operation !== "revoke" && operation !== "issue") return { error: "Выберите действие." };
  const student = await db.user.findFirst({
    where: { id: studentId, role: "student", studentProfile: { isNot: null } },
    select: { id: true, username: true, isDemo: true },
  });
  if (!student || !student.username || student.isDemo) return { error: "Этот аккаунт недоступен для изменения." };

  const temporary = operation === "issue" ? createTemporaryPassword() : null;
  const hash = temporary ? await hashPassword(temporary.password) : null;
  const updated = await db.$transaction(async tx => {
    const user = await tx.user.updateMany({
      where: { id: student.id, role: "student", username: student.username },
      data: { mustChangePassword: true, temporaryPasswordExpiresAt: temporary?.expiresAt ?? null },
    });
    if (!user.count) return false;

    const accounts = await tx.account.updateMany({
      where: { userId: student.id, providerId: "credential" },
      data: { password: hash },
    });
    if (!accounts.count && hash) {
      await tx.account.create({ data: {
        id: randomUUID(), accountId: student.id, userId: student.id, providerId: "credential", password: hash,
      } });
    }
    await tx.session.deleteMany({ where: { userId: student.id } });
    return true;
  });
  if (!updated) return { error: "Аккаунт изменился. Обновите страницу." };

  revalidatePath("/staff/students");
  revalidatePath(`/staff/students/${student.id}`);
  return temporary ? { credentials: { password: temporary.password, expiresAt: temporary.expiresAt.toISOString() } } : { revoked: true };
}

type DocumentsState = FormError & { saved?: StudentDocumentNumbers };

export async function saveStudentDocuments(studentId: string, _previous: DocumentsState, form: FormData): Promise<DocumentsState> {
  const viewer = await getRequestViewer();
  if (viewer?.role !== "staff") return { error: "Действие доступно сотруднику деканата." };

  const parsed = studentDocumentNumbers.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fieldError(parsed.error);

  try {
    const updated = await db.studentProfile.updateMany({
      where: { userId: studentId, user: { role: "student" } },
      data: parsed.data,
    });
    if (!updated.count) return { error: "Не удалось найти аккаунт студента." };
  } catch (error) {
    if (isUniqueConflict(error)) {
      return await documentConflict(parsed.data, studentId) ?? { error: "Один из номеров уже используется. Проверьте оба поля." };
    }
    throw error;
  }
  revalidatePath(`/staff/students/${studentId}`);
  revalidatePath("/profile");
  return { saved: parsed.data };
}

export async function deleteStudent(studentId: string, _previous: FormError, form: FormData): Promise<FormError> {
  const viewer = await getRequestViewer();
  if (!viewer) redirect("/");
  if (viewer.role !== "staff") return { error: "Действие доступно сотруднику деканата." };
  if (form.get("confirmation") !== "delete") return { error: "Подтвердите удаление аккаунта." };

  try {
    const deleted = await db.$transaction(async tx => {
      const [student] = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT student.id FROM "User" AS student
        JOIN "StudentProfile" AS profile ON profile."userId" = student.id
        WHERE student.id = ${studentId} AND student.role = 'student'
        FOR UPDATE OF student
      `;
      if (!student) return false;

      await tx.bulletin.deleteMany({ where: { audience: "student", target: student.id } });
      await tx.documentRequest.deleteMany({ where: { ownerId: student.id } });
      await tx.deanThread.deleteMany({ where: { ownerId: student.id } });
      await tx.user.delete({ where: { id: student.id } });
      return true;
    });
    if (!deleted) return { error: "Аккаунт студента уже удалён или недоступен." };
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error) {
      if (error.code === "P2003") return { error: "Аккаунт связан с записями других пользователей. Удаление отменено." };
      if (error.code === "P2034") return { error: "Данные изменились во время удаления. Попробуйте снова." };
    }
    throw error;
  }

  revalidatePath("/");
  revalidatePath("/staff");
  revalidatePath("/staff/requests");
  revalidatePath("/staff/students");
  revalidatePath(`/staff/students/${studentId}`);
  revalidatePath("/messages");
  redirect("/staff/students?removed=1");
}
