(() => {
	const preference = localStorage.getItem('arenaswap.theme');
	const light = preference === 'light'
		|| (preference !== 'dark' && matchMedia('(prefers-color-scheme: light)').matches);
	document.documentElement.dataset.bsTheme = light ? 'light' : 'dark';
	document.querySelector('meta[name="theme-color"]')?.setAttribute('content', light ? '#ffffff' : '#000000');
})();
