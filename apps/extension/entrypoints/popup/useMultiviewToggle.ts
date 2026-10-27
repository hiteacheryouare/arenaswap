import { useEffect, useMemo, useState } from 'react';
import { isMultiviewBuild, multiviewPermissions } from '../../utils/multiview';

// Multiview counts as on only while the permission it needs is still granted, since the browser's
// own settings can take it back at any time.
export default (enabled: boolean, setEnabled: (enabled: boolean) => void) => {
	const available = useMemo(() => isMultiviewBuild(browser.runtime.getManifest()), []);
	const [granted, setGranted] = useState(false);

	useEffect(() => {
		if (!available) return;
		browser.permissions.contains(multiviewPermissions).then(setGranted).catch(() => setGranted(false));
	}, [available]);

	const on = available && enabled && granted;

	const toggle = () => {
		if (on) {
			setGranted(false);
			setEnabled(false);
			void browser.permissions.remove(multiviewPermissions).catch(() => false);
			return;
		}
		// Asked inside the click, before anything is awaited, or the browser refuses to show the prompt.
		// The setting is saved first so a popup that closes behind the prompt still has it.
		const request = browser.permissions.request(multiviewPermissions);
		setEnabled(true);
		request.then(allowed => {
			setGranted(allowed);
			if (!allowed) setEnabled(false);
		}).catch(() => setEnabled(false));
	};

	return { available, on, toggle };
};
