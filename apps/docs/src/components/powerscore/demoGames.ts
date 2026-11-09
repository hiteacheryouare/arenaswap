import { scoreGame } from 'powerscore';
import type { Game, PowerScore } from 'powerscore';
import { capitalizeReason, translateReasonFragments } from '../../../../extension/utils/powerScoreReason';
import { extensionString } from '../docs/demoStrings';
import type { LocaleCode } from '../../i18n/locales';

// Two games on the same night, scripted through the fourth quarter. Each event is
// [secondsLeft, away, home]; the history handed to the engine is every event up to the moment.

export interface DemoScript {
	id: string;
	away: { abbreviation: string; nickname: string };
	home: { abbreviation: string; nickname: string };
	events: [number, number, number][];
}

export type DemoMode = 'classic' | 'blowouts' | 'fantasy';

export const nailBiter: DemoScript = {
	id: 'nyk-bos',
	away: { abbreviation: 'NYK', nickname: 'Knicks' },
	home: { abbreviation: 'BOS', nickname: 'Celtics' },
	events: [
		[720, 86, 90], [600, 88, 94], [480, 92, 98], [400, 94, 100], [331, 97, 100], [270, 97, 102],
		[222, 100, 102], [180, 103, 102], [134, 103, 104],
	],
};

export const blowout: DemoScript = {
	id: 'uta-okc',
	away: { abbreviation: 'UTA', nickname: 'Jazz' },
	home: { abbreviation: 'OKC', nickname: 'Thunder' },
	events: [[720, 80, 104], [600, 84, 109], [480, 86, 114], [360, 88, 117], [280, 90, 119], [190, 92, 121]],
};

export const secondsLeft = 134;

export const fantasyPlayer = 'Gilgeous-Alexander';

const start = 1_762_560_000_000;
const wallMsPerGameSecond = 2_500;
const timestampAt = (left: number) => start + (720 - left) * wallMsPerGameSecond;

const eventsSoFar = (script: DemoScript) => script.events.filter(([at]) => at >= secondsLeft);

export const scoreline = (script: DemoScript) => {
	const [, away, home] = eventsSoFar(script).at(-1)!;
	return { away, home };
};

export const recentScoring = (script: DemoScript, count: number) => eventsSoFar(script).slice(-count).map(([, away, home]) => ({ away, home }));

export const demoGame = (script: DemoScript): Game => {
	const { away, home } = scoreline(script);
	return {
		id: script.id,
		league: 'nba',
		sportType: 'basketball',
		status: 'in',
		awayTeam: { ...script.away, score: away },
		homeTeam: { ...script.home, score: home },
		period: 4,
		clockSeconds: secondsLeft,
	};
};

export const scoreDemo = (script: DemoScript, mode: DemoMode = 'classic'): PowerScore => {
	const history = eventsSoFar(script).map(([at, awayScore, homeScore]) => ({ gameId: script.id, timestamp: timestampAt(at), awayScore, homeScore }));
	history.push({ ...history.at(-1)!, timestamp: timestampAt(secondsLeft) });
	const fantasy = mode === 'fantasy' && script === blowout
		? [{ id: 'sga', name: fantasyPlayer, side: 'home' as const, position: 'player' as const, pointEvents: [{ at: timestampAt(secondsLeft + 66), points: 3 }] }]
		: undefined;
	return scoreGame(demoGame(script), { history, fantasy }, { mode });
};

// The extension's translator takes `$1` plurals as `{ "1": …, "n": … }` objects and `{name}`
// placeholders by name. This is the same rule, read from the extension's locale files.
const reasonTranslator = (locale: LocaleCode) => (key: string, subsOrCount?: unknown) => {
	const value = extensionString(locale, key);
	if (value && typeof value === 'object') {
		const count = Number(subsOrCount);
		const forms = value as Record<string, string>;
		return (count === 1 ? forms['1'] : forms.n).split('$1').join(String(count));
	}
	if (typeof value !== 'string') throw new Error(`Missing extension string for a PowerScore demo: ${locale} ${key}`);
	const subs = (subsOrCount ?? {}) as Record<string, string | number>;
	return Object.entries(subs).reduce((text, [name, replacement]) => text.split(`{${name}}`).join(String(replacement)), value);
};

// The reason as a finished sentence, ending on the full stop the locale joins its sentences with.
export const reasonIn = (score: PowerScore, locale: LocaleCode) => {
	const stop = String(extensionString(locale, 'powerScore.reasonSentenceJoiner')).trim();
	if (locale === 'en') return `${score.reason}${stop}`;
	const translated = translateReasonFragments(score.reasons, reasonTranslator(locale), locale);
	if (!translated) throw new Error(`A PowerScore demo reason has no ${locale} translation`);
	return `${capitalizeReason(translated, locale)}${stop}`;
};

export const quickStartGame = {
	id: 'game-1',
	league: 'nba',
	sportType: 'basketball',
	status: 'in',
	homeTeam: { nickname: 'Celtics', score: 104 },
	awayTeam: { nickname: 'Knicks', score: 103 },
	period: 4,
	clockSeconds: secondsLeft,
} satisfies Game;
