import { useEffect, useRef, useState } from 'react';
import { sensitivityThresholds } from '@arenaswap/core/constants';
import { i18n } from '#i18n';

const fmtClock = (secs) => {
	if (secs === undefined || secs === null) return '—';
	const m = Math.floor(secs / 60);
	const s = secs % 60;
	return `${m}:${String(s).padStart(2, '0')}`;
};

const fmtAgo = (ms) => {
	if (!ms) return 'never';
	const secs = Math.floor((Date.now() - ms) / 1000);
	if (secs < 60) return `${secs}s ago`;
	const mins = Math.floor(secs / 60);
	if (mins < 60) return `${mins}m ${secs % 60}s ago`;
	return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
};

const ScoreBar = ({ value }) => {
	const filled = Math.round(Math.min(100, Math.max(0, value)) / 10);
	return (
		<span className='debug-score-bar' aria-hidden='true'>
			{'█'.repeat(filled)}{'░'.repeat(10 - filled)}
		</span>
	);
};

const ModeBadge = ({ mode }) => (
	<span className={`debug-mode-badge debug-mode-${mode}`}>{mode}</span>
);

const DRow = ({ label, value, wide }) => (
	<div className={wide ? 'debug-row debug-row-wide' : 'debug-row'}>
		<span className='debug-row-label'>{label}</span>
		<span className='debug-row-mono'>{value ?? '—'}</span>
	</div>
);

const Section = ({ title, accent, children }) => (
	<div className='debug-section' style={{ '--dbg-accent': accent }}>
		<div className='debug-section-title'>{title}</div>
		<div className='debug-section-body'>{children}</div>
	</div>
);

