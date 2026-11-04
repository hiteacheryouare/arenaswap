import { createDefaultUserPreferences } from '@arenaswap/core/constants';
import type { LeagueId, UserPreferences } from '@arenaswap/core/types';
import eplStoppageTime from '../../../../packages/sideline/tests/fixtures/scoreboards/eplStoppageTime.json';
import nhlTiedThirdPeriod from '../../../../packages/sideline/tests/fixtures/scoreboards/nhlTiedThirdPeriod.json';
import nflNeutralSite from '../../../../packages/sideline/tests/fixtures/scoreboards/nflNeutralSite.json';
import wnbaSemifinalFourthQuarter from '../../../../packages/sideline/tests/fixtures/scoreboards/wnbaSemifinalFourthQuarter.json';

// Recorded scoreboard events (each file's `source` says which recording line). A spec moves the
// score or the clock on a copy to play the game forward; the rest of the event stays as it was sent.

interface capture {
	league: string;
	event: { id: string; competitions: { competitors: { homeAway: string; score: string }[]; status: { clock: number; displayClock: string; type: { detail: string; shortDetail: string } } }[] };
}

const captures = {
	wnba: wnbaSemifinalFourthQuarter,
	nhl: nhlTiedThirdPeriod,
	nfl: nflNeutralSite,
	epl: eplStoppageTime,
} as unknown as Record<'wnba' | 'nhl' | 'nfl' | 'epl', capture>;

export type capturedLeague = keyof typeof captures;

/** Each capture as recorded: Liberty at Dream 78–79 with 3:53 left, Hurricanes at Flyers 2–2 in the third, Colts at Commanders 20–13 to start the fourth, Leeds at Arsenal 1–2 in stoppage time. */
export const gameIds: Record<capturedLeague, string> = {
	wnba: captures.wnba.event.id,
	nhl: captures.nhl.event.id,
	nfl: captures.nfl.event.id,
	epl: captures.epl.event.id,
};

export interface eventPatch {
	home?: number;
	away?: number;
	// Seconds left in the period.
	clock?: number;
}

export const liveEvent = (league: capturedLeague, patch: eventPatch = {}): unknown => {
	const event = JSON.parse(JSON.stringify(captures[league].event)) as capture['event'];
	for (const competitor of event.competitions[0]!.competitors) {
		const score = competitor.homeAway === 'home' ? patch.home : patch.away;
		if (score !== undefined) competitor.score = String(score);
	}
	const { status } = event.competitions[0]!;
	if (patch.clock !== undefined) {
		const shown = `${Math.floor(patch.clock / 60)}:${String(patch.clock % 60).padStart(2, '0')}`;
		status.type.detail = status.type.detail.replace(status.displayClock, shown);
		status.type.shortDetail = status.type.shortDetail.replace(status.displayClock, shown);
		status.clock = patch.clock;
		status.displayClock = shown;
	}
	return event;
};

/** The slate each league answers with: one live event per league named. */
export const slate = (games: Partial<Record<capturedLeague, eventPatch>>): Partial<Record<LeagueId, unknown[]>> => (
	Object.fromEntries(Object.entries(games).map(([league, patch]) => [league, [liveEvent(league as capturedLeague, patch)]]))
);

/** Prefs as a settled user has them, stored the way the popup stores them. */
export const storedPrefs = (overrides: Partial<UserPreferences> = {}) => {
	const prefs = { ...createDefaultUserPreferences(), enabledLeagues: ['wnba', 'nhl'] as LeagueId[], ...overrides };
	return { prefs };
};
