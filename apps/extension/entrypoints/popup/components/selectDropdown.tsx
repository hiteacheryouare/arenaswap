import { Menu } from 'bootstrap';
import { useEffect, useId, useRef, type ReactNode } from 'react';

export interface selectDropdownOption<T extends string> {
	value: T;
	label: string;
	icon?: string;
	image?: ReactNode;
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

// Bootstrap's Menu opened off a form control with the select caret, so it sits among the popup's other
// controls with the same chevron and size while its items can carry an icon, a tick and a disabled
// state.
const selectDropdown = <T extends string>({ value, options, onChange, id, disabled = false, labelId, ariaLabel }: selectDropdownProps<T>) => {
	const toggleRef = useRef<HTMLButtonElement>(null);
	const ownId = useId();
	const hiddenLabelId = `${ownId}-label`;
	const valueId = `${ownId}-value`;
	const nameIds = [labelId ?? (ariaLabel ? hiddenLabelId : undefined), valueId].filter(Boolean).join(' ');
	const current = options.find(option => option.value === value) ?? options[0];

	useEffect(() => {
		if (!toggleRef.current) return;
		const menu = Menu.getOrCreateInstance(toggleRef.current);
		return () => menu.dispose();
	}, []);

	return (
		<div className='position-relative'>
			<button
				ref={toggleRef}
				id={id}
				type='button'
				className='form-control form-control-sm form-control-caret text-start text-truncate'
				data-bs-toggle='menu'
				aria-expanded='false'
				aria-labelledby={nameIds}
				disabled={disabled}
			>
				{!labelId && ariaLabel && <span id={hiddenLabelId} className='visually-hidden'>{ariaLabel}</span>}
				{current?.image && <span className='me-3'>{current.image}</span>}
				{current?.icon && <i className={`bi ${current.icon} me-3`} aria-hidden='true' />}
				<span id={valueId}>{current?.label}</span>
			</button>
			<div className='menu w-100 select-dropdown-menu'>
				{options.map(option => (
					<button
						key={option.value}
						type='button'
						className={`menu-item${option.value === value ? ' selected' : ''}${option.disabled ? ' disabled' : ''}`}
						aria-current={option.value === value ? 'true' : undefined}
						aria-disabled={option.disabled ? 'true' : undefined}
						disabled={option.disabled}
						onClick={() => onChange(option.value)}
					>
						{option.image}
						{option.icon && <i className={`bi ${option.icon}`} aria-hidden='true' />}
						<span className='flex-grow-1 text-truncate'>{option.label}</span>
						{option.value === value && <i className='bi bi-check2 menu-item-check' aria-hidden='true' />}
					</button>
				))}
			</div>
		</div>
	);
};

export default selectDropdown;
