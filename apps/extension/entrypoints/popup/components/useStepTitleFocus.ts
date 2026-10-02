import { useEffect, useRef } from 'react';

// The Next or Back button that was clicked unmounts with its step, which drops keyboard focus to
// <body>. Each new step hands focus to its title instead, so a screen reader announces it.
const useStepTitleFocus = (step: unknown) => {
	const ref = useRef<HTMLDivElement>(null);
	useEffect(() => {
		ref.current?.querySelector<HTMLElement>('[data-step-title]')?.focus({ preventScroll: true });
	}, [step]);
	return ref;
};

export default useStepTitleFocus;
