import attachMenu from '../bootstrapMenu';
import { useEffect, useId, useRef, type ReactNode } from 'react';

export interface selectDropdownOption<T extends string> {
	value: T;
	label: string;
	icon?: string;
	image?: ReactNode;
	disabled?: boolean;
	hint?: string;
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
	const menuRef = useRef<HTMLDivElement>(null);
	const ownId = useId();
	const hiddenLabelId = `${ownId}-label`;
	const valueId = `${ownId}-value`;
	const nameIds = [labelId ?? (ariaLabel ? hiddenLabelId : undefined), valueId].filter(Boolean).join(' ');
	const current = options.find(option => option.value === value) ?? options[0];

	useEffect(() => {
		if (!toggleRef.current || !menuRef.current) return;
		return attachMenu(toggleRef.current, menuRef.current);
	}, []);

	return (
		<div className='position-relative'>
			<button
				ref={toggleRef}
				id={id}
				type='button'
				className='form-control form-control-sm form-control-caret text-start'
				data-bs-toggle='menu'
				aria-expanded='false'
				aria-labelledby={nameIds}
				disabled={disabled}
				title={current?.label}
			>
				{!labelId && ariaLabel && <span id={hiddenLabelId} className='visually-hidden'>{ariaLabel}</span>}
				{current?.image && <span className='me-3 flex-shrink-0'>{current.image}</span>}
				{current?.icon && <i className={`bi ${current.icon} me-3 flex-shrink-0`} aria-hidden='true' />}
				<span id={valueId} className='flex-grow-1 min-w-0 text-truncate'>{current?.label}</span>
			</button>
			<div ref={menuRef} className='menu select-dropdown-menu'>
				{options.map(option => (
					<button
						key={option.value}
						type='button'
						className={`menu-item${option.value === value ? ' selected' : ''}${option.disabled ? ' disabled' : ''}`}
						aria-current={option.value === value ? 'true' : undefined}
						aria-disabled={option.disabled ? 'true' : undefined}
						disabled={option.disabled}
						title={option.label}
						onClick={() => onChange(option.value)}
					>
						{option.image}
						{option.icon && <i className={`bi ${option.icon}`} aria-hidden='true' />}
						<span className='flex-grow-1 min-w-0 text-truncate'>{option.label}</span>
						{option.hint && <span className='flex-shrink-0 fg-secondary'>{option.hint}</span>}
						{option.value === value && <i className='bi bi-check2 menu-item-check' aria-hidden='true' />}
					</button>
				))}
			</div>
		</div>
	);
};

export default selectDropdown;
