import type { Game, MultiviewBox as MultiviewBoxData } from '@arenaswap/core/types';
import OnColorCrest from '@arenaswap/ui/src/components/onColorCrest';
import { buildGameCardSurface, teamsInOrder } from '@arenaswap/ui/src/components/gameCardShared';
import type { gridPlacement } from './multiviewLayout';

interface multiviewBoxProps {
	box: MultiviewBoxData;
	game?: Game;
	// Where it sits once its stream plays. Until then it waits underneath the big box, the size it
	// will be shown at, so the player starts up as if it were on screen.
	placement?: gridPlacement;
	stage: gridPlacement;
}

const frameAllow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';

const CrestBar = ({ game }: { game: Game }) => {
	const { style, leftColor, rightColor } = buildGameCardSurface(game);
	const [left, right] = teamsInOrder(game);
	return (
		<header className='multiview-bar' style={style}>
			<span className='multiview-team multiview-team-left'>
				<OnColorCrest team={left} surface={leftColor} className='multiview-crest' fallback='blank' />
				<span>{left.abbreviation}</span>
			</span>
			<span className='multiview-team multiview-team-right'>
				<span>{right.abbreviation}</span>
				<OnColorCrest team={right} surface={rightColor} className='multiview-crest' fallback='blank' />
			</span>
		</header>
	);
};

const MultiviewBox = ({ box, game, placement, stage }: multiviewBoxProps) => {
	const where = placement ?? stage;
	return (
		<section
			className={placement ? 'multiview-box' : 'multiview-box multiview-box-staged'}
			style={{ gridColumn: where.column, gridRow: where.row }}
			aria-hidden={placement ? undefined : true}
		>
			{game ? <CrestBar game={game} /> : <header className='multiview-bar' />}
			{/* The user's own logged-in stream, which has to play the way it does in its own tab. Its DRM and sign-in were only ever tried unsandboxed. */}
			{/* oxlint-disable-next-line react/iframe-missing-sandbox */}
			<iframe
				className='multiview-stream'
				name={box.gameId}
				src={box.url}
				allow={frameAllow}
				allowFullScreen
				title={game ? `${game.awayTeam.name} – ${game.homeTeam.name}` : box.url}
			/>
		</section>
	);
};

export default MultiviewBox;
