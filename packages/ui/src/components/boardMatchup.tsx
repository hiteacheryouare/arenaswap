import type { ReactNode } from 'react';
import type { Game, Team, TeamMonoMarks } from '@arenaswap/core/types';
import BaseDiamond from './baseDiamond';
import BoardCrest from './boardCrest';
import { isInningGame, resolveBoardClock, resolveBoardTone, statusWord, trailingSide, type boardTone } from './boardClock';
import { upcomingStatus } from './boardSituation';
import FavoriteStar from './favoriteStar';
import FlipScore from './flipScore';
import { useT } from './i18nContext';
import InningHalfIcon from './inningHalfIcon';
import TimeoutDots from './timeoutDots';

type side = 'away' | 'home';
export type matchupSize = 'stage' | 'tile' | 'row';

export interface matchupTeamOptions {
	names?: 'abbreviation' | 'name';
	records?: { away?: string | null; home?: string | null };
	favorites?: { away: boolean; home: boolean };
	onToggleFavorite?: (side: side) => void;
	monoMarks?: { away?: TeamMonoMarks | null; home?: TeamMonoMarks | null };
}

interface boardMatchupProps extends matchupTeamOptions {
	game: Game;
	size: matchupSize;
	// The surface under each crest, as a hex, for its legibility check.
	crests: { away: string; home: string };
	colors: { away: string; home: string };
	// Replaces the clock or the start time, as the detail view's day-and-time does.
	clock?: ReactNode;
	// Under an upcoming game's start time. Defaults to how long until it and where to watch.
	startNote?: ReactNode;
	timeouts?: boolean;
}

const crestSizes: Record<matchupSize, number> = { stage: 72, tile: 32, row: 28 };

const teamName = (team: Team, names: matchupTeamOptions['names'] = 'abbreviation') => (
	names === 'name' ? (team.nickname || team.name || team.abbreviation) : team.abbreviation
);

// A name shrinks to fit its column before it breaks, and past the floor it wraps inside the word.
// Keyed by the name, so a different name is a new element and fits again.
const nameFitFloor = 0.66;

const fitName = (element: HTMLElement | null) => {
	if (!element) return;
	const fit = () => {
		element.style.removeProperty('--name-fit');
		delete element.dataset.nameFit;
		if (element.clientWidth === 0) return;
		const overflow = element.scrollWidth / element.clientWidth;
		if (overflow <= 1) return;
		element.style.setProperty('--name-fit', String(Math.max(nameFitFloor, Math.floor(100 / overflow) / 100)));
		if (overflow > 1 / nameFitFloor) element.dataset.nameFit = 'wrap';
	};
	fit();
	// A frame later, since fitting changes the size being observed.
	let frame = 0;
	const observer = new ResizeObserver(() => {
		cancelAnimationFrame(frame);
		frame = requestAnimationFrame(fit);
	});
	observer.observe(element.closest('.as-match-team') ?? element);
	void document.fonts?.ready.then(fit);
	return () => {
		cancelAnimationFrame(frame);
		observer.disconnect();
	};
};

// v2's live dot, which also says what kind of live: red, pink past regulation, a pause for a delay.
export const StatusDot = ({ tone }: { tone: boardTone }) => {
	if (tone === 'delay') return <i className='bi bi-pause-fill as-live-dot is-delay' aria-hidden='true' />;
	if (tone !== 'live' && tone !== 'overtime') return null;
	return <span className={`as-live-dot is-${tone}`} aria-hidden='true' />;
};

export const StatusWord = ({ game }: { game: Game }) => {
	const t = useT();
	const tone = resolveBoardTone(game);
	const word = statusWord(game, tone, t);
	return word ? <span className={`as-status is-${tone}`}>{word}</span> : null;
};

// The same line across the top of every game: the tab it's on, the round, and whether it's live.
export const BoardTop = ({ game, tab, context }: { game: Game; tab?: ReactNode; context?: ReactNode }) => {
	const t = useT();
	if (!tab && !context && !statusWord(game, resolveBoardTone(game), t)) return null;
	return (
		<div className='as-top'>
			<span className='as-top-tab'>{tab}</span>
			<span className='as-top-context'>{context}</span>
			<span className='as-top-status'><StatusWord game={game} /></span>
		</div>
	);
};

const OutsDots = ({ outs }: { outs: number }) => {
	const t = useT();
	return (
		<span className='as-outs' role='img' aria-label={t('board.outs', outs)}>
			{[0, 1].map(index => <span key={index} className={`as-out${index < outs ? ' is-out' : ''}`} />)}
		</span>
	);
};

