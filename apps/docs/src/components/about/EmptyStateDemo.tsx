import { useState } from 'react';
import NoGamesMessage from '@arenaswap/ui/src/components/noGamesMessage';
import { islandTranslator, TranslationContext } from '../../i18n/islandStrings';

interface EmptyStateDemoProps {
	strings: Record<string, string>;
}

const EmptyStateDemo = ({ strings }: EmptyStateDemoProps) => {
	const [deal, setDeal] = useState(0);

	return (
		<TranslationContext.Provider value={islandTranslator(strings)}>
			<div className='popup-container doc-demo-popup-frame about-empty-frame'>
				<NoGamesMessage key={deal} onRefresh={() => setDeal(count => count + 1)} />
			</div>
		</TranslationContext.Provider>
	);
};

export default EmptyStateDemo;
