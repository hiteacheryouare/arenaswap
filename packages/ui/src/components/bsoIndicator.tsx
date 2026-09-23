import { useT } from './i18nContext';

interface bsoIndicatorProps {
	balls: number;
	strikes: number;
	outs: number;
}

const bsoGroup = (label: string, count: number, max: number, fillColor: string) => (
	<div className='d-flex align-items-center gap-1'>
		<span className='bso-label'>{label}</span>
		{Array.from({ length: max }, (_, i) => (
			<i
				key={i}
				// The unfilled colour is a class rather than an inline style, so a surface that is not
				// a white card can re-tone it. An inline style cannot be overridden by a stylesheet.
				className={`bi ${i < count ? 'bi-circle-fill' : 'bi-circle'} bso-dot${i < count ? '' : ' is-empty'}`}
				style={i < count ? { color: fillColor } : undefined}
			/>
		))}
	</div>
);

const bsoIndicator = ({ balls, strikes, outs }: bsoIndicatorProps) => {
	const t = useT();
	return (
		<div className='d-flex align-items-center gap-2 bso-indicator'>
			{bsoGroup(t('bso.balls'), balls, 3, '#4ade80')}
			{bsoGroup(t('bso.strikes'), strikes, 2, '#f75c03')}
			{bsoGroup(t('bso.outs'), outs, 2, '#ef4444')}
		</div>
	);
};

export default bsoIndicator;
