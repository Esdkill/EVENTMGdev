import type { MouseEvent, PointerEvent } from "react";

const backdropPresses = new WeakSet<HTMLDialogElement>();

function isBackdrop(event: PointerEvent<HTMLDialogElement> | MouseEvent<HTMLDialogElement>) {
  const dialog = event.currentTarget;
  if (event.target !== dialog || !dialog.matches(":modal")) return false;
  const bounds = dialog.getBoundingClientRect();
  return event.clientX < bounds.left || event.clientX >= bounds.right ||
    event.clientY < bounds.top || event.clientY >= bounds.bottom;
}

export const dialogBackdrop = {
  onPointerDown(event: PointerEvent<HTMLDialogElement>) {
    backdropPresses.delete(event.currentTarget);
    if (event.isPrimary && event.button === 0 && isBackdrop(event)) backdropPresses.add(event.currentTarget);
  },
  onClick(event: MouseEvent<HTMLDialogElement>, dismiss?: () => void) {
    if (!backdropPresses.delete(event.currentTarget) || !isBackdrop(event)) return;
    if (dismiss) dismiss();
    else event.currentTarget.close();
  },
};
