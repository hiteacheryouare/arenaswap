import { useState } from 'react';
import { i18n } from '#i18n';
import type { VenueDetails } from '@arenaswap/sideline';

interface venuePhotoProps {
	gameId: string;
	photos: VenueDetails['photos'];
	venueName?: string;
	venueLocation?: string;
	onFailed: () => void;
}

type photoView = 'interior' | 'main';

// The venue's name and city ride on the photo, so the panel's Venue row goes away while it shows.
const venuePhoto = ({ gameId, photos, venueName, venueLocation, onFailed }: venuePhotoProps) => {
	const [view, setView] = useState<photoView>(photos.interior ? 'interior' : 'main');
	const src = photos[view] ?? photos.interior ?? photos.main;
	if (!src) return null;
	const canSwitch = Boolean(photos.interior && photos.main);

	return (
		<figure className='gd-venue-photo m-0'>
			<img src={src} alt='' onError={onFailed} />
			{canSwitch && (
				<div className='btn-group btn-group-sm gd-venue-toggle' role='group' aria-label={i18n.t('detail.venuePhotoLabel')}>
					{(['interior', 'main'] as const).map(option => (
						<label key={option} className='btn btn-check'>
							<input
								type='radio'
								name={`gd-venue-photo-${gameId}`}
								checked={view === option}
								onChange={() => setView(option)}
							/>
							{i18n.t(option === 'interior' ? 'detail.venuePhotoInside' : 'detail.venuePhotoOutside')}
						</label>
					))}
				</div>
			)}
			{(venueName || venueLocation) && (
				<figcaption className='gd-venue-caption'>
					{venueName && <span className='gd-venue-caption-name'>{venueName}</span>}
					{venueLocation && <span className='gd-venue-caption-location'>{venueLocation}</span>}
				</figcaption>
			)}
		</figure>
	);
};

export default venuePhoto;
