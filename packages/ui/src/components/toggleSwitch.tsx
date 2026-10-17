import type { InputHTMLAttributes } from 'react';

// `switch` is the attribute Safari reads to draw and announce a checkbox as a switch. React's typings
// do not list it yet, and a spread is not checked against them.
const switchAttribute = { switch: '' };

// Bootstrap's switch: the checkbox sits inside the track it draws. `className` lands on the track,
// every other prop on the checkbox.
const toggleSwitch = ({ className, ...input }: InputHTMLAttributes<HTMLInputElement>) => (
	<div className={className ? `switch ${className}` : 'switch'}>
		<input type='checkbox' role='switch' aria-checked={input.checked} {...switchAttribute} {...input} />
	</div>
);

export default toggleSwitch;
