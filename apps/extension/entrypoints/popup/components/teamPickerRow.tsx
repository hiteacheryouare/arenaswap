import { i18n } from '#i18n';
import type { EspnTeamEntry } from '@arenaswap/sideline';
import CrestDisc from '@arenaswap/ui/src/components/crestDisc';

export type teamList = 'favorites' | 'rivals';

interface teamPickerRowProps {
	team: EspnTeamEntry;
	list?: teamList;
	isSelected: boolean;
	// On the other list. Picking it here moves it over.
	isOnOtherList?: boolean;
	sublabel?: string;
	onToggle: () => void;
}

const marks = {
	favorites: { className: 'team-pick-star', on: 'bi-star-fill', off: 'bi-star' },
	rivals: { className: 'team-pick-rival', on: 'bi-emoji-angry-fill', off: 'bi-emoji-angry' },
} as const;

const labelFor = (list: teamList, isSelected: boolean, team: string): string => {
	if (list === 'rivals') return isSelected ? i18n.t('teamPicker.removeRival', { team }) : i18n.t('teamPicker.addRival', { team });
	return isSelected ? i18n.t('teamPicker.removeFavorite', { team }) : i18n.t('teamPicker.addFavorite', { team });
};

// The whole row is the toggle, not just the 16px mark at its end.
const teamPickerRow = ({ team, list = 'favorites', isSelected, isOnOtherList = false, sublabel, onToggle }: teamPickerRowProps) => {
	const mark = isOnOtherList && !isSelected ? marks[list === 'favorites' ? 'rivals' : 'favorites'] : marks[list];
	return (
		<button
			type='button'
			className='d-flex align-items-center justify-content-between gap-3 mt-1 py-1 team-pick-row'
			onClick={onToggle}
			aria-label={labelFor(list, isSelected, team.name)}
		>
			<span className='d-flex align-items-center gap-3 min-w-0'>
				<CrestDisc
					logo={team.logo}
					abbreviation={(team.abbreviation ?? team.name ?? '?').slice(0, 3)}
					discClassName='team-pick-crest flex-shrink-0'
					crestClassName='team-pick-crest-logo'
					loading='lazy'
				/>
				<span className='d-block min-w-0'>
					<span className='d-block fw-semibold fg-body lh-xs small'>{team.name}</span>
					{sublabel && <span className='d-block setting-explainer lh-xs'>{sublabel}</span>}
				</span>
			</span>
			<i
				className={`bi ${isSelected || isOnOtherList ? mark.on : mark.off} fs-md flex-shrink-0 ${mark.className}`}
				data-selected={isSelected}
				data-other-list={isOnOtherList && !isSelected}
				aria-hidden='true'
			/>
		</button>
	);
};

export default teamPickerRow;
