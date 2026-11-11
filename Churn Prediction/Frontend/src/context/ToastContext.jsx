import { createContext, useCallback, useContext, useState } from 'react';
import { IconCheck, IconAlert, IconClose } from '../components/Icons';

const ToastContext = createContext(null);
let idSeq = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (message, type = 'info') => {
      const id = ++idSeq;
      setToasts((t) => [...t, { id, message, type }]);
      setTimeout(() => dismiss(id), 5000);
    },
    [dismiss]
  );

  const toast = {
    success: (m) => push(m, 'success'),
    error: (m) => push(m, 'error'),
    info: (m) => push(m, 'info'),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 w-80">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`panel flex items-start gap-2.5 px-3.5 py-3 text-sm shadow-lg ${
              t.type === 'error' ? 'border-risk-high/40' : t.type === 'success' ? 'border-risk-low/40' : ''
            }`}
          >
            <span
              className={
                t.type === 'error' ? 'text-risk-high' : t.type === 'success' ? 'text-risk-low' : 'text-brand'
              }
            >
              {t.type === 'error' ? <IconAlert /> : <IconCheck />}
            </span>
            <p className="flex-1 text-text leading-snug">{t.message}</p>
            <button onClick={() => dismiss(t.id)} className="text-text-faint hover:text-text-muted">
              <IconClose />
            </button>
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
