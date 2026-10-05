import { parseScoreboardEvents } from '../src/apiClient';
import { deriveBasketballPossession } from '../src/basketballPossession';
import lastPlays from './fixtures/liveExtras/basketballLastPlays.json';

type Json = any;
type recordedPlay = Exclude<keyof typeof lastPlays, '_source' | 'scoreboard'>;

const sideOf = (name: recordedPlay) => {
	const { homeId, awayId, lastPlay } = lastPlays[name] as Json;
	return { play: lastPlay, homeId, awayId, team: lastPlay.team?.id === homeId ? 'home' : 'away' };
};

const derive = (name: recordedPlay) => {
	const { play, homeId, awayId } = sideOf(name);
	return deriveBasketballPossession(play, homeId, awayId);
};

const opposite = (side: string) => (side === 'home' ? 'away' : 'home');

describe('deriveBasketballPossession, on recorded plays', () => {
	test.each<recordedPlay>(['defensiveRebound', 'offensiveRebound', 'teamOffensiveRebound'])('a rebound gives the ball to the rebounding team: %s', name => {
		expect(derive(name)).toBe(sideOf(name).team);
	});

	test.each<recordedPlay>(['madeThree', 'madeDunk'])('a made field goal hands it over: %s', name => {
		expect(derive(name)).toBe(opposite(sideOf(name).team));
	});

	test.each<recordedPlay>(['madeLastOfOne'])('a made last free throw hands it over: %s', name => {
		expect(derive(name)).toBe(opposite(sideOf(name).team));
	});

	test.each<recordedPlay>(['madeFirstOfTwo', 'madeSecondOfThree'])('the shooter keeps it with free throws still to come: %s', name => {
		expect(derive(name)).toBe(sideOf(name).team);
	});

	test.each<recordedPlay>(['stealTurnover', 'badPassTurnover', 'traveling', 'eightSeconds', 'offensiveFoulTurnover'])('a turnover hands it over: %s', name => {
		expect(derive(name)).toBe(opposite(sideOf(name).team));
	});

	// The play is hung on the team that committed the foul, so the ball goes to the other side.
	test.each<recordedPlay>(['shootingFoul', 'personalFoul', 'looseBallFoul', 'offensiveFoul'])('a foul hands it to the fouled team: %s', name => {
		expect(derive(name)).toBe(opposite(sideOf(name).team));
	});

	test.each<recordedPlay>([
		'missedShot', 'blockedShot', 'missedLastOfTwo', 'missedLastWithoutTeam', 'reboundWithoutTeam',
		'fullTimeout', 'substitution', 'violation', 'challengeSupported', 'challengeOverturned', 'endPeriod',
	])('says nothing when the play does not: %s', name => {
		expect(derive(name)).toBeUndefined();
	});
});

const play = (typeText: string, text: string, scoreValue = 0) => ({ type: { text: typeText }, text, team: { id: '1' }, scoreValue });

describe('deriveBasketballPossession, on plays the preseason has not shown yet', () => {
	test('a technical and its free throw leave the ball where it was', () => {
		expect(deriveBasketballPossession(play('Technical Foul', 'Jalen Brunson technical foul'), '1', '2')).toBeUndefined();
		expect(deriveBasketballPossession(play('Free Throw - Technical', 'Jalen Brunson makes technical free throw', 1), '1', '2')).toBeUndefined();
	});

	test('flagrant and clear-path free throws come with the ball', () => {
		expect(deriveBasketballPossession(play('Free Throw - Flagrant 2 of 2', 'Jalen Brunson makes free throw flagrant 2 of 2', 1), '1', '2')).toBe('home');
		expect(deriveBasketballPossession(play('Free Throw - Clear Path 2 of 2', 'Jalen Brunson makes free throw clear path 2 of 2', 1), '1', '2')).toBe('home');
	});

	test('a jump ball is unknown until the next play', () => {
		expect(deriveBasketballPossession(play('Jump Ball', 'Karl-Anthony Towns vs. Joel Embiid (Jalen Brunson gains possession)'), '1', '2')).toBeUndefined();
	});

	test('a charge hands it over', () => {
		expect(deriveBasketballPossession(play('Offensive Charge', 'Jalen Brunson offensive charge'), '1', '2')).toBe('away');
	});

	test('a team it does not recognise says nothing', () => {
		expect(deriveBasketballPossession(play('Defensive Rebound', 'Josh Hart defensive rebound'), '3', '4')).toBeUndefined();
		expect(deriveBasketballPossession(undefined, '1', '2')).toBeUndefined();
	});
});

describe('the scoreboard carries it onto the game', () => {
	const scoreboard = () => structuredClone(lastPlays.scoreboard) as Json;

	test('a live basketball game reads it off the last play', () => {
		const [game] = parseScoreboardEvents(scoreboard(), 'nba');
		expect(game!.possessionSide).toBe('home');
		expect(game!.possessionTeamId).toBeUndefined();
	});

	test('an unexpected play type costs the possession, not the scoreboard', () => {
		const raw = scoreboard();
		raw.events[0].competitions[0].situation.lastPlay.type = 'Defensive Rebound';
		const [game] = parseScoreboardEvents(raw, 'nba');
		expect(game!.homeTeam.score).toBeGreaterThan(0);
		expect(game!.possessionSide).toBe('home');
	});

	test('a finished game has none', () => {
		const raw = scoreboard();
		raw.events[0].competitions[0].status.type.state = 'post';
		const [game] = parseScoreboardEvents(raw, 'nba');
		expect(game!.status).toBe('post');
		expect(game!.possessionSide).toBeUndefined();
	});
});
