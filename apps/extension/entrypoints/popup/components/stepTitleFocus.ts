// The Next or Back button that was clicked unmounts with its step, which drops keyboard focus to
// <body>. Each step's title takes focus as it mounts instead, so a screen reader announces it.
// Module-level, so React calls it once per mount rather than on every render.
const focusStepTitle = (title: HTMLElement | null) => {
	title?.focus({ preventScroll: true });
};

export default focusStepTitle;
