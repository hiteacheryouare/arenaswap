import { useCallback, useState } from 'react';
import { i18n } from '#i18n';
import type { EspnTeamEntry } from '@arenaswap/core';
import Crest from '@arenaswap/ui/src/components/crest';
import { crestBacking } from '@arenaswap/ui/src/components/colorUtils';
import { logoTint } from '@arenaswap/ui/src/components/logoTint';

interface teamPickerRowProps {
	team: EspnTeamEntry;
	isFavorite: boolean;
	sublabel?: string;
	onToggle: () => void;
}

const teamPickerRow = ({ team, isFavorite, sublabel, onToggle }: teamPickerRowProps) => {
	// Read off the crest the row already draws rather than out of the API, so the disc costs no
	// extra field and no extra request. Null until the image lands, which leaves a plain white disc.
	// The URL comes off the element rather than the prop, so the handler never has to be rebuilt
	// and can never key the cache on a logo the image is no longer showing.
	const [tint, setTint] = useState<string | null>(null);
	const handleLoaded = useCallback((image: HTMLImageElement) => {
		setTint(logoTint(image, image.currentSrc || image.src));
	}, []);

	return (
		<div className='d-flex align-items-center justify-content-between gap-2 mt-1 py-1'>
			<div className='d-flex align-items-center gap-2 min-w-0'>
				<span className='team-pick-crest flex-shrink-0' style={{ background: crestBacking(tint) }}>
					<Crest
						logo={team.logo}
						abbreviation={(team.abbreviation ?? team.name ?? '?').slice(0, 3)}
						className='team-pick-crest-logo'
						loading='lazy'
						crossOrigin='anonymous'
						onLoaded={handleLoaded}
					/>
				</span>
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
};

export default teamPickerRow;
