import { useEffect, useState } from 'react';
import type { RecapSession } from '@arenaswap/core/types';
import { normalizeRecapSession, recapSessionStorageKey } from '../../../utils/recapSession';
import { sportTypeLabels } from '../popupHelpers';
import RecapGameCards from './recapGameCards';
import RecapSwitchLog from './recapSwitchLog';

interface sessionRecapViewProps {
	onBack: () => void;
}

const formatDuration = (ms: number): string => {
	const totalMinutes = Math.floor(ms / 60000);
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	if (hours > 0) return `${hours}h ${minutes}m`;
	return `${minutes}m`;
};

const sessionRecapView = ({ onBack }: sessionRecapViewProps) => {
	const [session, setSession] = useState<RecapSession | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		void browser.storage.local.get({ [recapSessionStorageKey]: null }).then(result => {
			setSession(normalizeRecapSession(result[recapSessionStorageKey]));
			setLoading(false);
		});
	}, []);

	const isEmpty = !session || session.switchEvents.length === 0;
	const sessionDuration = session ? session.lastEventTime - session.sessionStartTime : 0;
	const switchCount = session?.switchEvents.length ?? 0;
	const uniqueSports = session
		? [...new Set(Object.values(session.gameViews).map(v => sportTypeLabels[v.sportType]))]
		: [];

	return (
		<div className='popup-container game-detail-shell d-flex flex-column'>
			<div className='game-detail-header'>
				<button type='button' className='btn btn-sm game-detail-back-button' onClick={onBack}>
					<i className='bi bi-arrow-left' />
					<span>Back</span>
				</button>
				<div className='game-detail-title'>Session Recap</div>
			</div>

			<div className='flex-grow-1 overflow-y-auto px-2 pb-3'>
				{loading && (
					<div className='text-center text-body-secondary py-4' style={{ fontSize: '0.75rem' }}>
						Loading...
					</div>
				)}

				{!loading && isEmpty && (
					<div className='text-center text-body-secondary py-4 px-3'>
						<i className='bi bi-clock-history d-block mb-2' style={{ fontSize: '2rem', opacity: 0.4 }} />
						<div style={{ fontSize: '0.75rem' }}>No session data yet.</div>
						<div className='mt-1' style={{ fontSize: '0.7rem', opacity: 0.7 }}>Turn on ArenaSwap and watch some games.</div>
					</div>
				)}

				{!loading && !isEmpty && session && (
					<>
						<div className='d-flex justify-content-around text-center py-3 border-bottom border-secondary-subtle'>
							<div>
								<div className='fw-bold text-body' style={{ fontSize: '1rem' }}>{formatDuration(sessionDuration)}</div>
								<div className='text-body-secondary' style={{ fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Duration</div>
							</div>
							<div>
								<div className='fw-bold text-body' style={{ fontSize: '1rem' }}>{switchCount}</div>
								<div className='text-body-secondary' style={{ fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Switches</div>
							</div>
							<div>
								<div className='fw-bold text-body' style={{ fontSize: '1rem' }}>{uniqueSports.length}</div>
								<div className='text-body-secondary' style={{ fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sports</div>
							</div>
						</div>

						<RecapGameCards session={session} />
						<RecapSwitchLog session={session} />
					</>
				)}
			</div>
		</div>
	);
};

export default sessionRecapView;
