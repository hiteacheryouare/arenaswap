import { i18n } from '#i18n';
import type { ReactNode } from 'react';
import type { Game, ResolvedTheme, TeamMonoMarks } from '@arenaswap/core/types';
import BoardCrest from '@arenaswap/ui/src/components/boardCrest';
import { resolveBoardClock } from '@arenaswap/ui/src/components/boardClock';
import { resolveGameColors } from '@arenaswap/ui/src/components/gameSurface';
import InningHalfIcon from '@arenaswap/ui/src/components/inningHalfIcon';
import { formatCompactCountdown, useStartCountdown } from './startCountdown';
import type { MonoLogos } from './useSummaryData';

// The bar sits on the page, and the legibility check does its arithmetic on a hex, not on a variable.
const pageSurface: Record<ResolvedTheme, string> = { dark: '#0e1013', light: '#f4f5f7' };

// Its own component so a countdown tick re-renders this span and leaves the hero, the breakdown and
// the four ECharts canvases untouched. A delay outranks the countdown before a start: a postponed
// game has something to say that a time nobody is holding to does not.
const BarStatus = ({ game }: { game: Game }) => {
	const isPre = game.status === 'pre';
	const parts = useStartCountdown(isPre ? game.startTime : undefined);
	if (isPre) {
		const text = game.delayed === true
			? game.delayDescription ?? i18n.t('gameCard.delayFallback')
			: formatCompactCountdown(parts, i18n.t);
		if (!text) return null;
		return <span className={`dt-bar-status${game.delayed === true ? ' is-delayed' : ' num'}`}>{text}</span>;
	}
	const clock = resolveBoardClock(game, i18n.t);
	return (
		<span className={`dt-bar-status${clock.word ? '' : ' num'}${clock.delayed ? ' is-delayed' : ''}`}>
			{clock.topOfInning !== undefined && <InningHalfIcon topOfInning={clock.topOfInning} />}
			{clock.text}
		</span>
	);
};

const BarTeam = ({ abbreviation, crest, score, side }: {
	abbreviation: string;
	crest: ReactNode;
	score: number | null;
	side: 'away' | 'home';
}) => (
	<span className={`dt-bar-team is-${side}`}>
		{crest}
		<b>{abbreviation}</b>
		{score !== null && <span className='dt-bar-score'>{score}</span>}
	</span>
);

interface detailStickyBarProps {
	game: Game;
	compact: boolean;
	monoLogos: MonoLogos;
	dismiss?: 'back' | 'close';
	onBack: () => void;
	theme?: ResolvedTheme;
}

// Takes no room at rest. Once the stage's own matchup has scrolled under it, the bar fades in with
// the matchup in miniature, so the back control and the score never both leave the screen.
const detailStickyBar = ({ game, compact, monoLogos, dismiss = 'back', onBack, theme = 'dark' }: detailStickyBarProps) => {
	// Before a start both scores are 0 and stay 0, so the abbreviations do the whole job.
	const showScores = game.status !== 'pre';
	const [awayColor, homeColor] = resolveGameColors(game);
	const crest = (side: 'away' | 'home', marks: TeamMonoMarks | null) => (
		<BoardCrest
			team={side === 'away' ? game.awayTeam : game.homeTeam}
			size={14}
			surface={pageSurface[theme]}
			color={side === 'away' ? awayColor : homeColor}
			monoMarks={marks}
			className='dt-bar-crest'
		/>
	);

	return (
		// The whole bar goes back, as v2's sub-page bars did; the button is what the keyboard lands on.
		// oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
		<div className={`dt-bar is-back${compact ? ' is-visible' : ''}`} aria-hidden={!compact} onClick={onBack}>
			<button type='button' className='btn dt-back dt-bar-back' tabIndex={compact ? undefined : -1}>
				<i className={`bi ${dismiss === 'close' ? 'bi-x-lg' : 'bi-arrow-left'}`} aria-hidden='true' />
				<span>{i18n.t(dismiss === 'close' ? 'detail.close' : 'detail.back')}</span>
			</button>
			<span className='dt-bar-match'>
				<BarTeam side='away' abbreviation={game.awayTeam.abbreviation} crest={crest('away', monoLogos.away)} score={showScores ? game.awayTeam.score : null} />
				<span className='dt-bar-sep' aria-hidden='true' />
				<BarTeam side='home' abbreviation={game.homeTeam.abbreviation} crest={crest('home', monoLogos.home)} score={showScores ? game.homeTeam.score : null} />
			</span>
			<BarStatus game={game} />
		</div>
	);
};

export default detailStickyBar;