const popupFooter = () => {
	const [showDebug, setShowDebug] = useState(false);
	const [debug, setDebug] = useState(null);
	const heartClicks = useRef(0);
	const heartTimer = useRef(null);
	const refreshTimer = useRef(null);

	const loadDebug = async () => {
		const manifest = browser.runtime.getManifest();
		const ua = navigator.userAgent;
		const browserName = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : 'Unknown';
		const browserVer = ua.match(/(?:Chrome|Firefox|Edg)\/(\d+)/)?.[1] ?? '?';

		const [bg, syncData, localData, sessionData] = await Promise.all([
			browser.runtime.sendMessage({ type: 'GET_DEBUG_STATE' }).catch(() => null),
			browser.storage.sync.get(null).catch(() => ({})),
			browser.storage.local.get(null).catch(() => ({})),
			browser.storage.session.get(null).catch(() => ({})),
		]);

		setDebug({
			runtime: {
				version: manifest.version,
				mv: `MV${manifest.manifest_version}`,
				build: import.meta.env.MODE,
				browser: `${browserName} ${browserVer}`,
				id: browser.runtime.id,
			},
			bg,
			storage: {
				sync: Object.keys(syncData).length,
				syncKeys: Object.keys(syncData).join(', ') || '—',
				local: Object.keys(localData).length,
				localKeys: Object.keys(localData).join(', ') || '—',
				session: Object.keys(sessionData).length,
				sessionKeys: Object.keys(sessionData).join(', ') || '—',
			},
			loadedAt: Date.now(),
		});
	};

	const handleHeartClick = () => {
		heartClicks.current += 1;
		clearTimeout(heartTimer.current);
		heartTimer.current = setTimeout(() => { heartClicks.current = 0; }, 3000);
		if (heartClicks.current < 10) return;
		heartClicks.current = 0;
		clearTimeout(heartTimer.current);
		setShowDebug(v => !v);
	};

	useEffect(() => {
		if (!showDebug) {
			clearInterval(refreshTimer.current);
			return;
		}
		loadDebug();
		refreshTimer.current = setInterval(loadDebug, 5000);
		return () => clearInterval(refreshTimer.current);
	}, [showDebug]);

	// Clear the pending heart-click reset timer if the footer unmounts mid-sequence.
	useEffect(() => () => clearTimeout(heartTimer.current), []);

	const bg = debug?.bg;

	return (
		<div className='mt-auto'>
			{showDebug && debug && (
				<div className='popup-debug-panel'>
					<div className='debug-header'>
						<span className='debug-header-title'>ArenaSwap Debug</span>
						<span className='debug-header-version'>{debug.runtime.version}</span>
					</div>

					<Section title='RUNTIME' accent='#fdb913'>
						<DRow label='build' value={debug.runtime.build} />
						<DRow label='browser' value={debug.runtime.browser} />
						<DRow label='mv' value={debug.runtime.mv} />
						<DRow label='ext id' value={`${debug.runtime.id?.slice(0, 14)}…`} />
					</Section>

					{bg ? (
						<>
							<Section title='POLLING' accent='#f36f21'>
								<div className='debug-row'>
									<span className='debug-row-label'>mode</span>
									<ModeBadge mode={bg.demoMode ? 'demo' : 'live'} />
								</div>
								{Object.keys(bg.pollModes).length > 0 && (
									<div className='debug-leagues-grid'>
										{Object.entries(bg.pollModes).map(([league, mode]) => {
											const intervalMs = bg.leagueIntervals?.[league];
											const intervalLabel = intervalMs != null
												? `${(intervalMs / 1000).toFixed(1)}s`
												: null;
											return (
												<div key={league} className='debug-league-entry'>
													<span className='debug-row-label'>{league.toUpperCase()}</span>
													<ModeBadge mode={mode} />
													{intervalLabel && (
														<span className='debug-league-interval'>{intervalLabel}</span>
													)}
												</div>
											);
										})}
									</div>
								)}
								<DRow label='last switch' value={fmtAgo(bg.lastSwitchTime)} />
								<DRow
									label='pending'
									value={bg.pendingSwitch
										? `→ ${bg.gameLabels?.[bg.pendingSwitch.gameId] ?? bg.pendingSwitch.gameId}`
										: '—'}
								/>
								<DRow label='sensitivity' value={`${bg.sensitivity} (Δ${sensitivityThresholds[bg.sensitivity] ?? '?'}pts)`} />
								<DRow label='cooldown' value={`${bg.cooldownSeconds}s`} />
								<DRow label='delay' value={`${bg.switchDelaySeconds}s`} />
							</Section>

							<Section title='GAMES' accent='#0db14b'>
								<DRow label='live' value={bg.liveGameCount} />
								<DRow label='upcoming' value={bg.upcomingGameCount} />
								<DRow label='total' value={bg.totalGameCount} />
								<DRow label='tab regs' value={bg.tabRegistry?.length ?? 0} />
								<DRow
									label='standby'
									value={bg.onStandbyStream ? `ON (tab ${bg.standbyStreamTabId})` : 'OFF'}
								/>
							</Section>

							{(() => {
								const stalls = Object.entries(bg.clockStalls ?? {}).filter(([, v]) => v.stallCount > 0);
								if (stalls.length === 0) return null;
								return (
									<Section title='CLOCK STALLS' accent='#c9234a'>
										{stalls.map(([gameId, { stallCount, lastClock }]) => (
											<div key={gameId} className='debug-row'>
												<span className='debug-row-label'>
													{bg.gameLabels?.[gameId] ?? gameId.slice(0, 12)}
												</span>
												<span className='debug-row-mono'>
													<span className='debug-stall-badge'>×{stallCount}</span>
													{' '}{fmtClock(lastClock)}
												</span>
											</div>
										))}
									</Section>
								);
							})()}

							{bg.scores?.length > 0 && (
								<Section title='POWERSCORE' accent='#0089cf'>
									{[...bg.scores]
										.toSorted((a, b) => b.total - a.total)
										.slice(0, 5)
										.map((s, i) => (
											<div key={s.gameId} className='debug-score-row'>
												<span className='debug-score-rank'>{i + 1}</span>
												<span className='debug-score-label'>
													{bg.gameLabels?.[s.gameId] ?? s.gameId.slice(0, 10)}
												</span>
												<ScoreBar value={s.total} />
												<span className='debug-score-total'>{Math.round(s.total)}</span>
												{s.stalled && <span className='debug-stall-badge'>stall</span>}
											</div>
										))}
								</Section>
							)}
						</>
					) : (
						<div className='debug-no-bg'>background unavailable</div>
					)}

					<Section title='STORAGE' accent='#645faa'>
						<DRow label='sync' value={`${debug.storage.sync} keys`} />
						<DRow label='local' value={`${debug.storage.local} keys`} />
						<DRow label='session' value={`${debug.storage.session} keys`} />
						<DRow label='sync keys' value={debug.storage.syncKeys} wide />
						<DRow label='local keys' value={debug.storage.localKeys} wide />
						<DRow label='session keys' value={debug.storage.sessionKeys} wide />
					</Section>

					<div className='debug-refresh-bar'>
						auto-refresh 5s · {new Date(debug.loadedAt).toLocaleTimeString()}
					</div>
				</div>
			)}
			<div className='popup-lattice-line'>
				<img src='/images/lattice-rosette-white.svg' alt='' aria-hidden='true' />
				<span>Lattice &amp; Company</span>
			</div>
			<div className='popup-signature-bar'>
				{i18n.t('footer.builtWith')}
				<button
					type='button'
					onClick={handleHeartClick}
					aria-label={i18n.t('footer.toggleDebug')}
					className='bg-transparent border-0 p-0 mx-px cursor-default text-inherit leading-none'
				>
					&nbsp;❤️&nbsp;
				</button>
				{i18n.t('footer.credit')}
			</div>
		</div>
	);
};

export default popupFooter;
