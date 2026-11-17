import { useEffect, useState } from 'react';
import { bossCommandName } from '../../utils/bossMode';

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
