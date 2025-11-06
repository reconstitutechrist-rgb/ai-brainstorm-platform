export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

let toastQueue: Toast[] = [];
const listeners: Set<(toasts: Toast[]) => void> = new Set();

const notifyListeners = () => {
  listeners.forEach(listener => listener(toastQueue));
};

export const showToast = (message: string, type: ToastType = 'success') => {
  const id = `toast-${Date.now()}-${Math.random()}`;
  const newToast: Toast = { id, message, type };
  
  toastQueue = [...toastQueue, newToast];
  notifyListeners();

  // Auto-remove after 3 seconds
  setTimeout(() => {
    toastQueue = toastQueue.filter(t => t.id !== id);
    notifyListeners();
  }, 3000);
};

export const removeToast = (id: string) => {
  toastQueue = toastQueue.filter(t => t.id !== id);
  notifyListeners();
};

export const subscribeToToasts = (listener: (toasts: Toast[]) => void) => {
  listeners.add(listener);
  listener(toastQueue); // Send current state
  return () => {
    listeners.delete(listener);
  };
};

export const getToasts = () => toastQueue;
