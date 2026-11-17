import { useState } from 'react';
import { resolveConferenceCrest } from '@arenaswap/core/constants';
import Crest from './crest';
import { cachedCrestReadsOn, cachedLogoTint, crestBacking, crestReadsOn, logoTint } from '@arenaswap/chromatic';
import useDocumentTheme from './useDocumentTheme';

interface conferenceCrestProps {
	slug?: string;
	abbreviation: string;
	surfaces: { dark: string; light: string };
	discClassName: string;
	crestClassName: string;
}

const ConferenceCrest = ({ slug, abbreviation, surfaces, discClassName, crestClassName }: conferenceCrestProps) => {
	const theme = useDocumentTheme();
	const background = surfaces[theme];
	const crest = resolveConferenceCrest(slug, theme);
	const [failedSrc, setFailedSrc] = useState<string>();
	const usingFallback = crest.src !== undefined && failedSrc === crest.src;
	const src = usingFallback ? crest.fallbackSrc : crest.src;
	const needsCheck = Boolean(src) && !(crest.drawnForDark && !usingFallback);

	const [, setMeasuredPair] = useState<string>();
	const readable = src && needsCheck ? cachedCrestReadsOn(src, background) : true;
	const useDisc = readable === false;
	const tint = useDisc && src ? cachedLogoTint(src) : null;

	const measure = (image: HTMLImageElement) => {
		if (!src || !needsCheck) return;
		if (!crestReadsOn(image, src, background)) logoTint(image, src);
		setMeasuredPair(`${src}|${background}`);
	};

	const handleFailed = () => {
		if (crest.src && crest.fallbackSrc) setFailedSrc(crest.src);
	};

	return (
		<span className={`${discClassName}${useDisc ? '' : ' is-bare'}`} style={useDisc ? { background: crestBacking(tint) } : undefined}>
			<Crest
				key={`${src}|${background}`}
				logo={src}
				abbreviation={abbreviation}
				className={crestClassName}
				loading='lazy'
				crossOrigin='anonymous'
				onLoaded={measure}
				onFailed={handleFailed}
			/>
		</span>
	);
};

export default ConferenceCrest;
