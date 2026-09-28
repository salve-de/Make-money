'use client';

import { useEffect, useRef, type KeyboardEvent } from 'react';

export function useModalFocus(active: boolean, onClose: () => void) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLElement>('button, input, [tabindex="0"]')?.focus();
    return () => { if (previous?.isConnected) previous.focus(); };
  }, [active]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!active) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const items = [...(dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], summary, [tabindex="0"]',
    ) ?? [])].filter((item) => item.getClientRects().length > 0);
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };

  return { dialogRef, onKeyDown };
}
