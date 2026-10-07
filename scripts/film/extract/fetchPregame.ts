// One real upcoming game and its pre-game summary, for the 60-second film's Matchup beat. The
// Saturday recording holds no pre-game summaries, so this asks our sources for a game that has not
// kicked off yet.
//
// Run: npm run film:pregame -- [game id] [--league nfl]
// Writes: scripts/film/data/pregame.json
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { parseScoreboardEvents } from '../../../packages/core/src/apiClient';
import { leagueConfigMap } from '../../../packages/powerscore/src/constants';
import type { Game, LeagueId } from '../../../packages/core/src/types';

// Bears at Packers, Sunday, October 11, 2026.
const defaultGameId = '401872990';

const args = process.argv.slice(2);
const leagueIndex = args.indexOf('--league');
const league = (leagueIndex >= 0 ? args[leagueIndex + 1] : 'nfl') as LeagueId;
const gameId = args.find(arg => /^\d+$/.test(arg)) ?? defaultGameId;

const root = join(__dirname, '..', '..', '..');
const outFile = join(root, 'scripts', 'film', 'data', 'pregame.json');
const base = `https://site.api.espn.com/apis/site/v2/sports/${leagueConfigMap[league].espnPath}`;

// Everything useSummaryData reads before kickoff. The rest (plays, news, odds, leaders, the
// division table the full-league standings fetch replaces) never reaches the screen.
const keptKeys = ['header', 'boxscore', 'lastFiveGames', 'injuries', 'seasonseries'];

const getJson = async (url: string): Promise<Record<string, unknown>> => {
	const response = await fetch(url, { headers: { Accept: 'application/json' } });
	if (!response.ok) throw new Error(`HTTP ${response.status} from ${url}`);
	return response.json() as Promise<Record<string, unknown>>;
};

// The scoreboard is filed by US Eastern calendar day.
const easternDayKey = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' })
	.format(new Date(iso))
	.replaceAll('-', '');

// The ticket seller's links carry our sources' referral tag, in the header as well as the tickets.
const withoutReferral = (_key: string, value: unknown) => {
	if (typeof value !== 'string' || !value.includes('wsUser=')) return value;
	const url = new URL(value);
	url.searchParams.delete('wsUser');
	return url.toString();
};

// Only the two fields parseTickets reads.
const trimTickets = (ticketsInfo: unknown) => {
	const seat = (ticketsInfo as { seatSituation?: { eventLink?: unknown; summary?: unknown } } | undefined)?.seatSituation;
	return seat?.eventLink ? { seatSituation: { eventLink: seat.eventLink, summary: seat.summary } } : undefined;
};

const withoutSourceNames = (game: Game): Game => {
	if (!game.broadcasts) return game;
	const broadcasts = game.broadcasts.filter(name => !/espn/i.test(name));
	const { broadcasts: _dropped, ...rest } = game;
	return broadcasts.length > 0 ? { ...rest, broadcasts } : rest;
};

const main = async () => {
	const raw = await getJson(`${base}/summary?event=${gameId}`);
	const kickoff = (raw.header as { competitions?: { date?: string }[] } | undefined)?.competitions?.[0]?.date;
	if (!kickoff) throw new Error(`No kickoff time in the summary for ${gameId}`);

	const scoreboard = await getJson(`${base}/scoreboard?dates=${easternDayKey(kickoff)}&limit=500`);
	const parsed = parseScoreboardEvents(scoreboard, league).find(game => game.id === gameId);
	if (!parsed) throw new Error(`${gameId} is not on the ${league} scoreboard for ${kickoff}`);
	if (parsed.status !== 'pre') throw new Error(`${gameId} is ${parsed.status}, not pre-game`);

	const summary: Record<string, unknown> = Object.fromEntries(keptKeys.filter(key => key in raw).map(key => [key, raw[key]]));
	const tickets = trimTickets(raw.ticketsInfo);
	if (tickets) summary.ticketsInfo = tickets;

	const json = JSON.stringify({ fetchedAt: Date.now(), game: withoutSourceNames(parsed), summary }, withoutReferral);
	mkdirSync(dirname(outFile), { recursive: true });
	writeFileSync(outFile, json);
	console.log(`${parsed.awayTeam.abbreviation} @ ${parsed.homeTeam.abbreviation}, ${kickoff}, ${(json.length / 1e3).toFixed(1)} KB → ${outFile}`);
};

void main();
