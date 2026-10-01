import type { ReactNode } from 'react';
import type { Game, UserPreferences } from '@arenaswap/core/types';
import HoverTooltip from './hoverTooltip';

type Translate = (key: string, subsOrCount?: unknown, subs?: unknown) => string;

const minuteMs = 60_000;

const formatOverUnder = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1));

export const oddsLine = (game: Game): string | null => {
	const parts: string[] = [];
	if (game.odds?.details) parts.push(game.odds.details);
	if (game.odds?.overUnder !== undefined) parts.push(`O/U ${formatOverUnder(game.odds.overUnder)}`);
	return parts.length ? parts.join(' • ') : null;
};

const networksOf = (game: Game, limit = 2) => game.broadcasts?.slice(0, limit).join(', ');

export const downDistanceLine = (game: Game, t: Translate): string | undefined => (
	game.downDistance && game.fieldPosition
		? t('gameCard.downDistanceAt', { downDistance: game.downDistance, fieldPosition: game.fieldPosition })
		: game.downDistance
);

// Our sources write rounds as "NLWC · Game 2"; the board doesn't do middle dots.
export const roundLabel = (game: Pick<Game, 'postseasonLabel'>): string | undefined => (
	game.postseasonLabel?.replace(/\s*·\s*/g, ', ')
);

const placeLines = (game: Game, t: Translate) => {
	const networks = game.broadcasts?.slice(0, 2).join(' • ');
	return [
		game.venueName && <span key='venue' className='as-meta-venue'>{game.venueName}</span>,
		networks && <span key='watch' className='as-meta-watch'><b>{t('gameCard.watchLabel')}</b> {networks}</span>,
	];
};

// Under every live game: where it is and where to watch it.
export const liveNote = (game: Game, t: Translate): ReactNode => {
	const lines = placeLines(game, t).filter(Boolean);
	return lines.length ? lines : null;
};

// v2's meta under the top game's matchup: where it is, where to watch, and the line.
export const stageNote = (game: Game, prefs: Pick<UserPreferences, 'bettingEnabled'>, t: Translate): ReactNode => {
	const odds = prefs.bettingEnabled ? oddsLine(game) : null;
	const provider = prefs.bettingEnabled ? game.odds?.provider : undefined;
	const lines = [
		...placeLines(game, t),
		(odds || provider?.name) && (
			<span key='odds' className='as-meta-odds'>
				{odds}
				{provider?.name && (
					<HoverTooltip className='as-meta-provider' text={`${t('gameCard.oddsProvidedBy')} ${provider.name}`}>
						{provider.logoUrl
							? <img className='odds-provider-logo' src={provider.logoUrl} alt={provider.name} />
							: provider.name}
					</HoverTooltip>
				)}
			</span>
		),
	].filter(Boolean);
	return lines.length ? lines : null;
};

// "in 54 min, NBC", or the first network alone once a start is more than a few hours out.
export const upcomingStatus = (game: Game, t: Translate, now = Date.now()): string => {
	const parts: string[] = [];
	const start = game.startTime ? new Date(game.startTime).getTime() : Number.NaN;
	if (Number.isFinite(start)) {
		const minutes = Math.round((start - now) / minuteMs);
		if (minutes <= 0) parts.push(t('detail.startsSoon'));
		else if (minutes < 60) parts.push(t('board.inMinutes', minutes));
		else if (minutes < 6 * 60) parts.push(t('board.inHours', Math.round(minutes / 60)));
	}
	const networks = networksOf(game, 1);
	if (networks) parts.push(networks);
	return parts.join(', ');
};
