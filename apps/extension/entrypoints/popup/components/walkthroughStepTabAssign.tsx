import { useLayoutEffect, useRef, useState } from 'react';
import { i18n } from '#i18n';
import type { TabRegistration } from '@arenaswap/core/types';
import GameRow from '@arenaswap/ui/src/components/gameRow';
import TabAssignSelect from './tabAssignSelect';
import WalkthroughFrame from './walkthroughFrame';
import { eaglesGiantsQ2, tourTabLabel, tourTabs } from './walkthroughMocks';

interface walkthroughStepTabAssignProps {
	onNext: () => void;
	onBack: () => void;
}

const walkthroughStepTabAssign = ({ onNext, onBack }: walkthroughStepTabAssignProps) => {
	const [registry, setRegistry] = useState<TabRegistration[]>([]);
	const screenRef = useRef<HTMLDivElement>(null);
	const [hintLeft, setHintLeft] = useState<number>();

	// The hint's arrow sits under the picker's first letter, wherever the translation leaves it.
	useLayoutEffect(() => {
		const screen = screenRef.current;
		const label = screen?.querySelector('.as-picker-label');
		if (!screen || !label) return;
		const contentLeft = screen.getBoundingClientRect().left + parseFloat(getComputedStyle(screen).paddingLeft);
		setHintLeft(Math.max(0, label.getBoundingClientRect().left - contentLeft));
	}, [registry]);

	return (
		<WalkthroughFrame
			step={3}
			stepLabel={i18n.t('stepTabAssign.step', [3, 8])}
			title={i18n.t('stepTabAssign.title')}
			lede={i18n.t('stepTabAssign.subtitle')}
			backLabel={i18n.t('stepTabAssign.back')}
			onBack={onBack}
			nextLabel={i18n.t('stepTabAssign.next')}
			onNext={onNext}
		>
			<div ref={screenRef} className='wt-screen wt-assign'>
				<GameRow
					game={eaglesGiantsQ2}
					power={52}
					tab={(
						<TabAssignSelect
							gameId={eaglesGiantsQ2.id}
							openTabs={tourTabs}
							registry={registry}
							onChange={setRegistry}
							formatTabLabel={tourTabLabel}
						/>
					)}
				/>
				<span className='wt-hint' style={{ marginLeft: hintLeft }}>{i18n.t('stepTabAssign.linkHint')}</span>
			</div>
			<p className='wt-body'>{i18n.t('stepTabAssign.body')}</p>
		</WalkthroughFrame>
	);
};

export default walkthroughStepTabAssign;
