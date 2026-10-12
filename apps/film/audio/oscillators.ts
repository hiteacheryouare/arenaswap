export const twoPi = Math.PI * 2;

export const wrapPhase = (phase: number): number => phase - Math.floor(phase);

// PolyBLEP residual: rounds off the discontinuity of a naive saw or square so it stops aliasing.
export const polyBlep = (phase: number, increment: number): number => {
	if (phase < increment) {
		const t = phase / increment;
		return t + t - t * t - 1;
	}
	if (phase > 1 - increment) {
		const t = (phase - 1) / increment;
		return t * t + t + t + 1;
	}
	return 0;
};

export const sawSample = (phase: number, increment: number): number => 2 * phase - 1 - polyBlep(phase, increment);

export const squareSample = (phase: number, increment: number): number => (
	(phase < 0.5 ? 1 : -1) + polyBlep(phase, increment) - polyBlep(wrapPhase(phase + 0.5), increment)
);

export interface MetalBank {
	phases: Float64Array;
	increments: Float64Array;
}

// Six detuned squares at inharmonic ratios: the classic drum-machine recipe for cymbal metal.
export const createMetalBank = (frequencies: number[], sampleRate: number, phases: number[]): MetalBank => ({
	phases: Float64Array.from(phases),
	increments: Float64Array.from(frequencies, frequency => frequency / sampleRate),
});

export const tickMetalBank = (bank: MetalBank): number => {
	let sum = 0;
	for (let i = 0; i < bank.phases.length; i++) {
		sum += squareSample(bank.phases[i], bank.increments[i]);
		bank.phases[i] = wrapPhase(bank.phases[i] + bank.increments[i]);
	}
	return sum / bank.phases.length;
};
