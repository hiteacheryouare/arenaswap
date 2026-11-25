import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { isHomeFirst } from '@arenaswap/core/constants';
import type { Game, Team } from '@arenaswap/core/types';
import { teamDisplayInk } from '@arenaswap/chromatic';
import { buildGameCardSurface } from '@arenaswap/ui/src/components/gameCardShared';
import OnColorCrest from '@arenaswap/ui/src/components/onColorCrest';
import RevealName from './reveal/revealName';
import RevealNamingScene from './reveal/revealNamingScene';
import RevealHeadToHead from './reveal/revealHeadToHead';
import RevealTypeSlam from './reveal/revealTypeSlam';
import RevealScoreRoll, { measureRolls, type revealRoll } from './reveal/revealScoreRoll';
import {
	revealAbbrScale,
	revealCutTotalMs,
	revealDelayMs,
	revealHoldScale,
	revealLean,
	revealOpenCrestShare,
	revealRate,
	revealSkewDeg,
	revealSpineStartMs,
	revealStageBleedPx,
	revealSweepRun,
	type revealCut,
	type revealMode,
} from '../cardReveal';

interface gameCardRevealProps {
	game: Game;
	mode: revealMode;
	index: number;
	skipping: boolean;
	cut?: revealCut;
	children: ReactNode;
}

type revealSide = 'away' | 'home';

interface revealSideProps {
	team: Team;
	surface: string;
	side: revealSide;
	crestlessLate?: number;
	onCrestFailed: () => void;
}

interface revealOpeningProps {
	game: Game;
	awayColor: string;
	homeColor: string;
	crestlessLate: (side: revealSide) => number | undefined;
	onCrestFailed: (side: revealSide) => () => void;
}

interface revealLanding {
	awayDx: number;
	awayDy: number;
	homeDx: number;
	homeDy: number;
	lean: number;
	skew: number;
	crestSize: number;
	hold: number;
	sweepRun: number;
	cardHeight: number;
	cardWidth: number;
	rolls: revealRoll[];
}

const crestCentre = (rect: DOMRect, box: DOMRect) => ({
	x: rect.left - box.left + rect.width / 2,
	y: rect.top - box.top + rect.height / 2,
});

const timelineNow = () => Number(document.timeline?.currentTime ?? 0);

const lateStyle = (late?: number) => (late ? { '--reveal-late': `${late}ms` } as CSSProperties : undefined);

const RevealSide = ({ team, surface, side, crestlessLate, onCrestFailed }: revealSideProps) => {
	const crestless = crestlessLate !== undefined;
	return (
		<>
			<span className={`game-card-reveal-wipe is-${side}`}>
				<span className={`game-card-reveal-crest${crestless ? ' is-named' : ''}`} style={lateStyle(crestlessLate)}>
					<span className='game-card-reveal-crest-plate is-bare'>
						<OnColorCrest
							team={team}
							surface={surface}
							className='game-card-reveal-crest-logo'
							fallback={crestless ? 'abbreviation' : 'blank'}
							loading='eager'
							silhouetteWhenLost
							onFailed={onCrestFailed}
						/>
					</span>
					{crestless && <RevealName key={team.name} team={team} className='game-card-reveal-crest-name' inset={0} />}
				</span>
			</span>
			<span className={`game-card-reveal-mask is-${side}`}>
				<span className='game-card-reveal-abbr'>
					<span className='game-card-reveal-abbr-edge'>{team.abbreviation}</span>
					<span className='game-card-reveal-abbr-face'>{team.abbreviation}</span>
				</span>
			</span>
		</>
	);
};

