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
		<span className='bso-label' aria-hidden='true'>{label}</span>
		{Array.from({ length: max }, (_, i) => (
			<i
				key={i}
				className={`bi ${i < count ? 'bi-circle-fill' : 'bi-circle'} bso-dot${i < count ? '' : ' is-empty'}`}
				aria-hidden='true'
			/>
		))}
	</div>
);

// One image with the count spoken in words, since three letters and seven dots read aloud as nothing.
const bsoIndicator = ({ balls, strikes, outs }: bsoIndicatorProps) => {
	const t = useT();
	const spoken = t('bso.countSpoken', {
		balls: t('bso.ballsSpoken', balls),
		strikes: t('bso.strikesSpoken', strikes),
		outs: t('bso.outsSpoken', outs),
	});
	return (
		<div className='d-flex align-items-center gap-2 bso-indicator' role='img' aria-label={spoken}>
			{bsoGroup(t('bso.balls'), balls, 3)}
			{bsoGroup(t('bso.strikes'), strikes, 2)}
			{bsoGroup(t('bso.outs'), outs, 2)}
		</div>
	);
};

export default bsoIndicator;
