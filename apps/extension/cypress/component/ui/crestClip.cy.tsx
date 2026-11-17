import Crest from '@arenaswap/ui/src/components/crest';

const frames: [string, string, boolean][] = [
	['gd-bar-logo-shell', 'gd-bar-logo', true],
	['gd-poster-crest', 'gd-poster-crest-logo', false],
	['game-detail-team-logo-shell', 'game-detail-team-logo', false],
	['ff-endzone-crest', 'ff-endzone-crest-art', true],
	['ff-logo-shell', 'ff-logo-art', true],
];

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
	frames.forEach(([plate, art, plates]) => {
		it(`${plate} draws a bare crest whole`, () => {
			mountFrame(plate, art, true);
			cy.get(`.${plate}`).should('have.css', 'overflow', 'visible');
		});

		if (!plates) return;

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
