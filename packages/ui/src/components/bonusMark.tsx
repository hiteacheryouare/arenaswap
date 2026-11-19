import { useT } from './i18nContext';

interface bonusMarkProps {
	bonus?: 'bonus' | 'double';
	teamAbbreviation: string;
}

const bonusMark = ({ bonus, teamAbbreviation }: bonusMarkProps) => {
	const t = useT();
	if (!bonus) return <div className='gd-bonus invisible' aria-hidden='true'>{t('detail.bonus')}</div>;

	const label = t(bonus === 'double' ? 'detail.foulsDoubleBonus' : 'detail.foulsBonus', { team: teamAbbreviation });
	return (
		<div className='gd-bonus' title={label}>
			<span aria-hidden='true'>{t('detail.bonus')}</span>
			<span className='visually-hidden'>{label}</span>
		</div>
	);
};

export default bonusMark;
