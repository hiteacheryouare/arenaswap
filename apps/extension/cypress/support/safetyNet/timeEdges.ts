import type { Game } from '@arenaswap/core/types';
import { makeGame } from '../fixtures';

// Games whose geometry comes from time, for anything that lays a game out against a clock (the
// Guide). Each is a real game from scripts/powerscore/recordings: `now` is when the recorder saw
// the state, and `endedAt` is when it first saw the final, which is what `slate.endTimes` carries.

export interface timeEdge {
	label: string;
	game: Game;
	now: number;
	endedAt?: number;
}

// nfl 401872988: scheduled 17:00Z, still in overtime 3 h 45 min later, against a 195-minute typical
// run. Ended in a 27-27 tie.
const giantsCommanders = makeGame('nfl-401872988', {
	league: 'nfl', sportType: 'football', startTime: '2026-10-11T17:00:00Z',
	awayTeam: { id: '19', name: 'New York Giants', nickname: 'Giants', shortName: 'Giants', abbreviation: 'NYG', score: 27, color: '#003C7F', alternateColor: '#C9243F' },
	homeTeam: { id: '28', name: 'Washington Commanders', nickname: 'Commanders', shortName: 'Commanders', abbreviation: 'WSH', score: 27, color: '#5A1414', alternateColor: '#FFB612' },
	venueName: 'Northwest Stadium', venueLocation: 'Landover, MD',
});

// ncaaf 401864516: scheduled 23:30Z, final 2 h 40 min later, against a 210-minute typical run.
const airForceNorthernIllinois = makeGame('ncaaf-401864516', {
	league: 'ncaaf', sportType: 'football', startTime: '2026-10-10T23:30:00Z', status: 'post', period: 4, clockSeconds: 0,
	awayTeam: { id: '2005', name: 'Air Force Falcons', nickname: 'Falcons', shortName: 'Air Force', abbreviation: 'AFA', score: 28, color: '#003594', alternateColor: '#FFFFFF' },
	homeTeam: { id: '2459', name: 'Northern Illinois Huskies', nickname: 'Huskies', shortName: 'N Illinois', abbreviation: 'NIU', score: 7, color: '#C8102E', alternateColor: '#000000' },
	venueName: 'Huskie Stadium', venueLocation: 'Dekalb, IL',
});

const giantsCommandersFinal = { ...giantsCommanders, status: 'post', period: 5, clockSeconds: 0, finalPeriodSuffix: 'OT' } satisfies Game;

export const timeEdges = {
	runsLong: {
		label: 'live long past its typical length',
		game: { ...giantsCommanders, status: 'in', period: 5, clockSeconds: 12 },
		now: Date.parse('2026-10-11T20:45:40Z'),
	},
	endsEarly: {
		label: 'final well before its typical length, end known',
		game: airForceNorthernIllinois,
		now: Date.parse('2026-10-11T02:30:00Z'),
		endedAt: Date.parse('2026-10-11T02:09:45Z'),
	},
	knownEnd: {
		label: 'final past its typical length, end known',
		game: giantsCommandersFinal,
		now: Date.parse('2026-10-11T21:15:00Z'),
		endedAt: Date.parse('2026-10-11T20:45:55Z'),
	},
	unknownEnd: {
		label: 'final with no known end',
		game: giantsCommandersFinal,
		now: Date.parse('2026-10-11T21:15:00Z'),
	},
	noStart: {
		label: 'no start time',
		game: { ...airForceNorthernIllinois, id: 'ncaaf-401864516-no-start', status: 'pre', startTime: undefined },
		now: Date.parse('2026-10-10T22:00:00Z'),
	},
} satisfies Record<string, timeEdge>;

export const everyTimeEdge: readonly timeEdge[] = Object.values(timeEdges);
