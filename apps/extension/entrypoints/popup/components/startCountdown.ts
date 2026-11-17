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

export const countdownShowsSeconds = (parts: CountdownParts | null): boolean => (
	parts !== null && parts.remainingMs > 0 && parts.days === 0
);

type Translate = (key: string, subsOrCount?: unknown, subs?: unknown) => string;

const countdownPair = (value: number, unit: string, nextValue: number, nextUnit: string): string => (
	`${value}${unit} ${String(nextValue).padStart(2, '0')}${nextUnit}`
);

export const formatCompactCountdown = (parts: CountdownParts | null, t: Translate): string => {
	if (parts === null) return '';
	if (parts.remainingMs <= 0) return t('detail.startsSoon');

	if (parts.days > 0) return countdownPair(parts.days, t('detail.unitDays'), parts.hours, t('detail.unitHours'));
	if (parts.hours > 0) return countdownPair(parts.hours, t('detail.unitHours'), parts.minutes, t('detail.unitMinutes'));
	if (parts.minutes > 0) return countdownPair(parts.minutes, t('detail.unitMinutes'), parts.seconds, t('detail.unitSeconds'));
	return `${parts.seconds}${t('detail.unitSeconds')}`;
};

export const useStartCountdown = (iso: string | undefined): CountdownParts | null => {
	const targetMs = useMemo(() => (iso ? new Date(iso).getTime() : Number.NaN), [iso]);
	const [nowMs, setNowMs] = useState(() => Date.now());

	useEffect(() => {
		if (!Number.isFinite(targetMs)) return;
		let timer: ReturnType<typeof setTimeout> | undefined;
		const scheduleNextTick = (remainingMs: number) => {
			if (remainingMs <= 0) return;
			const stepMs = remainingMs < dayMs ? secondMs : minuteMs;
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