const RevealOpening = ({ game, awayColor, homeColor, crestlessLate, onCrestFailed }: revealOpeningProps) => (
	<div className='game-card-reveal-opening' aria-hidden='true'>
		{([['away', game.awayTeam, awayColor], ['home', game.homeTeam, homeColor]] as const).map(([side, team, surface]) => (
			<span key={side} className={`game-card-reveal-opening-field is-${side} is-bare`} style={lateStyle(crestlessLate(side))}>
				{crestlessLate(side) !== undefined
					? <RevealName key={team.name} team={team} className='game-card-reveal-opening-field-name' />
					: <OnColorCrest team={team} surface={surface} className='game-card-reveal-opening-logo' fallback='blank' loading='eager' silhouetteWhenLost onFailed={onCrestFailed(side)} />}
			</span>
		))}
		<RevealNamingScene game={game} />
	</div>
);

const inDrawnOrder = (game: Game): Game => (
	isHomeFirst(game) ? { ...game, awayTeam: game.homeTeam, homeTeam: game.awayTeam } : game
);

const gameCardReveal = ({ game: listedGame, mode, index, skipping, cut: pickedCut = 'poster', children }: gameCardRevealProps) => {
	const cut = mode === 'quick' ? pickedCut : 'poster';
	const game = useMemo(() => inDrawnOrder(listedGame), [listedGame]);
	const wrapperRef = useRef<HTMLDivElement | null>(null);
	const [staged] = useState(() => mode !== 'none');
	const [landing, setLanding] = useState<revealLanding | null>(null);
	const [done, setDone] = useState(false);
	const [failedLogos, setFailedLogos] = useState<Record<string, number>>({});
	const [startedAt] = useState(timelineNow);
	const delay = revealDelayMs(index, mode);
	const spineStart = revealSpineStartMs(index, mode);

	const measure = useCallback(() => {
		const wrapper = wrapperRef.current;
		if (!wrapper) return;
		const [awayCrest, homeCrest] = wrapper.querySelectorAll('.game-card .team-crest');
		if (!awayCrest || !homeCrest) return;
		const box = wrapper.getBoundingClientRect();
		const awayRect = awayCrest.getBoundingClientRect();
		const away = crestCentre(awayRect, box);
		const home = crestCentre(homeCrest.getBoundingClientRect(), box);
		const crestSize = awayRect.width;
		const stageHeight = box.height + revealStageBleedPx * 2;
		const lean = revealLean(stageHeight, box.width);
		setLanding({
			awayDx: away.x - box.width * 0.25,
			awayDy: away.y - box.height / 2,
			homeDx: home.x - box.width * 0.75,
			homeDy: home.y - box.height / 2,
			lean,
			skew: revealSkewDeg(lean, stageHeight),
			crestSize,
			hold: revealHoldScale(box.width, box.height, crestSize),
			sweepRun: revealSweepRun(box.width, lean),
			cardHeight: box.height,
			cardWidth: box.width,
			rolls: cut === 'boxScore' ? measureRolls(wrapper) : [],
		});
	}, [cut]);

	useLayoutEffect(() => {
		const wrapper = wrapperRef.current;
		if (!wrapper || mode === 'none' || done) return;
		measure();
		if (typeof ResizeObserver === 'undefined') return;
		const observer = new ResizeObserver(measure);
		observer.observe(wrapper);
		return () => observer.disconnect();
	}, [mode, done, measure]);

	useLayoutEffect(() => {
		if (mode === 'none') return;
		const timer = setTimeout(() => setDone(true), delay + revealCutTotalMs(mode, cut));
		return () => clearTimeout(timer);
	}, [mode, cut, delay]);

	if (!staged) return <>{children}</>;
	const playing = mode !== 'none' && !done;
	const poster = playing && cut === 'poster';

	const { leftColor: awayColor, rightColor: homeColor } = buildGameCardSurface(listedGame);
	const teamOn = (side: revealSide) => (side === 'away' ? game.awayTeam : game.homeTeam);
	const crestlessLate = (side: revealSide) => {
		const { logo } = teamOn(side);
		return logo ? failedLogos[logo] : 0;
	};
	const onCrestFailed = (side: revealSide) => () => {
		const { logo } = teamOn(side);
		if (logo) setFailedLogos(held => (logo in held ? held : { ...held, [logo]: Math.round(timelineNow() - startedAt) }));
	};

	return (
		<div
			ref={wrapperRef}
			className={`game-card-reveal${game.status === 'post' ? ' is-final' : ''}${playing && skipping ? ' is-skipping' : ''}`}
			data-reveal-cut={playing ? cut : undefined}
			style={!playing ? undefined : {
				'--reveal-away': awayColor,
				'--reveal-home': homeColor,
				'--reveal-ink-away': teamDisplayInk(game.awayTeam, awayColor),
				'--reveal-ink-home': teamDisplayInk(game.homeTeam, homeColor),
				'--reveal-delay': `${delay}ms`,
				'--reveal-spine': `${spineStart}ms`,
				'--reveal-rate': revealRate(mode),
				'--reveal-lean': `${landing?.lean ?? 0}px`,
				'--reveal-skew': `${landing?.skew ?? 0}deg`,
				'--reveal-crest': `${landing?.crestSize ?? 0}px`,
				'--reveal-hold': landing?.hold ?? 1,
				'--reveal-sweep-run': `${landing?.sweepRun ?? 0}px`,
				'--reveal-open-crest': `${(landing?.cardHeight ?? 0) * revealOpenCrestShare}px`,
				'--reveal-abbr-scale': revealAbbrScale(game.awayTeam.abbreviation, game.homeTeam.abbreviation),
				'--reveal-away-dx': `${landing?.awayDx ?? 0}px`,
				'--reveal-away-dy': `${landing?.awayDy ?? 0}px`,
				'--reveal-home-dx': `${landing?.homeDx ?? 0}px`,
				'--reveal-home-dy': `${landing?.homeDy ?? 0}px`,
				'--reveal-width': `${landing?.cardWidth ?? 0}px`,
				'--reveal-reach': `${Math.hypot(landing?.cardWidth ?? 0, landing?.cardHeight ?? 0)}px`,
			} as CSSProperties}
		>
			{playing && cut !== 'poster' && <>
				{cut === 'headToHead' && <span className='game-card-reveal-base' aria-hidden='true' />}
				<div className='game-card-reveal-stage' aria-hidden='true'>
					{cut === 'headToHead' && <RevealHeadToHead game={game} awayColor={awayColor} homeColor={homeColor} />}
					{cut === 'typeSlam' && landing && <RevealTypeSlam game={game} awayColor={awayColor} homeColor={homeColor} width={landing.cardWidth} height={landing.cardHeight} />}
					{cut === 'boxScore' && <RevealScoreRoll rolls={landing?.rolls ?? []} />}
				</div>
			</>}
			{poster && <span className='game-card-reveal-base' aria-hidden='true' />}
			{poster && mode === 'full' && (
				<RevealOpening game={game} awayColor={awayColor} homeColor={homeColor} crestlessLate={crestlessLate} onCrestFailed={onCrestFailed} />
			)}
			{poster && <div className='game-card-reveal-stage' aria-hidden='true'>
				<span className='game-card-reveal-half is-away' />
				<span className='game-card-reveal-half is-home' />
				<RevealSide team={game.awayTeam} surface={awayColor} side='away' crestlessLate={crestlessLate('away')} onCrestFailed={onCrestFailed('away')} />
				<RevealSide team={game.homeTeam} surface={homeColor} side='home' crestlessLate={crestlessLate('home')} onCrestFailed={onCrestFailed('home')} />
			</div>}
			{children}
			{poster && <div className='game-card-reveal-sweeps' aria-hidden='true'>
				<span className='game-card-reveal-sweep is-away' />
				<span className='game-card-reveal-sweep is-away is-chaser' />
				<span className='game-card-reveal-sweep is-away is-chaser is-trailer' />
				<span className='game-card-reveal-sweep is-home' />
				<span className='game-card-reveal-sweep is-home is-chaser' />
				<span className='game-card-reveal-sweep is-home is-chaser is-trailer' />
			</div>}
		</div>
	);
};

export default gameCardReveal;
