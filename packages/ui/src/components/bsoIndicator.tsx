import { useT } from './i18nContext';

interface bsoIndicatorProps {
	balls: number;
	strikes: number;
	outs: number;
}

// Lit in the ink of the surface rather than in green, orange and red: every surface these sit on is
// a team colour now, and red outs on the Phillies or green balls on the Athletics are not there.
const bsoGroup = (label: string, count: number, max: number) => (
	<div className='d-flex align-items-center gap-1'>
		<span className='bso-label'>{label}</span>
		{Array.from({ length: max }, (_, i) => (
			<i
				key={i}
				className={`bi ${i < count ? 'bi-circle-fill' : 'bi-circle'} bso-dot${i < count ? '' : ' is-empty'}`}
			/>
		))}
	</div>
);

const bsoIndicator = ({ balls, strikes, outs }: bsoIndicatorProps) => {
	const t = useT();
	return (
		<div className='d-flex align-items-center gap-2 bso-indicator'>
			{bsoGroup(t('bso.balls'), balls, 3)}
			{bsoGroup(t('bso.strikes'), strikes, 2)}
			{bsoGroup(t('bso.outs'), outs, 2)}
		</div>
	);
};

export default bsoIndicator;
