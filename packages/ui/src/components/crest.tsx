import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { isHex, readableInkOn } from '@arenaswap/chromatic';

type crestState = 'pending' | 'loaded' | 'failed' | 'missing';

type crestVerdict = 'pending' | 'settled';

interface crestOutcome {
	src: string;
	status: 'loaded' | 'failed';
}

interface crestProps {
	logo?: string;
	abbreviation: string;
	className?: string;
	label?: string;
	title?: string;
	fallback?: 'abbreviation' | 'blank' | 'none';
	teamColor?: string;
	icon?: string;
	loading?: 'eager' | 'lazy';
	// Without `crossOrigin` that canvas is tainted and throws on read; with it the request changes
	// shape, so a host answering without CORS headers would fail to load at all rather than just
	// fail to be sampled. Every ESPN logo host we use sends `Access-Control-Allow-Origin: *`.
	crossOrigin?: 'anonymous';
	verdict?: crestVerdict;
	onLoaded?: (image: HTMLImageElement) => void;
	onFailed?: () => void;
}

export const resolveCrestState = (logo: string | undefined, outcome: crestOutcome | null, verdict?: crestVerdict): crestState => {
	if (!logo) return 'missing';
	const state = outcome?.src === logo ? outcome.status : 'pending';
	return verdict === 'pending' && state !== 'failed' ? 'pending' : state;
};

export const crestFill = (teamColor: string | undefined, fallback: crestProps['fallback'] = 'abbreviation'): CSSProperties | undefined => {
	if (fallback === 'none') return { '--as-avatar-bg': 'transparent' } as CSSProperties;
	return isHex(teamColor)
		? { '--as-avatar-bg': teamColor, '--as-avatar-color': readableInkOn(teamColor) } as CSSProperties
		: undefined;
};

const Crest = ({
	logo,
	abbreviation,
	className,
	label,
	title,
	fallback = 'abbreviation',
	teamColor,
	icon,
	loading,
	crossOrigin,
	verdict,
	onLoaded,
	onFailed,
}: crestProps) => {
	const [outcome, setOutcome] = useState<crestOutcome | null>(null);

	// Held in a ref rather than closed over: `settle` is a ref callback, and rebuilding it whenever
	// an inline handler changes identity would make React detach and reattach the image every
	// render. Seeded from the first render, since `settle` fires at commit, before any effect.
	const onLoadedRef = useRef(onLoaded);
	useEffect(() => { onLoadedRef.current = onLoaded; }, [onLoaded]);
	const onFailedRef = useRef(onFailed);
	useEffect(() => { onFailedRef.current = onFailed; }, [onFailed]);

	// Not defensive padding: the docs site hydrates its islands on load or on intersection, by
	// which point the crest has usually fired `load` already and the event is gone, leaving the
	// placeholder up for good. `complete` alone would not do either — it is true for a broken
	// image too, so `naturalWidth` is what separates the two.
	const settle = useCallback((image: HTMLImageElement | null) => {
		if (!logo || !image?.complete) return;
		const status = image.naturalWidth > 0 ? 'loaded' : 'failed';
		setOutcome({ src: logo, status });
		if (status === 'loaded') onLoadedRef.current?.(image);
		else onFailedRef.current?.();
	}, [logo]);

	return (
		<span
			className={className ? `avatar crest ${className}` : 'avatar crest'}
			style={crestFill(teamColor, fallback)}
			data-crest-state={resolveCrestState(logo, outcome, verdict)}
			data-crest-verdict={verdict}
			role={label ? 'img' : undefined}
			aria-label={label}
			title={title}
		>
			{fallback === 'abbreviation' && (icon
				? <i className={`bi ${icon}`} aria-hidden='true' />
				: <span className='crest-initials' aria-hidden='true'>{abbreviation}</span>)}
			{logo && (
				<img
					ref={settle}
					className='avatar-img'
					src={logo}
					alt=''
					loading={loading}
					crossOrigin={crossOrigin}
					onLoad={event => {
						setOutcome({ src: logo, status: 'loaded' });
						onLoadedRef.current?.(event.currentTarget);
					}}
					onError={() => {
						setOutcome({ src: logo, status: 'failed' });
						onFailedRef.current?.();
					}}
				/>
			)}
		</span>
	);
};

export default Crest;
