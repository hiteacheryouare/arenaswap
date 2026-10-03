import { useT } from './i18nContext';
import type { Translator } from './i18nContext';

interface baseDiamondProps {
	first: boolean;
	second: boolean;
	third: boolean;
}

// No home plate and no outline: occupancy is the whole signal.
const base = (name: string, occupied: boolean) => (
	<i
		className={`bi bi-diamond-fill base-marker base-${name}${occupied ? ' occupied' : ''}`}
		aria-hidden='true'
	/>
);

// Each of the eight states is one whole sentence, so a translator words it naturally rather than
// joining base names in English order.
const spokenRunners = (t: Translator, { first, second, third }: baseDiamondProps): string => {
	if (first && second && third) return t('bases.loaded');
	if (first && second) return t('bases.firstSecond');
	if (first && third) return t('bases.firstThird');
	if (second && third) return t('bases.secondThird');
	if (first) return t('bases.first');
	if (second) return t('bases.second');
	if (third) return t('bases.third');
	return t('bases.empty');
};

const baseDiamond = ({ first, second, third }: baseDiamondProps) => {
	const t = useT();
	return (
		<div className='base-diamond' role='img' aria-label={spokenRunners(t, { first, second, third })}>
			{base('second', second)}
			{base('third', third)}
			{base('first', first)}
		</div>
	);
};

export default baseDiamond;
