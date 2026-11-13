import { useSyncExternalStore } from "react";

// Saved items live only in this browser (SPEC §7). Storage can throw on some phones, so every access is guarded.
const KEY = "saved-codes";

export function readSaved(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((c) => typeof c === "string" && /^R\d{1,9}$/.test(c)).slice(0, 100) : [];
  } catch {
    return [];
  }
}

export function writeSaved(codes: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(codes));
  } catch {
    // storage full or blocked: saving just doesn't stick
  }
  window.dispatchEvent(new Event(KEY));
}

function subscribe(onChange: () => void) {
  window.addEventListener(KEY, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(KEY, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Whether `code` is saved. False during server render, so the first paint matches. */
export function useIsSaved(code: string) {
  return useSyncExternalStore(subscribe, () => readSaved().includes(code), () => false);
}
