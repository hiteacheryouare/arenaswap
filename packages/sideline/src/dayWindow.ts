// ESPN files its scoreboard by US Eastern calendar date, not by UTC: a 2026-09-04T02:10Z first
// pitch comes back under dates=20260903.
const espnFilingDateFormat = new Intl.DateTimeFormat('en-US', {
	timeZone: 'America/New_York',
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
});

export const toQueryDate = (date: Date): string => {
	const parts = espnFilingDateFormat.formatToParts(date);
	const part = (type: Intl.DateTimeFormatPartTypes): string => parts.find(p => p.type === type)?.value ?? '';
	return `${part('year')}${part('month')}${part('day')}`;
};

const localDayStart = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate());

/* A window is a list of Eastern filing dates now, because ESPN stopped answering for a span.

   Every one of the 31 leagues answers `dates=20260914-20260915` with
   `{"code":400,"message":"Failed to get events endpoint."}`, at any width — including a one-day
   `20260915-20260915` — while a single `dates=20260915` still answers 200 in all 31. Measured across
   every league and 20 consecutive times on one of them, on both `site.api` and `site.web.api`, so it
   is a settled state rather than a service flapping.

   No multi-day form survives it. Comma, encoded comma and encoded hyphen all 400, and a repeated
   `dates=` parameter answers 200 for the first value only, which is worse than failing. `YYYYMM` and
   `YYYY` do still work, but truncation drops the tail — the days furthest ahead — so a month cannot
   stand in for a window that ends in the future. */
const padDatePart = (value: number): string => String(value).padStart(2, '0');

export const shiftDayKey = (dayKey: string, byDays: number): string => {
	// Stepped at noon UTC: these are calendar dates rather than instants, and noon is the one hour
	// no DST discontinuity can push onto an adjacent date.
	const at = Date.UTC(
		Number(dayKey.slice(0, 4)),
		Number(dayKey.slice(4, 6)) - 1,
		Number(dayKey.slice(6, 8)),
		12,
	);
	const moved = new Date(at + (byDays * 24 * 60 * 60 * 1000));
	return `${moved.getUTCFullYear()}${padDatePart(moved.getUTCMonth() + 1)}${padDatePart(moved.getUTCDate())}`;
};

export const buildDayWindowKeys = (days: number, now: Date = new Date(), pastDays = 0): string[] => {
	const firstLocalDay = localDayStart(now);
	const windowStart = new Date(
		firstLocalDay.getFullYear(),
		firstLocalDay.getMonth(),
		firstLocalDay.getDate() - pastDays,
	);
	const lastLocalDay = localDayStart(new Date(now.getTime() + (days * 24 * 60 * 60 * 1000)));
	const windowEnd = new Date(new Date(
		lastLocalDay.getFullYear(),
		lastLocalDay.getMonth(),
		lastLocalDay.getDate() + 1,
	).getTime() - 1);

	const lastKey = toQueryDate(windowEnd);
	const keys: string[] = [];
	for (let key = toQueryDate(windowStart); key <= lastKey; key = shiftDayKey(key, 1)) {
		keys.push(key);
	}
	return keys;
};

// The days the live poll asks for. ESPN's undated board is not a full slate in every league —
// college football files by week rather than by day and trims that week to about 25 featured games,
// so a live game can simply be absent from it — and naming the days returns the complete card.
//
// `days: 0` ends the window at the end of today, which is the last day a live game can have started;
// the day back is there because ESPN files a game under its Eastern start date, so an 11pm kickoff
// is still filed under yesterday while it is on screen after Eastern midnight.
export const buildCurrentDayKeys = (now: Date = new Date()): string[] => buildDayWindowKeys(0, now, 1);
