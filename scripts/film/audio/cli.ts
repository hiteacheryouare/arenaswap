// Renders the ad-film soundtrack to WAV.
//
//   npx rolldown scripts/film/audio/cli.ts --platform=node --file=scripts/film/audio/cli.cjs --format=cjs --log-level=silent
//   node scripts/film/audio/cli.cjs --demo 30 --out temporary/adfilm/audioTests/demo30.wav --report
//   node scripts/film/audio/cli.cjs --plan plan.json --out film.wav [--bits 16] [--seed 7]
//   node scripts/film/audio/cli.cjs --sfx dot --out temporary/adfilm/audioTests/sfx/dot.wav
//
// --report prints duration, loudness, true peak, DC, click and tail checks; --arc prints the loudness
// of every half bar; --stems prints each stem's share of the raw mix.
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import analyzeAudio, { loudnessArc, transientWindows, type TimeWindow } from './analyze';
import arrange, { demoPlans } from './arrangement';
import { sumStereo } from './buffers';
import { gainToDb, integratedLoudness, samplePeak } from './loudness';
import renderStems, { stemNames } from './mixer';
import renderSfxReel, { reelKinds } from './reel';
import renderScore, { type Cue, type RenderedAudio, type ScorePlan } from './score';
import { writeWav } from './wav';

const { values } = parseArgs({
	options: {
		plan: { type: 'string' },
		demo: { type: 'string' },
		sfx: { type: 'string' },
		out: { type: 'string' },
		bits: { type: 'string', default: '24' },
		seed: { type: 'string' },
		report: { type: 'boolean', default: false },
		stems: { type: 'boolean', default: false },
		arc: { type: 'boolean', default: false },
	},
});

const fail = (message: string): never => {
	console.error(`${message}\nUsage: cli.cjs (--demo 15|30|60 | --plan file.json | --sfx ${reelKinds.join('|')}) --out file.wav [--bits 16|24] [--seed n] [--report] [--arc] [--stems]`);
	process.exit(1);
};

const decibels = (value: number): string => `${value.toFixed(2)} dB`;

const printReport = (audio: RenderedAudio, windows: TimeWindow[]): void => {
	const report = analyzeAudio(audio, windows);
	const clickTimes = report.clicksOutside.slice(0, 8).map(time => time.toFixed(3)).join(', ');
	console.log(`  duration      ${report.samples} samples = ${report.seconds.toFixed(6)} s`);
	console.log(`  loudness      ${report.integratedLufs.toFixed(2)} LUFS integrated`);
	console.log(`  true peak     ${decibels(report.truePeakDb)} (sample peak ${decibels(report.samplePeakDb)})`);
	console.log(`  DC offset     L ${report.dcOffset[0].toExponential(2)}  R ${report.dcOffset[1].toExponential(2)}`);
	console.log(`  max jump      ${report.maxJump.toFixed(4)} at ${report.maxJumpAt.toFixed(3)} s (outside drum and effect transients)`);
	console.log(`  clicks        ${report.clicksOutside.length} outside transients${clickTimes ? ` at ${clickTimes} s` : ''}; ${report.clicksInside} inside`);
	console.log(`  last 50 ms    peak ${decibels(report.tailPeakDb)}, final sample L ${report.lastSample[0]} R ${report.lastSample[1]}`);
};

const printStems = (plan: ScorePlan): void => {
	const arrangement = arrange(plan);
	const stems = renderStems(arrangement, 48000, plan.seed ?? 1);
	const length = stems.drums.left.length;
	const whole = integratedLoudness(sumStereo(stemNames.map(name => stems[name]), length), 48000);
	console.log(`raw mix ${whole.toFixed(2)} LUFS`);
	for (const name of stemNames) {
		const loudness = integratedLoudness(stems[name], 48000);
		console.log(`  ${name.padEnd(7)} ${loudness.toFixed(2).padStart(7)} LUFS  ${(loudness - whole).toFixed(2).padStart(7)} LU  peak ${decibels(gainToDb(samplePeak(stems[name])))}`);
	}
};

const out = values.out ?? fail('Missing --out.');
const bits = values.bits === '16' ? 16 : 24;
const started = performance.now();

if (values.sfx) {
	const kind = values.sfx as Cue['kind'];
	if (!reelKinds.includes(kind)) fail(`Unknown sound effect "${values.sfx}".`);
	const audio = renderSfxReel(kind);
	writeWav(out, audio, bits);
	console.log(`${out}: ${kind} reel, ${audio.left.length} samples, ${((performance.now() - started) / 1000).toFixed(2)} s`);
	if (values.report) printReport(audio, []);
} else {
	const demo = values.demo as keyof typeof demoPlans | undefined;
	const loaded: ScorePlan = values.plan
		? JSON.parse(readFileSync(values.plan, 'utf8'))
		: demo && demo in demoPlans ? demoPlans[demo] : fail('Pass --plan or --demo 15|30|60.');
	const plan: ScorePlan = values.seed === undefined ? loaded : { ...loaded, seed: Number(values.seed) };
	const audio = renderScore(plan);
	const seconds = (performance.now() - started) / 1000;
	writeWav(out, audio, bits);
	const expected = Math.round(plan.bars * 4 * 60 / plan.bpm * audio.sampleRate);
	console.log(`${out}: ${audio.left.length} samples (expected ${expected}), rendered in ${seconds.toFixed(2)} s`);
	if (values.report) printReport(audio, transientWindows(arrange(plan)));
	if (values.arc) {
		for (const point of loudnessArc(audio, arrange(plan))) {
			const lufs = Number.isFinite(point.lufs) ? point.lufs : -70;
			console.log(`  ${point.time.toFixed(2).padStart(6)} s  bar ${String(point.bar).padStart(2)}  ${point.part.padEnd(6)} ${lufs.toFixed(1).padStart(6)} LUFS ${'#'.repeat(Math.max(0, Math.round(lufs + 40)))}`);
		}
	}
	if (values.stems) printStems(plan);
}
