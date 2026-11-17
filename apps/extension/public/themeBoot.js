(() => {
	const preference = localStorage.getItem('arenaswap.theme');
	const light = preference === 'light'
		|| (preference === 'system' && matchMedia('(prefers-color-scheme: light)').matches);
	document.documentElement.dataset.bsTheme = light ? 'light' : 'dark';
})();
