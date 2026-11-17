import Crest from '@arenaswap/ui/src/components/crest';

interface crestFrame {
	plateClass: string;
	crestClass: string;
	canPlate: boolean;
}

const frames: crestFrame[] = [
	{ plateClass: 'gd-bar-logo-shell', crestClass: 'gd-bar-logo', canPlate: true },
	{ plateClass: 'gd-poster-crest', crestClass: 'gd-poster-crest-logo', canPlate: false },
	{ plateClass: 'game-detail-team-logo-shell', crestClass: 'game-detail-team-logo', canPlate: false },
	{ plateClass: 'ff-endzone-crest', crestClass: 'ff-endzone-crest-art', canPlate: true },
	{ plateClass: 'ff-logo-shell', crestClass: 'ff-logo-art', canPlate: true },
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
	frames.forEach(({ plateClass: plate, crestClass: art, canPlate: plates }) => {
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
