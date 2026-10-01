import type { CSSProperties } from 'react';
import { scoreMaxTotal } from '@arenaswap/core/constants';
import HeatBar, { powerScoreColor } from './heatBar';
import { useT } from './i18nContext';

// v2's line under a game: the label, the bar, and the score out of 100 in the bar's own colour.
const PowerLine = ({ value }: { value: number }) => {
	const t = useT();
	return (
		<div className='as-power-line' style={{ '--heat-color': powerScoreColor(value) } as CSSProperties}>
			<span className='as-power-label'>{t('gameCard.powerScore')}</span>
			<HeatBar value={value} />
			<span className='as-power-figure num' aria-label={`${t('gameCard.powerScore')} ${value}`}>
				<b>{value}</b> / {scoreMaxTotal}
			</span>
		</div>
	);
};

export default PowerLine;
