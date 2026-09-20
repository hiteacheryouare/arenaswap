import { useT } from './i18nContext';

interface timeoutDotsProps {
	remaining: number;
	// What a full allotment looks like in this sport. Gridiron is 3 a half, which is the only
	// value the leagues we ship ever send — but the NBA carries 7, and seven dots do not fit in a
	// 60px column, so the ceiling is a parameter and anything above it falls back to a numeral.
	max?: number;
	teamAbbreviation: string;
}

export const gridironTimeouts = 3;
const maxDrawableDots = 4;

const timeoutDots = ({ remaining, max = gridironTimeouts, teamAbbreviation }: timeoutDotsProps) => {
	const t = useT();
	if (!Number.isFinite(remaining) || remaining < 0) return null;

	const label = t('gameCard.timeoutsRemaining', { team: teamAbbreviation, count: remaining });
	const total = Math.max(max, remaining);

	// A count too wide to draw still has to be readable, so it says the number instead of
	// silently rendering a shorter row than the sport actually allows.
	if (total > maxDrawableDots) {
		return (
			<span className='timeout-dots timeout-dots-numeric' title={label} aria-label={label}>
				{t('gameCard.timeoutsShort', { count: remaining })}
			</span>
		);
	}

	return (
		<span className='timeout-dots' role='img' title={label} aria-label={label}>
			{Array.from({ length: total }, (_, i) => (
				<i
					key={i}
					// Same pair and the same `.is-empty` hook as BsoIndicator, so the hero's dark
					// re-toning already covers the unfilled half.
					className={`bi ${i < remaining ? 'bi-circle-fill' : 'bi-circle'} timeout-dot${i < remaining ? '' : ' is-empty'}`}
					aria-hidden='true'
				/>
			))}
		</span>
	);
};

export default timeoutDots;
