import type { ReactNode, RefObject } from 'react';
import type { Game } from '@arenaswap/core/types';
import { PopupHeader } from '@arenaswap/ui/src/components/popupChrome';
import GameStage from '@arenaswap/ui/src/components/gameStage';
import GameTile from '@arenaswap/ui/src/components/gameTile';
import GameRow from '@arenaswap/ui/src/components/gameRow';
import { arrangeLive } from '@arenaswap/ui/src/components/boardLayout';
import { stageNote, stageSituation } from '@arenaswap/ui/src/components/boardSituation';
import { useT } from '@arenaswap/ui/src/components/i18nContext';

// The popup's Games screen as a picture: the same components and the same markup mainView.tsx
// renders, fed by the page instead of the background. Nothing in it can be clicked or focused.

export interface SiteBoardTab {
	number: number;
}

// One picker drawn open, for a still that shows a tab being handed to a game.
export interface SiteBoardMenu {
	gameId: string;
	options: { label: string; hint?: string; disabled?: boolean; current?: boolean; highlighted?: boolean }[];
}

interface SiteBoardProps {
	games: Game[];
	scores: Map<string, number>;
	// Which tab each game is on, by game id. A game with no entry offers to take one.
	tabs?: Record<string, SiteBoardTab>;
	watchedId?: string | null;
	switchThreshold?: number;
	trends?: Record<string, number | null>;
	favorites?: Record<string, { away: boolean; home: boolean }>;
	bettingEnabled?: boolean;
	scroller?: RefObject<HTMLDivElement | null>;
	toggleId: string;
	menu?: SiteBoardMenu;
	className?: string;
}

const rowSurface = '#0e1013';
const noop = () => {};

// The inline picker SelectDropdown draws, left disabled: there are no tabs here to hand a game to.
const TabPicker = ({ label, offer = false, menu }: { label: string; offer?: boolean; menu?: SiteBoardMenu }) => (
	<div className='game-card-tab-assign is-inline' data-card-control='true'>
		<div className={`dropdown${offer ? ' is-offer' : ''}`}>
			<button type='button' className='as-picker' disabled tabIndex={-1} aria-expanded={menu ? 'true' : undefined}>
				<span className='as-picker-label'>{label}</span>
				<i className='bi bi-chevron-down as-picker-chevron' aria-hidden='true' />
			</button>
			{menu && (
				<ul className='dropdown-menu select-dropdown-menu show site-board-menu'>
					{menu.options.map(option => (
						<li key={option.label}>
							<span className={`dropdown-item d-flex align-items-center gap-2${option.disabled ? ' disabled' : ''}${option.highlighted ? ' is-highlighted' : ''}`} aria-current={option.current ? 'true' : undefined}>
								<span className='flex-grow-1 text-truncate'>{option.label}</span>
								{option.hint && <span className='select-dropdown-hint'>{option.hint}</span>}
								{option.current && <i className='bi bi-check2 select-dropdown-check' aria-hidden='true' />}
							</span>
						</li>
					))}
				</ul>
			)}
		</div>
	</div>
);

const SiteBoard = ({
	games,
	scores,
	tabs = {},
	watchedId = null,
	switchThreshold = Number.POSITIVE_INFINITY,
	trends = {},
	favorites = {},
	bettingEnabled = false,
	scroller,
	toggleId,
	menu,
	className,
}: SiteBoardProps) => {
	const t = useT();
	const board = arrangeLive(games.filter(game => game.status === 'in'), scores);
	const scoreOf = (game: Game) => scores.get(game.id) ?? 0;
	const tabLabel = (game: Game) => t('board.tab', { number: tabs[game.id]?.number ?? 0 });

	const picker = (game: Game, compact = false): ReactNode => {
		const open = menu?.gameId === game.id ? menu : undefined;
		if (!tabs[game.id]) return <TabPicker label={t(compact ? 'board.noTab' : 'board.assignTab')} offer menu={open} />;
		return <TabPicker label={game.id === watchedId ? t('board.watching', { tab: tabLabel(game) }) : tabLabel(game)} menu={open} />;
	};

	const stageLabel = (game: Game): ReactNode => {
		const watched = board.all.find(candidate => candidate.id === watchedId);
		const overtaking = tabs[game.id] && watched && watched.id !== game.id && scoreOf(game) >= scoreOf(watched) + switchThreshold;
		if (overtaking) return <span className='as-stage-switching'>{t('board.switchingTo', { tab: tabLabel(game) })}</span>;
		return picker(game);
	};

	const opener = (game: Game) => ({ 'aria-label': t('gameCard.openDetails', { away: game.awayTeam.abbreviation, home: game.homeTeam.abbreviation }) });

	return (
		<div ref={scroller} className={`popup-container d-flex flex-column gm site-board${className ? ` ${className}` : ''}`}>
			<PopupHeader
				scroller={scroller}
				enabled
				interactive={false}
				toggleId={toggleId}
				onToggleEnabled={noop}
				onOpenSettings={noop}
				onStartTour={noop}
				onStage={board.stage !== null}
			/>

			{board.stage && (
				<GameStage
					key={board.stage.id}
					game={board.stage}
					label={stageLabel(board.stage)}
					note={stageNote(board.stage, { bettingEnabled }, t as Parameters<typeof stageNote>[2])}
					situation={stageSituation(board.stage)}
					power={{ value: scoreOf(board.stage), label: t('gameCard.powerScore') }}
					favorites={favorites[board.stage.id]}
					watched={board.stage.id === watchedId}
					interactive={opener(board.stage)}
				/>
			)}

			<div className='gm-lower'>
				{board.tiles.length > 0 && (
					<div className={`gm-tiles${board.tiles.length % 2 ? ' is-odd' : ''}`}>
						{board.tiles.map(game => (
							<GameTile
								key={game.id}
								game={game}
								power={scoreOf(game)}
								trend={trends[game.id]}
								tab={picker(game, true)}
								favorites={favorites[game.id]}
								watched={game.id === watchedId}
								interactive={opener(game)}
							/>
						))}
					</div>
				)}

				{board.rows.length > 0 && (
					<div className='gm-rows as-rows'>
						{board.rows.map(game => (
							<GameRow
								key={game.id}
								game={game}
								surface={rowSurface}
								power={scoreOf(game)}
								status={picker(game)}
								favorites={favorites[game.id]}
								watched={game.id === watchedId}
								interactive={opener(game)}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	);
};

export default SiteBoard;
