import { Dialog } from 'bootstrap';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { i18n } from '#i18n';
import { isProfileNameTaken, normalizeProfileName, profileNameLimit, uniqueProfileName, type profileEntry } from '../../../utils/profiles';

export type profileDialogRequest =
	| { kind: 'new' }
	| { kind: 'rename'; profile: profileEntry }
	| { kind: 'delete'; profile: profileEntry };

interface profileDialogProps {
	request: profileDialogRequest | null;
	profiles: readonly profileEntry[];
	activeName: string;
	onCreate: (name: string, fresh: boolean) => void;
	onRename: (id: string, name: string) => void;
	onDelete: (id: string) => void;
	onClose: () => void;
}

const startingName = (request: profileDialogRequest, profiles: readonly profileEntry[]) => (
	request.kind === 'new'
		? uniqueProfileName(i18n.t('profiles.defaultName', { count: String(profiles.length + 1) }), profiles)
		: request.profile.name
);

const profileDialog = ({ request, profiles, activeName, onCreate, onRename, onDelete, onClose }: profileDialogProps) => {
	const dialogRef = useRef<HTMLDialogElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const titleId = useId();
	const [name, setName] = useState('');
	const [shown, setShown] = useState<profileDialogRequest | null>(null);
	const onCloseRef = useRef(onClose);
	// Bootstrap ignores a hide while the dialog is still opening, so a quick Cancel waits for it.
	const openingRef = useRef<Promise<void>>(Promise.resolve());
	onCloseRef.current = onClose;

	if (request && request !== shown) {
		setShown(request);
		if (request.kind !== 'delete') setName(startingName(request, profiles));
	}

	useEffect(() => {
		const element = dialogRef.current;
		if (!element) return;
		const dialog = Dialog.getOrCreateInstance(element);
		const hidden = () => onCloseRef.current();
		element.addEventListener('hidden.bs.dialog', hidden);
		return () => {
			element.removeEventListener('hidden.bs.dialog', hidden);
			dialog.dispose();
		};
	}, []);

	useEffect(() => {
		if (!request || !dialogRef.current) return;
		openingRef.current = Dialog.getOrCreateInstance(dialogRef.current).show().then(() => inputRef.current?.select());
	}, [request]);

	const close = () => {
		const element = dialogRef.current;
		if (element) void openingRef.current.then(() => Dialog.getOrCreateInstance(element).hide());
	};

	const editing = shown && shown.kind !== 'delete' ? shown : null;
	const trimmed = normalizeProfileName(name);
	const taken = editing ? isProfileNameTaken(trimmed, profiles, editing.kind === 'rename' ? editing.profile.id : undefined) : false;
	const nameReady = trimmed.length > 0 && !taken;

	const submit = (fresh: boolean) => {
		if (!shown) return;
		if (shown.kind === 'delete') onDelete(shown.profile.id);
		else if (!nameReady) return;
		else if (shown.kind === 'rename') onRename(shown.profile.id, trimmed);
		else onCreate(trimmed, fresh);
		close();
	};

	const onSubmit = (event: FormEvent) => {
		event.preventDefault();
		submit(false);
	};

	const title = !shown ? '' : {
		new: () => i18n.t('profiles.newTitle'),
		rename: () => i18n.t('profiles.renameTitle'),
		delete: () => i18n.t('profiles.deleteTitle', { name: shown.kind === 'delete' ? shown.profile.name : '' }),
	}[shown.kind]();

	return (
		<dialog ref={dialogRef} id='profileDialog' className='dialog profile-dialog' aria-labelledby={titleId}>
			<form onSubmit={onSubmit}>
				<div className='dialog-header'>
					<h2 id={titleId} className='dialog-title text-truncate'>{title}</h2>
				</div>
				<div className='dialog-body'>
					{shown?.kind === 'delete' ? (
						<p className='setting-explainer mb-0'>{i18n.t('profiles.deleteBody')}</p>
					) : (
						<>
							<label htmlFor='profileName' className='form-label small fg-secondary mb-1'>{i18n.t('profiles.nameLabel')}</label>
							<input
								ref={inputRef}
								id='profileName'
								type='text'
								className='form-control form-control-sm'
								value={name}
								maxLength={profileNameLimit}
								autoComplete='off'
								aria-invalid={taken ? 'true' : undefined}
								aria-describedby={taken ? 'profileNameTaken' : undefined}
								onChange={event => setName(event.target.value)}
							/>
							{taken && <p id='profileNameTaken' className='backup-problem small mt-2 mb-0' role='alert'>{i18n.t('profiles.nameTaken', { name: trimmed })}</p>}
						</>
					)}
				</div>
				<div className='dialog-footer flex-column align-items-stretch'>
					{shown?.kind === 'delete' && (
						<button type='submit' id='profileDeleteConfirm' className='btn btn-solid theme-danger'>{i18n.t('profiles.delete')}</button>
					)}
					{shown?.kind === 'rename' && (
						<button type='submit' id='profileRenameSave' className='btn btn-solid theme-primary' disabled={!nameReady}>{i18n.t('profiles.save')}</button>
					)}
					{shown?.kind === 'new' && (
						<>
							<button type='submit' id='profileCopy' className='btn btn-solid theme-primary text-truncate' disabled={!nameReady}>
								{i18n.t('profiles.copyCurrent', { name: activeName })}
							</button>
							<button type='button' id='profileFresh' className='btn btn-outline theme-accent' disabled={!nameReady} onClick={() => submit(true)}>
								{i18n.t('profiles.startFresh')}
							</button>
						</>
					)}
					<button type='button' id='profileDialogCancel' className='btn btn-link btn-sm fg-secondary' onClick={close}>{i18n.t('profiles.cancel')}</button>
				</div>
			</form>
		</dialog>
	);
};

export default profileDialog;
