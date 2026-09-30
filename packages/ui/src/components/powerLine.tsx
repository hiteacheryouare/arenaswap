import type { CSSProperties } from 'react';
import { scoreMaxTotal } from '@arenaswap/core/constants';
import HeatBar, { powerScoreColor } from './heatBar';
import { useT } from './i18nContext';

export const Trend = ({ value }: { value: number | null | undefined }) => {
	const t = useT();
	if (value === null || value === undefined) return null;
	if (value === 0) return <span className='as-trend'>{t('board.steady')}</span>;
	const up = value > 0;
	return (
		<span className={`as-trend num ${up ? 'is-up' : 'is-down'}`}>
			<span aria-hidden='true'>{up ? '▲' : '▼'}</span> {Math.abs(value)}
			<span className='visually-hidden'> {t(up ? 'board.trendUp' : 'board.trendDown')}</span>
		</span>
	);
};

// v2's line under a game: the label, the bar, and the score out of 100 in the bar's own colour.
const PowerLine = ({ value, trend }: { value: number; trend?: number | null }) => {
	const t = useT();
	return (
		<div className='as-power-line' style={{ '--heat-color': powerScoreColor(value) } as CSSProperties}>
			<span className='as-power-label'>{t('gameCard.powerScore')}</span>
			<HeatBar value={value} />
			<span className='as-power-figure num' aria-label={`${t('gameCard.powerScore')} ${value}`}>
				<b>{value}</b> / {scoreMaxTotal}
			</span>
			<Trend value={trend} />
		</div>
	);
};

export default PowerLine;
