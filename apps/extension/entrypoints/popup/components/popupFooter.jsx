import { useEffect, useRef, useState } from 'react';
import { sensitivityThresholds } from '@arenaswap/core/constants';
import { i18n } from '#i18n';
import { isMultiviewBuild, multiviewPermissions } from '../../../utils/multiview';
import { powerScoreColor } from './gameCardShared';

const fmtSpan = (secs) => {
	if (secs < 60) return `${secs}s`;
	const mins = Math.floor(secs / 60);
	if (mins < 60) return `${mins}m ${secs % 60}s`;
	const hours = Math.floor(mins / 60);
	if (hours < 48) return `${hours}h ${mins % 60}m`;
	return `${Math.floor(hours / 24)}d ${hours % 24}h`;
};

const fmtAgo = (ms) => (ms ? `${fmtSpan(Math.floor((Date.now() - ms) / 1000))} ago` : 'never');

const fmtBuiltAt = ({ builtAt, timeZone }) => new Date(builtAt).toLocaleString(undefined, {
	timeZone,
	year: 'numeric',
	month: 'short',
	day: 'numeric',
	hour: 'numeric',
	minute: '2-digit',
	timeZoneName: 'short',
});

const attempt = (read, fallback) => Promise.resolve().then(read).catch(() => fallback);

const multiviewAccess = async (manifest) => {
	if (!isMultiviewBuild(manifest)) return 'Not in this build';
	return (await attempt(() => browser.permissions.contains(multiviewPermissions), false)) ? 'Granted' : 'Not granted';
};

