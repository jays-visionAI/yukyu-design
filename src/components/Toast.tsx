import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type ToastVariant = 'default' | 'success' | 'error';
interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}
interface ToastApi {
  push: (message: string, variant?: ToastVariant) => void;
  success: (msg: string) => void;
  error: (msg: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, variant: ToastVariant = 'default') => {
    const id = Date.now() + Math.random();
    setToasts((cur) => [...cur, { id, message, variant }]);
    setTimeout(() => {
      setToasts((cur) => cur.filter((t) => t.id !== id));
    }, 2800);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      push,
      success: (m) => push(m, 'success'),
      error: (m) => push(m, 'error'),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast ${
              t.variant === 'success'
                ? 'toast-success'
                : t.variant === 'error'
                  ? 'toast-error'
                  : ''
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
