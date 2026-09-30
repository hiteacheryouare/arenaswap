import type { ReactNode } from 'react';
import type { Game, UserPreferences } from '@arenaswap/core/types';
import BsoIndicator from './bsoIndicator';
import { isInningGame } from './boardClock';
import HoverTooltip from './hoverTooltip';

type Translate = (key: string, subsOrCount?: unknown, subs?: unknown) => string;

const minuteMs = 60_000;

const formatOverUnder = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1));

export const oddsLine = (game: Game): string | null => {
	const parts: string[] = [];
	if (game.odds?.details) parts.push(game.odds.details);
	if (game.odds?.overUnder !== undefined) parts.push(`O/U ${formatOverUnder(game.odds.overUnder)}`);
	return parts.length ? parts.join(', ') : null;
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

// The full count, under the stage's matchup. The bases and the outs sit between the scores.
export const stageSituation = (game: Game): ReactNode => {
	if (!isInningGame(game) || game.status !== 'in' || !game.bso) return null;
	return (
		<div className='as-stage-situation'>
			<BsoIndicator {...game.bso} />
		</div>
	);
};

// Up to three quiet lines beside the PowerScore: where it is, where to watch, the line.
export const stageNote = (game: Game, prefs: Pick<UserPreferences, 'bettingEnabled'>, t: Translate): ReactNode => {
	const lead = game.venueName;
	const networks = networksOf(game);
	const odds = prefs.bettingEnabled ? oddsLine(game) : null;
	const lines = [
		lead && <span key='lead' className='as-note-lead'>{lead}</span>,
		networks && <span key='watch'>{t('board.watchOn', { networks })}</span>,
		(odds || (prefs.bettingEnabled && game.odds?.provider?.name)) && (
			<span key='odds' className='as-note-odds'>
				{odds}
				{game.odds?.provider?.name && (
					<HoverTooltip className='as-note-provider' text={`${t('gameCard.oddsProvidedBy')} ${game.odds.provider.name}`}>
						{game.odds.provider.darkLogoUrl
							? <img className='odds-provider-logo' src={game.odds.provider.darkLogoUrl} alt={game.odds.provider.name} />
							: game.odds.provider.name}
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
