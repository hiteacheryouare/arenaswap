import { Range } from 'bootstrap';
import { useLayoutEffect, useRef, type InputHTMLAttributes, type ReactNode } from 'react';

interface formRangeProps extends InputHTMLAttributes<HTMLInputElement> {
	// A <datalist> the input names with `list`; Range draws a tick under the track for each option.
	children?: ReactNode;
}

// Bootstrap's Range fills the track up to the thumb. It follows the input's own events, so a value
// that arrives through props is handed to it here. Layout effects, so the fill is in place before
// the first paint rather than a frame after it.
const formRange = ({ className, children, ...input }: formRangeProps) => {
	const wrapperRef = useRef<HTMLDivElement>(null);
	const rangeRef = useRef<Range | null>(null);

	useLayoutEffect(() => {
		const range = Range.getOrCreateInstance(wrapperRef.current!);
		rangeRef.current = range;
		return () => {
			range.dispose();
			rangeRef.current = null;
		};
	}, []);

	useLayoutEffect(() => {
		rangeRef.current?.update();
	}, [input.value, input.min, input.max]);

	return (
		<div ref={wrapperRef} className='form-range'>
			<input type='range' className={className ? `form-range-input ${className}` : 'form-range-input'} {...input} />
			{children}
		</div>
	);
};

export default formRange;
