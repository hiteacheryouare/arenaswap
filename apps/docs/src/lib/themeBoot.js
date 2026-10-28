// Inlined into the head as a plain blocking script, so a light page never paints dark for a frame.
// Nothing stored means the visitor never chose, and the OS decides.
(() => {
	const preference = localStorage.getItem('arenaswap.theme');
	const light = preference === 'light'
		|| (preference !== 'dark' && matchMedia('(prefers-color-scheme: light)').matches);
	document.documentElement.dataset.bsTheme = light ? 'light' : 'dark';
	document.querySelector('meta[name="theme-color"]')?.setAttribute('content', light ? '#ffffff' : '#000000');
})();
