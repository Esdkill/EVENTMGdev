"use client";

import { useEffect, useState } from "react";
import { promoImageUrl, promoPlacements, type PromoPlacement } from "../../../lib/promo-banners";
import { useRecoverableAction } from "../../recoverable-action";
import { savePromoBanner } from "./actions";

export type BannerFields = { id: string; title: string; href: string | null; placements: PromoPlacement[]; published: boolean };

export function BannerForm({ initial, id }: { initial?: BannerFields; id: string }) {
  const [state, submission, pending] = useRecoverableAction(savePromoBanner, { error: "" });
  const [noHref, setNoHref] = useState(initial?.href === null);
  const [preview, setPreview] = useState<string>();
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const imageSrc = preview || (initial && promoImageUrl(initial.id));

  return <form className="surface request-summary request-form" {...submission}>
    <h2>{initial ? "Редактирование баннера" : "Новый баннер"}</h2>
    <input type="hidden" name="id" value={id} />
    {initial && <input type="hidden" name="edit" value="yes" />}
    <label className="field">Название баннера
      <input name="title" defaultValue={initial?.title} required maxLength={160} />
    </label>
    <label className="field">Ссылка, которая откроется по нажатию
      <input name="href" type="url" defaultValue={initial?.href ?? ""} placeholder="https://…" disabled={noHref} required={!noHref} maxLength={600} />
    </label>
    <label className="promo-no-href">
      <input type="checkbox" name="noHref" value="yes" checked={noHref} onChange={event => setNoHref(event.currentTarget.checked)} />
      Ссылки нет
    </label>
    <fieldset className="field promo-placement-options">
      <legend>Где показать</legend>
      {Object.entries(promoPlacements).map(([key, label]) => (
        <label key={key}>
          <input type="checkbox" name="placements" value={key} defaultChecked={(initial?.placements ?? ["home"]).includes(key as PromoPlacement)} />
          {label}
        </label>
      ))}
    </fieldset>
    <label className="field">Изображение баннера
      <input type="file" name="image" accept="image/png,image/jpeg" aria-describedby="promo-image-hint" required={!initial}
        onChange={event => {
          const file = event.currentTarget.files?.[0];
          setPreview(file ? URL.createObjectURL(file) : undefined);
        }} />
    </label>
    <p className="muted" id="promo-image-hint">Рекомендуемый размер 1600 × 400 px (4:1). PNG или JPG, до 5 МБ. Важный текст размещайте крупно, чтобы его было видно на телефоне.</p>
    {imageSrc && <figure className="promo-figure">
      <img src={imageSrc} alt="Предпросмотр баннера" />
      <figcaption className="muted">Предпросмотр</figcaption>
    </figure>}
    {state.error && <p className="form-error" role="alert">{state.error}</p>}
    <div className="assistant-settings-actions">
      {!initial?.published && <button className="secondary" name="intent" value="draft" disabled={pending}>Сохранить черновик</button>}
      <button className="primary" name="intent" value="publish" disabled={pending}>
        {pending ? "Сохраняем…" : initial?.published ? "Сохранить изменения" : "Опубликовать баннер"}
      </button>
    </div>
  </form>;
}
