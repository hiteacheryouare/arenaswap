export interface Stereo {
	left: Float32Array;
	right: Float32Array;
}

export const createStereo = (length: number): Stereo => ({
	left: new Float32Array(length),
	right: new Float32Array(length),
});

// Equal-power pan, scaled so a centred source keeps unity gain on both sides.
export const panGains = (pan: number): [number, number] => {
	const angle = (Math.min(1, Math.max(-1, pan)) + 1) * Math.PI / 4;
	return [Math.cos(angle) * Math.SQRT2, Math.sin(angle) * Math.SQRT2];
};

export const addMono = (target: Stereo, source: Float32Array, offset: number, gain: number, pan = 0): void => {
	const [gainLeft, gainRight] = panGains(pan);
	const begin = Math.max(0, -offset);
	const end = Math.min(source.length, target.left.length - offset);
	for (let i = begin; i < end; i++) {
		const sample = source[i] * gain;
		target.left[offset + i] += sample * gainLeft;
		target.right[offset + i] += sample * gainRight;
	}
};

export const addStereo = (target: Stereo, source: Stereo, offset: number, gain: number, pan = 0): void => {
	const [gainLeft, gainRight] = panGains(pan);
	const begin = Math.max(0, -offset);
	const end = Math.min(source.left.length, target.left.length - offset);
	for (let i = begin; i < end; i++) {
		target.left[offset + i] += source.left[i] * gain * gainLeft;
		target.right[offset + i] += source.right[i] * gain * gainRight;
	}
};

export const sumStereo = (sources: Stereo[], length: number): Stereo => {
	const mix = createStereo(length);
	for (const source of sources) addStereo(mix, source, 0, 1);
	return mix;
};

export const scaleStereo = (target: Stereo, gain: number): void => {
	for (let i = 0; i < target.left.length; i++) {
		target.left[i] *= gain;
		target.right[i] *= gain;
	}
};

export const applyGainCurve = (target: Stereo, curve: Float32Array): void => {
	for (let i = 0; i < target.left.length; i++) {
		target.left[i] *= curve[i];
		target.right[i] *= curve[i];
	}
};
