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
	standbyStreamTabId?: number | null;
	tabAssignEnabled?: boolean;
}

const pregameSetup = ({
	game,
	currentBoost,
	openTabs,
	registry,
	onSetGameBoost,
	onRegistryChange,
	formatTabLabel,
	standbyStreamTabId,
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
					standbyStreamTabId={standbyStreamTabId}
				/>
			</div>
		)}

		<GameBoostInput bare gameId={game.id} currentBoost={currentBoost} onSetGameBoost={onSetGameBoost} />
	</div>
);

export default pregameSetup;
