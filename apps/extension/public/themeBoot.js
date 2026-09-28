// A plain blocking script, so a light page never opens dark for a frame. Mirrors utils/theme.ts,
// and tests/theme.test.ts holds the two to the same answer.
(() => {
	const preference = localStorage.getItem('arenaswap.theme');
	const light = preference === 'light'
		|| (preference === 'system' && matchMedia('(prefers-color-scheme: light)').matches);
	document.documentElement.dataset.bsTheme = light ? 'light' : 'dark';
})();
