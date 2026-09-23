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

// Injected rather than imported so the formatter stays pure and Jest-testable, matching
// gameSituation's resolver.
type Translate = (key: string, subsOrCount?: unknown, subs?: unknown) => string;

// The trailing figure is padded the way the hero's trailing segments are. This string is pinned to
// the right of the sticky bar, so its left edge is the one that moves, and a countdown that ticks
// every second should not shuffle sideways each time a digit crosses 9.
const countdownPair = (value: number, unit: string, nextValue: number, nextUnit: string): string => (
	`${value}${unit} ${String(nextValue).padStart(2, '0')}${nextUnit}`
);

// The sticky bar's slot is 5.5rem and shared with the live status text, so it gets two units where
// the hero gets three: the largest one that is not zero, and the one below it. Dropping a zero
// leading segment is the difference — the hero prints "0h 13m 42s" a quarter of an hour out, since
// it picks its segment set once at the day boundary, and two slots cannot spend one on a zero.
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
