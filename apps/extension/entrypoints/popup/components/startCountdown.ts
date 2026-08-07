import { useEffect, useMemo, useState } from 'react';

export interface CountdownParts {
	days: number;
	hours: number;
	minutes: number;
	seconds: number;
	remainingMs: number;
}

const secondMs = 1_000;
const minuteMs = 60_000;
const hourMs = 60 * minuteMs;
const dayMs = 24 * hourMs;

export const countdownParts = (targetMs: number, nowMs: number): CountdownParts => {
	const remainingMs = Math.max(0, targetMs - nowMs);
	return {
		days: Math.floor(remainingMs / dayMs),
		hours: Math.floor((remainingMs % dayMs) / hourMs),
		minutes: Math.floor((remainingMs % hourMs) / minuteMs),
		seconds: Math.floor((remainingMs % minuteMs) / secondMs),
		remainingMs,
	};
};

// Further out than a day the seconds digit would roll 86,400 times before anyone could act on
// it, so the clock steps once a minute instead.
export const countdownShowsSeconds = (parts: CountdownParts | null): boolean => (
	parts !== null && parts.remainingMs > 0 && parts.days === 0
);

export const useStartCountdown = (iso: string | undefined): CountdownParts | null => {
	const targetMs = useMemo(() => (iso ? new Date(iso).getTime() : Number.NaN), [iso]);
	const [nowMs, setNowMs] = useState(() => Date.now());

	useEffect(() => {
		if (!Number.isFinite(targetMs)) return;
		let timer: ReturnType<typeof setTimeout> | undefined;
		const scheduleNextTick = (remainingMs: number) => {
			if (remainingMs <= 0) return;
			const stepMs = remainingMs < dayMs ? secondMs : minuteMs;
			// Land just after the smallest visible digit changes; the 50ms pad absorbs early wake-ups.
			timer = setTimeout(() => {
				const now = Date.now();
				setNowMs(now);
				scheduleNextTick(targetMs - now);
			}, (remainingMs % stepMs) + 50);
		};
		scheduleNextTick(targetMs - Date.now());
		return () => clearTimeout(timer);
	}, [targetMs]);

	if (!Number.isFinite(targetMs)) return null;
	return countdownParts(targetMs, nowMs);
};
