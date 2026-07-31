import { useT } from './i18nContext';

interface inningHalfIconProps {
	/** Top of inning = true, bottom = false; nothing renders when undefined */
	topOfInning?: boolean;
}

const inningHalfIcon = ({ topOfInning }: inningHalfIconProps) => {
	const t = useT();
	if (topOfInning === undefined) return null;
	const label = t(topOfInning ? 'gameCard.topOfInning' : 'gameCard.bottomOfInning');
	return (
		<i
			className={`bi ${topOfInning ? 'bi-caret-up-fill' : 'bi-caret-down-fill'} inning-half-icon`}
			role='img'
			aria-label={label}
			title={label}
		/>
	);
};

export default inningHalfIcon;
