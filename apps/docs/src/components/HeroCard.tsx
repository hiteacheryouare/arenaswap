import LiveGameCard from '@arenaswap/ui/src/components/liveGameCard';
import type { Game, PowerScoreResult } from '@arenaswap/core/types';

interface HeroCardProps {
	game: Game;
	excitementResult: PowerScoreResult;
	tabLabel: string;
}

const HeroCard = ({ game, excitementResult, tabLabel }: HeroCardProps) => (
	<LiveGameCard
		game={game}
		excitementResult={excitementResult}
		favoriteTeamIds={new Set()}
		onToggleFavoriteTeam={() => {}}
		onOpenGameDetail={() => {}}
		bettingPrefs={{ bettingEnabled: false }}
		tabSlot={
			<div className='game-card-tab-assign'>
				<select className='form-select form-select-sm'>
					<option>{tabLabel}</option>
				</select>
			</div>
		}
	/>
);

export default HeroCard;
