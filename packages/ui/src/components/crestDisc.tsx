import { useCallback, useState } from 'react';
import Crest from './crest';
import { crestBacking } from './colorUtils';
import { logoTint } from './logoTint';

interface crestDiscProps {
	logo?: string;
	abbreviation: string;
	// The disc and the crest are sized by the call site, since a 15px row and a 58px poster want
	// different boxes out of the same component.
	discClassName: string;
	crestClassName: string;
	fallback?: 'abbreviation' | 'blank';
	loading?: 'eager' | 'lazy';
}

// A crest on a white disc tinted with a colour sampled out of the crest itself. Read off the image
// the row already draws rather than out of the API, so the disc costs no extra field and no extra
// request. Null until the image lands, which leaves a plain white disc — which is already enough to
// separate a dark crest from a dark surface.
//
// The URL comes off the element rather than the prop, so the handler never has to be rebuilt and
// can never key the cache on a logo the image is no longer showing.
const CrestDisc = ({ logo, abbreviation, discClassName, crestClassName, fallback, loading }: crestDiscProps) => {
	const [tint, setTint] = useState<string | null>(null);
	const handleLoaded = useCallback((image: HTMLImageElement) => {
		setTint(logoTint(image, image.currentSrc || image.src));
	}, []);

	return (
		<span className={discClassName} style={{ background: crestBacking(tint) }}>
			<Crest
				logo={logo}
				abbreviation={abbreviation}
				className={crestClassName}
				fallback={fallback}
				loading={loading}
				crossOrigin='anonymous'
				onLoaded={handleLoaded}
			/>
		</span>
	);
};

export default CrestDisc;