// Drawn where the two scores meet: the bases and the outs, or the down and where the ball is.
const Situation = ({ game }: { game: Game }) => {
	if (game.status !== 'in' || game.delayed === true) return null;
	if (isInningGame(game)) {
		if (!game.baseRunners && !game.bso) return null;
		return (
			<span className='as-situation'>
				{game.baseRunners && <BaseDiamond {...game.baseRunners} />}
				{game.bso && <OutsDots outs={game.bso.outs} />}
			</span>
		);
	}
	if (game.sportType !== 'football' || !game.downDistance) return null;
	return (
		<span className='as-downs'>
			<b>{game.downDistance}</b>
			{game.fieldPosition && <small>{game.fieldPosition}</small>}
		</span>
	);
};

const Centre = ({ game, clock, startNote }: Pick<boardMatchupProps, 'game' | 'clock' | 'startNote'>) => {
	const t = useT();
	const status = resolveBoardClock(game, t);
	if (game.status === 'pre') {
		const note = startNote === undefined ? upcomingStatus(game, t as Parameters<typeof upcomingStatus>[1]) : startNote;
		return (
			<span className='as-centre is-pre'>
				<span className='as-centre-time num'>{clock ?? status.text}</span>
				{note && <span className='as-centre-note'>{note}</span>}
			</span>
		);
	}
	if (game.status === 'post') {
		return <span className='as-centre is-final'><span className='as-centre-word'>{status.text}</span></span>;
	}
	return (
		<span className='as-centre'>
			<Situation game={game} />
			<span className={`as-clock${status.word ? '' : ' num'}${status.delayed ? ' is-delayed' : ''}`}>
				<StatusDot tone={resolveBoardTone(game)} />
				{clock ?? (
					<>
						{status.topOfInning !== undefined && <InningHalfIcon topOfInning={status.topOfInning} />}
						{status.text}
					</>
				)}
			</span>
		</span>
	);
};

const MatchTeam = ({ game, side, size, crest, color, timeouts, options }: {
	game: Game;
	side: side;
	size: matchupSize;
	crest: string;
	color: string;
	timeouts: boolean;
	options: matchupTeamOptions;
}) => {
	const t = useT();
	const team = side === 'away' ? game.awayTeam : game.homeTeam;
	const name = teamName(team, options.names);
	const record = options.records?.[side];
	return (
		<span className={`as-match-team is-${side}`}>
			<BoardCrest team={team} size={crestSizes[size]} surface={crest} color={color} monoMarks={options.monoMarks?.[side]} />
			<span className='as-match-name'>
				<b key={`${team.rank ?? ''}${name}`} ref={fitName}>
					{team.rank !== undefined && <span className='as-rank' title={t('gameCard.teamRank', { rank: team.rank })}>{team.rank}</span>}
					{name}
				</b>
				<FavoriteStar
					team={team}
					favorited={options.favorites?.[side] ?? false}
					onToggle={options.onToggleFavorite && (() => options.onToggleFavorite?.(side))}
				/>
			</span>
			{record && <small className='as-match-record num'>{record}</small>}
			{timeouts && team.timeouts !== undefined && <TimeoutDots remaining={team.timeouts} teamAbbreviation={team.abbreviation} />}
		</span>
	);
};

// One game as a scoreboard reads it: each team under its crest, the scores beside them, and what is
// happening in the middle.
const BoardMatchup = ({ game, size, crests, colors, clock, startNote, timeouts = false, ...options }: boardMatchupProps) => {
	const behind = trailingSide(game);
	const wide = Math.max(game.awayTeam.score, game.homeTeam.score) >= 100;
	const score = (which: side) => (
		<FlipScore
			value={(which === 'away' ? game.awayTeam : game.homeTeam).score}
			className={`as-match-score is-${which}${behind === which ? ' is-behind' : ''}`}
		/>
	);
	return (
		<div className={`as-match is-${size}${game.status === 'pre' ? ' is-pre' : ''}${wide ? ' is-wide' : ''}`}>
			<MatchTeam game={game} side='away' size={size} crest={crests.away} color={colors.away} timeouts={timeouts} options={options} />
			{game.status !== 'pre' && score('away')}
			<Centre game={game} clock={clock} startNote={startNote} />
			{game.status !== 'pre' && score('home')}
			<MatchTeam game={game} side='home' size={size} crest={crests.home} color={colors.home} timeouts={timeouts} options={options} />
		</div>
	);
};

export default BoardMatchup;
