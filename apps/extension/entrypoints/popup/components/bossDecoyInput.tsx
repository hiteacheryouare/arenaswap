import { useState } from 'react';
import { i18n } from '#i18n';
import { normalizeDecoyUrl } from '../../../utils/bossMode';
import SettingTooltipIcon from './settingTooltipIcon';

interface bossDecoyInputProps {
	value: string;
	shortcut?: string;
	disabled: boolean;
	onChange: (url: string) => void;
}

// Saved when the field is left or Enter is pressed, not on every key: each save writes to
// storage.sync, which allows 120 writes a minute, and half an address is not one worth keeping.
const bossDecoyInput = ({ value, shortcut, disabled, onChange }: bossDecoyInputProps) => {
	const [draft, setDraft] = useState<string | null>(null);
	const [invalid, setInvalid] = useState(false);

	const commit = () => {
		const typed = (draft ?? value).trim();
		if (typed === '') {
			setInvalid(false);
			setDraft(null);
			if (value !== '') onChange('');
			return;
		}
		const url = normalizeDecoyUrl(typed);
		if (url === null) {
			setInvalid(true);
			return;
		}
		setInvalid(false);
		setDraft(null);
		if (url !== value) onChange(url);
	};

	return (
		<div>
			<div className='d-flex align-items-center gap-1 mb-1'>
				<label className='text-body-secondary setting-toggle-label' htmlFor='bossDecoyInput'>
					<i className='bi bi-incognito me-1 text-primary' />{i18n.t('setup.bossDecoy')}
				</label>
				<SettingTooltipIcon text={i18n.t('setup.bossDecoyExplainer')} label={i18n.t('setup.bossDecoy')} />
			</div>
			<input
				id='bossDecoyInput'
				type='text'
				inputMode='url'
				autoComplete='off'
				spellCheck={false}
				className={`form-control form-control-sm${invalid ? ' is-invalid' : ''}`}
				placeholder='docs.google.com/spreadsheets/…'
				value={draft ?? value}
				disabled={disabled}
				aria-invalid={invalid}
				aria-describedby={invalid ? 'bossDecoyInvalid' : undefined}
				onChange={e => {
					setDraft(e.target.value);
					setInvalid(false);
				}}
				onBlur={commit}
				onKeyDown={e => {
					if (e.key === 'Enter') commit();
				}}
			/>
			{invalid && <div id='bossDecoyInvalid' className='invalid-feedback d-block'>{i18n.t('setup.bossDecoyInvalid')}</div>}
			{shortcut && <div className='setting-explainer mt-1'>{i18n.t('setup.bossShortcut', { shortcut })}</div>}
		</div>
	);
};

export default bossDecoyInput;
