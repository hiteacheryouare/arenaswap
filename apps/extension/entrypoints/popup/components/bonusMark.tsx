import { i18n } from '#i18n';

interface bonusMarkProps {
	bonus?: 'bonus' | 'double';
	teamAbbreviation: string;
}

// Drawn even when the team isn't in the bonus, just hidden, so it holds its line of the hero.
const bonusMark = ({ bonus, teamAbbreviation }: bonusMarkProps) => {
	if (!bonus) return <div className='gd-bonus invisible' aria-hidden='true'>{i18n.t('detail.bonus')}</div>;

	const label = i18n.t(bonus === 'double' ? 'detail.foulsDoubleBonus' : 'detail.foulsBonus', { team: teamAbbreviation });
	return (
		<div className='gd-bonus' title={label}>
			<span aria-hidden='true'>{i18n.t('detail.bonus')}</span>
			<span className='visually-hidden'>{label}</span>
		</div>
	);
};

export default bonusMark;
