import type { CSSProperties } from 'react';
import type { Format, Super } from '../cuts/cutTypes';
import { easeIn, easeSignature, progress } from '../timing';

const enterSeconds = 0.55;
const exitSeconds = 0.3;
const lineStagger = 0.08;

// The last character is the sentence's full stop in whatever script it is written in, and it is
// always drawn in the dot's orange: every line of copy ends on the motif.
const sentenceEnd = /[.。．!?！？]$/u;

export const splitEnding = (text: string): [string, string] => (sentenceEnd.test(text) ? [text.slice(0, -1), text.slice(-1)] : [text, '']);

const Supers = ({ t, supers, format, copy }: { t: number; supers: Super[]; format: Format; copy: (key: string) => string }) => (
	<div className={`supers is-${format}`}>
		{supers.filter(item => t >= item.from && t < item.to).map(item => {
			const lines = copy(item.key).split('\n');
			const leaving = 1 - easeIn(progress(t, item.to - exitSeconds, item.to));
			return (
				<div key={`${item.key}-${item.from}`} className={`super is-${item.place}`} data-super={item.key} style={{ opacity: leaving }}>
					{lines.map((line, index) => {
						const arrive = easeSignature(progress(t, item.from + index * lineStagger, item.from + index * lineStagger + enterSeconds));
						const [body, ending] = splitEnding(line);
						const style: CSSProperties = { opacity: arrive, transform: `translateY(${(1 - arrive) * 22}px)` };
						return (
							<span key={index} className='super-line' style={style}>
								{body}
								{ending && <span className='super-stop' data-super-stop>{ending}</span>}
							</span>
						);
					})}
				</div>
			);
		})}
	</div>
);

export default Supers;
