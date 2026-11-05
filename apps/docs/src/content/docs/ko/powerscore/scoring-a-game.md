---
sourceHash: 'd23f4e1a7b17'
title: 라이브 데이터로 경기 점수 매기기
description: 내 피드를 Game 객체에 매핑하고, 폴링마다 득점 기록을 유지하고, 데이터가 받쳐주는 부스트와 모드를 켜고, 응원팀 부스트와 수동 부스트를 더해요.
section: powerscore
order: 2
navLabel: 라이브 데이터로 점수 매기기
faq:
  - q: scoreGame은 경기가 실제로 라이브인지 확인하나요?
    a: 부스트만 확인해요. 경기 status가 'in'이 아니면 부스트는 아무 점수도 주지 않아요. 시그널은 시작 전이거나 끝난 경기에도 점수를 매기고, 인터미션이나 지연 중인 경기는 0점이에요. ArenaSwap이 점수 계산기를 부르기 전에 하는 것처럼, 라이브 경기만 먼저 직접 걸러주세요.
  - q: 목록에 없는 리그에도 PowerScore를 쓸 수 있나요?
    a: 네. Game은 리그 id에 대해 제네릭이고, 내장 표에 없는 id는 그 종목의 기본값으로 점수를 매겨요. 기본값이 맞지 않으면 options.league로 호출마다 피리어드 수와 길이를 덮어쓰세요.
---

`scoreGame`은 아무것도 가져오지 않아요. 넘겨준 `Game` 객체와 컨텍스트에 점수를 매길 뿐이에요. 이 페이지에서는 가상의 피드로 둘을 만든 다음, 데이터가 허락하는 만큼 엔진의 기능을 더 켜봐요.

## 피드를 Game에 매핑하기

필수인 건 `id`, `league`, `sportType`, 두 팀의 점수뿐이에요. 나머지는 피드에 있으면 점수를 더 정교하게 만들고, 없으면 알 수 없는 값으로 처리돼요. 가진 것만 매핑하고 나머지는 건너뛰세요.

```ts
import { scoreGame } from 'powerscore';
import type { Game } from 'powerscore';

// Whatever your feed sends. This one is invented.
interface FeedEvent {
	id: string;
	state: 'scheduled' | 'live' | 'final';
	period: number;
	clock: string; // '0:45'
	halftime: boolean;
	home: { name: string; points: number };
	away: { name: string; points: number };
}

const toGame = (event: FeedEvent): Game => ({
	id: event.id,
	league: 'nba',
	sportType: 'basketball',
	homeTeam: { score: event.home.points, abbreviation: event.home.name },
	awayTeam: { score: event.away.points, abbreviation: event.away.name },
	period: event.period,
	clockSeconds: parseClock(event.clock), // '0:45' -> 45
	status: event.state === 'live' ? 'in' : event.state === 'final' ? 'post' : 'pre',
	intermission: event.halftime,
});

const score = scoreGame(toGame(event));
```

`status`는 정직하게 설정하세요. 부스트는 점수를 주기 전에 `'in'`인지 확인해요. `intermission`이나 `delayed` 플래그가 켜지면 경기가 재개될 때까지 전체 점수가 0이 돼요. 그래서 광고 시간이나 우천 지연 중인 경기가 진행 중인 경기를 앞지르지 못해요.

## 더 주면, 더 켜져요

선택 필드는 각각 그 필드가 필요한 엔진의 부분을 켜요. 하나를 빼면 그 부분은 0점이 돼요. 오류는 나지 않아요.

