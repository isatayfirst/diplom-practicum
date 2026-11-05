"use client";

import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  titleId: string;
  confirmLabel: string;
  cancelLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  // Куда вернуть фокус при закрытии, если кнопка, открывшая окно, уже исчезла (например, пункт меню).
  returnFocus?: () => HTMLElement | null;
  children?: ReactNode;
};

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [href], select, textarea, [tabindex]:not([tabindex="-1"])';

// Окно подтверждения на нативном <dialog>: showModal делает остальную страницу недоступной,
// а Tab и Shift+Tab мы замыкаем внутри окна сами. Esc закрывает, фокус возвращается на кнопку,
// из которой окно открыли.
export default function ConfirmDialog({
  open,
  title,
  titleId,
  confirmLabel,
  cancelLabel,
  busy = false,
  onConfirm,
  onClose,
  returnFocus,
  children,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const returnFocusRef = useRef(returnFocus);

  useEffect(() => {
    onCloseRef.current = onClose;
    returnFocusRef.current = returnFocus;
  }, [onClose, returnFocus]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
      // Первым получает фокус безопасный выбор: «Отмена».
      dialog.querySelector<HTMLElement>("[data-initial-focus]")?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    // Esc и dialog.close() приходят сюда как событие close.
    const handleClose = () => {
      onCloseRef.current();
      const opener = openerRef.current?.isConnected ? openerRef.current : null;
      (returnFocusRef.current?.() ?? opener)?.focus();
      openerRef.current = null;
    };
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, []);

  function trapFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") return;
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !event.currentTarget.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !event.currentTarget.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="t-dialog"
      aria-labelledby={titleId}
      onKeyDown={trapFocus}
      // Пока идёт запрос, Esc не закрывает окно: иначе результат запроса некуда показать.
      onCancel={(event) => busy && event.preventDefault()}
    >
      <h2 id={titleId} className="t-dialog-title">
        {title}
      </h2>
      {children}
      <div className="t-dialog-actions">
        <button type="button" className="t-button t-button-outline" data-initial-focus onClick={onClose} disabled={busy}>
          {cancelLabel}
        </button>
        <button type="button" className="t-button t-button-solid" onClick={onConfirm} disabled={busy}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
