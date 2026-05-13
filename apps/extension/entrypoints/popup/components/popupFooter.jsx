import { useRef, useState } from 'react';

const popupFooter = () => {
	const [showDebug, setShowDebug] = useState(false);
	const [debugInfo, setDebugInfo] = useState(null);
	const heartClicks = useRef(0);
	const heartTimer = useRef(null);

	const handleHeartClick = async () => {
		heartClicks.current += 1;
		clearTimeout(heartTimer.current);
		heartTimer.current = setTimeout(() => { heartClicks.current = 0; }, 3000);

		if (heartClicks.current < 10) return;
		heartClicks.current = 0;
		clearTimeout(heartTimer.current);

		if (!debugInfo) {
			const manifest = browser.runtime.getManifest();
			const ua = navigator.userAgent;
			const browserName = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : 'Unknown';
			const browserVer = ua.match(/(?:Chrome|Firefox|Edg)\/(\d+)/)?.[1] ?? '?';
			const [syncData, localData, sessionData] = await Promise.all([
				browser.storage.sync.get(null).catch(() => ({})),
				browser.storage.local.get(null).catch(() => ({})),
				browser.storage.session.get(null).catch(() => ({})),
			]);
			setDebugInfo({
				version: manifest.version,
				mv: manifest.manifest_version,
				build: import.meta.env.MODE,
				browser: `${browserName} ${browserVer}`,
				id: browser.runtime.id,
				sync: Object.keys(syncData).join(', ') || '—',
				local: Object.keys(localData).join(', ') || '—',
				session: Object.keys(sessionData).join(', ') || '—',
			});
		}
		setShowDebug(v => !v);
	};

	return (
		<div className='mt-auto'>
			{showDebug && debugInfo && (
				<div style={{
					backgroundColor: '#0d0d0d',
					borderTop: '1px solid #1a3a1a',
					fontFamily: 'monospace',
					fontSize: '0.6rem',
					lineHeight: '1.6',
					color: '#4ade80',
					padding: '0.4rem 0.6rem',
					overflowY: 'auto',
					maxHeight: '7rem',
					wordBreak: 'break-all',
					overflowWrap: 'anywhere',
				}}>
					<div style={{ color: '#166534', marginBottom: '0.2rem' }}>— debug —</div>
					{Object.entries(debugInfo).map(([key, val]) => (
						<div key={key} style={{ display: 'flex', gap: '0.5rem' }}>
							<span style={{ color: '#166534', flexShrink: 0, width: '4rem' }}>{key}</span>
							<span style={{ minWidth: 0, wordBreak: 'break-all' }}>{val}</span>
						</div>
					))}
				</div>
			)}
			<div className='popup-signature-bar'>
				Built with{' '}
				<button
					type='button'
					onClick={handleHeartClick}
					style={{ background: 'none', border: 'none', padding: 0, margin: '0 1px', cursor: 'default', fontSize: 'inherit', lineHeight: 1 }}
					tabIndex={-1}
					aria-hidden='true'
				>
					❤️
				</button>
				{' '}by Ryan Mullin
			</div>
		</div>
	);
};

export default popupFooter;
