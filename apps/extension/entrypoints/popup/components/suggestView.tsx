import { useState } from 'react';
import { i18n } from '#i18n';
import type { Browser } from 'wxt/browser';
import type { Game, Team } from '@arenaswap/core/types';
import BoardCrest from '@arenaswap/ui/src/components/boardCrest';
import { resolveGameColors } from '@arenaswap/ui/src/components/gameSurface';
import useDocumentTheme from '@arenaswap/ui/src/components/useDocumentTheme';
import { suggestionPairKey, type TabSuggestion } from '../../../utils/tabSuggestions';
import { cardSurface } from './teamPickerRow';

interface suggestViewProps {
	suggestions: TabSuggestion[];
	games: Game[];
	openTabs: Browser.tabs.Tab[];
	formatTabLabel: (tab: Browser.tabs.Tab) => string;
	onApply: (accepted: TabSuggestion[]) => void;
	onBack: () => void;
}

const TeamMark = ({ team, color, surface }: { team: Team; color: string; surface: string }) => (
	<span className='suggest-team'>
		<BoardCrest team={team} size={20} surface={surface} color={color} className='suggest-crest' />
		<b>{team.abbreviation}</b>
	</span>
);

const suggestView = ({ suggestions, games, openTabs, formatTabLabel, onApply, onBack }: suggestViewProps) => {
	const theme = useDocumentTheme();

	// Suggestions arrive best-first, so the first pre-checked row per game is the strongest claim on it.
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

	// A game holds one tab, so checking a row releases whichever row held that game. Resolved here
	// rather than at apply time, so the list never shows a state it won't honour.
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
		<div className='popup-container st si d-flex flex-column pb-0'>
			<header className='as-subhead'>
				<button type='button' className='as-icon st-back' onClick={onBack} aria-label={i18n.t('setup.back')}>
					<i className='bi bi-arrow-left' aria-hidden='true' />
				</button>
				<h2>{i18n.t('suggest.header')}</h2>
			</header>

			<div className='st-body flex-grow-1'>
				{suggestions.length === 0 ? (
					<div className='as-empty'>
						<p>{i18n.t('suggest.empty')}</p>
					</div>
				) : (
					<>
						<p className='st-note si-lede'>{i18n.t('suggest.lede')}</p>
						<div className='st-card suggest-list'>
							{suggestions.map(suggestion => {
								const game = games.find(candidate => candidate.id === suggestion.gameId);
								const tab = openTabs.find(candidate => candidate.id === suggestion.tabId);
								if (!game || !tab) return null;
								const key = suggestionPairKey(suggestion.tabId, suggestion.gameId);
								const [awayColor, homeColor] = resolveGameColors(game, theme);

								return (
									<label
										key={key}
										className='st-control suggest-row'
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
											className='form-check-input'
											checked={checked.includes(key)}
											onChange={() => toggle(suggestion)}
										/>
										<span className='suggest-copy'>
											<span className='suggest-matchup'>
												<TeamMark team={game.awayTeam} color={awayColor} surface={cardSurface[theme]} />
												<span className='suggest-at' aria-hidden='true'>@</span>
												<TeamMark team={game.homeTeam} color={homeColor} surface={cardSurface[theme]} />
											</span>
											<span className='suggest-tab-label'>{formatTabLabel(tab)}</span>
										</span>
									</label>
								);
							})}
						</div>
					</>
				)}
			</div>

			<footer className='suggest-foot'>
				<button
					type='button'
					className='btn btn-primary w-100'
					disabled={accepted.length === 0}
					onClick={() => onApply(accepted)}
				>
					{accepted.length === 0 ? i18n.t('suggest.applyNone') : i18n.t('suggest.apply', accepted.length)}
				</button>
			</footer>
		</div>
	);
};

export default suggestView;
