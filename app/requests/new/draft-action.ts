"use server";

import { getAssistantConnection } from "../../../lib/assistant-connection";
import { z } from "zod";
import { demoRequestDraft, requestDraftFromModel } from "../../../lib/request-draft";
import type { DraftResult } from "../../../lib/request-draft-fields";
import { getRequestViewer } from "../../../lib/viewer";

const requestText = z.string().trim().min(8).max(1000);
const minutes = new Map<string, { expires: number; count: number }>();
const unavailable = { error: "Помощник сейчас недоступен. Попробуйте ещё раз или заполните заявку вручную." };

export async function prepareRequestDraft(text: string): Promise<DraftResult> {
  const viewer = await getRequestViewer();
  if (viewer?.role !== "student") return { error: "Войдите в кабинет студента." };
  const description = requestText.safeParse(text);
  if (!description.success) return { error: "Опишите, какая справка нужна, от 8 до 1000 символов." };

  try {
    const settings = await getAssistantConnection();
    const { apiKey, model } = settings;
    if (!apiKey) {
      if (!viewer.isDemo) return { error: "Деканат ещё не подключил ИИ-помощника. Заявку можно заполнить вручную." };
      const draft = demoRequestDraft(description.data);
      return draft ? { draft, demo: true } : { error: "Опишите, какая справка или заявление вам нужны." };
    }

    const now = Date.now();
    for (const [id, usage] of minutes) if (usage.expires <= now) minutes.delete(id);
    const usage = minutes.get(viewer.id) ?? { count: 0, expires: now + 60_000 };
    if (usage.count >= 8) return { error: "Слишком много запросов. Попробуйте через минуту или заполните заявку вручную." };
    minutes.set(viewer.id, { ...usage, count: usage.count + 1 });

    const { supported, ...draft } = await requestDraftFromModel(description.data, { ...settings, apiKey }, model);
    return supported ? { draft, demo: false } : { error: "Опишите, какая справка или заявление вам нужны." };
  } catch {
    return unavailable;
  }
}
