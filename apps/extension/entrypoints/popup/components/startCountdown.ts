import { useEffect, useMemo, useState } from 'react';
import { i18n } from '#i18n';

export interface CountdownParts {
	days: number;
	hours: number;
	minutes: number;
	remainingMs: number;
}

const minuteMs = 60_000;
const hourMs = 60 * minuteMs;
const dayMs = 24 * hourMs;

export const countdownParts = (targetMs: number, nowMs: number): CountdownParts => {
	const remainingMs = Math.max(0, targetMs - nowMs);
	return {
		days: Math.floor(remainingMs / dayMs),
		hours: Math.floor((remainingMs % dayMs) / hourMs),
		minutes: Math.floor((remainingMs % hourMs) / minuteMs),
		remainingMs,
	};
};

export const formatStartsIn = (parts: CountdownParts | null): string => {
	// No scheduled time, or the clock has run down past the last whole minute — there is
	// nothing left worth counting, and a stale "0 minutes" would read as broken.
	if (!parts || parts.remainingMs < minuteMs) return i18n.t('detail.startsSoon');

	const segments: string[] = [];
	if (parts.days > 0) segments.push(i18n.t('detail.countdownDays', parts.days));
	// Keep the shape stable once a bigger unit is on screen: "1 day 0 hours 5 minutes"
	// reads as a real countdown, where "1 day 5 minutes" looks like a dropped hour count.
	if (parts.days > 0 || parts.hours > 0) segments.push(i18n.t('detail.countdownHours', parts.hours));
	segments.push(i18n.t('detail.countdownMinutes', parts.minutes));

	return i18n.t('detail.startsIn', { duration: segments.join(' ') });
};

// Re-renders on the displayed-minute boundary rather than every second: the countdown
// never shows seconds, so a 1s tick would be 59 wasted renders a minute.
export const useStartCountdown = (iso: string | undefined): CountdownParts | null => {
	const targetMs = useMemo(() => (iso ? new Date(iso).getTime() : Number.NaN), [iso]);
	const [nowMs, setNowMs] = useState(() => Date.now());

	useEffect(() => {
		if (!Number.isFinite(targetMs)) return;
		let timer: ReturnType<typeof setTimeout> | undefined;
		const scheduleNextTick = (remainingMs: number) => {
			if (remainingMs <= 0) return;
			// Land just after the minutes digit changes; the 50ms pad absorbs early timer wake-ups.
			timer = setTimeout(() => {
				const now = Date.now();
				setNowMs(now);
				scheduleNextTick(targetMs - now);
			}, (remainingMs % minuteMs) + 50);
		};
		scheduleNextTick(targetMs - Date.now());
		return () => clearTimeout(timer);
	}, [targetMs]);

	if (!Number.isFinite(targetMs)) return null;
	return countdownParts(targetMs, nowMs);
};
