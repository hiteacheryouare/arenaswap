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

// A black mark, so a light backdrop has something to reach for. Solid dark 8x8.
const blackMark = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFUlEQVR4nGPkUXb4z4AHMOGTHD4KAH25AX7gsIqPAAAAAElFTkSuQmCC';

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

