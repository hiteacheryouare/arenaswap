import { useEffect, useState } from 'react';
import { bossCommandName } from '../../utils/bossMode';

// Read from the browser rather than assumed: a user can rebind or clear the shortcut, and another
// extension can hold it first. An empty answer means nothing is bound, so there is nothing to show.
const useBossShortcut = (): string | undefined => {
	const [shortcut, setShortcut] = useState<string>();

	useEffect(() => {
		let cancelled = false;
		browser.commands.getAll().then(commands => {
			if (!cancelled) setShortcut(commands.find(command => command.name === bossCommandName)?.shortcut || undefined);
		}).catch(() => {});
		return () => { cancelled = true; };
	}, []);

	return shortcut;
};

export default useBossShortcut;
