import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
// Type-only, so it is erased at build and does not drag Bootstrap into this module's graph.
import type { Tooltip } from 'bootstrap';

interface hoverTooltipProps {
	text: string;
	className?: string;
	children: ReactNode;
}

// Bootstrap's JavaScript belongs to the consuming app, not to this package — see the note at the
// top of _bootstrap.scss — so it is pulled in on demand inside the effect. That keeps it out of any
// bundle that renders a card but never a tooltip, which is every page on the marketing site.
//
// `title` stays on the element as well as being passed as an option, so that if the import never
// resolves the browser's own tooltip still does the job.
const HoverTooltip = ({ text, className, children }: hoverTooltipProps) => {
	const ref = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		const element = ref.current;
		if (!element) return;
		let instance: Tooltip | null = null;
		let unmounted = false;

		void import('bootstrap').then(({ Tooltip }) => {
			if (unmounted) return;
			// The tip is parented to <body>, so it outlives this subtree and has to be torn down by
			// hand. Without `animation: false` that teardown is deferred behind a CSS transition and
			// lands on an element React has already removed, which throws from inside Popper.
			instance = new Tooltip(element, { title: text, placement: 'auto', trigger: 'hover focus', container: 'body', animation: false });
		});

		return () => {
			unmounted = true;
			instance?.hide();
			instance?.dispose();
		};
	}, [text]);

	// A button rather than a span so it is focusable without a hand-placed tabIndex, and because the
	// card's own click handler already skips targets inside a `button` — see isInteractiveCardTarget.
	return (
		<button ref={ref} type='button' className={className} title={text}>
			{children}
		</button>
	);
};

export default HoverTooltip;