| 줄 것 | 위치 | 켜지는 것 |
|---|---|---|
| 오래된 것부터 정렬한 득점 스냅샷 | `context.history` | 모멘텀, 리드 변화, 추격. 스냅샷이 최소 3개 필요해요. |
| 폴링마다 0에서 1 사이의 승리 확률 | `context.winProbability` | ±5 승리 확률 보정. 값이 최소 5개 필요해요. |
| 경기가 광고 시간인지 여부 | `context.onBreak` | 광고 시간 감점. |
| 팀의 `possession`, `yardsToEndZone`, `down`, `distance`, `timeouts` | `game`, `game.homeTeam` | 투 미닛 드릴과 판타지의 풋볼 상황. |
| `isRedZone`, 그리고 `down`, `distance`, `isGoalToGo` | `game` | 레드존 부스트. |
| `baseRunners`, `outs`, `topOfInning` | `game` | 주자 상황과 역전 주자. |
| 각 팀의 `hits` | `game.homeTeam`, `game.awayTeam` | 노히트. |
| `series`, 그리고 각 팀의 `rank` | `game`, `game.homeTeam` | 중요도: 벼랑 끝 시리즈, 랭킹 팀끼리의 맞대결. |
| `context.stakes` | `context` | 중요도: 시즌 막판 순위 싸움. |
| `pregameLine` | `context` | 이변 주시. 경기 전 배당을 쓰세요. |
| `redCards` | `game` | 레드카드 부스트, 축구. |
| `powerPlay`, `emptyNet` | `context` | 하키의 득점 기회. |
| `fantasy` | `context` | 판타지 모드. |
| 각 팀의 `nickname` | `game.homeTeam`, `game.awayTeam` | `reason`에서 약어 대신 쓰는 팀 이름. |
| `seasonType`, `postseasonRound` | `game` | 중요도가 경기를 정규시즌(순위와 레이스)이 아니라 포스트시즌(시리즈)으로 읽어요. |
| `recentLeadChanges` | `context` | 폴링 사이에 뒤집힌 경우를 위한, 피드의 플레이 로그에서 가져온 리드 변화 횟수. |

