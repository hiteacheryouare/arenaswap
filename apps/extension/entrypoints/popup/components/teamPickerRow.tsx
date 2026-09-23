import { i18n } from '#i18n';
import type { EspnTeamEntry } from '@arenaswap/core';
import CrestDisc from '@arenaswap/ui/src/components/crestDisc';

interface teamPickerRowProps {
	team: EspnTeamEntry;
	isFavorite: boolean;
	sublabel?: string;
	onToggle: () => void;
}

const teamPickerRow = ({ team, isFavorite, sublabel, onToggle }: teamPickerRowProps) => (
	<div className='d-flex align-items-center justify-content-between gap-2 mt-1 py-1'>
		<div className='d-flex align-items-center gap-2 min-w-0'>
			<CrestDisc
				logo={team.logo}
				abbreviation={(team.abbreviation ?? team.name ?? '?').slice(0, 3)}
				discClassName='team-pick-crest flex-shrink-0'
				crestClassName='team-pick-crest-logo'
				loading='lazy'
			/>
			<div className='min-w-0'>
				<div className='fw-semibold text-body lh-sm small'>{team.name}</div>
				{sublabel && <div className='setting-explainer lh-sm'>{sublabel}</div>}
			</div>
		</div>
		<button
			type='button'
			className={`btn btn-link btn-sm p-0 flex-shrink-0 ${isFavorite ? 'text-warning' : 'text-body-secondary'}`}
			onClick={onToggle}
			aria-label={isFavorite ? i18n.t('teamPicker.removeFavorite', { team: team.name }) : i18n.t('teamPicker.addFavorite', { team: team.name })}
		>
			<i className={`bi ${isFavorite ? 'bi-star-fill' : 'bi-star'} fs-6`} />
		</button>
	</div>
);

export default teamPickerRow;
