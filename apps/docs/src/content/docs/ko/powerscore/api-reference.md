---
sourceHash: '91a61d4e6782'
title: PowerScore API 레퍼런스
navLabel: API 레퍼런스
description: powerscore가 내보내는 모든 함수와 상수의 시그니처, 매개변수, 반환값, 그리고 입력이 없거나 잘못됐을 때의 동작. 더 이상 권장되지 않는 2.x API도 포함해요.
section: powerscore
order: 6
---

여기 있는 모든 것은 패키지 루트에서 내보내져요. `import { ... } from 'powerscore'`로 가져오세요. 3.0 함수가 먼저 나오고, 그다음 헬퍼, 내장 모드를 이루는 조각, 상수 순이에요. 마지막은 2.x API로, 더 이상 권장되지 않지만 예전과 똑같이 작동해요. 타입은 [PowerScore TypeScript 타입](/arenaswap/docs/powerscore/types/)에 있어요.

## 점수 매기기

### scoreGame

```ts
function scoreGame(
	game: Game<string>,
	context?: ScoringContext,
	options?: ScoreOptions,
): PowerScore
```

메인 진입점이에요. 모드 하나로 경기에 점수를 매기고 [`PowerScore`](/arenaswap/docs/powerscore/types/#powerscore)를 돌려줘요. 합계, 목록으로 정리된 모든 시그널과 부스트, 그리고 이유가 들어 있어요.

| 매개변수 | 기본값 | 설명 |
|---|---|---|
| `game` | 필수 | 현재 경기 상태예요. 꼭 필요한 건 `id`, `league`, `sportType`, 두 팀의 점수뿐이에요. |
| `context` | `{}` | 기록, 승리 확률, 경기 전 배당, 판타지 로스터 등 경기가 담고 있지 않은 나머지예요. [`ScoringContext`](/arenaswap/docs/powerscore/types/#scoringcontext)를 보세요. |
| `options` | `{}` | 어떤 모드로 할지, 어떤 시그널을 끌지, 그리고 응원팀, 포스트시즌, 수동 부스트예요. [`ScoreOptions`](/arenaswap/docs/powerscore/types/#scoreoptions)를 보세요. |

선택 필드가 없어도 오류를 던지지 않아요. 그 필드가 필요한 엔진의 부분이 0점이 돼요. 인식되지 않는 `league`는 그 종목의 기본값으로 점수를 매겨요. 입력 어디에서든 유한하지 않은 값은 `NaN`으로 퍼지지 않고 없는 것으로 취급해요.

멈춘 경기(`intermission` 또는 `delayed`)는 모든 부스트를 포함해 전부 0점이고, `reason`은 비어 있어요. `game.status`는 부스트만 읽고, `'in'`이 아니면 부스트는 아무 점수도 주지 않아요.

합계는 정해진 순서로 만들어져요.

1. 시그널이 점수를 매겨요. 꺼진 시그널은 재조정으로 빠져요.
2. 광고 시간 감점이 빠져요.
3. 승리 확률 보정이 더해져요 (클래식만). 결과는 0에서 100으로 제한돼요.
4. 모드 자체의 부스트가 묶음 상한 안에서 더해지고, 합계는 100에서 잘려요.
5. 모드가 클래식과 섞이는 경우(바닥, 혼합, 부스트)는 여기서 적용돼요.
6. 응원팀과 포스트시즌 부스트가 더해지고, 합계는 다시 100에서 잘려요. `paysPostseason: false`인 모드는 포스트시즌 부스트를 건너뛰어요.
7. `gameBoost`가 마지막에 더해져요. 100을 넘을 수 있는 유일한 값이에요.

```ts
const score = scoreGame(game, { history }, { mode: 'blowouts' });
score.total;  // 0–100
score.reason; // 'BOS on a 12–0 run. Up 28 in the 3rd quarter'
```

### signalPoints와 boostPoints

```ts
function signalPoints(score: Pick<PowerScore, 'signals'>, id: string): number
function boostPoints(score: Pick<PowerScore, 'boosts'>, id: string): number
```

결과에서 id로 항목 하나를 조회해요. 없는 id면 둘 다 `0`을 돌려줘요.

### createSignalInput

```ts
function createSignalInput(
	game: Game<string>,
	context: ScoringContext,
	options?: ScoreOptions,
): SignalInput
```

시그널이나 부스트의 `compute`가 받는 [`SignalInput`](/arenaswap/docs/powerscore/types/#signalinput)을 만들어요. 경기, 컨텍스트, 확정된 종목 및 리그 설정, `progress`, `now`, `margin`이 들어 있어요. `scoreGame`이 내부적으로 부르는 함수이고, 직접 만든 시그널을 단독으로 테스트할 수 있도록 내보내져 있어요.

## 모드

### defineMode

```ts
function defineMode(mode: PowerScoreMode): PowerScoreMode
```

모드를 미리 한 번 검사하고 그대로 돌려줘요. 시그널 두 개가 id를 공유하거나, 시그널의 상한이 양수가 아니거나, 모드에 시그널이 없으면 오류를 던져요.

```ts
import { defineMode, scoreGame, type PowerScoreMode } from 'powerscore';

const overtimeOnly: PowerScoreMode = defineMode({
	id: 'overtimeOnly',
	signals: [
		{
			id: 'extraTime',
			ceiling: 100,
			compute: ({ game, league }) => (
				(game.period ?? 0) > league.regularPeriods
					? { points: 100, reason: { key: 'overtime' } }
					: { points: 0 }
			),
		},
	],
	boosts: [],
	reasonPriority: ['extraTime'],
	usesBreakPenalty: false,
	usesWinProbability: false,
});

scoreGame(game, context, { mode: overtimeOnly });
```

시그널의 `compute`는 경기, 컨텍스트, 확정된 종목 및 리그 설정, 경기의 `progress`(시작은 0, 정규 시간 종료와 연장 내내는 1), `margin`을 받아요. 상한으로 제한된 `points`와 선택 사항인 `reason`을 돌려줘요. 모드는 `boosts`, `bucketCaps`, `classicBlend`, `paysPostseason`(기본값 `true`, `false`면 포스트시즌 부스트를 주지 않아요), 그리고 할 말이 없는 경기를 클래식으로 보내는 `appliesTo(game, context)`도 가질 수 있어요.

`reasonPriority`는 이유를 읽을 수 있는 시그널의 목록이에요. 그중 가장 강한 시그널이 말하고, 동점이면 순서로 가려요. 내장 모드가 아는 이유 키는 `score.reason`에 영어로 렌더링돼요. 직접 만든 키는 그 키 그대로 렌더링되니, 문자열이 아니라 `score.reasons`에서 번역하세요.

### classicMode, blowoutsMode, fantasyMode, builtInModes, getMode

`classicMode`, `blowoutsMode`, `fantasyMode`는 내장 `PowerScoreMode` 객체 세 개예요. `builtInModes`는 같은 세 개를 id로 묶은 것이고, `getMode(idOrMode)`는 id, 모드 객체, 또는 아무것도 없는 경우(클래식)를 풀어줘요. 펼쳐서 그 위에 쌓을 수 있어요. 3.0 부스트가 없는 클래식을 얻으려면 이렇게 하세요.

```ts
scoreGame(game, context, { mode: { ...classicMode, boosts: [] } });
```

### 시그널과 부스트

내장 모드를 이루는 조각도 내보내져 있어서, 직접 만든 모드가 재사용할 수 있어요.

| 내보내기 | 설명 |
|---|---|
| `classicSignals`, `blowoutsSignals`, `fantasySignals` | 각 모드의 시그널 목록이에요. |
| `closenessSignal`, `lateGameSignal`, `momentumSignal`, `leadChangesSignal`, `comebackSignal` | 클래식의 다섯 가지를 하나씩이에요. |
| `scoringOpportunityBoost`, `goAheadRunBoost`, `twoMinuteDrillBoost`, `noHitterBoost`, `redCardBoost`, `upsetWatchBoost`, `upsetRoutBoost`, `stakesBoost` | 각 부스트의 `BoostDefinition`이에요. 각각이 주는 점수는 [부스트와 페널티](/arenaswap/docs/powerscore/boosts-and-penalties/)에 있어요. |
| `underdogProbability(line, sportType, league)` | `PregameLine`에서 계산한, 경기 전 언더독의 확률이에요. 배당으로 알 수 없으면 `undefined`예요. |
| `postseasonBoostShare(round)` | 라운드가 받는 포스트시즌 부스트의 비율이에요. 1, 0.75, 0.5, 0.25, 라운드가 없으면 0이에요. |
| `applyProgressFloor`, `findLeadChanges` | 접전도와 리드 변화 뒤에 있는 두 헬퍼예요. |
| `baseMask(baseRunners)`, `runnersOn(mask)` | 베이스를 1루가 가장 낮은 3비트 숫자로(`0b101`은 1루와 3루 주자) 바꾸는 함수와, 그게 주자 몇 명인지 세는 함수예요. |

## 이유

```ts
function renderReasonEnglish(fragment: ReasonFragment): string
function renderReasonsEnglish(fragments: readonly ReasonFragment[]): string
```

이유 문장 하나, 또는 여러 개를 이어 붙인 문장들을 영어로 렌더링해요. `score.reason`을 채우는 함수예요. 직접 이유를 만들면서 같은 방식으로 읽히게 하고 싶을 때 쓰세요. `ordinal(n)`은 이들이 쓰는 영어 서수("2nd", "11th", "21st")를 돌려줘요.

## 설정과 진행도

```ts
function resolveSportConfig(sportType: SportType, override?: Partial<SportTypeConfig>): SportTypeConfig
function resolveLeagueConfig(game: Pick<Game<string>, 'league' | 'sportType'>, override?: Partial<LeagueConfig>): LeagueConfig
function getGameProgress(game: Game<string>, sport: SportTypeConfig, league: LeagueConfig): number
function scoreMargin(game: Game<string>): number
```

`resolveSportConfig`와 `resolveLeagueConfig`는 `scoreGame`이 호출 맨 처음에 하는 일을 해요. 알 수 없는 `sportType`은 농구 설정으로 대체돼요. 알 수 없는 리그는 그 종목에서 가장 잘 알려진 리그로 대체돼요. 농구는 NBA, 하키는 NHL, 야구는 MLB, 풋볼은 NFL, 소프트볼은 NCAA 소프트볼, 축구는 MLS예요. `getGameProgress`는 시작에서 0이고, 정규 시간 종료와 연장 내내 1이에요. `scoreMargin`은 점수 차의 절댓값이에요.

## 판타지 점수

판타지의 판타지 점수 시그널에는 판타지 포인트가 필요해요. 이 함수들은 박스스코어 한 줄을 그 포인트로 바꿔줘요. 어떤 기록을 쓸지는 정하는 쪽이 정하고, 함수들은 점수를 매겨요.

### computeFantasyPoints

```ts
function computeFantasyPoints(
	sport: FantasySport,
	stats: Partial<Record<string, number>>,
	overrides?: Partial<Record<string, number>>,
): number
```

기록 한 줄의 합계를 소수 둘째 자리로 반올림해서 돌려줘요. 알 수 없는 기록과 유한하지 않은 값은 무시해요. 수비의 `pointsAllowed`는 구간별로 점수를 매겨요.

```ts
import { computeFantasyPoints } from 'powerscore';

computeFantasyPoints('football', {
	passingYards: 310,
	passingTouchdowns: 3,
	interceptionsThrown: 1,
	rushingYards: 22,
}); // 12.4 + 12 − 2 + 2.2 = 24.6
```

### defaultFantasyScoring, resolveFantasyScoring, fantasySportOf

`defaultFantasyScoring`에는 `'football'`(풀 PPR), `'basketball'`, `'baseball'`, `'hockey'`의 기본 규칙이 들어 있어요. 각 규칙은 `{ points, min, max }`라서 설정 화면에서 범위를 강제할 수 있어요.

```ts
defaultFantasyScoring.football.receptions; // { points: 1, min: 0, max: 2 }
```

`resolveFantasyScoring(sport, overrides?)`는 규칙을 평범한 숫자로 돌려줘요. 덮어쓴 값은 그 규칙의 범위로 제한되고, 없는 규칙은 무시돼요.

```ts
resolveFantasyScoring('football', { receptions: 0.5 }).receptions; // 0.5, half PPR
resolveFantasyScoring('football', { receptions: 5 }).receptions;   // 2, held to its bound
```

`fantasySportOf(sportType)`는 `sportType`을 네 가지 판타지 종목 중 하나로 대응시켜요. 소프트볼은 야구로 치고, 축구에는 없어서 `undefined`를 돌려줘요.

## 상수

| 상수 | 값 |
|---|---|
| `scoreMaxCloseness` | 42 |
| `scoreMaxLateGame` | 38 |
| `scoreMaxMomentum` | 38 |
| `scoreMaxLeadChanges` | 18 |
| `scoreMaxComeback` | 20 |
| `scoreMaxSignalsSubtotal` | 156 (클래식의 다섯 가지 상한의 합) |
| `scoreMaxTotal` | 100 |
| `breakPenalty` | 15, `context.onBreak`가 `true`인 동안의 일괄 감점 |
| `scoreWinProbVarianceMax` | 5 |
| `boostBucketCaps` | `{ moment: 20, noHitter: 70, context: 16 }` |

클래식의 상한이 100점 한도를 넘는 이유는 [모드별 PowerScore 시그널](/arenaswap/docs/powerscore/signals/#why-the-ceilings-add-up-to-more-than-the-total)에 있어요. 상한은 [부스트와 페널티](/arenaswap/docs/powerscore/boosts-and-penalties/#caps-on-the-buckets)에서 설명해요.

`scoringOpportunityBaseRunnerBoosts`, `scoringOpportunityRedZoneBoost`, `scoringOpportunityRedZoneFringeBoost`, `redZoneDownMultipliers`, `thirdAndShortDistance`에는 득점 기회 부스트의 정확한 값이 들어 있고, [부스트와 페널티](/arenaswap/docs/powerscore/boosts-and-penalties/)에 표로 정리돼 있어요. 더 새로운 부스트의 숫자는 `goAheadRunTunables`, `twoMinuteDrillTunables`, `noHitterTunables`, `redCardTunables`, `upsetTunables`, `stakesTunables`, `hockeyTunables`에 있어요.

`scorerTunables`에는 엔진이 점수를 매기는 모든 구간의 값이 들어 있어요. 위의 상수들이 이미 이름으로 알려주는 것과 같은 숫자예요. 그래서 사용하는 쪽이 구간 값을 하드코딩하지 않고 읽을 수 있어요.

`sportTypeConfigs`, `sportTypeConfigMap`, `leagueConfigs`, `leagueConfigMap`, `allLeagueIds`에는 엔진이 호출마다 읽는 종목과 리그 설정이 들어 있어요. 필드와 모든 종목과 리그의 실제 값은 [종목 및 리그 설정](/arenaswap/docs/powerscore/configuration/)에 있어요.

## 2.x API

여전히 내보내지고 작동하며, 표시된 곳은 더 이상 권장되지 않아요. 3.0에서 제거된 건 없어요. 모드나 새 부스트가 필요해지면 `scoreGame`으로 옮기세요. 그때까지는 예전과 같은 숫자를 돌려줘요.

### computePowerScore

```ts
function computePowerScore(
	game: Game,
	history?: ScoreSnapshot[],
	winProbabilityHistory?: number[],
): PowerScoreResult
```

더 이상 권장되지 않아요. 클래식의 시그널 다섯 개에 점수를 매기고, 승리 확률 보정을 적용해서, 평평한 `PowerScoreResult`(`closeness`, `lateGame`, `momentum`, `leadChanges`, `comeback`, `total`, `reason` 등)를 돌려줘요. 클래식 모드의 `scoreGame`에서 시그널만 남겨 평평하게 만든 것이라 순간 부스트는 하나도 들어 있지 않아요.

| 매개변수 | 기본값 | 설명 |
|---|---|---|
| `game` | 필수 | 현재 경기 상태예요. |
| `history` | `[]` | 최근 득점 스냅샷이에요. 최소 3개가 들어 있기 전까지 모멘텀, 리드 변화, 추격은 0이에요. |
| `winProbabilityHistory` | `[]` | 0에서 1 사이의 최근 승리 확률 값이에요. 유한한 값이 최소 5개 있어야 반영돼요. |

오류를 던지지 않아요. `isPlayFrozen(game)`이 true이면 즉시 전부 0인 결과를 돌려줘요. `game.status`는 확인하지 않아요. 다른 필드가 같다면 `'pre'`나 `'post'` 경기도 `'in'` 경기와 같은 점수예요.

### computeScoringOpportunityBoost

```ts
function computeScoringOpportunityBoost(game: Game<string>): number
```

더 이상 권장되지 않아요. 이 숫자는 `scoreGame`의 `boosts` 목록에 `scoringOpportunity`로 들어 있어요. `game.status === 'in'`이고 경기가 멈추지 않은 경우가 아니면 `0`을 돌려줘요. 그렇다면 야구와 소프트볼은 주자 수에 따라 0에서 10, 풋볼은 레드존 점수 차와 다운에 따라 0에서 15를 돌려줘요. 그 밖의 모든 `sportType`은 `0`이에요. 하키도 마찬가지인데, 하키의 파워플레이와 빈 골대는 이 함수가 받지 않는 `context`에서 오기 때문이에요. `computePowerScore`의 `total`에는 포함되지 않아요.

### computeWinProbVarianceScore

```ts
function computeWinProbVarianceScore(winProbHistory: number[]): number | undefined
```

승리 확률 기록을 ±5 보정값에 대응시켜요. 먼저 유한하지 않은 항목을 걸러내고, 유한한 값이 5개 미만이면 `undefined`를 돌려줘요. 그렇지 않으면 `-scoreWinProbVarianceMax`에서 `scoreWinProbVarianceMax` 사이의 정수를 돌려줘요.

### isPlayFrozen

```ts
function isPlayFrozen(game: Game<string>): boolean
```

`game.intermission === true`이거나 `game.delayed === true`이면 `true`를, 그 외에는 두 필드가 모두 없는 경우를 포함해 `false`를 돌려줘요.

### computeGameProgress

```ts
function computeGameProgress(game: Game<string>): number
```

종반 압박 시그널이 읽는 것과 같은 시계로, 경기가 정규 시간을 얼마나 지났는지를 0에서 1로 돌려줘요. 경기를 타임라인에 그릴 때 편해요.

### normalizePowerScoreResult

```ts
function normalizePowerScoreResult(
	score: Partial<PowerScoreResult> & Pick<PowerScoreResult, 'gameId'>,
	options?: { allowTotalOverflow?: boolean },
): PowerScoreResult
```

더 이상 권장되지 않아요. 일부만 있거나 믿을 수 없는 `PowerScoreResult`(`gameId`만 필수)를 받아서 완전히 제한된 유효한 결과로 돌려줘요. `computePowerScore`가 만드는 모든 결과에 내부적으로 이 함수를 불러요.

다섯 시그널 필드는 각자의 상한으로 제한돼요. `total`은 `options.allowTotalOverflow`가 `true`가 아니면 `scoreMaxTotal`로 제한돼요. 이 옵션을 켜면 최소 `0`으로만 제한되어, 수동 부스트가 일부러 100을 넘길 수 있어요. `total`이 없거나 유한하지 않으면 날것의 합이 아니라 다섯 시그널의 합에서 `breakPenalty`를 뺀 값으로 대체돼요. `reason`이 문자열이 아니면 `scorerTunables.reasons.fallback`("best game available")으로 대체돼요. `favoriteBonus`, `favoriteTeamCount`, `gameBoost`, `scoringOpportunityBoost`, `postseasonBoost`는 주어지면 반올림되고 `0` 아래로 내려가지 않아요. 주어지지 않으면 `0`으로 채우지 않고 결과에서 아예 빠져요. 오류를 던지지 않아요.

### 옮기면 달라지는 것

`scoreGame`을 거친 클래식에는 새 부스트가 들어 있어서, 같은 경기가 `computePowerScore`보다 높은 점수를 받을 수 있어요. 최대 묶음 상한만큼이에요. `normalizePowerScoreResult` 주변에서 직접 더하던 응원팀, 포스트시즌, 수동 부스트는 이제 `scoreGame`의 옵션이에요. 나머지는 모두 그대로 이어져요. `Game` 타입에 선택 필드와 리그 타입 매개변수가 생겼지만, 그냥 `Game`은 예전과 같은 뜻이에요. 표에 없는 리그 id는 예전에는 종목과 상관없이 NBA 설정으로 점수가 매겨졌어요. 이제는 그 종목 자신의 기본값을 받아서, 알 수 없는 리그의 하키 경기는 NHL의 피리어드와 시계를 받아요.
