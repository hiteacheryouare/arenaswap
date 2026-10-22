import { Menu } from 'bootstrap';
import { useEffect, useRef } from 'react';
import { i18n } from '#i18n';
import type { profileEntry } from '../../../utils/profiles';

interface profileRowProps {
	profile: profileEntry;
	active: boolean;
	disabled: boolean;
	onSwitch: () => void;
	onRename: () => void;
	onExport: () => void;
	onDelete: () => void;
}

const profileRow = ({ profile, active, disabled, onSwitch, onRename, onExport, onDelete }: profileRowProps) => {
	const toggleRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		if (!toggleRef.current) return;
		const menu = Menu.getOrCreateInstance(toggleRef.current, { placement: 'bottom-end' });
		return () => menu.dispose();
	}, []);

	return (
		<div className='profile-row' data-active={active}>
			<button
				type='button'
				id={`profileSwitch-${profile.id}`}
				className='profile-row-switch'
				aria-current={active ? 'true' : undefined}
				disabled={disabled}
				onClick={active ? undefined : onSwitch}
			>
				<i className={`bi ${active ? 'bi-check2' : 'bi-person'} profile-row-icon`} aria-hidden='true' />
				<span className='profile-row-name'>{profile.name}</span>
				{active && <span className='visually-hidden'>{i18n.t('profiles.inUse')}</span>}
			</button>
			<div className='position-relative'>
				<button
					ref={toggleRef}
					type='button'
					id={`profileMore-${profile.id}`}
					className='btn btn-sm btn-link profile-row-more'
					data-bs-toggle='menu'
					aria-expanded='false'
					aria-label={i18n.t('profiles.more', { name: profile.name })}
					disabled={disabled}
				>
					<i className='bi bi-three-dots' aria-hidden='true' />
				</button>
				<div className='menu'>
					<button type='button' className='menu-item' onClick={onRename}>
						<i className='bi bi-pencil' aria-hidden='true' />
						{i18n.t('profiles.rename')}
					</button>
					<button type='button' className='menu-item' onClick={onExport}>
						<i className='bi bi-download' aria-hidden='true' />
						{i18n.t('profiles.export')}
					</button>
					{!active && (
						<button type='button' className='menu-item fg-danger' onClick={onDelete}>
							<i className='bi bi-trash3' aria-hidden='true' />
							{i18n.t('profiles.delete')}
						</button>
					)}
				</div>
			</div>
		</div>
	);
};

export default profileRow;
