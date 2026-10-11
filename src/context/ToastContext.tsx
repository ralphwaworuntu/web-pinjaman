import { createContext, useContext, useState, useCallback } from 'react';
import { generateId } from '../utils/idGenerator';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    toasts: Toast[];
    showToast: (message: string, type?: ToastType, durationMs?: number) => void;
    removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType>({
    toasts: [],
    showToast: () => { },
    removeToast: () => { }
});

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const showToast = useCallback((message: string, type: ToastType = 'success', durationMs: number = 3000) => {
        const id = generateId();
        setToasts(prev => [...prev, { id, message, type }]);

        // Auto-dismiss (default 3 seconds)
        setTimeout(() => removeToast(id), durationMs);
    }, [removeToast]);

    return (
        <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
            {children}
        </ToastContext.Provider>
    );
};

export const useToast = () => useContext(ToastContext);
