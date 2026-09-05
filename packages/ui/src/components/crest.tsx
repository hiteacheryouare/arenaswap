import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

type crestState = 'pending' | 'loaded' | 'failed' | 'missing';

interface crestOutcome {
	src: string;
	status: 'loaded' | 'failed';
}

interface crestProps {
	logo?: string;
	// Never sliced here: the game card wants three characters, the detail poster wants the whole
	// abbreviation, and a league mark wants its initials.
	abbreviation: string;
	className?: string;
	// Only for the handful of crests that are the sole thing naming what they depict. Everywhere
	// else the team or league name is already visible text beside the crest, and a second copy of
	// it is noise to a screen reader.
	label?: string;
	title?: string;
	fallback?: 'abbreviation' | 'blank' | 'none';
	fallbackStyle?: CSSProperties;
	loading?: 'eager' | 'lazy';
	// Both opt-in, and only for a caller that reads the crest's own pixels back off a canvas.
	// Without `crossOrigin` that canvas is tainted and throws on read; with it the request changes
	// shape, so a host answering without CORS headers would fail to load at all rather than just
	// fail to be sampled. Every ESPN logo host we use sends `Access-Control-Allow-Origin: *`.
	crossOrigin?: 'anonymous';
	onLoaded?: (image: HTMLImageElement) => void;
}

// Keyed on the URL rather than on a boolean, so a crest that fails once retries when the URL
// changes. Both halves of that happen in practice: game cards are reused across polls, and a
// league mark starts on a hardcoded URL and switches to ESPN's once the live list arrives.
export const resolveCrestState = (logo: string | undefined, outcome: crestOutcome | null): crestState => {
	if (!logo) return 'missing';
	return outcome?.src === logo ? outcome.status : 'pending';
};

// The placeholder and the image share one box, and CSS picks between them off `data-crest-state`.
// Layering rather than swapping means a crest already in the cache paints in the first frame, and
// it lets the one non-React caller (`TeamStrip.astro`) drive the same stylesheet by hand.
const Crest = ({
	logo,
	abbreviation,
	className,
	label,
	title,
	fallback = 'abbreviation',
	fallbackStyle,
	loading,
	crossOrigin,
	onLoaded,
}: crestProps) => {
	const [outcome, setOutcome] = useState<crestOutcome | null>(null);

	// Held in a ref rather than closed over: `settle` is a ref callback, and rebuilding it whenever
	// an inline handler changes identity would make React detach and reattach the image every
	// render. Seeded from the first render, since `settle` fires at commit, before any effect.
	const onLoadedRef = useRef(onLoaded);
	useEffect(() => { onLoadedRef.current = onLoaded; }, [onLoaded]);

	// Not defensive padding: the docs site hydrates its islands on load or on intersection, by
	// which point the crest has usually fired `load` already and the event is gone, leaving the
	// placeholder up for good. `complete` alone would not do either — it is true for a broken
	// image too, so `naturalWidth` is what separates the two.
	const settle = useCallback((image: HTMLImageElement | null) => {
		if (!logo || !image?.complete) return;
		const status = image.naturalWidth > 0 ? 'loaded' : 'failed';
		setOutcome({ src: logo, status });
		if (status === 'loaded') onLoadedRef.current?.(image);
	}, [logo]);

	return (
		<span
			className={className ? `crest ${className}` : 'crest'}
			data-crest-state={resolveCrestState(logo, outcome)}
			role={label ? 'img' : undefined}
			aria-label={label}
			title={title}
		>
			{/* Before the image, because both layers are absolutely positioned and paint order is
			    DOM order — reorder these two and the placeholder covers the crest. */}
			{fallback !== 'none' && (
				<span className='crest-fallback' style={fallbackStyle} aria-hidden='true'>
					{fallback === 'abbreviation' ? abbreviation : null}
				</span>
			)}
			{logo && (
				<img
					ref={settle}
					src={logo}
					alt=''
					loading={loading}
					crossOrigin={crossOrigin}
					onLoad={event => {
						setOutcome({ src: logo, status: 'loaded' });
						onLoadedRef.current?.(event.currentTarget);
					}}
					onError={() => setOutcome({ src: logo, status: 'failed' })}
				/>
			)}
		</span>
	);
};

export default Crest;
