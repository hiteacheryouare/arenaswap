import { useCallback, useEffect, useRef, useState } from 'react';
import { motionDuration } from '@arenaswap/ui/src/motion';

export type toastVariant = 'success' | 'error' | 'info';

export interface toastItem {
	id: string;
	message: string;
	variant: toastVariant;
	leaving?: boolean;
}

const useToast = () => {
	const [toasts, setToasts] = useState<toastItem[]>([]);
	const timeoutIds = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

	useEffect(() => () => { timeoutIds.current.forEach(id => clearTimeout(id)); }, []);

	const dismissToast = useCallback((id: string) => {
		clearTimeout(timeoutIds.current.get(id));
		setToasts(prev => prev.map(t => (t.id === id ? { ...t, leaving: true } : t)));
		timeoutIds.current.set(id, setTimeout(() => {
			setToasts(prev => prev.filter(t => t.id !== id));
			timeoutIds.current.delete(id);
		}, motionDuration.quick));
	}, []);

	const showToast = useCallback((message: string, variant: toastVariant = 'info') => {
		const id = crypto.randomUUID();
		setToasts(prev => [...prev, { id, message, variant }]);
		timeoutIds.current.set(id, setTimeout(() => dismissToast(id), 3000));
	}, [dismissToast]);

	return { toasts, showToast, dismissToast };
};

export default useToast;
