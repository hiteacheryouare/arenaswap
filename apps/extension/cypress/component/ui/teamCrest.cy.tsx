import { useState } from 'react';
import TeamCrest from '@arenaswap/ui/src/components/teamCrest';

// Solid 8x8 PNGs as data URIs, so the canvas measurement runs for real and is never tainted. Navy is
// the Yankees' case — ink that stands off nothing dark. Gold is the Steelers' — ink that stands off
// everything.
const navy = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFUlEQVR4nGPkUXb4z4AHMOGTHD4KAH25AX7gsIqPAAAAAElFTkSuQmCC';
const gold = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFklEQVR4nGP8v03oPwMewIRPcvgoAADe+QLWq7gZUwAAAABJRU5ErkJggg==';
// Pure white, and deliberately not the same bytes as `gold`: the component skips measuring an
// image it has already swapped to, so a mono fixture identical to the colour one short-circuits it.
const whiteMark = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFklEQVR4nGP8////fwY8gAmf5PBRAAAbbgQMid1tCwAAAABJRU5ErkJggg==';

const popup = '#0d1117';

// Shaped like the Diamondbacks' crest and matched to its real profile: a mid-red mass that stays
// visible against Arizona's own red, carrying thin pale detail that does the reading. It measures
// 12.5% strong ink and 12.0% dead at 48x48 — the real crest is 14.0% and 13.7% — and 0% strong at
// 24x24, which is the size the colour-bucketing sampler uses.
const stripedOnRed = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAABpElEQVR4nO3ZMU7EQBAF0do+GSE52hvsmYj2BitORkxCsggiB5ZlT2Lmd/3EUWlacvgu31+fT4D725WR3T4ef1/761BfZz5+s+fy/vryPOvx33Xv68zH7/bHf8B/Oj6hr5mPT+hr5uMT+pr5+IS+Zj4+oa+Zj0/oa+bjE/qa+fiEvmY+PqGvmY9P6Gvm4xP6mvn4hP6iBzxO7fUA9AA693rAwPQAcno94MD0APJ6PWDH9AByez1gY3oA+b0esDI9gD69HrCYHkC/Xg9AD6BzrwegB9C51wMGpgeQ0+sBB6YHkNfrATumB5Db6wEb0wPI7/WAlekB9On1gMX0APr1egB6AJ17PQA9gM69HjAwPYCcXg84MD2AvF4P2DE9gNxeD9iYHkB+rwesTA+gT68HLKYH0K/XA9AD6NzrAegBdO71gIHpAeT0esCB6QHk9XrAjukB5PZ6wMb0APJ7PWBlegB9ej1gMT2Afr0egB5A514PQA+gc68HDEwPIKfXAw5MDyCv1wN2TA8gt9cDNqYHkN/rASvTA+jT6wGL6QH06/UAzu1/AFpu0tP0p+LTAAAAAElFTkSuQmCC';
// The Diamondbacks' own red as it appears under the hero's scrim.
const dbacksBackdrop = '#7b1323';

// A black mark, so a light backdrop has something to reach for. Solid dark 8x8, and — like the
// white mark above — deliberately not the same bytes as any crest here: it was a byte-for-byte copy
// of `navy`, which made the mark the component had swapped *to* indistinguishable from the artwork
// it had swapped *from*, so the measurement skipped itself and the verdict never landed.
const blackMark = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAD0lEQVR42mOQwgEYhpYEAJ8xE4HmivYxAAAAAElFTkSuQmCC';

// Solid fills at a real size, for the crests served over the wire below: the legibility measure
// walks 48x48 of them and reaches the answer the product would. Yankees navy is the case that ends
// in a mark — nothing in it stands off the popup.
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
	// The measurement needs the image decoded, so every assertion below waits for the load.
	cy.get('.tc-crest').should('have.attr', 'data-crest-state', 'loaded');
};

describe('TeamCrest keeps a team in its own colours until they stop reading', () => {
	// The complaint this rule exists for: most crests are drawn for a dark broadcast background and
	// look better in colour than in any monochrome treatment.
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

	// The same navy on a light card is perfectly readable, so nothing is swapped. The rule is about
	// the pair, not about the crest.
	it('leaves that same crest alone on a surface it reads against', () => {
		mount(navy, { white: whiteMark, black: blackMark }, '#f8fafc');
		cy.get('.tc-crest').should('not.have.class', 'is-mono');
		cy.get('.tc-crest img').should('have.attr', 'src', navy);
	});

	// Every club outside North America. ESPN has drawn no white mark for any of them, so the plate
	// the product already had is what carries an unreadable crest.
	it('falls back to the tinted plate when there is no white mark', () => {
		mount(navy);
		cy.get('.tc-crest').should('not.have.class', 'is-mono');
		cy.get('.tc-disc').should('not.have.class', 'is-bare').then($disc => {
			expect(getComputedStyle($disc[0]!).backgroundImage).to.include('linear-gradient');
		});
	});
});

// The bug this guards was real: the legibility measure was reading the canvas at the size the colour
// sampler uses, and Arizona came out monochrome because their pale detail had been averaged away.
describe('the legibility measure samples finely enough to see thin detail', () => {
	it('keeps a crest whose readability lives in thin pale detail', () => {
		mount(stripedOnRed, { white: whiteMark, black: blackMark }, dbacksBackdrop);
		cy.get('.tc-crest').should('not.have.class', 'is-mono');
		cy.get('.tc-crest img').should('have.attr', 'src', stripedOnRed);
	});
});

