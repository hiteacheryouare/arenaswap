import Crest from '@arenaswap/ui/src/components/crest';

// Internal pages hand over chrome:// or about: icon URLs the popup is not allowed to load, so a
// favicon that fails falls back to the same globe as a tab that has none.
const tabFavicon = ({ url }) => (
	<Crest logo={url || undefined} abbreviation='' icon='bi-globe2' className='tab-favicon' />
);

export default tabFavicon;
