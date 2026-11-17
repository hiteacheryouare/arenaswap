import { useState } from 'react';
import TeamCrest from '@arenaswap/ui/src/components/teamCrest';

const navy = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFUlEQVR4nGPkUXb4z4AHMOGTHD4KAH25AX7gsIqPAAAAAElFTkSuQmCC';
const gold = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFklEQVR4nGP8v03oPwMewIRPcvgoAADe+QLWq7gZUwAAAABJRU5ErkJggg==';
const whiteMark = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFklEQVR4nGP8////fwY8gAmf5PBRAAAbbgQMid1tCwAAAABJRU5ErkJggg==';

const popup = '#0d1117';

const stripedOnRed = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAABpElEQVR4nO3ZMU7EQBAF0do+GSE52hvsmYj2BitORkxCsggiB5ZlT2Lmd/3EUWlacvgu31+fT4D725WR3T4ef1/761BfZz5+s+fy/vryPOvx33Xv68zH7/bHf8B/Oj6hr5mPT+hr5uMT+pr5+IS+Zj4+oa+Zj0/oa+bjE/qa+fiEvmY+PqGvmY9P6Gvm4xP6mvn4hP6iBzxO7fUA9AA693rAwPQAcno94MD0APJ6PWDH9AByez1gY3oA+b0esDI9gD69HrCYHkC/Xg9AD6BzrwegB9C51wMGpgeQ0+sBB6YHkNfrATumB5Db6wEb0wPI7/WAlekB9On1gMX0APr1egB6AJ17PQA9gM69HjAwPYCcXg84MD2AvF4P2DE9gNxeD9iYHkB+rwesTA+gT68HLKYH0K/XA9AD6NzrAegBdO71gIHpAeT0esCB6QHk9XrAjukB5PZ6wMb0APJ7PWBlegB9ej1gMT2Afr0egB5A514PQA+gc68HDEwPIKfXAw5MDyCv1wN2TA8gt9cDNqYHkN/rASvTA+jT6wGL6QH06/UAzu1/AFpu0tP0p+LTAAAAAElFTkSuQmCC';
const dbacksBackdrop = '#7b1323';

const blackMark = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAD0lEQVR42mOQwgEYhpYEAJ8xE4HmivYxAAAAAElFTkSuQmCC';

const solidSvg = (fill: string) => (
	`<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><rect width='64' height='64' fill='${fill}'/></svg>`
);

const mount = (logo: string, monoMarks?: { white?: string; black?: string }, background = popup) => {
	cy.mount(
		<div style={{ background, padding: '1rem', width: '120px' }}>
			<TeamCrest
				logo={logo}
				monoMarks={monoMarks}
				abbreviation='NYY'
				background={background}
				discClassName='tc-disc'
				crestClassName='tc-crest'
				fallback='blank'
			/>
		</div>,
	);
	cy.get('.tc-crest').should('have.attr', 'data-crest-state', 'loaded');
};

describe('TeamCrest keeps a team in its own colours until they stop reading', () => {
	it('draws a crest that reads in its own colours, with nothing behind it', () => {
		mount(gold, { white: whiteMark, black: blackMark });
		cy.get('.tc-crest img').should('have.attr', 'src', gold);
		cy.get('.tc-crest').should('not.have.class', 'is-mono');
		cy.get('.tc-disc').should('have.class', 'is-bare').then($disc => {
			expect(getComputedStyle($disc[0]!).backgroundImage).to.equal('none');
		});
	});

	it('reaches for the white mark only when the colours stop reading', () => {
		mount(navy, { white: whiteMark, black: blackMark });
		cy.get('.tc-crest').should('have.class', 'is-mono');
		cy.get('.tc-crest img').should('have.attr', 'src', whiteMark);
		cy.get('.tc-disc').should('have.class', 'is-bare');
	});

	it('leaves that same crest alone on a surface it reads against', () => {
		mount(navy, { white: whiteMark, black: blackMark }, '#f8fafc');
		cy.get('.tc-crest').should('not.have.class', 'is-mono');
		cy.get('.tc-crest img').should('have.attr', 'src', navy);
	});

	it('falls back to the tinted plate when there is no white mark', () => {
		mount(navy);
		cy.get('.tc-crest').should('not.have.class', 'is-mono');
		cy.get('.tc-disc').should('not.have.class', 'is-bare').then($disc => {
			expect(getComputedStyle($disc[0]!).backgroundImage).to.include('linear-gradient');
		});
	});
});

