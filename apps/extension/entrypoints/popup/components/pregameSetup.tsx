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

// Before a start there is nothing to report, so the screen leads with the two things worth deciding
// in advance: which tab the game lands in, and how far it should outrank everything else.
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
	<section className='card dt-card dt-setup' aria-labelledby='dt-setup-title'>
		<h3 className='dt-card-title dt-setup-heading' id='dt-setup-title'>{i18n.t(startPhraseKey(game.sportType))}</h3>

		{tabAssignEnabled && (
			<div className='dt-setup-row'>
				<p className='dt-row-help'>{i18n.t('detail.pregameTabExplainer')}</p>
				<TabAssignSelect
					gameId={game.id}
					openTabs={openTabs}
					registry={registry}
					onChange={onRegistryChange}
					formatTabLabel={formatTabLabel}
				/>
			</div>
		)}

		<div className='dt-setup-row'>
			<GameBoostInput bare gameId={game.id} currentBoost={currentBoost} onSetGameBoost={onSetGameBoost} />
		</div>
	</section>
);

export default pregameSetup;
