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
				<div className='popup-debug-panel py-[0.4rem] px-[0.6rem] overflow-y-auto max-h-[7rem]'>
					<div className='popup-debug-label mb-[0.2rem]'>— debug —</div>
					{Object.entries(debugInfo).map(([key, val]) => (
						<div key={key} className='flex gap-2'>
							<span className='popup-debug-label shrink-0 w-16'>{key}</span>
							<span className='min-w-0'>{val}</span>
						</div>
					))}
				</div>
			)}
			<div className='popup-signature-bar'>
				Built with{' '}
				<button
					type='button'
					onClick={handleHeartClick}
					aria-label='Toggle debug info'
					className='bg-transparent border-0 p-0 mx-px cursor-default text-inherit leading-none'
				>
					❤️
				</button>
				{' '}by Ryan Mullin
			</div>
		</div>
	);
};

export default popupFooter;
