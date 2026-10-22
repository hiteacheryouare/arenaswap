import { useState } from 'react';
import { i18n } from '#i18n';
import type { FantasyRosterEntry } from '@arenaswap/core';
import type { UserPreferences } from '@arenaswap/core/types';
import { openBackupTab } from '../../../utils/settingsBackup';
import type { profileList } from '../../../utils/profiles';
import ProfileDialog, { type profileDialogRequest } from './profileDialog';
import ProfileRow from './profileRow';
import { syncedSummary } from './settingsSummary';

export interface profileActions {
	onSwitch: (id: string) => void;
	onCreate: (name: string, fresh: boolean) => void;
	onRename: (id: string, name: string) => void;
	onDelete: (id: string) => void;
}

interface backupSyncPageProps {
	prefs: UserPreferences;
	fantasyRoster: readonly FantasyRosterEntry[];
	profiles: profileList;
	profilesBusy: boolean;
	profileActions: profileActions;
}

const backupSyncPage = ({ prefs, fantasyRoster, profiles, profilesBusy, profileActions }: backupSyncPageProps) => {
	const [dialog, setDialog] = useState<profileDialogRequest | null>(null);
	const activeName = profiles.profiles.find(profile => profile.id === profiles.activeId)?.name ?? '';

	// Rename and Delete open from a menu that has already closed, so focus goes back to the row's own button.
	const closeDialog = () => {
		const rowButton = dialog && dialog.kind !== 'new' ? document.getElementById(`profileMore-${dialog.profile.id}`) : null;
		(rowButton ?? document.getElementById('profileNew'))?.focus();
		setDialog(null);
	};

	return (
		<>
			<div className='fw-bold popup-section-label'><i className='bi bi-people' />{i18n.t('profiles.section')}</div>
			<div className='profile-list'>
				{profiles.profiles.map(profile => (
					<ProfileRow
						key={profile.id}
						profile={profile}
						active={profile.id === profiles.activeId}
						disabled={profilesBusy}
						onSwitch={() => profileActions.onSwitch(profile.id)}
						onRename={() => setDialog({ kind: 'rename', profile })}
						onExport={() => openBackupTab('export', profile.id)}
						onDelete={() => setDialog({ kind: 'delete', profile })}
					/>
				))}
			</div>
			<button type='button' id='profileNew' className='btn btn-outline theme-accent w-100 mt-2' disabled={profilesBusy} onClick={() => setDialog({ kind: 'new' })}>
				<i className='bi bi-plus-lg me-2' aria-hidden='true' />
				{i18n.t('profiles.new')}
			</button>

			<button type='button' id='backupOpen' className='btn btn-solid theme-primary w-100 mt-5' onClick={() => openBackupTab()}>
				{i18n.t('backup.open')}
			</button>

			<div className='fw-bold popup-section-label mt-5'><i className='bi bi-cloud' />{i18n.t('backup.syncedSection')}</div>
			<p className='setting-explainer mb-2'>{i18n.t('backup.syncedExplainer', { name: activeName })}</p>
			<div className='backup-summary'>
				{syncedSummary(prefs, fantasyRoster).map(row => (
					<div key={row.id} className='d-flex justify-content-between align-items-baseline gap-3'>
						<span className='fg-secondary setting-toggle-label'>{row.label}</span>
						<span id={`backupSummary-${row.id}`} className='fw-semibold setting-value-label text-end'>{row.value}</span>
					</div>
				))}
			</div>

			<ProfileDialog
				request={dialog}
				profiles={profiles.profiles}
				activeName={activeName}
				onCreate={profileActions.onCreate}
				onRename={profileActions.onRename}
				onDelete={profileActions.onDelete}
				onClose={closeDialog}
			/>
		</>
	);
};

export default backupSyncPage;
