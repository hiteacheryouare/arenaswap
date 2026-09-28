import type { ReactNode } from 'react';
import SettingTooltipIcon from './settingTooltipIcon';

interface settingsGroupProps {
	title?: ReactNode;
	tooltip?: string;
	// Sits at the end of the title line, such as a sport's select-all.
	action?: ReactNode;
	// A master switch is off: everything after the first row dims.
	off?: boolean;
	// For a child that draws its own card.
	plain?: boolean;
	children: ReactNode;
}

const SettingsGroup = ({ title, tooltip, action, off = false, plain = false, children }: settingsGroupProps) => (
	<section className='st-group'>
		{(title || action) && (
			<div className='st-group-head'>
				{title && (
					<h3 className='st-group-title'>
						{title}
						{tooltip && <SettingTooltipIcon text={tooltip} />}
					</h3>
				)}
				{action}
			</div>
		)}
		{plain ? children : <div className={`st-card${off ? ' is-off' : ''}`}>{children}</div>}
	</section>
);

interface settingCopyProps {
	htmlFor?: string;
	label: ReactNode;
	tooltip?: string;
	note?: ReactNode;
}

export const SettingCopy = ({ htmlFor, label, tooltip, note }: settingCopyProps) => (
	<div className='st-copy'>
		<div className='st-label-row'>
			{htmlFor ? <label className='st-label' htmlFor={htmlFor}>{label}</label> : <span className='st-label'>{label}</span>}
			{tooltip && <SettingTooltipIcon text={tooltip} />}
		</div>
		{note && <p className='st-note'>{note}</p>}
	</div>
);

interface settingToggleProps {
	id: string;
	label: ReactNode;
	checked: boolean;
	onChange: () => void;
	disabled?: boolean;
	tooltip?: string;
	note?: ReactNode;
	nested?: boolean;
	title?: string;
	leading?: ReactNode;
}

export const SettingToggle = ({ id, label, checked, onChange, disabled, tooltip, note, nested, title, leading }: settingToggleProps) => (
	<div className={`st-control st-toggle${nested ? ' is-nested' : ''}`}>
		{leading}
		<SettingCopy htmlFor={id} label={label} tooltip={tooltip} note={note} />
		<div className='form-check form-switch m-0'>
			<input
				className='form-check-input'
				type='checkbox'
				role='switch'
				id={id}
				checked={checked}
				aria-checked={checked}
				onChange={onChange}
				disabled={disabled}
				title={title}
			/>
		</div>
	</div>
);

interface settingRangeProps {
	id: string;
	label: ReactNode;
	tooltip?: string;
	valueLabel: ReactNode;
	value: number;
	min: number;
	max: number;
	onChange: (value: number) => void;
	disabled?: boolean;
	ends?: [ReactNode, ReactNode];
	// Replaces the end labels with a mark under every step.
	ticks?: ReactNode[];
	nested?: boolean;
}

export const SettingRange = ({ id, label, tooltip, valueLabel, value, min, max, onChange, disabled, ends, ticks, nested }: settingRangeProps) => (
	<div className={`st-control st-range${nested ? ' is-nested' : ''}`}>
		<div className='st-range-head'>
			<SettingCopy htmlFor={id} label={label} tooltip={tooltip} />
			{valueLabel}
		</div>
		<input
			id={id}
			type='range'
			className='form-range'
			min={min}
			max={max}
			step={1}
			value={value}
			onChange={event => onChange(Number(event.target.value))}
			disabled={disabled}
		/>
		{ticks ? (
			<div className='st-ticks num' aria-hidden='true'>
				{ticks.map((tick, index) => (
					<span key={index} style={{ left: `${(index / (ticks.length - 1)) * 100}%` }}>{tick}</span>
				))}
			</div>
		) : ends && (
			<div className='st-range-ends num'>
				<span>{ends[0]}</span>
				<span>{ends[1]}</span>
			</div>
		)}
	</div>
);

interface settingFieldProps {
	htmlFor: string;
	label: ReactNode;
	children: ReactNode;
	notes?: ReactNode;
}

// A picker gets the row's full width under its label, so no locale's longest option is clipped.
export const SettingField = ({ htmlFor, label, children, notes }: settingFieldProps) => (
	<div className='st-control st-field'>
		<SettingCopy htmlFor={htmlFor} label={label} />
		{children}
		{notes}
	</div>
);

export default SettingsGroup;
