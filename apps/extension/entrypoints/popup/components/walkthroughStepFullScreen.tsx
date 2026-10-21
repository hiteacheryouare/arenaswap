import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import Crest from '@arenaswap/ui/src/components/crest';
import { teamLogoOnColor } from '@arenaswap/core/constants';
import { matchupSurfaceStyle } from './gameCardShared';
import { i18n } from '#i18n';
import FlowStepper from './flowStepper';
import focusStepTitle from './stepTitleFocus';
import fullScreenShortcut, { fullScreenKeys } from '../../../utils/fullScreenShortcut';

interface walkthroughStepFullScreenProps {
	onNext: () => void;
	onBack: () => void;
}

interface screenGame {
	away: { abbr: string; color: string; logo: string; score: number };
	home: { abbr: string; color: string; logo: string; score: number };
}

const eaglesGame: screenGame = {
	away: { abbr: 'PHI', color: '#004C54', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/phi.png', score: 14 },
	home: { abbr: 'NYG', color: '#0B2265', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/nyg.png', score: 10 },
};

const sixersGame: screenGame = {
	away: { abbr: 'PHI', color: '#006BB6', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/phi.png', score: 98 },
	home: { abbr: 'BOS', color: '#007A33', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/bos.png', score: 95 },
};

const switchAtMs = 1600;

// Bootstrap declares the size on each kbd, so a parent cannot hand it down.
const keyStyle = { '--as-kbd-font-size': 'var(--as-font-size-md)' } as CSSProperties;

const walkthroughStepFullScreen = ({ onNext, onBack }: walkthroughStepFullScreenProps) => {
	const [game, setGame] = useState(eaglesGame);

	useEffect(() => {
		const timer = setTimeout(() => setGame(sixersGame), switchAtMs);
		return () => clearTimeout(timer);
	}, []);

	return (
		<div className='popup-container d-flex flex-column'>
			<FlowStepper step={5} total={9} className='pt-5 pb-3' />

			<div className='fw-bold fs-lg text-center mb-1 popup-step-title' role='heading' aria-level={1} tabIndex={-1} ref={focusStepTitle} data-step-title>{i18n.t('stepFullScreen.title')}</div>
			<div className='fg-secondary small text-center mb-5 lh-md'>
				{i18n.t('stepFullScreen.subtitle')}
			</div>

			<div className='border border-subtle-accent rounded p-3 mb-5'>
				<div
					className='game-card is-team-colored d-flex align-items-center justify-content-center mb-0 motion-tint'
					style={{ aspectRatio: '16 / 9', pointerEvents: 'none', ...matchupSurfaceStyle(game.away.color, game.home.color) }}
					aria-hidden='true'
				>
					<div className='d-flex align-items-center justify-content-center game-card-matchup w-100'>
						<div className='d-flex flex-column align-items-center gap-1 team-column is-away'>
							<Crest logo={teamLogoOnColor(game.away.logo)} abbreviation={game.away.abbr} className='team-crest-32' teamColor={game.away.color} />
							<span className='fw-bold text-center text-nowrap team-abbreviation'>{game.away.abbr}</span>
						</div>
						<div className='d-flex align-items-center game-score-row game-card-center'>
							<span className='fw-bold lh-1 game-score-value'>{game.away.score}</span>
							<span className='game-score-sep' />
							<span className='fw-bold lh-1 game-score-value'>{game.home.score}</span>
						</div>
						<div className='d-flex flex-column align-items-center gap-1 team-column is-home'>
							<Crest logo={teamLogoOnColor(game.home.logo)} abbreviation={game.home.abbr} className='team-crest-32' teamColor={game.home.color} />
							<span className='fw-bold text-center text-nowrap team-abbreviation'>{game.home.abbr}</span>
						</div>
					</div>
				</div>

				<div className='d-flex justify-content-center gap-1 mt-3' aria-hidden='true'>
					{fullScreenKeys().map(key => <kbd key={key} style={keyStyle}>{key}</kbd>)}
				</div>
			</div>

			<p className='fg-secondary small lh-md'>
				{i18n.t('stepFullScreen.body', { shortcut: fullScreenShortcut() })}
			</p>

			<div className='d-flex gap-3 mt-auto'>
				<button type='button' className='btn btn-solid theme-accent flex-grow-1' onClick={onBack}>
					<i className='bi bi-arrow-left' /> {i18n.t('stepFullScreen.back')}
				</button>
				<button type='button' className='btn btn-solid theme-primary flex-grow-1' onClick={onNext}>
					{i18n.t('stepFullScreen.next')} <i className='bi bi-arrow-right' />
				</button>
			</div>
		</div>
	);
};

export default walkthroughStepFullScreen;
