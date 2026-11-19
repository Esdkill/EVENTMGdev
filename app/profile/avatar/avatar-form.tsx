"use client";

import NextImage from "next/image";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { avatarMaxBytes, stockAvatars, stockAvatarSource } from "../../../lib/stock-avatars";
import { useRecoverableAction } from "../../recoverable-action";
import { Icon } from "../../requests/request-ui";
import { changeAvatar } from "./actions";

function cropAvatar(image: HTMLImageElement, position: number) {
  const side = Math.min(image.naturalWidth, image.naturalHeight);
  const x = (image.naturalWidth - side) * position / 100;
  const y = (image.naturalHeight - side) * position / 100;
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Avatar crop unavailable");
  context.drawImage(image, x, y, side, side, 0, 0, canvas.width, canvas.height);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Avatar crop failed")), "image/png");
  });
}

function AvatarCrop({ image, position, onPositionChange, disabled }: {
  image: HTMLImageElement; position: number; onPositionChange: (position: number) => void; disabled: boolean;
}) {
  const drag = useRef<{ id: number; coordinate: number; position: number; travel: number } | null>(null);
  const horizontal = image.naturalWidth > image.naturalHeight;
  const coordinate = (event: PointerEvent<HTMLDivElement>) => horizontal ? event.clientX : event.clientY;

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (disabled || !event.isPrimary || event.button !== 0) return;
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    const excess = Math.abs(image.naturalWidth - image.naturalHeight);
    const travel = excess / side * event.currentTarget.clientWidth;
    if (!travel) return;
    drag.current = { id: event.pointerId, coordinate: coordinate(event), position, travel };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveImage(event: PointerEvent<HTMLDivElement>) {
    const start = drag.current;
    if (disabled || start?.id !== event.pointerId) return;
    const shift = (coordinate(event) - start.coordinate) / start.travel * 100;
    onPositionChange(Math.min(100, Math.max(0, Math.round(start.position - shift))));
  }

  return <div className="avatar-crop">
    <p className="muted">Перетащите фото, чтобы выбрать кадр.</p>
    <div className="avatar-crop-frame" onPointerDown={startDrag} onPointerMove={moveImage}
      onLostPointerCapture={event => { if (drag.current?.id === event.pointerId) drag.current = null; }}>
      <NextImage src={image.src} width={176} height={176} alt="Кадр аватарки 1:1" unoptimized draggable={false}
        style={{ objectPosition: horizontal ? `${position}% center` : `center ${position}%` }} />
    </div>
    <label>
      <span>{horizontal ? "Сдвиг кадра по горизонтали" : "Сдвиг кадра по вертикали"}</span>
      <input type="range" min={0} max={100} value={position}
        onChange={event => onPositionChange(event.currentTarget.valueAsNumber)} disabled={disabled} />
    </label>
  </div>;
}

export function AvatarForm({ chosen, uploads }: { chosen: string; uploads: { id: string }[] }) {
  const [file, setFile] = useState<File | null>(null);
  const [decoded, setDecoded] = useState<{ file: File; image: HTMLImageElement } | null>(null);
  const [fileError, setFileError] = useState("");
  const [position, setPosition] = useState(50);
  const image = decoded && decoded.file === file ? decoded.image : null;
  const needsCrop = image !== null && image.naturalWidth !== image.naturalHeight;
  const [upload, uploadSubmission, uploading] = useRecoverableAction(async (state, fields) => {
    if (image && needsCrop) {
      try {
        const cropped = await cropAvatar(image, position);
        fields.set("avatar", cropped, "avatar.png");
      } catch {
        return { error: "Не удалось обрезать аватарку. Выберите изображение ещё раз." };
      }
    }
    return changeAvatar(state, fields);
  }, { error: "" });
  const [selection, selectSubmission, selecting] = useRecoverableAction(changeAvatar, { error: "" });
  const [remove, removeSubmission, removing] = useRecoverableAction(changeAvatar, { error: "" });
  const pending = uploading || selecting || removing;

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const image = new window.Image();
    let active = true;
    image.src = url;
    image.decode().then(() => {
      if (active) setDecoded({ file, image });
    }, () => {
      if (active) setFileError("Не удалось открыть изображение. Выберите JPG, PNG или WebP.");
    });
    return () => { active = false; URL.revokeObjectURL(url); };
  }, [file]);

  const choices = [
    ...stockAvatars.map(avatar => ({ value: `preset:${avatar.id}`, label: avatar.label, src: stockAvatarSource(avatar.id) })),
    ...uploads.map(({ id }, index) => ({ value: `upload:${id}`, label: `Моя аватарка ${index + 1}`, src: `/api/v1/avatar?upload=${id}` })),
  ];

  return <>
    <div className="avatar-options">
      <section className="surface request-summary">
        <h2 id="avatar-gallery-heading">Выбрать аватарку</h2>
        <form className="request-form" aria-labelledby="avatar-gallery-heading" aria-busy={selecting} {...selectSubmission}>
          <input type="hidden" name="intent" value="select" />
          <div className="avatar-gallery">
            {choices.map(({ value, label, src }) => <button type="submit" name="avatarChoice" value={value} key={value}
              aria-label={label} aria-pressed={chosen === value} title={label} className="avatar-tile" disabled={pending}>
              <NextImage src={src} alt="" width={128} height={128} unoptimized />
              {chosen === value && <span className="avatar-tile-check" aria-hidden="true"><Icon name="request-check" size={11} monochrome /></span>}
            </button>)}
          </div>
          {selection.error && <p className="form-error" role="alert">{selection.error}</p>}
        </form>
      </section>
      <section className="surface request-summary">
        <h2>Загрузить аватарку</h2>
        <form className="request-form" {...uploadSubmission}>
          <input type="hidden" name="intent" value="upload" />
          <label className="avatar-upload">
            <input type="file" name="avatar" accept=".jpg,.jpeg,.png,.webp" aria-label="Выбрать файл" aria-describedby="avatar-formats"
              onChange={event => {
                const selected = event.currentTarget.files?.[0] ?? null;
                const tooLarge = Boolean(selected && selected.size > avatarMaxBytes);
                setFileError(tooLarge ? "Изображение должно быть не больше 5 МБ." : "");
                setPosition(50);
                setDecoded(null);
                setFile(tooLarge ? null : selected);
              }} required disabled={pending} />
            <span className="contact-icon"><Icon name="home-file-plus" size={20} monochrome /></span>
            <span className="avatar-upload-copy">
              <strong>{file?.name || "Выбрать файл"}</strong>
              <span className="muted" id="avatar-formats">Квадрат 1:1 · JPG, PNG или WebP до 5 МБ</span>
            </span>
          </label>
          {image && needsCrop && <AvatarCrop image={image} position={position} onPositionChange={setPosition} disabled={pending} />}
          {(fileError || upload.error) && <p className="form-error" role="alert">{fileError || upload.error}</p>}
          <button className="primary" disabled={pending || !image}>{uploading ? "Загружаем…" : "Добавить аватарку"}</button>
        </form>
      </section>
    </div>
    {chosen && <form {...removeSubmission}>
      <input type="hidden" name="intent" value="remove" />
      {remove.error && <p className="form-error" role="alert">{remove.error}</p>}
      <button className="text-action danger-text" disabled={pending}>{removing ? "Убираем…" : "Убрать аватарку из профиля"}</button>
    </form>}
  </>;
}