// A team drawn in its own light alternate is the one surface where the white mark is the worse of
// the two, so the crest keeps its colours and takes the plate instead.
// The bug this guards was reported from a real slate: the Athletics and the Commanders both carry a
// gold alternate, and on it neither their artwork nor a white mark reads — a white mark reaches only
// 3.3:1 on that gold. The crest fell all the way through to the tinted plate. Their black mark
// reaches 6:1, and ESPN draws the two marks as a pair for every team that has either.
describe('the monochrome mark is chosen to suit the surface', () => {
	// A team's own gold, as it appears under the hero scrim.
	const goldBackdrop = '#b88510';

	it('reaches for the black mark on a light backdrop, not the white one', () => {
		mount(gold, { white: whiteMark, black: blackMark }, goldBackdrop);
		cy.get('.tc-crest').should('have.class', 'is-mono');
		cy.get('.tc-crest img').should('have.attr', 'src', blackMark);
		cy.get('.tc-disc').should('have.class', 'is-bare');
	});

	// The other half of the same rule, so the choice is shown to be a choice.
	it('reaches for the white mark on a dark backdrop', () => {
		mount(navy, { white: whiteMark, black: blackMark });
		cy.get('.tc-crest img').should('have.attr', 'src', whiteMark);
	});

	// Only a team ESPN has drawn no marks for can still end up on a plate.
	it('plates a crest only when the team has no marks at all', () => {
		mount(gold, undefined, goldBackdrop);
		cy.get('.tc-disc').should('not.have.class', 'is-bare');
	});
});


// A verdict is a fact about a crest and a surface, and both of them move underneath a mounted
// instance: the guide's drawer reconciles one game's detail view into the next, and every hero
// passes a backdrop mixed from the game's own colours. Held as mount-time state the answer was
// never revisited, so the previous team's verdict drew the next team's crest — and because the
// component then stops rendering the colour artwork, nothing ever reloads it to correct the
// mistake. Both cases below are permanent rather than a flash.
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

		// No image load happens here — only the backdrop moves — so the measurement has to be driven
		// by the surface changing rather than by the crest arriving.
		cy.get('.swap').click();
		// The class rather than the `src`: this spec's black mark is byte-identical to the navy
		// crest, so a `src` assertion here would pass either way.
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

// The swap to a monochrome mark used to be watchable: the colour artwork appeared as soon as it
// decoded, which is a frame or more ahead of the commit that swapped it out, and the element went
// on being free to paint it across the swap. A flash is a fact about frames, so these read frames —
// the crests are served over intercepted requests so the loads land inside the window being sampled
// rather than before it.
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
		// Nothing here is vacuous: the colour artwork was fetched, through this element, and the
		// verdict that reached for the mark could only have come from its pixels.
		cy.get('@colour.all').should('have.length', 1);
		cy.then(() => {
			stopSampling?.();
			// Not vacuous: the element carried the colour artwork for most of the window, and the
			// mark it ended on is an answer only that artwork's own pixels could have given.
			expect(frames.filter(frame => frame.asked === colour).length, 'frames carrying the colour artwork').to.be.greaterThan(0);
			// The claim itself, in one line: the only thing this crest is ever on screen drawing is
			// the mark. Read off `currentSrc`, which is the request being painted rather than the
			// one most recently asked for — the two differ for exactly as long as a swap takes.
			expect(frames.filter(frame => frame.painted && !frame.shown.endsWith(mark)), 'frames painting anything but the mark').to.deep.equal([]);
			// Which is the placeholder's doing, so the crest is never `loaded` while the colour is
			// what the element is asking for.
			expect(frames.filter(frame => frame.asked === colour && frame.state === 'loaded'), 'frames calling the colour artwork loaded').to.deep.equal([]);
		});
	});

	// The majority case, and the one this must not pay for: a crest that reads is abbreviation then
	// colour, one transition, at the moment it decodes.
	it('shows a crest that reads as soon as it decodes, mark or no mark', () => {
		const frames: crestFrame[] = [];
		const colour = serve('colour', '#ffb612', 80);
		const mark = serve('mark', '#ffffff', 120);

		sampleEveryFrame(frames);
		mount(colour, { white: mark, black: mark });

		cy.get('.tc-crest').should('not.have.class', 'is-mono');
		cy.get('.tc-crest img').should('have.attr', 'src', colour).and('have.css', 'visibility', 'visible');
		// One fetch, and it is the one the crest is drawn from: the artwork is measured where it is
		// shown rather than loaded twice, once to be read and once to be painted.
		cy.get('@colour.all').should('have.length', 1);
		cy.get('@mark.all').should('have.length', 0);
		cy.then(() => {
			stopSampling?.();
			// The verdict lands in the same load handler that reports the image, so the artwork is
			// painted in the frame it arrives in or the one after: `load` is not a discrete event
			// and React's commit can fall the far side of a paint. That single frame is the one the
			// colour crest used to be painted in, which is the flash. Two would mean the
			// measurement had been pushed out to an effect.
			expect(frames.filter(frame => frame.shown.endsWith(colour) && !frame.painted).length, 'frames holding back artwork that had arrived').to.be.lessThan(2);
		});
	});

	// The placeholder waits for an answer, so a measurement that cannot produce one has to count as
	// an answer. `crestReadsOn` declines to write down a verdict it could not reach — a tainted
	// canvas, or Chrome handing back no context past its memory ceiling, which a guide with a
	// hundred bars can reach — and a crest waiting on that would never be drawn at all.
	it('draws a crest whose pixels could not be read at all', () => {
		// Its own URL, so the pair is genuinely unmeasured: a verdict this spec has already reached
		// for one of the fixtures above is served out of the cache without a canvas being touched.
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
