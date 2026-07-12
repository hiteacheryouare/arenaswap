import LiveGameCard from '@arenaswap/ui/src/components/liveGameCard';
import type { Game, PowerScoreResult } from '@arenaswap/core/types';

interface ScreenshotCardProps {
	game: Game;
	excitementResult: PowerScoreResult;
	tabLabel?: string;
}

const ScreenshotCard = ({ game, excitementResult, tabLabel }: ScreenshotCardProps) => (
	<LiveGameCard
		game={game}
		excitementResult={excitementResult}
		favoriteTeamIds={new Set()}
		onToggleFavoriteTeam={() => {}}
		onOpenGameDetail={() => {}}
		bettingPrefs={{ bettingEnabled: false }}
		tabSlot={tabLabel ? (
			<div className='game-card-tab-assign'>
				<select className='form-select form-select-sm'>
					<option>{tabLabel}</option>
				</select>
			</div>
		) : undefined}
	/>
);

export default ScreenshotCard;
