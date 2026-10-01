import { i18n } from '#i18n';
import type { EspnTeamEntry } from '@arenaswap/core';
import BoardCrest from '@arenaswap/ui/src/components/boardCrest';
import useDocumentTheme from '@arenaswap/ui/src/components/useDocumentTheme';

interface teamPickerRowProps {
	team: EspnTeamEntry;
	isFavorite: boolean;
	sublabel?: string;
	onToggle: () => void;
}

// The page the row sits on, which is what the crest's legibility check is made against.
export const cardSurface = { dark: '#0e1013', light: '#f4f5f7' } as const;
// The roster carries no team colours, so a crest that never loads letters a neutral disc.
const monogramColor = '#5a6370';

const teamPickerRow = ({ team, isFavorite, sublabel, onToggle }: teamPickerRowProps) => {
	const theme = useDocumentTheme();
	const abbreviation = (team.abbreviation || team.name || '?').slice(0, 3);

	return (
		<div className='st-control team-pick-row'>
			<BoardCrest
				team={{ id: team.id, name: team.name, abbreviation, logo: team.logo, score: 0 }}
				size={28}
				surface={cardSurface[theme]}
				color={monogramColor}
				className='team-pick-crest'
				loading='lazy'
			/>
			<div className='team-pick-copy'>
				<div className='team-pick-name'>{team.name}</div>
				{sublabel && <div className='team-pick-sublabel'>{sublabel}</div>}
			</div>
			<button
				type='button'
				className={`as-icon team-pick-star${isFavorite ? ' is-on' : ''}`}
				onClick={onToggle}
				aria-label={isFavorite ? i18n.t('teamPicker.removeFavorite', { team: team.name }) : i18n.t('teamPicker.addFavorite', { team: team.name })}
			>
				<i className={`bi ${isFavorite ? 'bi-star-fill' : 'bi-star'}`} aria-hidden='true' />
			</button>
		</div>
	);
};

export default teamPickerRow;
