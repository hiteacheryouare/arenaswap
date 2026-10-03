import { parseScoreboard } from '../src/espnSchemas';
import { offseasonGraceMs, resolveOffseason, toLeagueSchedule } from '../src/leagueSchedule';

// Shapes as ESPN sent them on 2026-10-02, trimmed to the ends that matter.
const collegeBasketballDays = ['2026-11-01T07:00Z', '2026-11-02T08:00Z', '2027-03-07T08:00Z'];
const nflWeeks = [
	{ label: 'Preseason', value: '1', startDate: '2026-08-06T07:00Z', endDate: '2026-09-06T06:59Z', entries: [
		{ startDate: '2026-08-06T07:00Z', endDate: '2026-08-13T06:59Z' },
	] },
	{ label: 'Postseason', value: '3', startDate: '2027-01-13T08:00Z', endDate: '2027-02-16T07:59Z', entries: [
		{ startDate: '2027-02-09T08:00Z', endDate: '2027-02-16T07:59Z' },
	] },
	{ label: 'Off Season', value: '4', startDate: '2027-02-16T08:00Z', endDate: '2027-08-01T06:59Z', entries: [] },
];
const worldCupRounds = [
	{ label: 'FIFA World Cup', startDate: '2026-06-11T04:00Z', endDate: '2026-12-31T04:59Z', entries: [
		{ startDate: '2026-06-11T07:00Z', endDate: '2026-06-28T06:59Z' },
		{ startDate: '2026-07-19T07:00Z', endDate: '2026-08-01T06:59Z' },
	] },
];

const at = (iso: string) => Date.parse(iso);
const scheduleOf = (calendar: unknown) => toLeagueSchedule(
	parseScoreboard({ events: [], leagues: [{ id: '1', calendar }] }).leagues[0]?.calendar,
);

describe('telling a league between seasons from one playing through them', () => {
	it('says when college basketball tips off, a month out, even though ESPN already calls it the regular season', () => {
		const offseason = resolveOffseason(scheduleOf(collegeBasketballDays), at('2026-10-02T19:00Z'));
		expect(offseason).toEqual({ returnsAt: at('2026-11-01T07:00Z') });
	});

	it('leaves a league alone from its first game day to its last', () => {
		const schedule = scheduleOf(collegeBasketballDays);
		expect(resolveOffseason(schedule, at('2026-11-01T23:00Z'))).toBeNull();
		expect(resolveOffseason(schedule, at('2027-03-08T05:00Z'))).toBeNull();
	});

	// The calendar of a season not yet played lists the regular season alone. March Madness is
	// still to come when the last listed day goes by.
	it('waits out the grace period before calling a season over', () => {
		const schedule = scheduleOf(collegeBasketballDays);
		const lastDayEnds = at('2027-03-08T08:00Z');
		expect(resolveOffseason(schedule, lastDayEnds + offseasonGraceMs)).toBeNull();
		expect(resolveOffseason(schedule, lastDayEnds + offseasonGraceMs + 1)).toEqual({});
	});

	it('reads the gridiron week groups and ignores the one ESPN files as the offseason', () => {
		const schedule = scheduleOf(nflWeeks);
		expect(schedule).toEqual({ startsAt: at('2026-08-06T07:00Z'), endsAt: at('2027-02-16T07:59Z') });
		expect(resolveOffseason(schedule, at('2026-10-02T19:00Z'))).toBeNull();
		expect(resolveOffseason(schedule, at('2027-05-01T12:00Z'))).toEqual({});
	});

	// The tournament group itself runs to New Year's Eve; the final was in July.
	it('dates a tournament by its rounds rather than by the group around them', () => {
		const schedule = scheduleOf(worldCupRounds);
		expect(schedule.endsAt).toBe(at('2026-08-01T06:59Z'));
		expect(resolveOffseason(schedule, at('2026-10-02T19:00Z'))).toEqual({});
	});

	it('calls a league with no calendar at all out of season, with no date to promise', () => {
		expect(resolveOffseason(scheduleOf(undefined), at('2026-10-02T19:00Z'))).toEqual({});
		expect(resolveOffseason(scheduleOf([]), at('2026-10-02T19:00Z'))).toEqual({});
	});

	it('says nothing about a league it never heard back from', () => {
		expect(resolveOffseason(undefined, at('2026-10-02T19:00Z'))).toBeNull();
	});

	// The calendar sits beside the logo in the same envelope, and the logo matters more.
	it('keeps the league logo when the calendar comes in a shape it has never seen', () => {
		const logos = [{ href: 'https://example/ncaab.png', rel: ['full', 'default'] }];
		const [league] = parseScoreboard({ events: [], leagues: [{ id: '41', logos, calendar: [{ value: 7 }] }] }).leagues;
		expect(league?.logos).toEqual(logos);
		expect(toLeagueSchedule(league?.calendar)).toEqual({});
	});
});