const panelText = (panel) => {
	const sections = [...panel.querySelectorAll('.debug-section')].map(section => {
		const title = section.querySelector('.popup-section-label').textContent;
		const rows = [...section.querySelectorAll('.debug-row, .debug-score-row')].map(row => {
			const [label, ...values] = [...row.children].map(cell => cell.textContent.trim()).filter(Boolean);
			return `${label}: ${values.join(' ')}`;
		});
		return [`## ${title}`, ...rows].join('\n');
	});
	return [`ArenaSwap debug · ${new Date().toISOString()}`, ...sections].join('\n\n');
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

const signatureBlockCount = 6;

const popupFooter = ({ ready = true, holdMs = 0, entrance = 'fade' }) => {
	const [signaturePhase, setSignaturePhase] = useState(ready && holdMs === 0 ? 'shown' : 'waiting');
	const [showDebug, setShowDebug] = useState(false);
	const [debug, setDebug] = useState(null);
	const [copyLabel, setCopyLabel] = useState('Copy all');
	const debugPanel = useRef(null);
	const copyTimer = useRef(null);
	const heartClicks = useRef(0);
	const heartTimer = useRef(null);
	const refreshTimer = useRef(null);

	const loadDebug = async () => {
		const manifest = browser.runtime.getManifest();
		const ua = navigator.userAgent;
		const browserName = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : 'Unknown';
		const browserVer = ua.match(/(?:Chrome|Firefox|Edg)\/(\d+)/)?.[1] ?? '?';

		const [bg, syncData, localData, sessionData, platform, multiview, notifications] = await Promise.all([
			attempt(() => browser.runtime.sendMessage({ type: 'GET_DEBUG_STATE' }), null),
			attempt(() => browser.storage.sync.get(null), {}),
			attempt(() => browser.storage.local.get(null), {}),
			attempt(() => browser.storage.session.get(null), {}),
			attempt(() => browser.runtime.getPlatformInfo(), null),
			multiviewAccess(manifest),
			attempt(() => browser.notifications.getPermissionLevel(), null),
		]);

		setDebug({
			runtime: {
				version: manifest.version,
				mv: `MV${manifest.manifest_version}`,
				build: import.meta.env.MODE,
				builtAt: fmtBuiltAt(__ARENASWAP_BUILD__),
				builtOn: `${__ARENASWAP_BUILD__.environment} · ${__ARENASWAP_BUILD__.timeZone}`,
				browser: `${browserName} ${browserVer}`,
				platform: platform && `${platform.os} ${platform.arch}`,
				language: browser.i18n.getUILanguage(),
				id: browser.runtime.id,
			},
			permissions: {
				multiview,
				notifications: notifications && `${notifications[0].toUpperCase()}${notifications.slice(1)}`,
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

	const copyDebug = async () => {
		const copied = await attempt(() => navigator.clipboard.writeText(panelText(debugPanel.current)).then(() => true), false);
		setCopyLabel(copied ? 'Copied' : "Couldn't copy");
		clearTimeout(copyTimer.current);
		copyTimer.current = setTimeout(() => setCopyLabel('Copy all'), 2000);
	};

	useEffect(() => () => {
		clearTimeout(heartTimer.current);
		clearTimeout(copyTimer.current);
	}, []);

	useEffect(() => {
		if (!ready || signaturePhase !== 'waiting') return;
		const timer = setTimeout(() => setSignaturePhase(entrance === 'stack' ? 'stacking' : 'fading'), holdMs);
		return () => clearTimeout(timer);
	}, [ready, holdMs, entrance, signaturePhase]);

	// Stacking ends on the blend, the last of its layers to settle, and fading ends on the bar's own
	// fade. The blocks' and the credit's ends bubble up here too and are ignored.
	const finishEntrance = (event) => {
		if (event.target === event.currentTarget || event.target.classList.contains('popup-signature-blend')) {
			setSignaturePhase('shown');
		}
	};

	const bg = debug?.bg;

	return (
		<div className='mt-auto'>
			{showDebug && debug && (
				<div className='popup-debug-panel' ref={debugPanel}>
					<Section title='Runtime' icon='cpu'>
						<DRow label='Version' value={debug.runtime.version} />
						<DRow label='Build' value={debug.runtime.build} />
						<DRow label='Built' value={debug.runtime.builtAt} />
						<DRow label='Built on' value={debug.runtime.builtOn} />
						<DRow label='Browser' value={debug.runtime.browser} />
						<DRow label='Platform' value={debug.runtime.platform} />
						<DRow label='Language' value={debug.runtime.language} />
						<DRow label='Manifest' value={debug.runtime.mv} />
						<DRow label='Extension ID' value={debug.runtime.id} />
					</Section>

					<Section title='Permissions' icon='shield-check'>
						<DRow label='Multiview access' value={debug.permissions.multiview} />
						<DRow label='Notifications' value={debug.permissions.notifications} />
					</Section>

					{bg ? (
						<>
							<Section title='Polling' icon='arrow-repeat'>
								<div className='debug-row'>
									<span className='debug-label'>Mode</span>
									<span className='debug-value'><ModeText mode={bg.demoMode ? 'demo' : 'live'} /></span>
								</div>
								<DRow label='Worker up' value={fmtSpan(Math.floor((Date.now() - bg.workerStartedAt) / 1000))} />
								{Object.entries(bg.pollModes).map(([league, mode]) => {
									const intervalMs = bg.leagueIntervals?.[league];
									const failures = bg.leagueFailures?.[league];
									return (
										<div key={league} className='debug-row'>
											<span className='debug-label'>{league.toUpperCase()}</span>
											<span className='debug-value'>
												<ModeText mode={mode} />
												{intervalMs != null && ` · ${(intervalMs / 1000).toFixed(1)}s`}
												{bg.leagueLastGoodAt?.[league] ? ` · ok ${fmtAgo(bg.leagueLastGoodAt[league])}` : ' · no good poll yet'}
												{failures > 0 && <span className='debug-break'>{` · ${failures} failed`}</span>}
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
								<DRow
									label='Held'
									value={bg.heldSwitch
										? `→ ${bg.gameLabels?.[bg.heldSwitch.gameId] ?? bg.heldSwitch.gameId} by ${Math.max(0, Math.round((bg.heldSwitch.holdUntil - Date.now()) / 1000))}s`
										: bg.contentAwareSwitching ? '—' : 'off'}
								/>
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
								const breaks = Object.entries(bg.commercialBreaks ?? {}).filter(([, entry]) => entry.kind);
								if (breaks.length === 0) return null;
								return (
									<Section title='Commercial Breaks' icon='tv'>
										{breaks.map(([gameId, { kind }]) => (
											<div key={gameId} className='debug-row'>
												<span className='debug-label'>{bg.gameLabels?.[gameId] ?? gameId}</span>
												<span className='debug-value debug-break'>{kind}</span>
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
												<span className='debug-score-flag'>{s.onBreak && <i className='bi bi-tv-fill debug-break' title='On a commercial break' />}</span>
											</div>
										))}
								</Section>
							)}
						</>
					) : (
						<div className='setting-explainer mt-5'>The background worker didn't answer.</div>
					)}

					<Section title='Storage' icon='database'>
						<DRow label='Sync' value={`${debug.storage.sync} keys`} />
						<DRow label='Local' value={`${debug.storage.local} keys`} />
						<DRow label='Session' value={`${debug.storage.session} keys`} />
						<DRow label='Sync keys' value={debug.storage.syncKeys} wide />
						<DRow label='Local keys' value={debug.storage.localKeys} wide />
						<DRow label='Session keys' value={debug.storage.sessionKeys} wide />
					</Section>

					<div className='setting-explainer text-center mt-5'>
						Refreshes every 5s · last at {new Date(debug.loadedAt).toLocaleTimeString()} ·{' '}
						<button type='button' className='btn btn-link p-0 fg-secondary align-baseline debug-copy' onClick={copyDebug}>
							{copyLabel}
						</button>
					</div>
				</div>
			)}
			<div
				className={`popup-signature-bar${signaturePhase === 'shown' ? '' : ` is-${signaturePhase}`}`}
				onAnimationEnd={finishEntrance}
				data-testid='popup-signature-bar'
			>
				{signaturePhase === 'stacking' && (
					<>
						<span className='popup-signature-stack' aria-hidden='true'>
							{Array.from({ length: signatureBlockCount }, (_, index) => <span key={index} />)}
						</span>
						<span className='popup-signature-blend' aria-hidden='true' />
					</>
				)}
				<span className='popup-signature-credit'>
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
				</span>
			</div>
		</div>
	);
};

export default popupFooter;
