import { i18n } from '#i18n';
import type { EspnTeamEntry } from '@arenaswap/core';
import CrestDisc from '@arenaswap/ui/src/components/crestDisc';

interface teamPickerRowProps {
	team: EspnTeamEntry;
	isFavorite: boolean;
	sublabel?: string;
	onToggle: () => void;
}

// The whole row is the toggle, not just the 16px star at its end.
const teamPickerRow = ({ team, isFavorite, sublabel, onToggle }: teamPickerRowProps) => (
	<button
		type='button'
		className='d-flex align-items-center justify-content-between gap-2 mt-1 py-1 team-pick-row'
		onClick={onToggle}
		aria-label={isFavorite ? i18n.t('teamPicker.removeFavorite', { team: team.name }) : i18n.t('teamPicker.addFavorite', { team: team.name })}
	>
		<span className='d-flex align-items-center gap-2 min-w-0'>
			<CrestDisc
				logo={team.logo}
				abbreviation={(team.abbreviation ?? team.name ?? '?').slice(0, 3)}
				discClassName='team-pick-crest flex-shrink-0'
				crestClassName='team-pick-crest-logo'
				loading='lazy'
			/>
			<span className='d-block min-w-0'>
				<span className='d-block fw-semibold text-body lh-sm small'>{team.name}</span>
				{sublabel && <span className='d-block setting-explainer lh-sm'>{sublabel}</span>}
			</span>
		</span>
		<i className={`bi ${isFavorite ? 'bi-star-fill' : 'bi-star'} fs-6 flex-shrink-0 team-pick-star`} data-favorited={isFavorite} aria-hidden='true' />
	</button>
);

export default teamPickerRow;
