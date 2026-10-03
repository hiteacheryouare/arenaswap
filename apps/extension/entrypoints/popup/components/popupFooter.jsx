import { useEffect, useRef, useState } from 'react';
import { sensitivityThresholds } from '@arenaswap/core/constants';
import { i18n } from '#i18n';
import { powerScoreColor } from './gameCardShared';

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

const ScoreBar = ({ value }) => (
	<div className='progress flex-grow-1 debug-score-progress' aria-hidden='true'>
		<div
			className='progress-bar'
			style={{ width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: powerScoreColor(value, 100) }}
		/>
	</div>
);

const ModeText = ({ mode }) => (
	<span className={`debug-mode debug-mode-${mode}`}>{mode}</span>
);

const DRow = ({ label, value, wide }) => (
	<div className={wide ? 'debug-row debug-row-wide' : 'debug-row'}>
		<span className='debug-label'>{label}</span>
		<span className='debug-value'>{value ?? '—'}</span>
	</div>
);

const Section = ({ title, icon, children }) => (
	<section className='debug-section'>
		<div className='fw-bold popup-section-label'>
			<i className={`bi bi-${icon}`} />
			{title}
		</div>
		{children}
	</section>
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

	useEffect(() => () => clearTimeout(heartTimer.current), []);

	const bg = debug?.bg;

	return (
		<div className='mt-auto'>
			{showDebug && debug && (
				<div className='popup-debug-panel'>
					<Section title='Runtime' icon='cpu'>
						<DRow label='Version' value={debug.runtime.version} />
						<DRow label='Build' value={debug.runtime.build} />
						<DRow label='Browser' value={debug.runtime.browser} />
						<DRow label='Manifest' value={debug.runtime.mv} />
						<DRow label='Extension ID' value={debug.runtime.id} />
					</Section>

					{bg ? (
						<>
							<Section title='Polling' icon='arrow-repeat'>
								<div className='debug-row'>
									<span className='debug-label'>Mode</span>
									<span className='debug-value'><ModeText mode={bg.demoMode ? 'demo' : 'live'} /></span>
								</div>
								{Object.entries(bg.pollModes).map(([league, mode]) => {
									const intervalMs = bg.leagueIntervals?.[league];
									return (
										<div key={league} className='debug-row'>
											<span className='debug-label'>{league.toUpperCase()}</span>
											<span className='debug-value'>
												<ModeText mode={mode} />
												{intervalMs != null && ` · ${(intervalMs / 1000).toFixed(1)}s`}
											</span>
										</div>
									);
								})}
								<DRow label='Last switch' value={fmtAgo(bg.lastSwitchTime)} />
								<DRow
									label='Pending'
									value={bg.pendingSwitch
										? `→ ${bg.gameLabels?.[bg.pendingSwitch.gameId] ?? bg.pendingSwitch.gameId}`
										: '—'}
								/>
								<DRow label='Sensitivity' value={`${bg.sensitivity} (Δ${sensitivityThresholds[bg.sensitivity] ?? '?'} pts)`} />
								<DRow label='Cooldown' value={`${bg.cooldownSeconds}s`} />
								<DRow label='Delay' value={`${bg.switchDelaySeconds}s`} />
							</Section>

							<Section title='Games' icon='trophy'>
								<DRow label='Live' value={bg.liveGameCount} />
								<DRow label='Upcoming' value={bg.upcomingGameCount} />
								<DRow label='Total' value={bg.totalGameCount} />
								<DRow label='Tab registrations' value={bg.tabRegistry?.length ?? 0} />
								<DRow
									label='Standby Stream'
									value={bg.onStandbyStream ? `On (tab ${bg.standbyStreamTabId})` : 'Off'}
								/>
							</Section>

							{(() => {
								const stalls = Object.entries(bg.clockStalls ?? {}).filter(([, v]) => v.stallCount > 0);
								if (stalls.length === 0) return null;
								return (
									<Section title='Clock Stalls' icon='stopwatch'>
										{stalls.map(([gameId, { stallCount, lastClock }]) => (
											<div key={gameId} className='debug-row'>
												<span className='debug-label'>{bg.gameLabels?.[gameId] ?? gameId}</span>
												<span className='debug-value'>
													<span className='debug-stall'>×{stallCount}</span>
													{` · ${fmtClock(lastClock)}`}
												</span>
											</div>
										))}
									</Section>
								);
							})()}

							{bg.scores?.length > 0 && (
								<Section title='PowerScore' icon='speedometer2'>
									{[...bg.scores]
										.toSorted((a, b) => b.total - a.total)
										.slice(0, 5)
										.map((s, i) => (
											<div key={s.gameId} className='debug-score-row'>
												<span className='debug-score-rank'>{i + 1}</span>
												<span className='debug-score-label text-truncate'>
													{bg.gameLabels?.[s.gameId] ?? s.gameId}
												</span>
												<ScoreBar value={s.total} />
												<span className='debug-score-total'>{Math.round(s.total)}</span>
												<span className='debug-score-flag'>{s.stalled && <i className='bi bi-pause-circle-fill debug-stall' title='Clock stalled' />}</span>
											</div>
										))}
								</Section>
							)}
						</>
					) : (
						<div className='setting-explainer mt-3'>The background worker didn't answer.</div>
					)}

					<Section title='Storage' icon='database'>
						<DRow label='Sync' value={`${debug.storage.sync} keys`} />
						<DRow label='Local' value={`${debug.storage.local} keys`} />
						<DRow label='Session' value={`${debug.storage.session} keys`} />
						<DRow label='Sync keys' value={debug.storage.syncKeys} wide />
						<DRow label='Local keys' value={debug.storage.localKeys} wide />
						<DRow label='Session keys' value={debug.storage.sessionKeys} wide />
					</Section>

					<div className='setting-explainer text-center mt-3'>
						Refreshes every 5s · last at {new Date(debug.loadedAt).toLocaleTimeString()}
					</div>
				</div>
			)}
			<div className='popup-signature-bar'>
				{i18n.t('footer.builtWith')}
				<button
					type='button'
					onClick={handleHeartClick}
					aria-label={i18n.t('footer.toggleDebug')}
					className='popup-signature-heart'
				>
					&nbsp;❤️&nbsp;
				</button>
				{i18n.t('footer.credit')}
			</div>
		</div>
	);
};

export default popupFooter;