필드는 모두 [타입 페이지](/arenaswap/docs/powerscore/types/#game)에 있고, 각 부스트가 주는 점수는 [부스트와 페널티](/arenaswap/docs/powerscore/boosts-and-penalties/)에 있어요.

## 모멘텀, 리드 변화, 추격을 위한 득점 기록 유지하기

이 세 시그널은 경기의 과거 점수 목록인 `context.history`에서 읽고, 스냅샷이 최소 세 개가 될 때까지 0점이에요. 폴링할 때마다 오래된 것부터 순서대로, 밀리초 단위 타임스탬프와 함께 하나씩 쌓으세요. 타임스탬프는 서로에 대해 상대적이기만 하면 돼요. 벽시계 시간일 필요는 없어요.

```ts
import { scoreGame } from 'powerscore';
import type { Game, ScoreSnapshot } from 'powerscore';

const game: Game = {
	id: 'g-401',
	league: 'nba',
	sportType: 'basketball',
	homeTeam: { score: 88, abbreviation: 'BOS' },
	awayTeam: { score: 82, abbreviation: 'LAL' },
	period: 3,
	clockSeconds: 300,
	status: 'in',
};

const history: ScoreSnapshot[] = [
	{ gameId: game.id, timestamp: 0, homeScore: 75, awayScore: 80 },
	{ gameId: game.id, timestamp: 15_000, homeScore: 79, awayScore: 80 },
	{ gameId: game.id, timestamp: 30_000, homeScore: 88, awayScore: 82 },
];

const score = scoreGame(game, { history });
```

보스턴은 5점 뒤지다가 13-2 런으로 막 리드를 잡았어요.

```ts
score.total;  // 86
score.reason; // 'BOS came back from 5 down to lead. Up 6 in the 3rd quarter'
// closeness 18, lateGame 2, momentum 38, leadChanges 12, comeback 16
```

배열이 끝없이 커지지 않도록 종목의 `historyWindowMs`보다 오래된 스냅샷은 잘라내세요. 그 구간과 나머지 종목별 설정은 [종목 및 리그 설정](/arenaswap/docs/powerscore/configuration/)에 있어요.

## 광고 시간과 승리 확률이 있다면 함께 넘기기

모두 컨텍스트에 들어가요. 경기가 광고 시간인지 알 수 있다면 `onBreak`를 넘기세요.

```ts
const score = scoreGame(game, { history, onBreak: isInBreak(game), winProbability });
```

`isInBreak`는 직접 작성하는 함수예요. 피드가 알려주는 이닝 교대, 투수 교체, 타임아웃 정보로 만드세요. `onBreak`가 `true`인 동안에는 점수에서 15점이 일괄 감점돼요.
`winProbability`는 어느 팀이든 0에서 1 사이의 최근 승리 확률 값 목록이에요. 50%에서 얼마나 떨어져 있는지만 중요해요. 둘 다 선택 사항이고, PowerScore는 없어도 잘 점수를 매겨요. 각각이 무엇을 바꾸는지는 [부스트와 페널티](/arenaswap/docs/powerscore/boosts-and-penalties/)에 있어요.

## 부스트가 그 순간을 보게 하기

야구, 풋볼, 하키, 축구에는 점수만으로는 보이지 않는 상황이 각각 있어요. 피드에 있는 필드를 추가하면 `scoreGame`이 그만큼 점수를 줘요. 9회 말, 동점, 만루, 원 아웃인 야구 경기를 볼게요.

```ts
const score = scoreGame({
	id: 'g-402',
	league: 'mlb',
	sportType: 'baseball',
	status: 'in',
	homeTeam: { score: 3, hits: 5 },
	awayTeam: { score: 3, hits: 4 },
	period: 9,
	topOfInning: false,
	outs: 1,
	baseRunners: { first: true, second: true, third: true },
});

score.boosts.filter(boost => boost.points > 0);
// [
//   { id: 'scoringOpportunity', points: 10 },
//   { id: 'goAheadRun', points: 10 },
// ]
```

이 둘을 합치면 순간 항목의 상한인 20이 채워져요. 풋볼은 `isRedZone`으로 레드존을 받고 `down`, `distance`, `isGoalToGo`로 가중치가 붙어요. 투 미닛 드릴은 `possession`, `yardsToEndZone`, `down`으로 받아요. 하키의 득점 기회에는 `context.powerPlay`와 `context.emptyNet`이 필요해요. 축구는 `redCards`가 필요해요.

## 다른 모드로 점수 매기기

`options.mode`로 모드를 고르세요. 압승은 따로 필요한 게 없어요. 판타지는 컨텍스트에 선수당 항목 하나씩 로스터가 필요해요.

```ts
const score = scoreGame(game, {
	history,
	fantasy: [
		{ id: 'p-1', name: 'Mahomes', side: 'home', position: 'QB' },
		{ id: 'p-2', name: 'Butker', side: 'home', position: 'K', pointEvents: [{ at: now - 40_000, points: 3 }] },
	],
}, { mode: 'fantasy' });
```

`pointEvents`는 지금부터 1분 전에 선수가 판타지 점수를 얻었다는 사실을 판타지 점수 시그널이 보는 방법이에요. 박스스코어 한 줄을 그 점수로 바꾸려면 [`computeFantasyPoints`](/arenaswap/docs/powerscore/api-reference/#computefantasypoints)를 쓰세요. 내 선수가 한 명도 없는 경기는 클래식으로 점수를 매기고, `score.modeId`가 그렇게 알려줘요.

## 응원팀, 포스트시즌, 수동 부스트 더하기

경기에 먼저 점수를 매기고, 시청자의 응원팀처럼 PowerScore가 모르는 것은 옵션으로 더하세요. 같은 옵션이 모든 모드에서 작동해요.

```ts
const score = scoreGame(game, { history }, {
	favoriteTeamCount: 1,
	favoriteBoostPoints: 10,
	gameBoost: 10,
});

score.total; // 106
```

응원팀 부스트와 포스트시즌 부스트는 합계에 더해지고 100에서 잘려요. `gameBoost`는 그다음에 더해지고, 100을 넘을 수 있는 유일한 값이에요. 그래서 시청자가 고정한 경기는 만점도 이길 수 있어요. 멈춘 경기는 이 부스트를 전부 건너뛰어요. 멈춘 경기가 진행 중인 경기를 앞지를 수는 없으니까요.

ArenaSwap의 [점수 계산 코드](https://github.com/hiteacheryouare/arenaswap/blob/mega/packages/core/src/scoring.ts)도 점수를 탭 전환기에 넘기기 전에 같은 방식으로 옵션을 만들어요.

## 2.x 방식

`computePowerScore(game, history, winProbabilityHistory)`는 여전히 작동하고, 순간 부스트가 없는 기존 2.x 결과를 그대로 돌려줘요. 늘 받던 숫자만 원한다면 이쪽이 맞아요. 아직 남아 있는 것들은 [API 레퍼런스](/arenaswap/docs/powerscore/api-reference/#the-2x-api)에 전부 나와 있어요.
