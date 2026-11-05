import { useEffect, useState } from 'react';

// True from the first moment this tab is on screen. Chrome holds back a never-shown tab's video, so
// no box can be expected to play before then.
export default (): boolean => {
	const [shown, setShown] = useState(() => document.visibilityState === 'visible');
	useEffect(() => {
		if (shown) return;
		const onChange = () => {
			if (document.visibilityState === 'visible') setShown(true);
		};
		document.addEventListener('visibilitychange', onChange);
		return () => document.removeEventListener('visibilitychange', onChange);
	}, [shown]);
	return shown;
};
