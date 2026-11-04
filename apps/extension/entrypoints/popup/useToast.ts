import { useCallback, useEffect, useRef, useState } from 'react';
import { motionDuration } from '@arenaswap/ui/src/motion';

export type toastVariant = 'success' | 'error' | 'info';

export interface toastItem {
	id: string;
	message: string;
	variant: toastVariant;
	leaving?: boolean;
}

const toastLifetime: Record<toastVariant, number> = { success: 3000, info: 3000, error: 6000 };

interface toastTimer {
	timeoutId: ReturnType<typeof setTimeout>;
	endsAt: number;
}

const useToast = () => {
	const [toasts, setToasts] = useState<toastItem[]>([]);
	const timeoutIds = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
	const lifetimes = useRef<Map<string, toastTimer>>(new Map());
	const paused = useRef<Map<string, number>>(new Map());

	useEffect(() => () => {
		timeoutIds.current.forEach(id => clearTimeout(id));
		lifetimes.current.forEach(({ timeoutId }) => clearTimeout(timeoutId));
	}, []);

	const dismissToast = useCallback((id: string) => {
		clearTimeout(timeoutIds.current.get(id));
		clearTimeout(lifetimes.current.get(id)?.timeoutId);
		lifetimes.current.delete(id);
		paused.current.delete(id);
		setToasts(prev => prev.map(t => (t.id === id ? { ...t, leaving: true } : t)));
		timeoutIds.current.set(id, setTimeout(() => {
			setToasts(prev => prev.filter(t => t.id !== id));
			timeoutIds.current.delete(id);
		}, motionDuration.quick));
	}, []);

	const startLifetime = useCallback((id: string, duration: number) => {
		lifetimes.current.set(id, { timeoutId: setTimeout(() => dismissToast(id), duration), endsAt: Date.now() + duration });
	}, [dismissToast]);

	const showToast = useCallback((message: string, variant: toastVariant = 'info') => {
		const id = crypto.randomUUID();
		setToasts(prev => [...prev, { id, message, variant }]);
		startLifetime(id, toastLifetime[variant]);
	}, [startLifetime]);

	const pauseToast = useCallback((id: string) => {
		const timer = lifetimes.current.get(id);
		if (!timer) return;
		clearTimeout(timer.timeoutId);
		lifetimes.current.delete(id);
		paused.current.set(id, Math.max(timer.endsAt - Date.now(), 0));
	}, []);

	const resumeToast = useCallback((id: string) => {
		const remaining = paused.current.get(id);
		if (remaining === undefined) return;
		paused.current.delete(id);
		startLifetime(id, remaining);
	}, [startLifetime]);

	return { toasts, showToast, dismissToast, pauseToast, resumeToast };
};

export default useToast;
