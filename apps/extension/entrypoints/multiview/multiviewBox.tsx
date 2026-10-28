import type { Game, MultiviewBox as MultiviewBoxData } from '@arenaswap/core/types';
import OnColorCrest from '@arenaswap/ui/src/components/onColorCrest';
import { buildGameCardSurface, teamsInOrder } from '@arenaswap/ui/src/components/gameCardShared';
import { i18n } from '#i18n';
import { useEffect, useState } from 'react';
import type { gridPlacement } from './multiviewLayout';

interface multiviewBoxProps {
	box: MultiviewBoxData;
	game?: Game;
	placement: gridPlacement;
	onAir: boolean;
	// Has played at some point since the box opened.
	played: boolean;
	audible: boolean;
}

// How long a box that has never played keeps its card before the player is shown anyway, in case
// it is waiting on a sign-in or a play button.
const neverPlayedMs = 30_000;

const frameAllow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
const logo = '/images/full_logo_white_on_transparent.svg';

const CrestBar = ({ game, audible }: { game: Game; audible: boolean }) => {
	const { style, leftColor, rightColor } = buildGameCardSurface(game);
	const [left, right] = teamsInOrder(game);
	return (
		<header className='multiview-bar' style={style}>
			<span className='multiview-team multiview-team-left'>
				<OnColorCrest team={left} surface={leftColor} className='multiview-crest' fallback='blank' />
				<span>{left.abbreviation}</span>
			</span>
			{audible && <i className='bi bi-volume-up-fill multiview-sound' role='img' aria-label={i18n.t('multiview.soundOn')} />}
			<span className='multiview-team multiview-team-right'>
				<span>{right.abbreviation}</span>
				<OnColorCrest team={right} surface={rightColor} className='multiview-crest' fallback='blank' />
			</span>
		</header>
	);
};

// Over the picture until the stream plays, and again whenever it stalls, so the player's own
// spinners and loading screens never show. Opaque on top rather than hiding the frame, which
// Chrome would take as a reason to hold its video back.
const OffAirCard = ({ game, onAir }: { game?: Game; onAir: boolean }) => {
	const className = onAir ? 'multiview-off-air multiview-off-air-gone' : 'multiview-off-air';
	if (!game) {
		return (
			<div className={className} aria-hidden='true'>
				<img className='multiview-off-air-mark' src={logo} alt='' />
			</div>
		);
	}
	const { leftColor, rightColor } = buildGameCardSurface(game);
	const [left, right] = teamsInOrder(game);
	return (
		<div className={className} aria-hidden='true'>
			<div className='multiview-off-air-side' style={{ backgroundColor: leftColor }}>
				<OnColorCrest team={left} surface={leftColor} className='multiview-off-air-crest' fallback='abbreviation' />
			</div>
			<div className='multiview-off-air-side' style={{ backgroundColor: rightColor }}>
				<OnColorCrest team={right} surface={rightColor} className='multiview-off-air-crest' fallback='abbreviation' />
			</div>
			<img className='multiview-off-air-mark' src={logo} alt='' />
		</div>
	);
};

const MultiviewBox = ({ box, game, placement, onAir, played, audible }: multiviewBoxProps) => {
	const [waitedOut, setWaitedOut] = useState(false);
	useEffect(() => {
		const timer = setTimeout(() => setWaitedOut(true), neverPlayedMs);
		return () => clearTimeout(timer);
	}, []);
	const showPicture = onAir || (waitedOut && !played);

	return (
		<section
			className={audible ? 'multiview-box multiview-box-audible' : 'multiview-box'}
			style={{ gridColumn: placement.column, gridRow: placement.row }}
			data-game-id={box.gameId}
			data-on-air={showPicture}
		>
			{game ? <CrestBar game={game} audible={audible} /> : <header className='multiview-bar' />}
			<div className='multiview-picture'>
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
				<OffAirCard game={game} onAir={showPicture} />
			</div>
		</section>
	);
};

export default MultiviewBox;
