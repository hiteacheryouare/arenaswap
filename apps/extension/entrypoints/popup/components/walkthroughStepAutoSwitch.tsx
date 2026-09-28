import { useEffect, useState } from 'react';
import { i18n } from '#i18n';
import type { Game, TabRegistration } from '@arenaswap/core/types';
import GameRow from '@arenaswap/ui/src/components/gameRow';
import GameStage from '@arenaswap/ui/src/components/gameStage';
import useDocumentTheme from '@arenaswap/ui/src/components/useDocumentTheme';
import TabAssignSelect, { tabNumberLabel } from './tabAssignSelect';
import WalkthroughFrame from './walkthroughFrame';
import { eaglesGiantsQ2, sixersCelticsQ4, tourTabLabel, tourTabs } from './walkthroughMocks';

interface walkthroughStepAutoSwitchProps {
	onNext: () => void;
	onBack: () => void;
}

const rowSurface = { dark: '#0e1013', light: '#f4f5f7' } as const;

const [eaglesTab, sixersTab] = tourTabs as [typeof tourTabs[0], typeof tourTabs[0]];

const registry: TabRegistration[] = [
	{ gameId: eaglesGiantsQ2.id, tabId: eaglesTab.id! },
	{ gameId: sixersCelticsQ4.id, tabId: sixersTab.id! },
];

const tabPicker = (game: Game, watchedTabId: number) => (
	<TabAssignSelect
		gameId={game.id}
		openTabs={tourTabs}
		registry={registry}
		onChange={() => {}}
		formatTabLabel={tourTabLabel}
		variant='inline'
		watchedTabId={watchedTabId}
		disabled
	/>
);

// The board the way the Games screen draws it: the hottest game on the stage, the other in a row.
// The 76ers climb past the Eagles, take the stage with "Switching to Tab 2", then ArenaSwap moves
// the window and the label settles on "Watching".
const walkthroughStepAutoSwitch = ({ onNext, onBack }: walkthroughStepAutoSwitchProps) => {
	const theme = useDocumentTheme();
	const [phase, setPhase] = useState(0);
	const [sixersPower, setSixersPower] = useState(31);
	const [switched, setSwitched] = useState(false);

	useEffect(() => {
		const climb = setTimeout(() => setSixersPower(89), 800);
		const swap = setTimeout(() => setSwitched(true), 1800);
		const reveal = setTimeout(() => setPhase(1), 2200);
		return () => { clearTimeout(climb); clearTimeout(swap); clearTimeout(reveal); };
	}, []);

	const eaglesPower = 52;
	const sixersLead = sixersPower > eaglesPower;
	const stage = sixersLead ? sixersCelticsQ4 : eaglesGiantsQ2;
	const row = sixersLead ? eaglesGiantsQ2 : sixersCelticsQ4;
	const watchedTabId = switched ? sixersTab.id! : eaglesTab.id!;
	const watchedGameId = switched ? sixersCelticsQ4.id : eaglesGiantsQ2.id;
	const powerOf = (game: Game) => (game.id === sixersCelticsQ4.id ? sixersPower : eaglesPower);
	const stageLabel = sixersLead && !switched
		? <span className='as-stage-switching'>{i18n.t('board.switchingTo', { tab: tabNumberLabel(sixersTab) })}</span>
		: tabPicker(stage, watchedTabId);

	return (
		<WalkthroughFrame
			step={4}
			stepLabel={i18n.t('stepAutoSwitch.step', [4, 8])}
			title={i18n.t('stepAutoSwitch.title')}
			backLabel={i18n.t('stepAutoSwitch.back')}
			onBack={onBack}
			nextLabel={i18n.t('stepAutoSwitch.next')}
			onNext={onNext}
			nextDisabled={phase === 0}
		>
			<div className='wt-screen wt-board'>
				<div key={stage.id} className='wt-arrive'>
					<GameStage
						game={stage}
						label={stageLabel}
						power={{ value: powerOf(stage), label: i18n.t('gameCard.powerScore') }}
						watched={stage.id === watchedGameId}
					/>
				</div>
				<div key={row.id} className='as-rows wt-arrive'>
					<GameRow
						game={row}
						surface={rowSurface[theme]}
						power={powerOf(row)}
						status={tabPicker(row, watchedTabId)}
						watched={row.id === watchedGameId}
					/>
				</div>
			</div>

			{phase === 0 ? (
				<p className='wt-body wt-caption'>{i18n.t('stepAutoSwitch.watchingCaption')}</p>
			) : (
				<div className='wt-reveal'>
					<p className='wt-reveal-title'>{i18n.t('stepAutoSwitch.reveal')}</p>
					<p className='wt-body'>{i18n.t('stepAutoSwitch.revealBody')}</p>
				</div>
			)}
		</WalkthroughFrame>
	);
};

export default walkthroughStepAutoSwitch;
