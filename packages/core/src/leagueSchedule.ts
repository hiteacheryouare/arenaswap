import type { EspnCalendarGroup, EspnLeague } from './espnSchemas';
import type { LeagueSchedule } from './types';

const dayMs = 24 * 60 * 60 * 1000;

// ESPN's own `season.type` cannot answer this: it reads "Regular Season" for college basketball a
// month before the first tip, and "Preseason" for college baseball from June onward.
const offSeasonGroupValue = '4';

/* A future season's calendar is the regular season alone, with the postseason added once the
   bracket is set, so the last listed day is not the last day of games. Two weeks covers that lag,
   and the popup's cached copy is never older than one, so a stale calendar is replaced before it
   can label a league in the middle of its playoffs. */
export const offseasonGraceMs = 14 * dayMs;

const parseInstant = (value: string | undefined): number | undefined => {
	if (!value) return undefined;
	const ms = Date.parse(value);
	return Number.isFinite(ms) ? ms : undefined;
};

const groupSpans = (group: EspnCalendarGroup): { start?: number; end?: number }[] => {
	if (group.value === offSeasonGroupValue) return [];
	// A tournament group's own dates run to the end of the year; its rounds are where the games are.
	const spans = group.entries?.length ? group.entries : [group];
	return spans.map(span => ({ start: parseInstant(span.startDate), end: parseInstant(span.endDate) }));
};

export const toLeagueSchedule = (calendar: EspnLeague['calendar']): LeagueSchedule => {
	const spans = (calendar ?? []).flatMap(entry => {
		if (typeof entry !== 'string') return groupSpans(entry);
		const start = parseInstant(entry);
		return [{ start, end: start === undefined ? undefined : start + dayMs }];
	});
	const starts = spans.flatMap(span => span.start ?? []);
	const ends = spans.flatMap(span => span.end ?? []);
	if (starts.length === 0 || ends.length === 0) return {};
	return { startsAt: Math.min(...starts), endsAt: Math.max(...ends) };
};

export interface LeagueOffseason {
	returnsAt?: number;
}

// `undefined` is a league we have never heard back about, which says nothing. An empty schedule is
// ESPN sending no calendar at all, which only happens once a season has finished.
export const resolveOffseason = (schedule: LeagueSchedule | undefined, now: number): LeagueOffseason | null => {
	if (!schedule) return null;
	const { startsAt, endsAt } = schedule;
	if (startsAt === undefined || endsAt === undefined) return {};
	if (now < startsAt) return { returnsAt: startsAt };
	return now > endsAt + offseasonGraceMs ? {} : null;
};
