"use client";

import { useEffect, useRef, useState } from "react";
import { assistantBehaviors, assistantTones } from "../../../lib/assistant-conversation";
import type { AssistantBehavior, AssistantTone } from "../../../lib/assistant-conversation";
import { useRecoverableAction } from "../../recoverable-action";
import { knowledgeFileLimitMb } from "../../../lib/assistant-knowledge-limits";
import { assistantApiAddress, assistantProviders, type AssistantProvider } from "../../../lib/assistant-api-settings";
import type { AssistantModel } from "../../../lib/assistant-api";
import { addKnowledgeDocument, loadAssistantModels, removeAssistantConnection, revealAssistantKey, saveAssistantConnection, saveAssistantConversation } from "./actions";

type ModelCatalog = { models: AssistantModel[] } | { error: string };
type SavedConnection = { apiUrl: string; model: string; provider: AssistantProvider; revision: string };

export function AssistantApiPanel({ connection }: { connection: SavedConnection | null }) {
  const [view, setView] = useState<"edit" | "remove" | null>(null);
  const [state, submission, pending] = useRecoverableAction(removeAssistantConnection, { error: "" });

  if (!connection) return <AssistantConnectionForm connection={null} />;

  return <details className="assistant-connection-menu" onToggle={event => {
    if (!event.currentTarget.open) setView(null);
  }}>
    <summary>Подключённые API</summary>
    <div className="detail-stack">
      <div>
        <p className="muted">Чат и черновики</p>
        <strong>{assistantProviders[connection.provider].label}</strong>
        <p className="muted">{connection.apiUrl}</p>
      </div>
      {view === "remove" ? <form className="detail-stack" {...submission}>
        <input type="hidden" name="revision" value={connection.revision} />
        <p>Удалить общий ключ? Чат и черновики через этот API станут недоступны.</p>
        {state.error && <p className="form-error" role="alert">{state.error}</p>}
        <div className="assistant-settings-actions">
          <button type="submit" className="danger-outline" disabled={pending}>{pending ? "Удаляем…" : "Подтвердить удаление"}</button>
          <button type="button" className="secondary" onClick={() => setView(null)} disabled={pending}>Отмена</button>
        </div>
      </form> : <>
        <div className="assistant-settings-actions">
          <button type="button" className="secondary" onClick={() => setView(view === "edit" ? null : "edit")}
            aria-expanded={view === "edit"}>{view === "edit" ? "Свернуть настройки" : "Изменить подключение"}</button>
          <button type="button" className="danger-outline" onClick={() => setView("remove")}>Удалить подключение</button>
        </div>
        {view === "edit" && <AssistantConnectionForm connection={connection} />}
      </>}
    </div>
  </details>;
}

