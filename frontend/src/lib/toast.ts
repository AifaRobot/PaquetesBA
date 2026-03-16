// Thin singleton wrapper so screens can call toast.error() without hooks.
// The ToastProvider registers itself via setToastFn on mount.

type ToastType = 'success' | 'error' | 'info';

let _show: ((type: ToastType, text1: string, text2?: string) => void) | null = null;

export function setToastFn(fn: typeof _show) {
  _show = fn;
}

export const toast = {
  success(text1: string, text2?: string) { _show?.('success', text1, text2); },
  error(text1: string, text2?: string)   { _show?.('error',   text1, text2); },
  info(text1: string, text2?: string)    { _show?.('info',    text1, text2); },
};
