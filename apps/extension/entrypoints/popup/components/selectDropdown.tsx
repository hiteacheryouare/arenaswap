import { Dropdown } from 'bootstrap';
import { useEffect, useRef } from 'react';

export interface selectDropdownOption<T extends string> {
	value: T;
	label: string;
	icon?: string;
	// Quiet text at the end of the item, such as which tab a title belongs to.
	hint?: string;
	disabled?: boolean;
}

interface selectDropdownProps<T extends string> {
	value: T;
	options: readonly selectDropdownOption<T>[];
	onChange: (value: T) => void;
	id?: string;
	disabled?: boolean;
	ariaLabel?: string;
	// 'field' sits among the other form controls as a .form-select. 'inline' is a line of text with a
	// chevron, for a picker living inside a game on the list.
	variant?: 'field' | 'inline';
	// What the closed control says, when that isn't the selected option's own label.
	toggleLabel?: string;
	className?: string;
}

// Bootstrap's Dropdown dressed as a .form-select, so it sits among the popup's other controls with
// the same chevron and size while its items can carry an icon, a tick and a disabled state.
const selectDropdown = <T extends string>({
	value,
	options,
	onChange,
	id,
	disabled = false,
	ariaLabel,
	variant = 'field',
	toggleLabel,
	className,
}: selectDropdownProps<T>) => {
	const toggleRef = useRef<HTMLButtonElement>(null);
	const current = options.find(option => option.value === value) ?? options[0];

	useEffect(() => {
		if (!toggleRef.current) return;
		const dropdown = Dropdown.getOrCreateInstance(toggleRef.current, { popperConfig: { strategy: 'fixed' } });
		return () => dropdown.dispose();
	}, []);

	const toggleClass = variant === 'inline'
		? 'as-picker'
		: 'form-select select-field text-start';

	return (
		<div className={`dropdown${className ? ` ${className}` : ''}`}>
			<button
				ref={toggleRef}
				id={id}
				type='button'
				className={toggleClass}
				data-bs-toggle='dropdown'
				aria-expanded='false'
				aria-label={ariaLabel}
				disabled={disabled}
			>
				{variant === 'field' && current?.icon && <i className={`bi ${current.icon} select-field-icon`} aria-hidden='true' />}
				{variant === 'inline' ? <span className='as-picker-label'>{toggleLabel ?? current?.label}</span> : (toggleLabel ?? current?.label)}
				{variant === 'inline' && <i className='bi bi-chevron-down as-picker-chevron' aria-hidden='true' />}
			</button>
			<ul className={`dropdown-menu select-dropdown-menu${variant === 'field' ? ' w-100' : ''}`}>
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
							{option.hint && <span className='select-dropdown-hint'>{option.hint}</span>}
							{option.value === value && <i className='bi bi-check2 select-dropdown-check' aria-hidden='true' />}
						</button>
					</li>
				))}
			</ul>
		</div>
	);
};

export default selectDropdown;