function AssistantConnectionForm({ connection }: { connection: SavedConnection | null }) {
  const [state, submission, pending] = useRecoverableAction(saveAssistantConnection, { error: "" });
  const [selectedModel, setSelectedModel] = useState(connection?.model ?? "");
  const [apiUrl, setApiUrl] = useState(connection?.apiUrl ?? "");
  const [selectedProvider, setSelectedProvider] = useState<AssistantProvider | "">(connection?.provider ?? "");
  const [key, setKey] = useState("");
  const [revealed, setRevealed] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [keyError, setKeyError] = useState("");
  const [revealing, setRevealing] = useState(false);
  const [catalog, setCatalog] = useState<ModelCatalog>();
  const [loadAttempt, setLoadAttempt] = useState(0);
  const providerOption = selectedProvider ? assistantProviders[selectedProvider] : null;
  const providerHint = providerOption && "hint" in providerOption ? providerOption.hint : "Можно указать другой адрес из инструкции поставщика.";
  const enteredKey = key.trim();
  const address = apiUrl.trim().replace(/\/+$/, "");
  const knownAddress = assistantApiAddress(address);
  const canReuseKey = knownAddress === connection?.apiUrl;
  const canLoadModels = address.startsWith("https://") && Boolean(enteredKey || canReuseKey);
  const models = catalog && "models" in catalog ? catalog.models : [];
  const fetchingCatalog = canLoadModels && !catalog;
  const availableModel = models.some(item => item.id === selectedModel) ? selectedModel : "";

  useEffect(() => {
    if (!canLoadModels) return;
    let active = true;
    const timer = window.setTimeout(async () => {
      let result: ModelCatalog;
      try {
        result = await loadAssistantModels(address, enteredKey);
      } catch {
        result = { error: "Не удалось загрузить список моделей." };
      }
      if (!active) return;
      setCatalog(result);
    }, enteredKey ? 450 : 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [address, canLoadModels, enteredKey, loadAttempt]);

  function changeAddress(value: string) {
    if (value.trim().replace(/\/+$/, "") !== address) {
      setCatalog(undefined);
      setKey("");
      setSelectedModel(value === connection?.apiUrl ? connection.model : "");
      setRevealed(null);
      setVisible(false);
    }
    setApiUrl(value);
  }

  async function toggleKey() {
    setKeyError("");
    if (visible) {
      setVisible(false);
      setRevealed(null);
      return;
    }
    if (key) {
      setVisible(true);
      return;
    }
    setRevealing(true);
    try {
      const result = await revealAssistantKey();
      if (result.key) {
        setRevealed(result.key);
        setVisible(true);
      } else setKeyError(result.error || "Не удалось показать сохранённый ключ.");
    } catch {
      setKeyError("Не удалось показать сохранённый ключ.");
    } finally {
      setRevealing(false);
    }
  }

  return <form className="request-form" {...submission}>
    <label className="field">Поставщик
      <select name="provider" value={selectedProvider} required onChange={event => {
        const next = event.currentTarget.value as AssistantProvider;
        setSelectedProvider(next);
        changeAddress(next === connection?.provider ? connection.apiUrl : assistantProviders[next].apiUrl);
      }}>
        <option value="" disabled>Выберите поставщика</option>
        {Object.entries(assistantProviders).map(([id, item]) => <option key={id} value={id}>{item.label}</option>)}
      </select>
    </label>
    <label className="field">Адрес API
      <input name="apiUrl" type="url" value={apiUrl} maxLength={500} placeholder="https://api.example.com/v1" required
        onChange={event => changeAddress(event.currentTarget.value)} />
      <span className="muted">{providerHint}</span>
    </label>
    <div className="field">
      <label htmlFor="assistant-api-key">Ключ API</label>
      <div className="assistant-key-row">
        <input id="assistant-api-key" type={visible ? "text" : "password"} name={revealed === null ? "key" : undefined}
          value={revealed ?? key} required={!canReuseKey} readOnly={revealed !== null} autoComplete="off" spellCheck={false} maxLength={4096}
          placeholder={canReuseKey ? "Ключ сохранён" : "Вставьте ключ API"} onChange={event => {
            const value = event.currentTarget.value;
            if (value.trim() !== enteredKey) setCatalog(undefined);
            setKey(value);
          }} />
        <button type="button" className="secondary" onClick={toggleKey} disabled={revealing || (!key && !canReuseKey)} aria-controls="assistant-api-key">
          {visible ? "Скрыть ключ" : "Показать ключ"}
        </button>
      </div>
      {keyError && <p className="form-error" role="alert">{keyError}</p>}
    </div>
    <label className="field">Модель
      <select name="model" value={availableModel} onChange={event => setSelectedModel(event.currentTarget.value)} disabled={!models.length} required>
        <option value="" disabled>{fetchingCatalog ? "Загружаем модели…" : models.length ? "Выберите модель" :
          canLoadModels ? "Список моделей недоступен" : "Введите адрес и ключ API"}</option>
        {models.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
    </label>
    {catalog && "error" in catalog ? <p className="form-error" role="alert">{catalog.error}</p> :
      catalog && !models.length ? <p className="muted">API вернул пустой список моделей для этого ключа.</p> :
      models.length > 0 ? <p className="muted" role="status">Поставщик вернул {models.length} моделей. Чтобы проверить доступ к выбранной модели, нажмите «Проверить подключение».</p> : null}
    <div className="assistant-settings-actions">
      <button type="button" className="secondary" onClick={() => { setCatalog(undefined); setLoadAttempt(attempt => attempt + 1); }} disabled={pending || fetchingCatalog || !canLoadModels}>
        {fetchingCatalog ? "Загружаем модели…" : "Загрузить модели"}
      </button>
    </div>
    {state.error && <p className="form-error" role="alert">{state.error}</p>}
    {state.message && <p className="request-callout" role="status">{state.message}</p>}
    <div className="assistant-settings-actions">
      <button className="secondary" name="intent" value="check" disabled={pending || !availableModel}>Проверить подключение</button>
      <button className="primary" name="intent" value="save" disabled={pending || !availableModel}>{pending ? "Проверяем…" : "Сохранить настройки"}</button>
    </div>
  </form>;
}

export function AssistantConversationForm({ tone, behavior }: { tone: AssistantTone; behavior: AssistantBehavior }) {
  const [state, submission, pending] = useRecoverableAction(saveAssistantConversation, { error: "" });
  const [selectedTone, setSelectedTone] = useState(tone);

  return <form className="request-form" {...submission}>
    <label className="field">Тон общения
      <select name="tone" value={selectedTone} onChange={event => setSelectedTone(event.currentTarget.value as AssistantTone)}>
        {Object.entries(assistantTones).map(([value, option]) => <option key={value} value={value}>{option.label}</option>)}
      </select>
    </label>
    <p className="muted">Пример приветствия — «{assistantTones[selectedTone].greeting}»</p>
    <label className="field">Как отвечать
      <select name="behavior" defaultValue={behavior}>
        {Object.entries(assistantBehaviors).map(([value, option]) => <option key={value} value={value}>{option.label}</option>)}
      </select>
    </label>
    {state.error && <p className="form-error" role="alert">{state.error}</p>}
    <div className="assistant-settings-actions">
      <button className="primary" disabled={pending}>{pending ? "Сохраняем…" : "Сохранить стиль ответов"}</button>
    </div>
  </form>;
}

export function AssistantKnowledgeForm() {
  const input = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [dropError, setDropError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [state, submission, pending] = useRecoverableAction(addKnowledgeDocument, { error: "" });

  return <form className="request-form" {...submission}>
    <div className={`assistant-knowledge-drop${dragging ? " is-dragging" : ""}`}
      onDragOver={event => { event.preventDefault(); if (!pending) setDragging(true); }}
      onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false); }}
      onDrop={event => {
        event.preventDefault();
        setDragging(false);
        if (pending || !input.current) return;
        const files = event.dataTransfer.files;
        if (files.length !== 1) {
          setDropError("Перетащите один файл за раз.");
          return;
        }
        input.current.files = files;
        setFileName(files[0].name);
        setDropError("");
      }}>
      <p>{dragging ? "Отпустите файл для загрузки" : "Перетащите документ сюда"}</p>
      <button className="secondary" type="button" disabled={pending} onClick={() => input.current?.click()}>Выбрать файл</button>
      <input type="file" name="document" ref={input} hidden accept=".pdf,.docx,.txt,.jpg,.jpeg,.png"
        onChange={event => { setFileName(event.currentTarget.files?.[0]?.name ?? ""); setDropError(""); }} />
      <p className="muted">PDF, DOCX, TXT, JPG или PNG до {knowledgeFileLimitMb} МБ</p>
    </div>
    {fileName && <p className="assistant-file-name" role="status">{fileName}{pending ? " · Извлекаем текст и добавляем в поиск…" : ""}</p>}
    {(dropError || state.error) && <p className="form-error" role="alert">{dropError || state.error}</p>}
    <div className="assistant-settings-actions">
      <button className="primary" disabled={!fileName || pending}>{pending ? "Обрабатываем документ…" : "Добавить в базу знаний"}</button>
    </div>
  </form>;
}
