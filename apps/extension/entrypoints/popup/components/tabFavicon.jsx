import { useState } from 'react';

// Internal pages hand over chrome:// or about: icon URLs the popup is not allowed to load, so a
// favicon that fails falls back to the same globe as a tab that has none.
const tabFavicon = ({ url }) => {
	const [failedUrl, setFailedUrl] = useState();

	if (!url || url === failedUrl) return <i className='bi bi-globe2 tab-favicon' aria-hidden='true' />;
	return <img src={url} alt='' className='tab-favicon' onError={() => setFailedUrl(url)} />;
};

export default tabFavicon;
