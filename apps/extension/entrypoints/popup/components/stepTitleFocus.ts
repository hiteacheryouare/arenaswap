const focusStepTitle = (title: HTMLElement | null) => {
	title?.focus({ preventScroll: true });
};

export default focusStepTitle;
