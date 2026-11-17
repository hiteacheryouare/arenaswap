import { i18n } from '#i18n';
import { isHomeFirst } from '@arenaswap/core/constants';
import type { Game, ResolvedTheme, Team, TeamMonoMarks } from '@arenaswap/core/types';
import TeamCrest from '@arenaswap/ui/src/components/teamCrest';
import type { GameStatus } from './gameSituation';
import GameStatusText from './gameStatusText';
import { formatCompactCountdown, useStartCountdown } from './startCountdown';
import type { MonoLogos } from './useSummaryData';

const barSurface: Record<ResolvedTheme, string> = { dark: '#0d1117', light: '#ffffff' };

const BarCrest = ({ team, monoMarks, theme }: { team: Team; monoMarks?: TeamMonoMarks | null; theme: ResolvedTheme }) => (
	<TeamCrest
		logo={team.logo}
		monoMarks={monoMarks ?? undefined}
		abbreviation={team.abbreviation}
		background={barSurface[theme]}
		discClassName='gd-bar-logo-shell'
		crestClassName='gd-bar-logo'
		fallback='blank'
		teamColor={team.color}
	/>
);

interface barSlotProps {
	game: Game;
	status: GameStatus;
	compact: boolean;
}

const BarSlot = ({ game, status, compact }: barSlotProps) => {
	const parts = useStartCountdown(game.status === 'pre' ? game.startTime : undefined);
	const countdown = status.text ? '' : formatCompactCountdown(parts, i18n.t);

	if (!status.text && !countdown) return null;
	return (
		<span
			className={`gd-bar-status${compact ? ' is-visible' : ''}${countdown ? ' is-ticking' : ''}`}
			aria-hidden={!compact}
			title={countdown ? undefined : [status.text, status.clock].filter(Boolean).join(' • ')}
		>
			{countdown || <GameStatusText status={status} />}
		</span>
	);
};

interface detailStickyBarProps {
	game: Game;
	status: GameStatus;
	compact: boolean;
	monoLogos: MonoLogos;
	dismiss?: 'back' | 'close';
	onBack: () => void;
	theme?: ResolvedTheme;
}

const detailStickyBar = ({ game, status, compact, monoLogos, dismiss = 'back', onBack, theme = 'dark' }: detailStickyBarProps) => {
	const showScores = game.status !== 'pre';
	const away = { team: game.awayTeam, marks: monoLogos.away };
	const home = { team: game.homeTeam, marks: monoLogos.home };
	const [left, right] = isHomeFirst(game) ? [home, away] : [away, home];

	return (
		<div className='game-detail-header'>
			<button type='button' className='btn btn-sm game-detail-back-button' onClick={onBack}>
				<i className={dismiss === 'close' ? 'bi bi-x-lg' : 'bi bi-arrow-left'} aria-hidden='true' />
				<span>{i18n.t(dismiss === 'close' ? 'detail.close' : 'detail.back')}</span>
			</button>
			<div className={`gd-bar-compact${compact ? ' is-visible' : ''}`} aria-hidden={!compact}>
				<BarCrest team={left.team} monoMarks={left.marks} theme={theme} />
				<span className='gd-bar-abbrev'>{left.team.abbreviation}</span>
				{showScores && <span className='gd-bar-score'>{left.team.score}</span>}
				<span className='gd-bar-sep' aria-hidden='true' />
				{showScores && <span className='gd-bar-score'>{right.team.score}</span>}
				<span className='gd-bar-abbrev'>{right.team.abbreviation}</span>
				<BarCrest team={right.team} monoMarks={right.marks} theme={theme} />
			</div>
			<BarSlot game={game} status={status} compact={compact} />
		</div>
	);
};

export default detailStickyBar;
