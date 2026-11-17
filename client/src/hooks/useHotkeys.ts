import { useEffect, useRef } from 'react';

/**
 * Keyboard shortcut helpers.
 *
 * - useEscapeKey: closes popups with Esc. Popups register on a stack so only
 *   the top-most (most recently opened) one closes per key press.
 * - isTypingTarget / isPopupOpen: used by global shortcuts so single-key
 *   shortcuts never fire while the user is typing or a popup is open.
 */

type Handler = { current: () => void };
const escapeStack: Handler[] = [];
let listening = false;

function onKeyDown(e: KeyboardEvent) {
  if (e.key !== 'Escape' || escapeStack.length === 0) return;
  e.preventDefault();
  e.stopPropagation();
  escapeStack[escapeStack.length - 1].current();
}

export function isPopupOpen(): boolean {
  return escapeStack.length > 0;
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

/** Calls `onEscape` when Esc is pressed while `active` and this is the top-most popup. */
export function useEscapeKey(onEscape: () => void, active: boolean = true): void {
  const ref = useRef(onEscape);
  ref.current = onEscape;

  useEffect(() => {
    if (!active) return;
    if (!listening) {
      window.addEventListener('keydown', onKeyDown, true);
      listening = true;
    }
    const handler: Handler = { current: () => ref.current() };
    escapeStack.push(handler);
    return () => {
      const i = escapeStack.indexOf(handler);
      if (i !== -1) escapeStack.splice(i, 1);
    };
  }, [active]);
}
