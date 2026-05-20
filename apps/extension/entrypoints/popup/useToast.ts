import { useCallback, useEffect, useRef, useState } from 'react';

export type toastVariant = 'success' | 'error' | 'info';

export interface toastItem {
	id: string;
	message: string;
	variant: toastVariant;
}

const useToast = () => {
	const [toasts, setToasts] = useState<toastItem[]>([]);
	const timeoutIds = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

	useEffect(() => () => { timeoutIds.current.forEach(id => clearTimeout(id)); }, []);

	const showToast = useCallback((message: string, variant: toastVariant = 'info') => {
		const id = crypto.randomUUID();
		setToasts(prev => [...prev, { id, message, variant }]);
		const timeoutId = setTimeout(() => {
			setToasts(prev => prev.filter(t => t.id !== id));
			timeoutIds.current.delete(id);
		}, 3000);
		timeoutIds.current.set(id, timeoutId);
	}, []);

	const dismissToast = useCallback((id: string) => {
		clearTimeout(timeoutIds.current.get(id));
		timeoutIds.current.delete(id);
		setToasts(prev => prev.filter(t => t.id !== id));
	}, []);

	return { toasts, showToast, dismissToast };
};

export default useToast;
