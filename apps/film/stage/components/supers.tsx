import type { CSSProperties } from 'react';
import type { Format, Super } from '../cuts/cutTypes';
import { easeIn, easeSignature, progress, spring } from '../timing';

const enterSeconds = 0.55;
const exitSeconds = 0.3;
const lineStagger = 0.08;
const wordStagger = 0.26;
const wordDrop = 0.7;

// The last character is the sentence's full stop in whatever script it is written in, and it is
// always drawn in the dot's orange: every line of copy ends on the motif.
const sentenceEnd = /[.。．!?！？]$/u;

export const splitEnding = (text: string): [string, string] => (sentenceEnd.test(text) ? [text.slice(0, -1), text.slice(-1)] : [text, '']);

// Words as the locale breaks them, so a line in Japanese or Chinese drops in phrase by phrase too.
const wordsOf = (text: string) => [...new Intl.Segmenter(document.documentElement.lang || 'en', { granularity: 'word' }).segment(text)].map(part => part.segment);

const Ending = ({ ending }: { ending: string }) => (ending ? <span className='super-stop' data-super-stop>{ending}</span> : null);

const Line = ({ line, arrive }: { line: string; arrive: number }) => {
	const [body, ending] = splitEnding(line);
	const style: CSSProperties = { opacity: arrive, transform: `translateY(${(1 - arrive) * 22}px)` };
	return <span className='super-line' style={style}>{body}<Ending ending={ending} /></span>;
};

// Each word falls in from above, one after another, and lands without a bounce.
const DroppingLine = ({ line, local }: { line: string; local: number }) => {
	const [body, ending] = splitEnding(line);
	const segments = wordsOf(body);
	// How many words come before each segment, which is when it starts to fall.
	const order = segments.map((_, index) => segments.slice(0, index).filter(segment => segment.trim() !== '').length);
	return (
		<span className='super-line'>
			{segments.map((segment, index) => {
				if (segment.trim() === '') return segment;
				const land = spring(local - order[index]! * wordStagger, 0.5);
				const style: CSSProperties = { opacity: Math.min(1, land * 1.6), transform: `translateY(${(1 - Math.min(1, land)) * -wordDrop}em)` };
				const last = index === segments.length - 1;
				return <span key={index} className='super-word' style={style}>{segment}{last && <Ending ending={ending} />}</span>;
			})}
		</span>
	);
};

const Supers = ({ t, supers, format, copy }: { t: number; supers: Super[]; format: Format; copy: (key: string) => string }) => (
	<div className={`supers is-${format}`}>
		{supers.filter(item => t >= item.from && t < item.to).map(item => {
			const lines = copy(item.key).split('\n');
			const leaving = 1 - easeIn(progress(t, item.to - exitSeconds, item.to));
			return (
				<div key={`${item.key}-${item.from}`} className={`super is-${item.place}${item.animate === 'words' ? ' is-words' : ''}`} data-super={item.key} style={{ opacity: leaving }}>
					{lines.map((line, index) => (item.animate === 'words'
						? <DroppingLine key={index} line={line} local={t - item.from} />
						: <Line key={index} line={line} arrive={easeSignature(progress(t, item.from + index * lineStagger, item.from + index * lineStagger + enterSeconds))} />))}
				</div>
			);
		})}
	</div>
);

export default Supers;
