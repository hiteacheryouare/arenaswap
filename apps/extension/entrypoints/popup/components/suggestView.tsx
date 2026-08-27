import { useState } from 'react';
import { i18n } from '#i18n';
import type { Browser } from 'wxt/browser';
import type { Game, Team } from '@arenaswap/core/types';
import Crest from '@arenaswap/ui/src/components/crest';
import { suggestionPairKey, type TabSuggestion } from '../../../utils/tabSuggestions';

interface suggestViewProps {
	suggestions: TabSuggestion[];
	games: Game[];
	openTabs: Browser.tabs.Tab[];
	formatTabLabel: (tab: Browser.tabs.Tab) => string;
	onApply: (accepted: TabSuggestion[]) => void;
	onBack: () => void;
}

const TeamMark = ({ team }: { team: Team }) => (
	<span className='d-inline-flex align-items-center gap-1 min-w-0'>
		<Crest logo={team.logo} abbreviation={team.abbreviation} className='suggest-crest' fallback='blank' />
		<span className='fw-bold text-nowrap'>{team.abbreviation}</span>
	</span>
);

const suggestView = ({ suggestions, games, openTabs, formatTabLabel, onApply, onBack }: suggestViewProps) => {
	// Suggestions arrive best-first, so taking the first pre-checked row per game leaves the
	// strongest candidate holding it when two tabs both matched the same game.
	const [checked, setChecked] = useState<string[]>(() => {
		const claimed = new Set<string>();
		const initial: string[] = [];
		for (const suggestion of suggestions) {
			if (!suggestion.preChecked || claimed.has(suggestion.gameId)) continue;
			claimed.add(suggestion.gameId);
			initial.push(suggestionPairKey(suggestion.tabId, suggestion.gameId));
		}
		return initial;
	});

	// A game can only hold one tab, so checking a row has to release whichever row was holding that
	// game. Resolving it here rather than at apply time means the list never shows a state it will
	// not honour.
	const toggle = (suggestion: TabSuggestion) => {
		const key = suggestionPairKey(suggestion.tabId, suggestion.gameId);
		const sameGame = new Set(suggestions
			.filter(s => s.gameId === suggestion.gameId)
			.map(s => suggestionPairKey(s.tabId, s.gameId)));

		setChecked(current => current.includes(key)
			? current.filter(entry => entry !== key)
			: [...current.filter(entry => !sameGame.has(entry)), key]);
	};

	const accepted = suggestions.filter(s => checked.includes(suggestionPairKey(s.tabId, s.gameId)));

	return (
		<div className='popup-container d-flex flex-column'>
			<button className='setup-header' onClick={onBack}>
				<i className='bi bi-arrow-left' />
				{i18n.t('suggest.header')}
			</button>

			{suggestions.length === 0
				? <div className='settings-page-lede'>{i18n.t('suggest.empty')}</div>
				: (
					<>
						<div className='settings-page-lede'>{i18n.t('suggest.lede')}</div>
						<div className='suggest-list'>
							{suggestions.map(suggestion => {
								const game = games.find(candidate => candidate.id === suggestion.gameId);
								const tab = openTabs.find(candidate => candidate.id === suggestion.tabId);
								if (!game || !tab) return null;
								const key = suggestionPairKey(suggestion.tabId, suggestion.gameId);

								return (
									<label
										key={key}
										className='suggest-row'
										htmlFor={`suggest-${key}`}
										aria-label={i18n.t('suggest.rowLabel', {
											tab: formatTabLabel(tab),
											away: game.awayTeam.name,
											home: game.homeTeam.name,
										})}
									>
										<input
											type='checkbox'
											id={`suggest-${key}`}
											className='form-check-input flex-shrink-0 mt-0'
											checked={checked.includes(key)}
											onChange={() => toggle(suggestion)}
										/>
										<span className='min-w-0'>
											<span className='d-flex align-items-center gap-1 suggest-matchup'>
												<TeamMark team={game.awayTeam} />
												<span className='text-body-tertiary'>@</span>
												<TeamMark team={game.homeTeam} />
											</span>
											<span className='d-block text-truncate suggest-tab-label'>{formatTabLabel(tab)}</span>
										</span>
									</label>
								);
							})}
						</div>
					</>
				)}

			<div className='mt-auto pt-3'>
				<button
					type='button'
					className='btn btn-sm btn-primary w-100'
					disabled={accepted.length === 0}
					onClick={() => onApply(accepted)}
				>
					{accepted.length === 0 ? i18n.t('suggest.applyNone') : i18n.t('suggest.apply', accepted.length)}
				</button>
			</div>
		</div>
	);
};

export default suggestView;
