import { createStereo, type Stereo } from './buffers';
import { onePoleCoefficient } from './filters';

export interface DelayOptions {
	time: number;
	feedback: number;
	lowpass: number;
	highpass: number;
}

// Ping-pong: the dry signal enters on the left only and each repeat crosses sides, getting darker and
// thinner on every pass through the band-limit in the feedback path.
const renderPingPong = (input: Stereo, sampleRate: number, options: DelayOptions): Stereo => {
	const length = input.left.length;
	const output = createStereo(length);
	const delay = Math.max(1, Math.round(options.time * sampleRate));
	const lines = [new Float32Array(delay), new Float32Array(delay)];
	const lowpass = onePoleCoefficient(options.lowpass, sampleRate);
	const highpass = onePoleCoefficient(options.highpass, sampleRate);
	const lowStates = [0, 0];
	const rumbleStates = [0, 0];
	const band = (side: number, value: number): number => {
		lowStates[side] = value + (lowStates[side] - value) * lowpass;
		rumbleStates[side] = lowStates[side] + (rumbleStates[side] - lowStates[side]) * highpass;
		return lowStates[side] - rumbleStates[side];
	};
	let index = 0;
	for (let n = 0; n < length; n++) {
		const fromLeft = lines[0][index];
		const fromRight = lines[1][index];
		output.left[n] = fromLeft;
		output.right[n] = fromRight;
		lines[0][index] = (input.left[n] + input.right[n]) * 0.5 + band(0, fromRight) * options.feedback;
		lines[1][index] = band(1, fromLeft) * options.feedback;
		index = (index + 1) % delay;
	}
	return output;
};

export default renderPingPong;
