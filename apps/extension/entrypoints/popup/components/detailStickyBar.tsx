import { i18n } from '#i18n';
import type { Game, Team, TeamMonoMarks } from '@arenaswap/core/types';
import TeamCrest from '@arenaswap/ui/src/components/teamCrest';
import type { GameStatus } from './gameSituation';
import { formatCompactCountdown, useStartCountdown } from './startCountdown';
import type { MonoLogos } from './useSummaryData';

// The bar sits on the shell's own background rather than on team colour, and it is the one place a
// crest is drawn at 18px with nothing else to identify the team but three letters — a navy monogram
// there is a blank box. Same three treatments as the hero below it.
const barSurface = '#0d1117';

// Blank rather than lettered: the abbreviation is already the next element along. It still holds
// its box, because collapsing an 18px item drags the centred matchup off the card's axis.
const BarCrest = ({ team, monoMarks }: { team: Team; monoMarks?: TeamMonoMarks | null }) => (
	<TeamCrest
		logo={team.logo}
		monoMarks={monoMarks ?? undefined}
		abbreviation={team.abbreviation}
		background={barSurface}
		discClassName='gd-bar-logo-shell'
		crestClassName='gd-bar-logo'
		fallback='blank'
	/>
);

interface barSlotProps {
	game: Game;
	status: GameStatus;
	compact: boolean;
}

// A delay description wins the slot outright: a postponed game has something to say that a time
// until a start nobody is holding to does not. Otherwise the slot is the period and clock once a
// game is under way and the countdown before it, which is why the two share one element.
//
// Own component so a countdown tick re-renders this span and leaves the hero, the breakdown and
// the four ECharts canvases untouched, the way startCountdownDisplay does for the hero.
const BarSlot = ({ game, status, compact }: barSlotProps) => {
	const parts = useStartCountdown(game.status === 'pre' ? game.startTime : undefined);
	const countdown = status.text ? '' : formatCompactCountdown(parts, i18n.t);
	const text = status.text || countdown;

	if (!text) return null;
	return (
		<span
			className={`gd-bar-status${compact ? ' is-visible' : ''}${status.tabular || countdown ? ' font-lekton' : ''}`}
			aria-hidden={!compact}
		>
			{text}
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
}

// The matchup is absolutely centred and the status pinned separately to the right. In one
// centred group a longer status string drags the score off the card's axis, and it drifts
// again every time the period changes.
const detailStickyBar = ({ game, status, compact, monoLogos, dismiss = 'back', onBack }: detailStickyBarProps) => {
	// Before a start both scores are 0 and stay 0, so the abbreviations are doing the bar's whole
	// job on their own and the figures are noise. The rule between them stays either way: it is
	// what makes the pair read as one matchup rather than two adjacent teams.
	const showScores = game.status !== 'pre';

	return (
		<div className='game-detail-header'>
			<button type='button' className='btn btn-sm game-detail-back-button' onClick={onBack}>
				<i className={dismiss === 'close' ? 'bi bi-x-lg' : 'bi bi-arrow-left'} aria-hidden='true' />
				<span>{i18n.t(dismiss === 'close' ? 'detail.close' : 'detail.back')}</span>
			</button>
			<div className={`gd-bar-compact${compact ? ' is-visible' : ''}`} aria-hidden={!compact}>
				<BarCrest team={game.awayTeam} monoMarks={monoLogos.away} />
				<span className='gd-bar-abbrev'>{game.awayTeam.abbreviation}</span>
				{showScores && <span className='gd-bar-score'>{game.awayTeam.score}</span>}
				<span className='gd-bar-sep' aria-hidden='true' />
				{showScores && <span className='gd-bar-score'>{game.homeTeam.score}</span>}
				<span className='gd-bar-abbrev'>{game.homeTeam.abbreviation}</span>
				<BarCrest team={game.homeTeam} monoMarks={monoLogos.home} />
			</div>
			<BarSlot game={game} status={status} compact={compact} />
		</div>
	);
};

export default detailStickyBar;
