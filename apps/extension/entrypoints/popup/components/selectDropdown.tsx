import { Dropdown } from 'bootstrap';
import { useEffect, useId, useRef } from 'react';

export interface selectDropdownOption<T extends string> {
	value: T;
	label: string;
	icon?: string;
	disabled?: boolean;
}

interface selectDropdownProps<T extends string> {
	value: T;
	options: readonly selectDropdownOption<T>[];
	onChange: (value: T) => void;
	id?: string;
	disabled?: boolean;
	// The control's name: the id of a visible label, or text for a hidden one. Either way the name
	// read out is that label followed by the current value, so "Theme, Dark" rather than one or the
	// other.
	labelId?: string;
	ariaLabel?: string;
}

// Bootstrap's Dropdown dressed as a .form-select, so it sits among the popup's other controls with
// the same chevron and size while its items can carry an icon, a tick and a disabled state.
const selectDropdown = <T extends string>({ value, options, onChange, id, disabled = false, labelId, ariaLabel }: selectDropdownProps<T>) => {
	const toggleRef = useRef<HTMLButtonElement>(null);
	const ownId = useId();
	const hiddenLabelId = `${ownId}-label`;
	const valueId = `${ownId}-value`;
	const nameIds = [labelId ?? (ariaLabel ? hiddenLabelId : undefined), valueId].filter(Boolean).join(' ');
	const current = options.find(option => option.value === value) ?? options[0];

	useEffect(() => {
		if (!toggleRef.current) return;
		const dropdown = Dropdown.getOrCreateInstance(toggleRef.current);
		return () => dropdown.dispose();
	}, []);

	return (
		<div className='dropdown'>
			<button
				ref={toggleRef}
				id={id}
				type='button'
				className='form-select form-select-sm text-start text-truncate'
				data-bs-toggle='dropdown'
				aria-expanded='false'
				aria-labelledby={nameIds}
				disabled={disabled}
			>
				{!labelId && ariaLabel && <span id={hiddenLabelId} className='visually-hidden'>{ariaLabel}</span>}
				{current?.icon && <i className={`bi ${current.icon} me-2`} aria-hidden='true' />}
				<span id={valueId}>{current?.label}</span>
			</button>
			<ul className='dropdown-menu w-100 select-dropdown-menu'>
				{options.map(option => (
					<li key={option.value}>
						<button
							type='button'
							className={`dropdown-item d-flex align-items-center gap-2${option.disabled ? ' disabled' : ''}`}
							aria-current={option.value === value ? 'true' : undefined}
							aria-disabled={option.disabled ? 'true' : undefined}
							disabled={option.disabled}
							onClick={() => onChange(option.value)}
						>
							{option.icon && <i className={`bi ${option.icon}`} aria-hidden='true' />}
							<span className='flex-grow-1 text-truncate'>{option.label}</span>
							{option.value === value && <i className='bi bi-check2 select-dropdown-check' aria-hidden='true' />}
						</button>
					</li>
				))}
			</ul>
		</div>
	);
};

export default selectDropdown;
