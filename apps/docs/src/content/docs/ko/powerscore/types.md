---
sourceHash: '40ee38646993'
title: PowerScore TypeScript 타입
description: Game, ScoringContext, ScoreOptions, PowerScore, 그리고 모드와 설정 타입의 모든 필드, 어떤 것이 선택 사항인지, 선택 필드가 없을 때 어떻게 되는지.
section: powerscore
order: 7
navLabel: 타입
---

PowerScore 3의 타입은 세 그룹으로 나뉘어요. `scoreGame`에 넘기는 것: [`Game`](#game), [`ScoringContext`](#scoringcontext), [`ScoreOptions`](#scoreoptions). 돌려받는 것: [`PowerScore`](#powerscore). 그리고 모드를 이루는 것: [`PowerScoreMode`](#powerscoremode)와 그 조각들이에요. 2.x 타입은 맨 끝에 있고, 여전히 내보내지고 작동해요.

## Game

지금 이 순간의 경기 상태예요. 꼭 필요한 건 `id`, `league`, `sportType`, 두 팀의 점수뿐이에요. 나머지는 있을 때 점수를 더 정교하게 만들어요. 선택 필드가 없으면 기본값이 아니라 알 수 없는 값으로 취급돼요.

`Game`은 리그 id에 대해 제네릭이에요. `Game<League extends string = LeagueId>`예요. 그냥 `Game`은 예전과 같은 뜻이에요. 자체 리그 id를 쓰는 피드는 `Game<string>`을 써요.

| 필드 | 타입 | 없으면 |
|---|---|---|
| `id` | `string` | 필수예요. |
| `league` | `League` | 필수예요. `leagueConfigMap`이 인식하지 못하는 id는 그 종목의 기본값으로 점수를 매겨요 ([종목 및 리그 설정](/arenaswap/docs/powerscore/configuration/#tune-it-for-a-league-powerscore-doesnt-ship) 참고). |
| `sportType` | `SportType` | 필수예요. `sportTypeConfigMap`이 인식하지 못하는 값은 농구 설정으로 대체돼요. |
| `homeTeam` / `awayTeam` | [`TeamState`](#teamstate) | 필수예요. |
| `period?` | `number` | 종반 압박이 `0`으로 읽혀요. 접전도는 여전히 점수를 매기지만 경기 진행도도 `0`으로 읽혀서, 단계 값 전부가 아니라 고정 바닥만 지급해요. |
| `clockSeconds?` | `number` | `0:00`이 아니라 알 수 없는 값으로 취급돼요. 종반 상승은 피리어드 시작에 머물고, 시계로 제한되는 모든 부스트는 0점이에요. |
| `intermission?` | `boolean` | `false`예요. `true`이면 경기가 멈춰요. 경기가 재개될 때까지 전부 0점이에요. |
| `delayed?` | `boolean` | `false`예요. `true`이면 `intermission`처럼 경기가 멈춰요. |
| `status?` | `'pre' \| 'in' \| 'post'` | `'in'`이 아니면 값이 없는 경우를 포함해 부스트가 점수를 주지 않아요. 시그널은 이 값을 읽지 않아요. |
| `topOfInning?` | `boolean` | 야구와 소프트볼이에요. 이닝 초와 말의 접전도 값 사이에서 점수를 매겨요. 역전 주자 출루와 노히터에 필요해요. |
| `baseRunners?` | `{ first: boolean; second: boolean; third: boolean }` | 야구와 소프트볼이에요. 주자가 없는 것으로 취급돼요. |
| `outs?` | `number` | 야구와 소프트볼이에요. 0으로 취급돼요. 3이면 주자 기반 부스트는 점수를 주지 않아요. |
| `possession?` | `'home' \| 'away'` | 풋볼이에요. 피드가 알려주는 경우 하키의 퍽도 해당돼요. 없으면 투 미닛 드릴은 0점이고 판타지는 풋볼 상황을 갖지 못해요. |
| `yardsToEndZone?` | `number` | 풋볼이에요. 공을 가진 팀에게 필요한 야드예요. 투 미닛 드릴과 판타지에 필요해요. |
| `isRedZone?` | `boolean` | 풋볼 전용이에요. `false`이거나 없으면 득점 기회 부스트의 레드존 경우는 0점이에요. |
| `down?` | `number` | 풋볼 전용이에요. 부스트를 통째로 잃는 대신 가중치 없는(×1) 배수로 넘어가요. 투 미닛 드릴과 판타지에서 1보다 작은 `down`은 플레이 사이로 읽혀요. |
| `distance?` | `number` | 풋볼 전용이에요. 3다운에서 값이 없으면 3rd-and-short로 인정될 수 없어서 ×1로 넘어가요. |
| `isGoalToGo?` | `boolean` | 풋볼 전용이고, 4다운에서만 달라지는 게 있어요. |
| `series?` | [`SeriesState`](#seriesstate) | 시리즈가 없으니 중요도는 없음으로 읽어요. |
| `redCards?` | [`RedCard[]`](#redcard) | 축구예요. 카드가 없어요. |
| `seasonType?` | `'regular' \| 'postseason'` | 이 값이 그렇게 말하거나 `postseasonRound`가 설정돼 있으면 중요도는 경기를 포스트시즌으로 보고, 아니면 정규시즌으로 봐요. |
| `postseasonRound?` | `0 \| 1 \| 2 \| 3` | 포스트시즌 부스트가 없어요. `0`은 우승 결정, `1`은 준결승, `2`는 8강, `3`은 그 이전이에요. |

`SportId`는 1.x 호환을 위해 남겨둔, 더 이상 권장되지 않는 `LeagueId`의 별칭이에요. `LeagueId`를 쓰세요.

### TeamState

```ts
interface TeamState {
	score: number;
	abbreviation?: string;
	nickname?: string;
	rank?: number;
	hits?: number;
	errors?: number;
	timeouts?: number;
}
```

| 필드 | 없으면 |
|---|---|
| `score` | 필수예요. |
| `abbreviation` | `nickname`도 없을 때 이유에서 팀을 부르는 이름이고, 둘 다 없으면 `?`로 나와요. |
| `nickname` | 이유에서 팀을 부르는 이름이에요. "Lakers", "Nittany Lions", 또는 "Portland" 같은 축구 클럽의 짧은 이름이에요. 없으면 `abbreviation`으로 대체돼요. |
| `rank` | 랭킹에 없는 팀이에요. 토너먼트 시드도 넣지 마세요. 이건 1위가 가장 좋은 투표 순위예요. 중요도는 두 팀 모두에 필요해요. |
| `hits` | 야구와 소프트볼이에요. 안타 수가 없으니 노히터는 점수를 줄 수 없어요. `0`은 실제 값이에요. 무안타 팀이라는 뜻이에요. |
| `errors` | 야구와 소프트볼이에요. 지금은 어떤 점수도 읽지 않아요. |
| `timeouts` | 풋볼이에요. 투 미닛 드릴은 시계 관리에 중립 가중치를 써요. |

### SeriesState

```ts
interface SeriesState {
	homeWins: number;
	awayWins: number;
	bestOf: number; // 7 for best-of-seven
}
```

3전 2선승제보다 짧은 시리즈는 점수를 주지 않아요.

### RedCard

```ts
interface RedCard {
	side: 'home' | 'away';
	minute: number; // elapsed game minute the card was shown
}
```

## ScoringContext

경기 자체가 담고 있지 않은 모든 것이에요. 모든 필드가 선택 사항이고, `scoreGame`은 객체 전체를 두 번째 인수로 받아요.

| 필드 | 타입 | 없으면 |
|---|---|---|
| `history?` | [`ScoreSnapshot[]`](#scoresnapshot) | 3개가 들어 있기 전까지 모멘텀, 리드 변화, 추격은 0이에요. 오래된 것부터예요. |
| `onBreak?` | `boolean` | 호출하는 쪽이 광고 시간을 감지했어요. `true`이면 시그널 소계에서 `breakPenalty`(15)를 빼요. 없으면 광고 시간 감점이 없어요. |
| `winProbability?` | `number[]` | 경기 내내의 홈 팀 승리 확률이에요, 0에서 1. 영향을 주려면 유한한 값 5개가 필요해요. 없으면 보정이 없어요. |
| `pregameLine?` | [`PregameLine`](#pregameline) | 이변 주시와 이변 대승이 0점이에요. |
| `stakes?` | `Partial<Record<'home' \| 'away', TeamStakes>>` | 순위 싸움 중요도가 없어요. [`TeamStakes`](#teamstakes)를 보세요. |
| `powerPlay?` | `'home' \| 'away' \| boolean` | 득점 기회 부스트에 파워플레이가 없어요. 피드가 어느 팀인지 알려주면 그 쪽(side)을, 진행 중이라는 사실만 알려주면 `true`를 넣어요. |
| `emptyNet?` | `'home' \| 'away' \| boolean` | 득점 기회 부스트에 빈 골대가 없어요. 피드가 연속 두 번의 폴링에서 보고한 뒤에만 설정하세요. |
| `recentLeadChanges?` | `{ count: number; lastAt?: number }` | 폴링 사이에 뒤집힌 경우도 보는 피드 자체의 플레이 로그에서 센 리드 변화 횟수와 가장 최근 시각이에요. `history`가 보여주는 것보다 많이 세었을 때 써요. 리드 변화는 여전히 스냅샷 3개가 필요해요. |
| `fantasy?` | [`FantasyPlayerState[]`](#fantasyplayerstate) | 판타지에 선수가 없고, 경기는 클래식으로 점수를 매겨요. |

### ScoreSnapshot

모멘텀, 리드 변화, 추격을 감지하는 데 쓰는, 어느 한 시점의 경기 점수 기록이에요. 네 필드 모두 필수예요.

```ts
interface ScoreSnapshot {
	gameId: string;
	timestamp: number;
	homeScore: number;
	awayScore: number;
}
```

`timestamp`는 같은 배열의 다른 스냅샷에 대해 상대적이기만 하면 돼요. 감쇠는 벽시계 시간이 아니라 가장 최신 스냅샷의 타임스탬프를 기준으로 측정돼요. 같은 기록을 다시 재생하면 언제 재생하든 같은 결과가 나와요.

### PregameLine

경기 전 시점의 배당이에요. 라이브 배당은 점수와 함께 움직여서 이변을 지워 버려요.

```ts
interface PregameLine {
	favorite: 'home' | 'away';
	spread?: number;
	favoriteMoneyline?: number;
	underdogMoneyline?: number;
	drawMoneyline?: number;
}
```

`spread`는 우승 후보에게 부여된 점수를 양수로 적은 값이고, 농구와 풋볼만 읽어요. 머니라인이 둘 다 있으면 북메이커의 마진을 빼고 써요. `drawMoneyline`은 축구의 3-way 배당이에요. 런 라인이나 퍽 라인만으로는 누가 유리한지는 알아도 얼마나 유리한지는 몰라서 충분하지 않아요.

### TeamStakes

한 팀의 시즌 막판 순위 싸움 플래그예요. 정규시즌 전용이에요.

```ts
interface TeamStakes {
	canClinch?: boolean;
	canBeEliminated?: boolean;
	inRace?: boolean;
	nearLine?: 'title' | 'relegation' | 'topQualification' | 'other';
}
```

`canClinch`는 이 경기를 이기면 다른 일이 어떻게 되든 자리, 디비전, 우승 중 하나를 확정한다는 뜻이에요. `canBeEliminated`는 지면 팀이 경쟁에서 탈락한다는 뜻이에요. `inRace`는 아직 경쟁 중이라는 뜻이에요. 안전하지도 탈락하지도 않았어요. `nearLine`은 순위표의 어떤 선에서 몇 점 차 안에 있다는 뜻이에요.

### FantasyPlayerState

경기에 있는 로스터 선수 한 명이에요.

```ts
interface FantasyPlayerState {
	id: string;
	name?: string;
	side: 'home' | 'away';
	position: FantasyPosition;
	active?: boolean;
	role?: 'atBat' | 'onDeck' | 'inHole' | 'pitching';
	pointEvents?: { at: number; points: number }[];
}
```

`FantasyPosition`은 `'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DST' | 'P' | 'H' | 'player'`예요. 풋볼 포지션, 야구의 투수와 타자, 그 밖의 종목의 일반 선수예요. `name`은 "Mahomes in the red zone" 같은 이유에 나타나요. `active: false`는 피드가 그 선수가 경기에서 빠졌다고 말한다는 뜻이고, 아무것도 반영되지 않아요. `role`은 야구 전용이고, 선수가 이닝의 어디에 있는지예요. `pointEvents`는 들어온 대로의 판타지 점수라서, 최근 활약은 다른 이벤트처럼 사그라들어요.

## ScoreOptions

점수를 매기는 방법이에요. 모든 필드가 선택 사항이고, `scoreGame`은 객체를 세 번째 인수로 받아요.

| 필드 | 타입 | 하는 일 |
|---|---|---|
| `mode?` | `'classic' \| 'blowouts' \| 'fantasy' \| PowerScoreMode` | 어떤 모드로 경기에 점수를 매길지예요. 없으면 클래식이에요. |
| `disabledSignals?` | `readonly string[]` | 끌 모드의 시그널 id예요. 나머지는 모드의 전체 범위로 재조정돼요. |
| `classicDisabledSignals?` | `readonly string[]` | 클래식이 섞이거나 바닥으로 쓰일 때 클래식에서 끌 시그널 id예요. |
| `classicBlend?` | [`ClassicBlend`](#classicblend) | 시청자의 판타지 슬라이더처럼, 모드 자체의 섞는 방식을 덮어써요. |
| `favoriteTeamCount?` | `number` | 경기에 응원팀이 몇 개 있는지예요. |
| `favoriteBoostPoints?` | `number` | 응원팀 하나당 점수예요. |
| `postseasonBoostPoints?` | `number` | 우승을 가리는 경기의 점수예요. 앞선 라운드는 비율만큼 받아요. |
| `gameBoost?` | `number` | 수동 부스트예요. 합계를 100 너머로 밀 수 있는 유일한 값이에요. |
| `sport?` | `Partial<SportTypeConfig>` | 내장 표와 맞지 않는 종목이거나, 표를 조정하고 싶을 때 써요. |
| `league?` | `Partial<LeagueConfig>` | 내장 표가 모르는 리그에 써요. `regularPeriods`와 `periodDurationSecs`를 설정하세요. |

## PowerScore

`scoreGame`이 돌려주는 것이에요.

```ts
interface PowerScore {
	gameId: string;
	modeId: string;
	total: number;
	signals: ScoredSignal[];
	signalsSubtotal: number;
	scaledSubtotal: number;
	signalCeiling: number;
	frozen: boolean;
	onBreak: boolean;
	breakPenalty: number;
	winProbabilityVariance?: number;
	baseTotal: number;
	classicTotal?: number;
	blend?: BlendResult;
	boosts: ScoredBoost[];
	reasons: ReasonFragment[];
	reason: string;
}
```

| 필드 | 의미 |
|---|---|
| `modeId` | 실제로 경기에 점수를 매긴 모드예요. 경기에 로스터 선수가 없는 판타지처럼 적용되지 않는 모드는 `'classic'`으로 대체돼요. |
| `total` | 0에서 100이고, 100을 넘는 건 `gameBoost`를 통해서만이에요. |
| `signals` | 모드가 정의한 모든 시그널과 그 상한이에요. 0점이어도 들어 있어요. [`ScoredSignal`](#scoredsignal-scoredboost-and-reasonfragment)을 보세요. |
| `signalsSubtotal` | 꺼진 시그널 때문에 재조정하기 전의, 켜진 시그널의 합이에요. |
| `scaledSubtotal` | 재조정한 뒤의 같은 값이고, `signalCeiling`에서 잘려요. |
| `signalCeiling` | 모드의 상한의 합이에요. 클래식은 156이에요. |
| `frozen` | 하프타임, 인터미션, 지연 중이면 `true`예요. 전부 0점이고 `reason`은 비어 있어요. |
| `onBreak`, `breakPenalty` | 광고 시간 감점이 적용됐는지, 그리고 몇 점을 뺐는지예요 (항상 ≥ 0). 멈춘 점수에서는 각각 `false`와 `0`이에요. |
| `winProbabilityVariance?` | −5에서 +5예요. 승리 확률 데이터가 부족하면 `0`이 아니라 없어요. |
| `baseTotal` | 시그널에서 광고 시간 감점을 빼고 보정을 더한 값이에요. 0에서 100이고, 부스트 전이에요. |
| `classicTotal?` | 모드가 클래식과 섞일 때 클래식 자체의 합계예요. |
| `blend?` | 섞인 모드가 합계에 이른 과정이에요. [`BlendResult`](#blendresult)를 보세요. |
| `boosts` | 모드가 지급하는 모든 부스트이고, 점수를 주지 않으면 0이에요. 요청했다면 `favoriteBoost`, `postseasonBoost`, `gameBoost`도 들어 있어요. |
| `reasons` | 번역할 수 있는 조각 형태의 사실 문장이 최대 세 개예요. 지금 벌어지는 일, 방금 벌어진 일, 점수와 시간, 걸려 있는 것이에요. 모든 키는 [README의 이유 표](https://github.com/hiteacheryouare/arenaswap/blob/mega/packages/powerscore/README.md#reasons)를 보세요. |
| `reason` | 같은 내용을 영어 문장으로 만든 거예요. API가 아니라 표시용 텍스트라서 버전 사이에 표현이 바뀔 수 있어요. 이 문자열로 매칭하지 마세요. |

### ScoredSignal, ScoredBoost, ReasonFragment

```ts
interface ScoredSignal { id: string; points: number; ceiling: number; disabled: boolean }
interface ScoredBoost  { id: string; points: number; meta?: Record<string, number>; details?: ReasonFragment[] }
interface ReasonFragment { key: string; params?: Record<string, string | number> }
```

부스트의 `meta`에는 UI가 말하고 싶어 할 만한 것이 들어 있어요. 노히터의 `{ inning: 8 }`이나 투 미닛 드릴의 `{ secondsLeft: 95, trailBy: 3 }` 같은 거예요. 이유 조각은 `{ key: 'run', params: { team: 'Lakers', scoredFor: 12, scoredAgainst: 2 } }` 같은 모양이에요. 내장 모드가 아는 이유 키는 `reason`에 영어로 렌더링돼요. 직접 만든 키는 그 키 그대로 렌더링되니, 문자열이 아니라 `reasons`에서 번역하세요.

부스트의 `details`는 이 경기에서 그 부스트가 점수를 주거나 주지 않는 이유를 UI가 번역할 수 있는 이유 조각으로 알려줘요. 중요도의 `{ key: 'seriesClinch', params: { team: 'CHW' } }`나 하키 6-on-4의 골리를 뺀 상황과 파워플레이가 함께 있는 경우가 그 예예요. 경기 시작 전이나 경기가 멈춘 동안처럼 할 말이 없으면 없어요. 이 키들을 위한 영어 렌더러는 없어요. 아래 표에 내장 부스트가 보내는 모든 키와, ArenaSwap이 그 키에 보여주는 문장이 있어요.

| 부스트 | 키 | 매개변수 | 영어 문장 |
| --- | --- | --- | --- |
| `scoringOpportunity` | `basesEmpty` | — | Bases empty, so there's nobody to bring home. |
| `scoringOpportunity` | `runnerFirst` | — | A runner on first. |
| `scoringOpportunity` | `runnerSecond` | — | A runner on second, in scoring position. |
| `scoringOpportunity` | `runnerThird` | — | A runner on third, one base from home. |
| `scoringOpportunity` | `runnersFirstSecond` | — | Runners on first and second. |
| `scoringOpportunity` | `runnersFirstThird` | — | Runners on the corners. |
| `scoringOpportunity` | `runnersSecondThird` | — | Runners on second and third, both in scoring position. |
| `scoringOpportunity` | `basesLoaded` | — | Bases loaded. Nowhere to put anybody. |
| `scoringOpportunity` | `inningOver` | — | Three outs, so the bases are clear. |
| `scoringOpportunity` | `outsideRedZone` | — | Nobody's in the red zone. |
| `scoringOpportunity` | `redZone` | `team` | {team} is in the red zone. |
| `scoringOpportunity` | `redZoneThirdAndShort` | `team` | {team} is in the red zone, facing third and short. |
| `scoringOpportunity` | `redZoneFourthDown` | `team` | {team} is in the red zone on fourth down. This snap matters. |
| `scoringOpportunity` | `redZoneNotClose` | `team` | {team} is in the red zone, but the score's too lopsided for it to count. |
| `scoringOpportunity` | `emptyNet` | `team`, `margin`, `clock` | {team} pulled the goalie, down {margin} with {clock} left. |
| `scoringOpportunity` | `powerPlayTied` | — | A power play in a tie game. |
| `scoringOpportunity` | `powerPlayClose` | `margin` | A power play, and only {margin} in it. |
| `scoringOpportunity` | `powerPlayTeamTied` | `team` | {team} is on the power play in a tie game. |
| `scoringOpportunity` | `powerPlayTeamTrailing` | `team`, `margin` | {team} is on the power play, down {margin}. |
| `scoringOpportunity` | `powerPlayTeamLeading` | `team`, `margin` | {team} is on the power play, up {margin}. |
| `scoringOpportunity` | `noScoringPosition` | — | No runners or red zones in this sport, so this one sits out. |
| `goAheadRun` | `goAheadRun` | `team` | {team} has the go-ahead run on base. |
| `goAheadRun` | `tyingRun` | `team` | {team} has the tying run on base. |
| `goAheadRun` | `winningRun` | `team` | {team} has the winning run on base. One swing could end it. |
| `goAheadRun` | `lastChance` | — | It could be their last chance. |
| `twoMinuteDrill` | `driveTied` | `team`, `yards`, `clock` | Tie game. {team} has the ball {yards} yards out with {clock} left. |
| `twoMinuteDrill` | `driveTrailing` | `team`, `trailBy`, `yards`, `clock` | {team} is down {trailBy}, driving from {yards} yards out with {clock} left. |
| `redCard` | `redCard` | `team`, `players`, `minute` | {team} has been down to {players} since {minute}′. |
| `noHitter` | `noHitter` | `team`, `innings` | {team} still doesn't have a hit through {innings} innings. |
| `noHitter` | `doubleNoHitter` | `innings` | Neither team has a hit through {innings} innings. |
| `upsetWatch` | `underdogLeading` | `team`, `chance`, `margin` | Our sources gave {team} a {chance}% chance before the game. They lead by {margin}. |
| `upsetWatch` | `underdogLevel` | `team`, `chance` | Our sources gave {team} a {chance}% chance before the game. It's all square. |
| `upsetWatch` | `underdogClose` | `team`, `chance`, `margin` | Our sources gave {team} a {chance}% chance before the game. They trail by just {margin}. |
| `stakes` | `seriesClinch` | `team` | A win and {team} takes the series. |
| `stakes` | `seriesDecider` | `game` | Game {game}. Winner takes the series. |
| `stakes` | `rankedMeeting` | `rank`, `team`, `otherRank`, `other` | No. {rank} {team} vs. No. {otherRank} {other}. |
| `stakes` | `raceTitle` | `team` | {team} is in the title race. |
| `stakes` | `raceRelegation` | `team` | {team} is in a relegation fight. |
| `stakes` | `raceTopQualification` | `team` | {team} is chasing a top European spot. |
| `stakes` | `raceLine` | `team` | {team} is right on the edge of a playoff or qualifying spot. |
| `stakes` | `raceClinch` | `team` | {team} can clinch with a win. |
| `stakes` | `raceElimination` | `team` | A loss knocks {team} out of the race. |
| `stakes` | `raceHunt` | `team` | {team} is still in the playoff hunt. |
| `postseasonBoost` | `postseasonRound` | `round` | 0 is the final, 1 a semifinal, 2 a quarterfinal, 3 an earlier round |
| `postseasonBoost` | `regularSeason` | — | Regular season, so nothing extra here. |
| `postseasonBoost` | `postseasonBoostOff` | — | Your postseason boost is set to 0 in Settings. |

## PowerScoreMode

모드는 시그널 목록에 그 모드에 어울리는 부스트를 더한 거예요. 한 번 미리 검사해주는 [`defineMode`](/arenaswap/docs/powerscore/api-reference/#definemode)로 만드세요.

```ts
interface PowerScoreMode {
	id: string;
	signals: readonly SignalDefinition[];
	boosts: readonly BoostDefinition[];
	bucketCaps?: Readonly<Record<string, number>>;
	reasonPriority: readonly string[];
	usesBreakPenalty: boolean;
	usesWinProbability: boolean;
	classicBlend?: ClassicBlend;
	paysPostseason?: boolean;
	appliesTo?: (game: Game<string>, context: ScoringContext) => boolean;
}
```

| 필드 | 의미 |
|---|---|
| `signals`, `boosts` | 표시되는 순서예요. |
| `bucketCaps` | 부스트 묶음이 합쳐서 더할 수 있는 최대치예요. 목록에서 앞에 있는 부스트부터 먼저 지급돼요. |
| `reasonPriority` | 이유를 읽을 수 있는 시그널 id이고, 읽을 가치가 큰 것부터예요. 가장 강한 것이 "방금 벌어진 일" 문장을 만들고, 동점이면 순서로 가려요. |
| `usesBreakPenalty`, `usesWinProbability` | 광고 시간 감점과 ±5 보정이 적용되는지예요. |
| `classicBlend` | 모드가 클래식과 합쳐지는 방식이에요. |
| `paysPostseason?` | `false`이면 이 모드에서는 포스트시즌 부스트를 주지 않아요. 기본값은 `true`예요. 압승은 플레이오프의 대패가 이미 결과가 정해졌으니 `false`로 설정해요. |
| `appliesTo` | 모드가 할 말이 없는 경기에는 `false`를 돌려주고, 그 경기는 클래식으로 점수를 매겨요. |

### SignalDefinition과 BoostDefinition

```ts
interface SignalDefinition {
	id: string;
	ceiling: number;
	compute: (input: SignalInput) => SignalOutput;
}

interface BoostDefinition {
	id: string;
	bucket?: string; // boosts in one bucket share the mode's cap for it
	compute: (input: SignalInput) => BoostOutput;
}

interface SignalOutput { points: number; reason?: ReasonFragment }
interface BoostOutput extends SignalOutput { meta?: Record<string, number>; details?: ReasonFragment[] }
```

시그널의 `points`는 `ceiling`으로 제한돼요. 부스트에는 자체 상한이 없지만, 그 묶음에는 상한이 있을 수 있어요.

### SignalInput

`compute`가 받는 것이에요.

| 필드 | 의미 |
|---|---|
| `game`, `context` | `scoreGame`에 넘긴 것이에요. |
| `sport`, `league` | `options`의 덮어쓰기를 반영해 확정된 [`SportTypeConfig`](#sporttypeconfig-and-leagueconfig)와 `LeagueConfig`예요. |
| `progress` | 경기 시작은 0이고, 정규 시간 종료와 연장 내내는 1이에요. |
| `now` | `history`에서 가장 최신 스냅샷의 타임스탬프이고, 없으면 0이에요. |
| `margin` | 점수 차의 절댓값이에요. |

### ClassicBlend

```ts
type ClassicBlend =
	| { kind: 'floor'; factor: number } // total = max(own, factor × classic)
	| { kind: 'mix'; weight: number }   // total = weight × own + (1 − weight) × classic
	| { kind: 'boost'; weight: number }; // total = min(100, classic + weight × own)
```

압승은 계수 0.3의 바닥을 써요. 판타지는 가중치 0.6의 부스트를 써서, 내 선수들의 경기가 클래식 점수보다 오르기만 해요. 내장 모드는 `mix`를 쓰지 않지만, 직접 만드는 모드를 위해 있어요.

### BlendResult

```ts
interface BlendResult {
	kind: ClassicBlend['kind'];
	weight: number;         // the floor factor or the weight
	ownTotal: number;       // the mode's own total, with its boosts, before blending
	classicTotal: number;   // Classic's, likewise
	floorApplied?: boolean; // for a floor, whether Classic's share won
}
```

모드가 클래식과 섞였을 때 `score.blend`에 하나가 들어 있어서, 세부 내역에서 계산을 보여줄 수 있어요.

## SportTypeConfig와 LeagueConfig

`SportTypeConfig`에는 종목이 진행되는 방식의 모든 것이 들어 있어요. 접전도 임계값, 모멘텀과 추격 임계값, 감쇠 반감기, 종목에 시계가 있는지, 그리고 (야구와 소프트볼 전용) `lateGameCurve`예요. `LeagueConfig`에는 특정 리그의 피리어드 길이가 들어 있어요. `id`, `label`, `sportType`, `regularPeriods`, `periodDurationSecs`, `periodFormat`이에요. ArenaSwap이 자체 데이터 수집과 일정 막대에 쓰는 필드도 있는데, 점수 계산기는 읽지 않아요.

몇몇 필드는 선택 사항이고 일부 항목만 설정해요. `lateGameCurve`(야구와 소프트볼), `clockIsFullGameElapsed`(축구), `zeroZeroPenaltyPeriods`(하키와 축구), `knockoutRunMinutes`(두 월드컵과 두 올림픽 축구 대회)예요. `options.sport`와 `options.league`로 어떤 부분 집합이든 `Partial`로 넘겨서 호출마다 하나를 덮어쓸 수 있어요. 필드별 의미와 모든 종목과 리그의 실제 값은 [종목 및 리그 설정](/arenaswap/docs/powerscore/configuration/)에 있어요.

## LateGameCurveConfig

```ts
interface BaseballLateGameCurveConfig {
	model: 'baseball';
	regulationInnings: number;
	regulationStartInning: number;
}

type LateGameCurveConfig = BaseballLateGameCurveConfig;
```

`SportTypeConfig.lateGameCurve`는 야구와 소프트볼만 설정해요. 시계가 있는 종목은 `period`와 `clockSeconds`에서 바로 종반 상승을 계산하고, 이 필드는 `undefined`로 둬요. 시계가 있는 종목이 여기서 설정할 건 달리 없어서, 타입은 지금 한 가지 모양뿐이에요.

## ScorerTunables

엔진이 점수를 매기는 모든 구간의 값을 담은, 내보내진 단일 객체예요. 일부만 채운 설정이 아니라 전부 채워진 상수예요.

| 가지 | 담고 있는 것 |
|---|---|
| `scores.closeness` | 접전도 단계별 상한(`tied`, `tight`, `zeroZero`, `close`, `fringe`, `none`)이에요. [클래식의 접전도 시그널](/arenaswap/docs/powerscore/signals/#closeness)을 보세요. |
| `scores.closenessFlatFloor` | 진행도로 조정하기 전에 모든 접전도 단계가 지급하는 고정 바닥이에요. |
| `scores.lateGame` | 종반 상한, 연장전 사전 부스트, 이전 피리어드 접촉이에요. [종반 압박](/arenaswap/docs/powerscore/signals/#late-game-pressure)을 보세요. |
| `scores.momentum` | 모멘텀의 두 단계 값이에요. [모멘텀](/arenaswap/docs/powerscore/signals/#momentum-lead-changes-and-comeback-factor)을 보세요. |
| `scores.leadChanges` | 리드 변화의 두 단계 값이에요. |
| `scores.comeback` | 추격의 두 단계 값과 고정 바닥이에요. |
| `scores.winProbabilityVariance` | `maxAvgDist`와 `minDataPoints`이고, [부스트와 페널티](/arenaswap/docs/powerscore/boosts-and-penalties/#win-probability-balance)에 표로 정리돼 있어요. |
| `reasons` | 더 이상 권장되지 않는 평평한 결과가 돌아가는 이유인 `fallback`("best game available")뿐이에요. 영어 문구는 `renderReasonEnglish`에 있어요. |

## FantasyRule과 FantasySport

[`defaultFantasyScoring`](/arenaswap/docs/powerscore/api-reference/#computefantasypoints) 뒤에 있는 타입이에요.

```ts
type FantasySport = 'football' | 'basketball' | 'baseball' | 'hockey';

interface FantasyRule {
	points: number; // points per unit of the stat
	min: number;
	max: number;
}
```

`min`과 `max`는 설정 화면이 강제할 수 있는 범위이고, `resolveFantasyScoring`은 덮어쓴 값을 이 범위로 제한해요.

## SportType과 LeagueId

```ts
type SportType = 'basketball' | 'football' | 'hockey' | 'baseball' | 'softball' | 'soccer';
type LeagueId = 'nba' | 'wnba' | 'nhl' | /* ...31 total */;
```

`SportType`은 닫힌 유니온이에요. `LeagueId`는 내장 설정이 있는 31개 리그이지만 `Game`을 제한하지는 않아요. `Game<string>`이면 경기의 `league`는 어떤 문자열이든 되고, 표가 모르는 id는 그 종목의 기본값으로 점수를 매겨요. 31개 리그 id 전체 목록은 [종목 및 리그 설정](/arenaswap/docs/powerscore/configuration/)에 있어요. 실행 중에는 `allLeagueIds`로도 얻을 수 있어요.

## PowerScoreResult (2.x)

더 이상 권장되지 않지만 여전히 내보내지고 작동해요. `computePowerScore`의 평평한 출력이고, `normalizePowerScoreResult`가 일부만 담긴 버전을 받는 모양이에요. `scoreGame`은 이걸 돌려주지 않아요.

| 필드 | 타입 | 없으면 |
|---|---|---|
| `gameId` | `string` | 이 타입이 나오는 모든 곳에서 필수예요. |
| `total` | `number` | `computePowerScore`가 설정해요. 0에서 `scoreMaxTotal`(100)이고, `allowTotalOverflow`로 `normalizePowerScoreResult`를 거친 경우는 예외예요. |
| `closeness` | `number` | 0에서 `scoreMaxCloseness`(42)예요. |
| `lateGame` | `number` | 0에서 `scoreMaxLateGame`(38)이에요. |
| `momentum` | `number` | 0에서 `scoreMaxMomentum`(38)이에요. |
| `leadChanges` | `number` | 0에서 `scoreMaxLeadChanges`(18)예요. |
| `comeback` | `number` | 0에서 `scoreMaxComeback`(20)이에요. |
| `winProbabilityVariance?` | `number` | −`scoreWinProbVarianceMax`에서 `scoreWinProbVarianceMax`(±5)예요. 승리 확률 기록을 넘기지 않았거나 쓸 수 있는 게 너무 적으면 `0`이 아니라 없어요. |
| `reason` | `string` | 없거나 문자열이 아니면 `scorerTunables.reasons.fallback`("best game available")으로 대체돼요. |
| `onBreak?` | `boolean` | 없으면 `false`로 읽어요. `normalizePowerScoreResult`는 불리언일 때 그대로 통과시켜요. |
| `breakPenalty?` | `number` | 뺀 점수이고 항상 ≥ 0이에요. 넘기지 않았으면 `0`이 아니라 없어요. `computePowerScore`는 설정하지 않아요. |
| `signalsSubtotal?` | `number` | 광고 시간 감점 전 다섯 시그널의 합이에요. 0에서 `scoreMaxSignalsSubtotal`(156)이에요. |
| `favoriteBonus?`, `favoriteTeamCount?`, `gameBoost?`, `scoringOpportunityBoost?`, `postseasonBoost?` | `number` | `computePowerScore`가 계산하지 않아요. 호출하는 쪽이 넘기지 않으면 없어요. |

`scoreGame`이 응원팀, 포스트시즌, 게임 부스트를 대신 합쳐주니, 이 함수로는 `PowerScoreResult`를 직접 만들 일이 없어요. 2.x가 여전히 내보내는 모든 것은 [API 레퍼런스](/arenaswap/docs/powerscore/api-reference/#the-2x-api)에 나와 있어요.
