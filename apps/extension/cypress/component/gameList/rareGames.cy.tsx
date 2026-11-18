import { StaleLeaguesProvider } from '@arenaswap/ui/src/components/staleLeagueNote';
import GameCard from '../../../entrypoints/popup/components/gameCard';
import { makeScore } from '../../support/fixtures';
import { inEveryLocale } from '../../support/safetyNet/locales';
import { mountInPopup, popupSurface } from '../../support/safetyNet/mountInPopup';
import { rareGames } from '../../support/safetyNet/rareGames';

const rareCards = () => (
	<StaleLeaguesProvider shedLeagues={[]} lastGoodAt={{}} stuckSince={{ 'rare-resumed': Date.now() - (48 * 60_000) }}>
		<div className='mt-3'>
			{rareGames.map(({ game }) => (
				<div key={game.id} data-rare={game.id}>
					<GameCard
						game={game}
						excitementResult={game.status === 'in' ? makeScore(game.id, 88) : undefined}
						favoriteTeamIds={new Set<string>()}
						onToggleFavoriteTeam={() => {}}
						gameBoosts={{}}
						openTabs={[]}
						registry={[]}
						standbyStreamTabId={null}
						onRegistryChange={() => {}}
						formatTabLabel={() => ''}
						onOpenGameDetail={() => {}}
						bettingPrefs={{ bettingEnabled: false }}
						weatherPrefs={{ temperatureUnit: 'F' }}
					/>
				</div>
			))}
		</div>
	</StaleLeaguesProvider>
);

const card = (id: string) => cy.get(`[data-rare="${id}"]`);

describe('the games that almost never happen', () => {
	inEveryLocale('keeps every rare card inside the popup', locale => {
		mountInPopup(rareCards(), locale);
		cy.get(popupSurface).assertContained({ exempt: ['.menu'] });
	});

	for (const { game, label, expected } of rareGames.filter(rare => rare.expected)) {
		it(`labels ${label} the way it ended`, () => {
			mountInPopup(rareCards());
			if (expected?.status) card(game.id).find('.final-status-label').should('have.text', expected.status);
			if (expected?.period) card(game.id).find('.game-period').first().should('have.text', expected.period);
		});
	}

	for (const id of ['rare-152-148', 'rare-152-8', 'rare-73-0', 'rare-25-4']) {
		it(`keeps the score separator centred on the card for ${id.replace('rare-', '')}`, () => {
			mountInPopup(rareCards());
			card(id).find('.game-card-matchup').then(([matchup]) => {
				const box = matchup.getBoundingClientRect();
				card(id).find('.game-score-sep').then(([separator]) => {
					const sep = separator.getBoundingClientRect();
					const offset = (sep.left + (sep.width / 2)) - (box.left + (box.width / 2));
					expect(Math.abs(offset), `separator is ${offset.toFixed(1)}px off centre`).to.be.at.most(1);
				});
			});
		});
	}

	it("says 90+7' deep in stoppage time", () => {
		mountInPopup(rareCards());
		card('rare-stoppage').find('.game-clock').should('have.text', "90+7'");
	});
});
