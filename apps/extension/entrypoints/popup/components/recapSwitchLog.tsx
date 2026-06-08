import { useState } from 'react';
import type { RecapSession } from '@arenaswap/core/types';

interface recapSwitchLogProps {
	session: RecapSession;
}

const formatTime = (timestamp: number): string => (
	new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
);

const truncateReason = (reason: string, max = 60): string => (
	reason.length > max ? `${reason.slice(0, max)}…` : reason
);

const maxVisible = 8;

const recapSwitchLog = ({ session }: recapSwitchLogProps) => {
	const [expanded, setExpanded] = useState(false);
	const { switchEvents, gameViews } = session;

	if (switchEvents.length === 0) return null;

	const visible = expanded ? switchEvents : switchEvents.slice(0, maxVisible);
	const hasMore = switchEvents.length > maxVisible;

	return (
		<div className='mt-3'>
			<div className='fw-bold text-uppercase popup-section-label mb-1'>Switch Log</div>
			{visible.map(event => {
				const dest = gameViews[event.toGameId];
				const destLabel = dest
					? `${dest.awayTeamAbbreviation} @ ${dest.homeTeamAbbreviation}`
					: event.toGameId;
				return (
					<div key={event.timestamp} className='d-flex gap-2 mb-2' style={{ fontSize: '0.65rem' }}>
						<div className='text-body-tertiary flex-shrink-0' style={{ minWidth: '4.5rem' }}>
							{formatTime(event.timestamp)}
						</div>
						<div>
							<div className='fw-semibold text-body'>→ {destLabel}</div>
							{event.reason && (
								<div className='text-body-secondary'>{truncateReason(event.reason)}</div>
							)}
						</div>
					</div>
				);
			})}
			{hasMore && (
				<button
					type='button'
					className='btn btn-link btn-sm text-body-secondary p-0'
					style={{ fontSize: '0.65rem' }}
					onClick={() => setExpanded(e => !e)}
				>
					{expanded ? 'Show less' : `Show all ${switchEvents.length} switches`}
				</button>
			)}
		</div>
	);
};

export default recapSwitchLog;
