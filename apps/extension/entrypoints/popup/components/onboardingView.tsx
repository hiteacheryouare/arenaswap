import { useState } from 'react';
import { fetchTeamsForLeagues } from '@arenaswap/core';
import type { EspnTeamEntry } from '@arenaswap/core';
import type { LeagueId, LeagueLogoMap, SportType } from '@arenaswap/core/types';
import { leaguesBySportType } from '../popupHelpers';
import OnboardingTabControl from './onboardingTabControl';
import OnboardingLeaguePicker from './onboardingLeaguePicker';
import OnboardingTeamPicker from './onboardingTeamPicker';

interface onboardingViewProps {
	leagueLogos: LeagueLogoMap;
	onComplete: (leagues: LeagueId[], favorites: string[]) => void;
}

const defaultLeagues: LeagueId[] = ['nba', 'nfl', 'nhl', 'mlb'];

const onboardingView = ({ leagueLogos, onComplete }: onboardingViewProps) => {
	const [step, setStep] = useState<1 | 2 | 3>(1);
	const [selectedLeagues, setSelectedLeagues] = useState<Set<LeagueId>>(() => new Set(defaultLeagues));
	const [selectedFavorites, setSelectedFavorites] = useState<Set<string>>(new Set());
	const [teams, setTeams] = useState<EspnTeamEntry[]>([]);
	const [teamsLoading, setTeamsLoading] = useState(false);
	const [teamsError, setTeamsError] = useState(false);

	const onToggleLeague = (id: LeagueId) => {
		setSelectedLeagues(prev => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const onToggleSport = (sport: SportType, selectAll: boolean) => {
		const sportLeagues = leaguesBySportType[sport].map(l => l.id);
		setSelectedLeagues(prev => {
			const next = new Set(prev);
			for (const id of sportLeagues) {
				if (selectAll) next.add(id);
				else next.delete(id);
			}
			return next;
		});
	};

	const onNext = async () => {
		setTeamsLoading(true);
		setTeamsError(false);
		try {
			const fetched = await fetchTeamsForLeagues([...selectedLeagues]);
			setTeams(fetched);
		} catch {
			setTeamsError(true);
		} finally {
			setTeamsLoading(false);
		}
		setStep(3);
	};

	const onToggleFavorite = (key: string) => {
		setSelectedFavorites(prev => {
			const next = new Set(prev);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});
	};

	const finish = (withFavorites: boolean) => {
		onComplete([...selectedLeagues], withFavorites ? [...selectedFavorites] : []);
	};

	return (
		<div className='popup-root'>
			<div className='popup-view-shell'>
				{step === 1 && (
					<OnboardingTabControl onNext={() => setStep(2)} />
				)}
				{step === 2 && (
					<OnboardingLeaguePicker
						selectedLeagues={selectedLeagues}
						leagueLogos={leagueLogos}
						onToggleLeague={onToggleLeague}
						onToggleSport={onToggleSport}
						onBack={() => setStep(1)}
						onNext={() => { void onNext(); }}
					/>
				)}
				{step === 3 && (
					<OnboardingTeamPicker
						teams={teams}
						isLoading={teamsLoading}
						hasError={teamsError}
						selectedFavorites={selectedFavorites}
						onToggleFavorite={onToggleFavorite}
						onBack={() => setStep(2)}
						onRetry={() => { void onNext(); }}
						onSkip={() => finish(false)}
						onDone={() => finish(true)}
					/>
				)}
			</div>
		</div>
	);
};

export default onboardingView;
