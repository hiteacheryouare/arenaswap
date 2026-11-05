import GuideGrid from '../../../entrypoints/guide/guideGrid';
import { buildBar } from '../../../entrypoints/guide/guideHeat';
import { timeEdges, type timeEdge } from '../../support/safetyNet/timeEdges';
import '../../../assets/guide.scss';

const mountEdge = ({ game, now, endedAt }: timeEdge) => {
	cy.viewport(1280, 800);
	const bar = buildBar(game, false, now, endedAt)!;
	cy.mount(
		<div className='guide-page'>
			<div className='guide-scroller'>
				<GuideGrid bars={[bar]} band={null} leagueLogos={{}} now={now} minPlotPx={900} onOpen={cy.stub()} />
			</div>
		</div>,
	);
};

describe('a game against the now line', () => {
	it('ends a final with a known end at or before the now line', () => {
		mountEdge(timeEdges.endsEarly);
		cy.get('.guide-bar-shape').then(([shape]) => {
			cy.get('.guide-now').should(([line]) => {
				expect(shape!.getBoundingClientRect().right).to.be.at.most(line!.getBoundingClientRect().left + 0.5);
			});
		});
	});

	it('does not draw a final whose end nobody saw running past the now line', () => {
		mountEdge({ ...timeEdges.endsEarly, endedAt: undefined });
		cy.get('.guide-bar-shape').then(([shape]) => {
			cy.get('.guide-now').should(([line]) => {
				expect(shape!.getBoundingClientRect().right).to.be.at.most(line!.getBoundingClientRect().left + 0.5);
			});
		});
	});

	it('keeps a live game running past the now line', () => {
		mountEdge(timeEdges.runsLong);
		cy.get('.guide-bar-shape').then(([shape]) => {
			cy.get('.guide-now').should(([line]) => {
				expect(shape!.getBoundingClientRect().right).to.be.greaterThan(line!.getBoundingClientRect().left);
			});
		});
	});
});
