import { useCallback, useState } from 'react';

export type toastVariant = 'success' | 'error' | 'info';

export interface toastItem {
	id: string;
	message: string;
	variant: toastVariant;
}

const useToast = () => {
	const [toasts, setToasts] = useState<toastItem[]>([]);

	const showToast = useCallback((message: string, variant: toastVariant = 'info') => {
		const id = crypto.randomUUID();
		setToasts(prev => [...prev, { id, message, variant }]);
		setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
	}, []);

	const dismissToast = useCallback((id: string) => {
		setToasts(prev => prev.filter(t => t.id !== id));
	}, []);

	return { toasts, showToast, dismissToast };
};

export default useToast;
