"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getRequestViewer } from "../lib/viewer";
import { changeStatus, RequestError, saveStaffNote, sendRequestMessage, staffAction, submitRequest } from "../lib/requests";
import { versionField } from "../lib/request-fields";

function feedback(error: unknown) {
  if (error instanceof RequestError) return { error: error.message };
  if (error instanceof z.ZodError) return { error: error.issues[0]?.message ?? "Проверьте поля формы" };
  throw error;
}

export async function createChatRequest(_previous: { error: string }, form: FormData): Promise<{ error: string; id?: string }> {
  const viewer = await getRequestViewer();
  if (!viewer) redirect("/");
  if (viewer.role !== "student") return { error: "Действие недоступно" };
  try {
    const { id } = await submitRequest(viewer.id, form.get("key"), Object.fromEntries(form));
    return { error: "", id };
  } catch (error) {
    return feedback(error);
  }
}

export async function createRequest(previous: { error: string }, form: FormData) {
  const result = await createChatRequest(previous, form);
  if ("id" in result && result.id) redirect(`/requests/${result.id}?submitted=1`);
  return { error: result.error, id: undefined };
}

export async function cancelRequest(id: string, _previous: { error: string }, form: FormData) {
  const viewer = await getRequestViewer();
  if (!viewer) redirect("/");
  try {
    await changeStatus(viewer, id, "cancel", form.get("version"));
  } catch (error) {
    return feedback(error);
  }
  revalidatePath(`/requests/${id}`);
  redirect(`/requests/${id}`);
}

export async function updateRequest(id: string, _previous: { error: string }, form: FormData) {
  const viewer = await getRequestViewer();
  if (!viewer) redirect("/");
  if (viewer.role !== "staff") return { error: "Действие недоступно" };
  try {
    const action = form.get("operation");
    if (action === "note") {
      const note = z.string().trim().max(1000, "Комментарий должен содержать до 1000 символов").parse(form.get("note"));
      await saveStaffNote(id, versionField.parse(form.get("version")), note);
    } else {
      const file = form.get("document");
      await changeStatus(viewer, id, staffAction.parse(action), form.get("version"), form.get("reason"), file instanceof File ? file : undefined);
    }
  } catch (error) {
    return feedback(error);
  }
  revalidatePath(`/staff/requests/${id}`);
  redirect(`/staff/requests/${id}`);
}

export async function postRequestMessage(id: string, _previous: { error: string }, form: FormData) {
  const viewer = await getRequestViewer();
  if (!viewer) redirect("/");
  if (viewer.role !== "staff") return { error: "Действие доступно сотруднику деканата." };
  try {
    await sendRequestMessage(id, viewer.id, form.get("key"), form.get("message"));
  } catch (error) {
    return feedback(error);
  }
  revalidatePath(`/requests/${id}`);
  revalidatePath(`/staff/requests/${id}`);
  redirect(`/staff/requests/${id}#request-messages`);
}