describe('the legibility measure samples finely enough to see thin detail', () => {
	it('keeps a crest whose readability lives in thin pale detail', () => {
		mount(stripedOnRed, { white: whiteMark, black: blackMark }, dbacksBackdrop);
		cy.get('.tc-crest').should('not.have.class', 'is-mono');
		cy.get('.tc-crest img').should('have.attr', 'src', stripedOnRed);
	});
});

describe('the monochrome mark is chosen to suit the surface', () => {
	const goldBackdrop = '#b88510';

	it('reaches for the black mark on a light backdrop, not the white one', () => {
		mount(gold, { white: whiteMark, black: blackMark }, goldBackdrop);
		cy.get('.tc-crest').should('have.class', 'is-mono');
		cy.get('.tc-crest img').should('have.attr', 'src', blackMark);
		cy.get('.tc-disc').should('have.class', 'is-bare');
	});

	it('reaches for the white mark on a dark backdrop', () => {
		mount(navy, { white: whiteMark, black: blackMark });
		cy.get('.tc-crest img').should('have.attr', 'src', whiteMark);
	});

	it('plates a crest only when the team has no marks at all', () => {
		mount(gold, undefined, goldBackdrop);
		cy.get('.tc-disc').should('not.have.class', 'is-bare');
	});
});

describe('a crest is re-judged when the crest or the surface changes under it', () => {
	const marks = { white: whiteMark, black: blackMark };

	const mountSwapping = (initial: { logo: string; background: string }, swapped: { logo: string; background: string }) => {
		const Swapper = () => {
			const [next, setNext] = useState(false);
			const { logo, background } = next ? swapped : initial;
			return (
				<div style={{ background, padding: '1rem', width: '120px' }}>
					<button type='button' className='swap' onClick={() => setNext(true)}>swap</button>
					<TeamCrest
						logo={logo}
						monoMarks={marks}
						abbreviation='NYY'
						background={background}
						discClassName='tc-disc'
						crestClassName='tc-crest'
						fallback='blank'
					/>
				</div>
			);
		};
		cy.mount(<Swapper />);
		cy.get('.tc-crest').should('have.attr', 'data-crest-state', 'loaded');
	};

	it('drops the mark when the same crest moves to a surface it reads on', () => {
		mountSwapping({ logo: navy, background: popup }, { logo: navy, background: '#f8fafc' });
		cy.get('.tc-crest').should('have.class', 'is-mono');

		cy.get('.swap').click();
		cy.get('.tc-crest').should('not.have.class', 'is-mono');
	});

	it('keeps the next team in colour rather than inheriting the last mark', () => {
		mountSwapping({ logo: navy, background: popup }, { logo: gold, background: popup });
		cy.get('.tc-crest').should('have.class', 'is-mono');

		cy.get('.swap').click();
		cy.get('.tc-crest').should('not.have.class', 'is-mono');
		cy.get('.tc-crest img').should('have.attr', 'src', gold);
	});
});

