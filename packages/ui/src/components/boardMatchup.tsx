import type { ReactNode } from 'react';
import type { Game, Team, TeamMonoMarks } from '@arenaswap/core/types';
import BaseDiamond from './baseDiamond';
import BoardCrest from './boardCrest';
import BsoIndicator from './bsoIndicator';
import { hasShootout, isInningGame, resolveBoardTone, resolveClockLines, statusWord, trailingSide, type boardTone } from './boardClock';
import { downDistanceLine, upcomingStatus } from './boardSituation';
import FavoriteStar from './favoriteStar';
import FlipScore from './flipScore';
import { useT } from './i18nContext';
import InningHalfIcon from './inningHalfIcon';
import TimeoutDots from './timeoutDots';
import { conditionIcon, formatTemperature, type temperatureDisplayUnit } from './weatherUtils';

type side = 'away' | 'home';
export type matchupSize = 'stage' | 'hero' | 'tile' | 'row';

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
	// On a white card, where the colour artwork always reads.
	plainCrests?: boolean;
	// Set to draw an upcoming game's forecast under its start time, as v2's cards did.
	temperatureUnit?: temperatureDisplayUnit;
}

const crestSizes: Record<matchupSize, number> = { stage: 96, hero: 64, tile: 56, row: 44 };

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
	if (!word) return null;
	return (
		<span className={`as-status is-${tone}`}>
			<StatusDot tone={tone} />
			{word}
		</span>
	);
};

// v2's status row across the top of every game: whether it's live on the left, the round on the right.
export const BoardTop = ({ game, context, children }: { game: Game; context?: ReactNode; children?: ReactNode }) => {
	const t = useT();
	if (!context && !children && !statusWord(game, resolveBoardTone(game), t)) return null;
	return (
		<div className='as-top'>
			<StatusWord game={game} />
			{children}
			{context && <span className='as-top-context'>{context}</span>}
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

const isLive = (game: Game) => game.status === 'in' && game.delayed !== true;

// Under the clock: the count, or the down and where the ball is.
const Situation = ({ game, size }: { game: Game; size: matchupSize }) => {
	const t = useT();
	if (!isLive(game)) return null;
	if (isInningGame(game)) {
		if (!game.bso) return null;
		return size === 'stage' || size === 'hero' ? <BsoIndicator {...game.bso} /> : <OutsDots outs={game.bso.outs} />;
	}
	if (game.sportType !== 'football' || !game.downDistance) return null;
	if (size !== 'tile') return <span className='as-downs'>{downDistanceLine(game, t as Parameters<typeof downDistanceLine>[1])}</span>;
	return (
		<span className='as-downs is-stacked'>
			<b>{game.downDistance}</b>
			{game.fieldPosition && <small>{game.fieldPosition}</small>}
		</span>
	);
};

// Between the two scores: v2's hairline, or the bases for a game that has them.
const ScoreDivider = ({ game }: { game: Game }) => {
	if (isInningGame(game) && isLive(game)) {
		return (
			<span className='as-match-mid is-bases'>
				<BaseDiamond first={game.baseRunners?.first ?? false} second={game.baseRunners?.second ?? false} third={game.baseRunners?.third ?? false} />
			</span>
		);
	}
	return <span className='as-match-mid' aria-hidden='true'><span className='as-match-sep' /></span>;
};

const Centre = ({ game, size, clock, startNote, temperatureUnit }: Pick<boardMatchupProps, 'game' | 'size' | 'clock' | 'startNote' | 'temperatureUnit'>) => {
	const t = useT();
	if (game.status === 'pre') {
		const lines = resolveClockLines(game, t);
		const note = startNote === undefined ? upcomingStatus(game, t as Parameters<typeof upcomingStatus>[1]) : startNote;
		return (
			<span className='as-centre is-pre'>
				<span className='as-centre-time'>{clock ?? lines.main}</span>
				{note && <span className='as-centre-note'>{note}</span>}
				{game.weather && temperatureUnit && (
					<span className='as-centre-weather'>
						<i className={`bi ${conditionIcon(game.weather.conditionLabel)}`} aria-hidden='true' />
						{formatTemperature(game.weather.temperatureF, temperatureUnit)}
					</span>
				)}
			</span>
		);
	}
	const lines = resolveClockLines(game, t);
	// The status row already says Final; all a result adds is a shootout's tally.
	if (game.status === 'post') {
		if (!hasShootout(game)) return null;
		return <span className='as-centre'><span className='as-period'>{t('gameCard.shootout', { away: game.awayTeam.shootoutScore ?? 0, home: game.homeTeam.shootoutScore ?? 0 })}</span></span>;
	}
	return (
		<span className='as-centre'>
			<span className={`as-clock${lines.word ? ' is-word' : ''}${game.delayed === true ? ' is-delayed' : ''}`}>
				{clock ?? (
					<>
						{lines.topOfInning !== undefined && <InningHalfIcon topOfInning={lines.topOfInning} />}
						{lines.main}
					</>
				)}
			</span>
			{!clock && lines.sub && <span className='as-period'>{lines.sub}</span>}
			<Situation game={game} size={size} />
		</span>
	);
};

const MatchTeam = ({ game, side, size, crest, color, timeouts, plain, options }: {
	game: Game;
	side: side;
	size: matchupSize;
	crest: string;
	color: string;
	timeouts: boolean;
	plain: boolean;
	options: matchupTeamOptions;
}) => {
	const t = useT();
	const team = side === 'away' ? game.awayTeam : game.homeTeam;
	const name = teamName(team, options.names);
	const record = options.records?.[side];
	return (
		<span className={`as-match-team is-${side}`}>
			<BoardCrest team={team} size={crestSizes[size]} surface={crest} color={color} monoMarks={options.monoMarks?.[side]} plain={plain} />
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
			{record && <small className='as-match-record'>{record}</small>}
			{timeouts && team.timeouts !== undefined && <TimeoutDots remaining={team.timeouts} teamAbbreviation={team.abbreviation} />}
		</span>
	);
};

// One game as v2's card read it: each team under its crest, the two scores together in the middle
// split by a hairline, and the clock and period stacked under them.
const BoardMatchup = ({ game, size, crests, colors, clock, startNote, timeouts = false, plainCrests = false, temperatureUnit, ...options }: boardMatchupProps) => {
	const behind = game.status === 'post' ? trailingSide(game) : null;
	const wide = Math.max(game.awayTeam.score, game.homeTeam.score) >= 100;
	const score = (which: side) => (
		<FlipScore
			value={(which === 'away' ? game.awayTeam : game.homeTeam).score}
			className={`as-match-score is-${which}${behind === which ? ' is-behind' : ''}`}
		/>
	);
	return (
		<div className={`as-match is-${size}${game.status === 'pre' ? ' is-pre' : ''}${wide ? ' is-wide' : ''}`}>
			<MatchTeam game={game} side='away' size={size} crest={crests.away} color={colors.away} timeouts={timeouts} plain={plainCrests} options={options} />
			{game.status !== 'pre' && score('away')}
			{game.status !== 'pre' && <ScoreDivider game={game} />}
			{game.status !== 'pre' && score('home')}
			<Centre game={game} size={size} clock={clock} startNote={startNote} temperatureUnit={temperatureUnit} />
			<MatchTeam game={game} side='home' size={size} crest={crests.home} color={colors.home} timeouts={timeouts} plain={plainCrests} options={options} />
		</div>
	);
};

export default BoardMatchup;
