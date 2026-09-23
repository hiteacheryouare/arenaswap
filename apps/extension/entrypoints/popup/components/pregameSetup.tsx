import { i18n } from '#i18n';
import type { Browser } from 'wxt/browser';
import type { Game, TabRegistration } from '@arenaswap/core/types';
import GameBoostInput from './gameBoostInput';
import TabAssignSelect from './tabAssignSelect';
import { startPhraseKey } from './gameStartPhrase';

interface pregameSetupProps {
	game: Game;
	currentBoost: number;
	openTabs: Browser.tabs.Tab[];
	registry: TabRegistration[];
	onSetGameBoost: (gameId: string, boost: number) => void;
	onRegistryChange: (updated: TabRegistration[]) => void;
	formatTabLabel: (tab: Browser.tabs.Tab) => string;
	// Off where there is no tab registry to write to, which leaves the picker with nothing to list.
	tabAssignEnabled?: boolean;
}

// Before a game starts there is nothing to report on it, so the screen offers the two things
// you would actually want to decide in advance: which tab it lands in, and how much it should
// outrank everything else. Favourites live on the poster, next to the team they apply to.
const pregameSetup = ({
	game,
	currentBoost,
	openTabs,
	registry,
	onSetGameBoost,
	onRegistryChange,
	formatTabLabel,
	tabAssignEnabled = true,
}: pregameSetupProps) => (
	<div className='gd-setup'>
		<div className='gd-setup-heading'>{i18n.t(startPhraseKey(game.sportType))}</div>

		{tabAssignEnabled && (
			<div className='gd-setup-row'>
				<span className='gd-setup-explainer'>{i18n.t('detail.pregameTabExplainer')}</span>
				<TabAssignSelect
					gameId={game.id}
					openTabs={openTabs}
					registry={registry}
					onChange={onRegistryChange}
					formatTabLabel={formatTabLabel}
				/>
			</div>
		)}

		<GameBoostInput bare gameId={game.id} currentBoost={currentBoost} onSetGameBoost={onSetGameBoost} />
	</div>
);

export default pregameSetup;