describe('a crest bound for a monochrome mark never shows its colours', () => {
	// Same origin, so `crossOrigin='anonymous'` still leaves the canvas readable. Aliased, because
	// how many times each one is asked for is half of what these specs are checking.
	const serve = (name: string, fill: string, delay: number) => {
		const url = `/crest-test/${Cypress._.uniqueId(name)}.svg`;
		cy.intercept('GET', url, {
			delay,
			statusCode: 200,
			headers: { 'content-type': 'image/svg+xml' },
			body: solidSvg(fill),
		}).as(name);
		return url;
	};

	// A real box, from the walkthrough's own class: an image with no size is one Chrome declines to
	// defer, and the lazy case below would prove nothing against a 0x0 crest.
	const sizedCrest = 'tc-crest team-crest-32';

	// `asked` is the `src` React has committed and `shown` is `currentSrc`, which is the request the
	// element is actually drawing from. They are different things for as long as a new source takes
	// to arrive, and that gap is the bug: an `img` goes on painting the old image the whole time.
	interface crestFrame {
		asked: string;
		shown: string;
		state: string;
		painted: boolean;
	}

	let stopSampling: (() => void) | undefined;

	const sampleEveryFrame = (frames: crestFrame[]) => {
		cy.window().then(win => {
			let running = true;
			stopSampling = () => { running = false; };
			const tick = () => {
				if (!running) return;
				const crest = win.document.querySelector('.tc-crest');
				const image = crest?.querySelector('img');
				if (crest && image) {
					frames.push({
						asked: image.getAttribute('src') ?? '',
						shown: image.currentSrc,
						state: crest.getAttribute('data-crest-state') ?? '',
						painted: win.getComputedStyle(image).visibility !== 'hidden',
					});
				}
				win.requestAnimationFrame(tick);
			};
			win.requestAnimationFrame(tick);
		});
	};

	afterEach(() => { stopSampling?.(); });

	it('holds the placeholder up from the abbreviation straight through to the mark', () => {
		const frames: crestFrame[] = [];
		const colour = serve('colour', '#0c2340', 80);
		const mark = serve('mark', '#ffffff', 120);

		sampleEveryFrame(frames);
		mount(colour, { white: mark, black: mark });

		cy.get('.tc-crest').should('have.class', 'is-mono');
		cy.get('.tc-crest img').should('have.attr', 'src', mark).and('have.css', 'visibility', 'visible');
		cy.get('@colour.all').should('have.length', 1);
		cy.then(() => {
			stopSampling?.();
			expect(frames.filter(frame => frame.asked === colour).length, 'frames carrying the colour artwork').to.be.greaterThan(0);
			expect(frames.filter(frame => frame.painted && !frame.shown.endsWith(mark)), 'frames painting anything but the mark').to.deep.equal([]);
			expect(frames.filter(frame => frame.asked === colour && frame.state === 'loaded'), 'frames calling the colour artwork loaded').to.deep.equal([]);
		});
	});

	it('shows a crest that reads as soon as it decodes, mark or no mark', () => {
		const frames: crestFrame[] = [];
		const colour = serve('colour', '#ffb612', 80);
		const mark = serve('mark', '#ffffff', 120);

		sampleEveryFrame(frames);
		mount(colour, { white: mark, black: mark });

		cy.get('.tc-crest').should('not.have.class', 'is-mono');
		cy.get('.tc-crest img').should('have.attr', 'src', colour).and('have.css', 'visibility', 'visible');
		cy.get('@colour.all').should('have.length', 1);
		cy.get('@mark.all').should('have.length', 0);
		cy.then(() => {
			stopSampling?.();
			expect(frames.filter(frame => frame.shown.endsWith(colour) && !frame.painted).length, 'frames holding back artwork that had arrived').to.be.lessThan(2);
		});
	});

	it('draws a crest whose pixels could not be read at all', () => {
		const colour = serve('colour', '#0c2340', 20);
		const mark = serve('mark', '#ffffff', 20);
		cy.window().then(win => {
			cy.stub(win.CanvasRenderingContext2D.prototype, 'getImageData').throws(new Error('tainted canvas'));
		});
		mount(colour, { white: mark, black: mark });

		cy.get('.tc-crest').should('not.have.class', 'is-mono');
		cy.get('.tc-crest img').should('have.attr', 'src', colour).and('have.css', 'visibility', 'visible');
	});

	// `visibility` rather than `display` for exactly this: an image taken out of layout has no box
	// to be scrolled into, and a lazy crest on the guide would never load at all.
	it('still loads a lazy crest while it is being held back', () => {
		const colour = serve('colour', '#0c2340', 40);
		const mark = serve('mark', '#ffffff', 40);

		cy.mount(
			<div style={{ background: popup, padding: '1rem', width: '120px' }}>
				<TeamCrest
					logo={colour}
					monoMarks={{ white: mark, black: mark }}
					abbreviation='NYY'
					background={popup}
					discClassName='tc-disc'
					crestClassName={sizedCrest}
					fallback='blank'
					loading='lazy'
				/>
			</div>,
		);

		cy.get('.tc-crest').should('have.class', 'is-mono');
		cy.get('.tc-crest img').should('have.attr', 'src', mark).and('have.css', 'visibility', 'visible');
	});
});
