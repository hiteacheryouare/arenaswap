// The one thing a round crest frame must never do is cut the artwork. A crest reaches into the
// corners of its own box — the Giants' 'ny' runs the whole width of theirs — so a circle drawn at
// the size of the mark shaves its ends off, which is what the sticky bar did to 25px of that one.
//
// Two rules, checked here for every frame that has them rather than in each call site's own spec:
// a bare crest has no plate to keep clear of and is never clipped, and a plated one is inset to
// three quarters of the plate, the share the widest mark in any league needs to land on it.
import Crest from '@arenaswap/ui/src/components/crest';

// The plate class and the crest class, exactly as each call site passes them to TeamCrest.
const frames: [string, string][] = [
	['gd-bar-logo-shell', 'gd-bar-logo'],
	['gd-poster-crest', 'gd-poster-crest-logo'],
	['game-detail-team-logo-shell', 'game-detail-team-logo'],
	['ff-endzone-crest', 'ff-endzone-crest-art'],
	['ff-logo-shell', 'ff-logo-art'],
];

// `.ff-logo-shell` fills its foreignObject rather than carrying a size, so every frame is mounted
// in a box of its own and measured against what it actually renders at.
const mountFrame = (plate: string, art: string, bare: boolean) => {
	cy.viewport(200, 200);
	cy.mount(
		<div style={{ width: '96px', height: '96px', display: 'flex' }}>
			<span className={bare ? `${plate} is-bare` : plate}>
				<Crest abbreviation='NYG' className={art} fallback='blank' />
			</span>
		</div>,
	);
};

describe('a round crest frame', () => {
	frames.forEach(([plate, art]) => {
		it(`${plate} draws a bare crest whole`, () => {
			mountFrame(plate, art, true);
			cy.get(`.${plate}`).should('have.css', 'overflow', 'visible');
		});

		it(`${plate} insets a plated crest to three quarters of the plate`, () => {
			mountFrame(plate, art, false);
			cy.get(`.${plate}`).should('have.css', 'overflow', 'hidden');
			cy.get(`.${plate}`).then($plate => {
				const box = $plate[0]!.getBoundingClientRect();
				cy.get(`.${art}`).should($crest => {
					const mark = $crest[0]!.getBoundingClientRect();
					expect(mark.width / box.width, `${art} width against its plate`).to.be.at.most(0.75);
					expect(mark.height / box.height, `${art} height against its plate`).to.be.at.most(0.75);
				});
			});
		});
	});
});
