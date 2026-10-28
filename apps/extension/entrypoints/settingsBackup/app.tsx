import { useEffect, useState, type DragEvent } from 'react';
import { i18n } from '#i18n';
import { createFavoriteTeamKey, parseFavoriteTeamKey } from '@arenaswap/core/constants';
import type { LeagueId, LeagueLogoMap } from '@arenaswap/core/types';
import { fetchTeamsForLeagues, type EspnTeamEntry } from '@arenaswap/sideline';
import { displayLocale } from '../../utils/displayLocale';
import { defaultProfileName, followSyncedProfile, loadProfiles, type profileList } from '../../utils/profiles';
import {
	addSettingsProfile,
	applySettingsProfile,
	downloadSettingsFile,
	loadSettingsProfile,
	normalizeSettingsProfile,
	parseSettingsFile,
	readBackupHash,
	settingsFileName,
	type settingsFile,
	type settingsFileProblem,
	type settingsProfile,
} from '../../utils/settingsBackup';
import { fullLogoSrc, useTheme } from '../../utils/theme';
import SelectDropdown from '../popup/components/selectDropdown';
import { isLeagueLogoCacheFresh, leagueLogoCacheKey, seededLeagueLogos } from '../popup/leagueLogoCache';
import SetupCard from './setupCard';

type importProblem = settingsFileProblem | 'saveFailed';

const problemKeys = {
	unreadable: 'backupImport.problemUnreadable',
	notOurs: 'backupImport.problemNotOurs',
	tooNew: 'backupImport.problemTooNew',
	saveFailed: 'backupImport.problemSaveFailed',
} as const satisfies Record<importProblem, string>;

// Onboarding's link lands on the drop zone, a profile's Export on the download button.
const sectionControls: Record<string, string> = { import: 'importFile', export: 'backupDownload' };

