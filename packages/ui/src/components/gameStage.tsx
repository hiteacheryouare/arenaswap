import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import type { Game, Team, TeamMonoMarks } from '@arenaswap/core/types';
import BoardCrest from './boardCrest';
import { resolveBoardClock, trailingSide } from './boardClock';
import FlipScore from './flipScore';
import { gameSurfaceStyle, resolveGameSurface } from './gameSurface';
import { useT } from './i18nContext';
import InningHalfIcon from './inningHalfIcon';
import TimeoutDots from './timeoutDots';

type side = 'away' | 'home';

interface stageTeamOptions {
	names?: 'abbreviation' | 'name';
	records?: { away?: string | null; home?: string | null };
	favorites?: { away: boolean; home: boolean };
	onToggleFavorite?: (side: side) => void;
	monoMarks?: { away?: TeamMonoMarks | null; home?: TeamMonoMarks | null };
}

export interface gameStageProps extends stageTeamOptions {
	game: Game;
	label?: ReactNode;
	clock?: ReactNode;
	note?: ReactNode;
	// Sits between the matchup and the foot: the count, the bases, the field.
	situation?: ReactNode;
	power?: { value: number; label: string } | null;
	head?: ReactNode;
	watched?: boolean;
	className?: string;
	interactive?: HTMLAttributes<HTMLElement>;
}

const teamName = (team: Team, names: stageTeamOptions['names'] = 'abbreviation') => (
	names === 'name' ? (team.nickname || team.name || team.abbreviation) : team.abbreviation
);

// A name shrinks to fit its column before it breaks: a three-digit score leaves each side 64px, and
// "Timberwolves" is 88. Past the floor it wraps inside the word instead of shrinking further. Keyed
// by the name, so a different name is a new element and fits again.
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
	const observer = new ResizeObserver(fit);
	observer.observe(element.parentElement ?? element);
	void document.fonts?.ready.then(fit);
	return () => observer.disconnect();
};

const StageTeam = ({ game, side, crestSurface, color, options }: {
	game: Game;
	side: side;
	crestSurface: string;
	color: string;
	options: stageTeamOptions;
}) => {
	const t = useT();
	const team = side === 'away' ? game.awayTeam : game.homeTeam;
	const favorited = options.favorites?.[side] ?? false;
	const record = options.records?.[side];
	const name = teamName(team, options.names);
	return (
		<span className='as-stage-team'>
			<BoardCrest team={team} size={48} surface={crestSurface} color={color} monoMarks={options.monoMarks?.[side]} />
			<b key={`${team.rank ?? ''}${name}`} ref={fitName}>
				{team.rank !== undefined && <span className='as-rank' title={t('gameCard.teamRank', { rank: team.rank })}>#{team.rank}</span>}
				{name}
			</b>
			{record && <small className='num'>{record}</small>}
			{team.timeouts !== undefined && <TimeoutDots remaining={team.timeouts} teamAbbreviation={team.abbreviation} />}
			{options.onToggleFavorite ? (
				<button
					type='button'
					className='as-star'
					data-favorited={favorited}
					data-team-star='true'
					aria-pressed={favorited}
					aria-label={favorited ? t('gameCard.removeFromFavorites', { team: team.abbreviation }) : t('gameCard.addToFavorites', { team: team.abbreviation })}
					title={favorited ? t('gameCard.favorited') : t('gameCard.addToFavoritesShort')}
					onClick={() => options.onToggleFavorite?.(side)}
				>
					<i className={`bi ${favorited ? 'bi-star-fill' : 'bi-star'}`} aria-hidden='true' />
				</button>
			) : favorited && (
				<i className='bi bi-star-fill as-star-mark' role='img' aria-label={t('gameCard.favorited')} />
			)}
		</span>
	);
};

export const StageField = () => <div className='as-stage-field' aria-hidden='true' />;

const GameStage = ({ game, label, clock, note, situation, power, head, watched, className, interactive, ...options }: gameStageProps) => {
	const t = useT();
	const surface = resolveGameSurface(game);
	const status = resolveBoardClock(game, t);
	const behind = trailingSide(game);
	const wide = Math.max(game.awayTeam.score, game.homeTeam.score) >= 100;
	const classes = ['as-stage', watched ? 'is-watched' : '', `is-${game.status}`, className ?? ''].filter(Boolean).join(' ');
	return (
		<article
			className={classes}
			style={gameSurfaceStyle(surface) as CSSProperties}
			data-game={game.id}
			{...interactive}
		>
			<StageField />
			{head}
			<div className='as-stage-meta'>
				<span className='as-stage-label'>{label}</span>
				<span className={`as-clock${status.word ? '' : ' num'}${status.delayed ? ' is-delayed' : ''}`}>
					{clock ?? (
						<>
							{status.topOfInning !== undefined && <InningHalfIcon topOfInning={status.topOfInning} />}
							{status.text}
						</>
					)}
				</span>
			</div>
			<div className='as-stage-match'>
				<StageTeam game={game} side='away' crestSurface={surface.crestAway} color={surface.away} options={options} />
				{game.status === 'pre' ? (
					<span className='as-stage-at'>{t('board.at')}</span>
				) : (
					<span className={`as-stage-score num${wide ? ' is-wide' : ''}`}>
						<FlipScore value={game.awayTeam.score} className={`as-score${behind === 'away' ? ' is-behind' : ''}`} />
						<FlipScore value={game.homeTeam.score} className={`as-score${behind === 'home' ? ' is-behind' : ''}`} />
					</span>
				)}
				<StageTeam game={game} side='home' crestSurface={surface.crestHome} color={surface.home} options={options} />
			</div>
			{situation}
			{(note || power) && (
				<div className='as-stage-foot'>
					<div className='as-stage-note'>{note}</div>
					{power && (
						<span className='as-stage-power'>
							<strong className='num'>{power.value}</strong>
							<small>{power.label}</small>
						</span>
					)}
				</div>
			)}
		</article>
	);
};

export default GameStage;