const formatExportedAt = (iso: string): string => {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return '';
	return new Intl.DateTimeFormat(displayLocale(), { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

const favoriteLeagues = (profiles: (settingsProfile | null | undefined)[]): LeagueId[] => [...new Set(
	profiles.flatMap(profile => profile?.prefs.favoriteTeamIds ?? []).flatMap(key => parseFavoriteTeamKey(key)?.leagueId ?? []),
)].toSorted();

const loadLeagueLogos = async (): Promise<LeagueLogoMap> => {
	const stored = (await browser.storage.local.get(leagueLogoCacheKey))[leagueLogoCacheKey];
	return { ...seededLeagueLogos(), ...(isLeagueLogoCacheFresh(stored, Date.now()) ? stored.logos : {}) };
};

const closeTab = () => {
	void browser.tabs.getCurrent().then(tab => {
		if (tab?.id !== undefined) void browser.tabs.remove(tab.id);
	});
};

const App = () => {
	const [current, setCurrent] = useState<settingsProfile | null>(null);
	const [profiles, setProfiles] = useState<profileList | null>(null);
	const [exportId, setExportId] = useState<string | null>(null);
	const [exportProfile, setExportProfile] = useState<settingsProfile | null>(null);
	const [file, setFile] = useState<settingsFile | null>(null);
	const [problem, setProblem] = useState<importProblem | null>(null);
	const [exportFailed, setExportFailed] = useState(false);
	const [applying, setApplying] = useState(false);
	const [done, setDone] = useState(false);
	const [dragging, setDragging] = useState(false);
	const [pickerKey, setPickerKey] = useState(0);
	const [leagueLogos, setLeagueLogos] = useState<LeagueLogoMap>(seededLeagueLogos);
	const [teams, setTeams] = useState<ReadonlyMap<string, EspnTeamEntry>>(new Map());
	const theme = useTheme(done && file ? file.profile.prefs.theme : current?.prefs.theme ?? null);

	useEffect(() => {
		document.title = `${i18n.t('setup.groupBackup')} · ArenaSwap`;
		document.documentElement.lang = displayLocale();
		const { section, profileId } = readBackupHash(location.hash);
		void followSyncedProfile().catch(loadProfiles).then(list => {
			setProfiles(list);
			setExportId(list.profiles.some(profile => profile.id === profileId) ? profileId ?? list.activeId : list.activeId);
			return loadSettingsProfile();
		}).then(setCurrent, () => setCurrent(normalizeSettingsProfile({})));
		loadLeagueLogos().then(setLeagueLogos).catch(() => {});
		document.getElementById(sectionControls[section] ?? '')?.focus();
	}, []);

	useEffect(() => {
		if (!exportId) return;
		let cancelled = false;
		loadSettingsProfile(exportId).then(profile => { if (!cancelled) setExportProfile(profile); }, () => {});
		return () => { cancelled = true; };
	}, [exportId]);

	// Crests only for the leagues someone has favorites in, and only once per set of leagues.
	const teamLeaguesKey = favoriteLeagues([current, exportProfile, file?.profile]).join(',');
	useEffect(() => {
		if (!teamLeaguesKey) return;
		let cancelled = false;
		fetchTeamsForLeagues(teamLeaguesKey.split(',') as LeagueId[])
			.then(fetched => {
				if (!cancelled) setTeams(new Map(fetched.map(team => [createFavoriteTeamKey(team.leagueId, team.id), team])));
			})
			.catch(() => {});
		return () => { cancelled = true; };
	}, [teamLeaguesKey]);

	const exportSettings = () => {
		setExportFailed(false);
		downloadSettingsFile(exportId ?? undefined).catch(() => setExportFailed(true));
	};

	const readFile = async (picked: File | undefined) => {
		if (!picked) return;
		const parsed = parseSettingsFile(await picked.text().catch(() => ''));
		setFile(parsed.ok ? parsed.file : null);
		setProblem(parsed.ok ? null : parsed.problem);
	};

	const startOver = () => {
		setFile(null);
		setProblem(null);
		setPickerKey(key => key + 1);
	};

	const bringIn = async (mode: 'add' | 'replace') => {
		if (!file) return;
		setApplying(true);
		try {
			const list = await (mode === 'add' ? addSettingsProfile(file.profile) : applySettingsProfile(file.profile));
			setProfiles(list);
			setExportId(list.activeId);
			const moved = await loadSettingsProfile();
			setCurrent(moved);
			setExportProfile(moved);
			setDone(true);
		} catch {
			setProblem('saveFailed');
		} finally {
			setApplying(false);
		}
	};

	// Every file drag is caught, even ones the page won't take, or a stray drop opens the JSON in the tab.
	const onDragOver = (event: DragEvent) => {
		if (!event.dataTransfer.types.includes('Files')) return;
		event.preventDefault();
		setDragging(!done && !applying && !file);
	};

	const onDragLeave = (event: DragEvent) => {
		if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
	};

	const onDrop = (event: DragEvent) => {
		event.preventDefault();
		setDragging(false);
		if (!done && !applying) void readFile(event.dataTransfer.files[0]);
	};

	const preview = file && !done ? file.profile : null;
	const activeName = current?.name ?? defaultProfileName;
	const shown = preview ?? (done ? current : exportProfile ?? current);
	const exportName = exportProfile?.name ?? activeName;
	const exportedAt = file ? formatExportedAt(file.exportedAt) : '';
	const setupMeta = preview
		? exportedAt
			? i18n.t('backupImport.fileMeta', { name: preview.name, date: exportedAt })
			: i18n.t('backupImport.fileMetaUndated', { name: preview.name })
		: shown && i18n.t('backupImport.fileMetaUndated', { name: shown.name });

	return (
		<div className='backup-page' onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
			<div className='backup-glow' aria-hidden='true' />
			<header className='backup-header'>
				<img src={fullLogoSrc(theme)} alt='ArenaSwap' className='backup-logo' />
			</header>

			<main className='backup-main'>
				<h1 className='backup-title'>{i18n.t('setup.groupBackup')}</h1>

				<div className='backup-grid'>
					<div className='backup-actions'>
						<section id='export' className='backup-card'>
							<h2 className='backup-heading'>{i18n.t('backup.exportTitle')}</h2>
							{profiles && profiles.profiles.length > 1 && (
								<div className='mt-3'>
									<label id='exportProfileLabel' className='form-label small fg-secondary mb-1'>{i18n.t('backup.exportProfile')}</label>
									<SelectDropdown
										id='exportProfile'
										labelId='exportProfileLabel'
										value={exportId ?? profiles.activeId}
										options={profiles.profiles.map(profile => ({ value: profile.id, label: profile.name }))}
										onChange={setExportId}
									/>
								</div>
							)}
							<button type='button' id='backupDownload' className='btn btn-solid theme-primary w-100 mt-3' onClick={exportSettings}>
								<i className='bi bi-download me-2' aria-hidden='true' />
								{i18n.t('backup.exportButton')}
							</button>
							<p className='backup-hint mt-2 mb-0'>{i18n.t('backup.exportFileHint', { fileName: settingsFileName(exportName, new Date()) })}</p>
							{exportFailed && <p className='backup-problem mt-3 mb-0' role='alert'>{i18n.t('backup.exportFailed')}</p>}
						</section>

						<section id='import' className='backup-card'>
							{done ? (
								<>
									<h2 className='backup-heading'>{i18n.t('backupImport.doneTitle', { name: activeName })}</h2>
									<button type='button' id='importCloseTab' className='btn btn-solid theme-primary w-100 mt-3' onClick={closeTab}>
										{i18n.t('backupImport.closeTab')}
									</button>
								</>
							) : (
								<>
									<h2 className='backup-heading'>{i18n.t('backupImport.title')}</h2>
									{problem && <p id='importProblem' className='backup-problem mt-2' role='alert'>{i18n.t(problemKeys[problem])}</p>}
									{file ? (
										<>
											<div className='d-flex flex-column gap-2 mt-3'>
												<button type='button' id='importAdd' className='btn btn-solid theme-primary text-truncate' onClick={() => void bringIn('add')} disabled={applying}>
													{applying ? i18n.t('backupImport.applying') : i18n.t('backupImport.addAsNew')}
												</button>
												<button type='button' id='importReplace' className='btn btn-outline theme-accent text-truncate' onClick={() => void bringIn('replace')} disabled={applying}>
													{i18n.t('backupImport.replace', { name: activeName })}
												</button>
											</div>
											<p className='backup-hint mt-2 mb-0'>{i18n.t('backupImport.replaceWarning', { name: activeName })}</p>
											<button type='button' id='importStartOver' className='btn btn-link btn-sm p-0 mt-3 fg-secondary' onClick={startOver} disabled={applying}>
												{i18n.t('backupImport.startOver')}
											</button>
										</>
									) : (
										<label className='backup-drop mt-2' data-dragging={dragging} htmlFor='importFile'>
											<i className='bi bi-file-earmark-arrow-up backup-drop-icon' aria-hidden='true' />
											<span className='backup-drop-title'>{i18n.t('backupImport.dropTitle')}</span>
											<span className='btn btn-outline theme-accent btn-sm mt-2'>{i18n.t('backupImport.chooseFile')}</span>
											<input
												key={pickerKey}
												type='file'
												id='importFile'
												className='visually-hidden'
												accept='application/json,.json'
												onChange={event => void readFile(event.target.files?.[0])}
											/>
										</label>
									)}
								</>
							)}
						</section>
					</div>

					{current && shown && (
						<SetupCard
							heading={preview ? i18n.t('backupImport.fromFile') : i18n.t('backup.yourSetup')}
							meta={setupMeta || undefined}
							profile={shown}
							compareTo={preview ? current : undefined}
							leagueLogos={leagueLogos}
							teams={teams}
						/>
					)}
				</div>
			</main>
		</div>
	);
};

export default App;
