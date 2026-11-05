---
sourceHash: '854afd07d71b'
title: 종목 및 리그 설정
description: SportTypeConfig와 LeagueConfig의 모든 필드, 여섯 종목과 31개 리그 전체의 기본값, 그리고 종목별 "접전"의 기준이 정해지는 방식.
section: powerscore
order: 5
navLabel: 설정
---

`scoreGame`은 호출할 때마다 가장 먼저 내보내진 맵 두 개를 조회해요. `SportType`을 키로 하는 `sportTypeConfigMap`에는 종목이 진행되는 방식이, `LeagueId`를 키로 하는 `leagueConfigMap`에는 리그의 피리어드 길이가 들어 있어요. 내장 값이 데이터와 맞지 않으면 `options.sport`와 `options.league`로 호출마다 둘 중 하나를 덮어쓸 수 있어요. 방법은 [PowerScore가 제공하지 않는 리그에 맞추기](#tune-it-for-a-league-powerscore-doesnt-ship)에 있어요.

## SportTypeConfig

`SportType`마다 항목이 하나씩 있고, `sportTypeConfigs`(배열)와 `sportTypeConfigMap`(`id`를 키로 하는 맵)으로 내보내져요. 아래 표는 여섯 종목의 실제 값이고, 표 다음에 [각 필드의 의미](#what-the-sport-fields-mean)가 이어져요. 클래식은 전부 읽어요. 압승은 `closenessMargins`, `momentumBigRun`, `momentumSmallRun`, 모멘텀 반감기, `historyWindowMs`를 읽어요.

| 필드 | 농구 | 풋볼 | 하키 | 축구 | 야구 | 소프트볼 |
|---|---|---|---|---|---|---|
| `clockBased` | true | true | true | true | false | false |
| `closenessMargins` (t1, t2, t3) | 5, 10, 18 | 3, 9, 14 | 1, 2, 3 | 1, 2, 3 | 1, 3, 5 | 1, 3, 5 |
| `momentumBigRun` / `momentumSmallRun` | 8 / 4 | 10 / 4 | 2 / 1 | 2 / 1 | 3 / 1 | 3 / 1 |
| `comebackThresholdBig` / `comebackThresholdSmall` | 6 / 3 | 7 / 3 | 2 / 1 | 2 / 1 | 2 / 1 | 2 / 1 |
| `clockCountsUp` | false | false | false | true | false | false |
| `clockIsFullGameElapsed` | false | false | false | true | false | false |
| `zeroZeroAsFullTie` | false | false | true | true | false | false |
| `zeroZeroPenaltyPeriods` | 없음 | 없음 | 1, 2 | 1 | 없음 | 없음 |
| `otPreBoostWindowSecs` | 60 | 60 | 60 | 60 | 0 | 0 |
| `decayHalfLifeMs.momentum` | 45,000 | 135,000 | 180,000 | 240,000 | 150,000 | 150,000 |
| `decayHalfLifeMs.leadChange` | 60,000 | 180,000 | 240,000 | 300,000 | 180,000 | 180,000 |
| `decayHalfLifeMs.comeback` | 60,000 | 180,000 | 240,000 | 300,000 | 180,000 | 180,000 |
| `historyWindowMs` | 300,000 (5분) | 720,000 (12분) | 960,000 (16분) | 1,200,000 (20분) | 720,000 (12분) | 720,000 (12분) |
| `lateGameCurve` | 없음 | 없음 | 없음 | 없음 | 9이닝, 6이닝부터 시작 | 7이닝, 5이닝부터 시작 |

`historyWindowMs`는 모멘텀, 리드 변화, 추격이 작동하려면 종목마다 붙들고 있어야 하는 득점 기록의 길이예요. 압승의 지속 시그널도 같은 구간으로 측정해요. 이 값은 종목에서 가장 긴 반감기의 네 배 이상이에요. 덕분에 호출 간격이 얼마든 시그널이 구간을 벗어나기 전에 완전히 감쇠해요.

### 종목 필드의 의미

| 필드 | 의미 |
|---|---|
| `clockBased` | 경기 시계가 있는 종목이에요. 야구와 소프트볼은 시계가 없어서 종반 압박이 이닝 단위로 흘러가요. |
| `closenessMargins` | 접전도가 단계별로 내려가는 세 가지 점수 차예요. t1 이내는 박빙, t2 이내는 접전, t3 이내는 가장자리이고, t3를 넘으면 점수가 없어요. 다른 시그널과 부스트도 이 값을 재사용해요. 추격의 대패 컷오프는 t2, 압승의 타이밍 게이트는 t3 초과가 그 예예요. |
| `momentumBigRun`, `momentumSmallRun` | 기록 구간 안에서 모멘텀의 전체 점수와 절반 점수를 주는 순 연속 득점이에요. |
| `comebackThresholdBig`, `comebackThresholdSmall` | 추격의 큰 단계와 중간 단계 점수를 주는 점수 변동 폭이에요. |
| `clockCountsUp` | 시계가 남은 시간이 아니라 경과한 시간을 보여줘요. 축구만 해당돼요. |
| `clockIsFullGameElapsed` | 시계가 피리어드마다 다시 시작하지 않고 경기 전체에 걸쳐(0분에서 90분+까지) 흘러요. 그래서 남은 시간을 계산하기 전에 끝난 피리어드를 빼줘요. 축구만 해당돼요. |
| `zeroZeroAsFullTie` | 0–0 경기가 접전도에서 동점 점수를 전부 받아요. `false`이면 0–0은 낮춘 `zeroZero` 단계를 받아요. |
| `zeroZeroPenaltyPeriods` | `zeroZeroAsFullTie`가 `true`여도 0–0이 여전히 낮춘 단계를 받는 피리어드예요. 하키는 1, 2피리어드, 축구는 전반이에요. |
| `otPreBoostWindowSecs` | 정규 시간 마지막 피리어드의 마지막 몇 초 동안, 동점 경기가 연장전 사전 부스트를 향해 올라가는 구간이에요. `0`이면 꺼져요. |
| `decayHalfLifeMs` | 마지막 득점 이후 모멘텀, 리드 변화, 추격이 얼마나 빨리 사그라드는지예요. 득점이 적은 종목일수록 길어서, 골 하나가 다음 골까지 시그널을 살려둬요. |
| `historyWindowMs` | 기록 시그널이 읽는 득점 기록의 길이예요. 위를 참고하세요. |
| `lateGameCurve` | 야구와 소프트볼 전용이에요. 정규 이닝이 몇 개인지, 종반 상승이 몇 회부터 시작되는지예요. |

## LeagueConfig

`LeagueId`마다 항목이 하나씩 있고, `leagueConfigs`(배열)와 `leagueConfigMap`(`id`를 키로 하는 맵)으로 내보내져요. 목록만 필요하면 `allLeagueIds`가 있어요. `periodFormat`은 표시용 텍스트일 뿐 점수에 영향을 주지 않아요. 각 항목에는 ArenaSwap이 자체 데이터 수집과 일정 막대에서 경기가 차지하는 길이에 쓰는 필드도 몇 개 있어요. 점수 계산기는 읽지 않으니 여기에는 표로 싣지 않았어요.

| 리그 | 종목 | 피리어드 | 피리어드 길이 |
|---|---|---|---|
| NBA (`nba`) | 농구 | 4 | 720초 |
| WNBA (`wnba`) | 농구 | 4 | 600초 |
| NCAA 농구 (`ncaab`) | 농구 | 2 | 1200초 |
| NCAA 여자 농구 (`ncaaw`) | 농구 | 4 | 600초 |
| 올림픽 남자 농구 (`olybkm`) | 농구 | 4 | 600초 |
| 올림픽 여자 농구 (`olybkw`) | 농구 | 4 | 600초 |
| NFL (`nfl`) | 풋볼 | 4 | 900초 |
| NCAA 풋볼 (`ncaaf`) | 풋볼 | 4 | 900초 |
| UFL (`ufl`) | 풋볼 | 4 | 900초 |
| NHL (`nhl`) | 하키 | 3 | 1200초 |
| NCAA 남자 하키 (`ncaamh`) | 하키 | 3 | 1200초 |
| 올림픽 남자 아이스하키 (`olymih`) | 하키 | 3 | 1200초 |
| 올림픽 여자 아이스하키 (`olywih`) | 하키 | 3 | 1200초 |
| MLB (`mlb`) | 야구 | 9이닝 | 0 |
| NCAA 야구 (`cbase`) | 야구 | 9이닝 | 0 |
| 올림픽 남자 야구 (`olybb`) | 야구 | 9이닝 | 0 |
| 월드 베이스볼 클래식 (`wbbc`) | 야구 | 9이닝 | 0 |
| NCAA 소프트볼 (`csoft`) | 소프트볼 | 7이닝 | 0 |
| MLS (`mls`) | 축구 | 2 | 2700초 |
| 프리미어리그 (`epl`) | 축구 | 2 | 2700초 |
| 라리가 (`laliga`) | 축구 | 2 | 2700초 |
| 분데스리가 (`bundesliga`) | 축구 | 2 | 2700초 |
| 세리에 A (`seriea`) | 축구 | 2 | 2700초 |
| 리가 MX (`ligamx`) | 축구 | 2 | 2700초 |
| UEFA 챔피언스리그 (`ucl`) | 축구 | 2 | 2700초 |
| UEFA 유로파리그 (`uel`) | 축구 | 2 | 2700초 |
| NWSL (`nwsl`) | 축구 | 2 | 2700초 |
| FIFA 월드컵 (`fifawc`) | 축구 | 2 | 2700초 |
| FIFA 여자 월드컵 (`fifawwc`) | 축구 | 2 | 2700초 |
| 올림픽 남자 축구 (`olysocm`) | 축구 | 2 | 2700초 |
| 올림픽 여자 축구 (`olysocw`) | 축구 | 2 | 2700초 |

리그는 모두 31개이고, `LeagueId`의 31개 멤버와 일치해요.

## 종목별 "접전"의 기준이 정해지는 방식

`closenessMargins: [t1, t2, t3]`라는 튜플 하나가 종목의 여러 가지를 결정해요. 점수 차가 어느 접전도 단계에 속하는지를 정해요. `t1`이면 박빙, `t2`이면 접전, `t3`이면 가장자리, 그 너머는 손이 닿지 않는 거리예요. 종반 압박이 올라가는 상한, 풋볼 레드존 부스트가 지급되는 구간, 압승이 점수를 주기 시작하는 지점(`t2`를 넘는 두 번의 득점 차), 그리고 중요도에 얼마나 가중치를 둘지도 정해요.

농구의 `[5, 10, 18]`은 2점 차 경기는 박빙이고 9점 차 경기는 접전이라는 뜻이에요. 18점 차는 그래도 가장자리로 쳐주는 마지막 점수 차예요. 하키와 축구의 `[1, 2, 3]`은 2골 차 경기를 농구의 9점 차처럼 대해요. 한 종목의 "접전"이 무슨 뜻인지 바꾸려면 흩어진 임계값 여러 개가 아니라 튜플 하나만 바꾸면 돼요.

## PowerScore가 제공하지 않는 리그에 맞추기

`Game`은 리그 id에 대해 제네릭이라서, 자체 id를 쓰는 피드도 `Game<string>`으로 그대로 쓸 수 있어요. 표에 없는 리그는 그 종목의 기본값으로 점수를 매겨요. 종목마다 피리어드 수와 시계는 가장 잘 알려진 리그를 기준으로 해요.

| 종목 | 기본 기준 |
|---|---|
| 농구 | NBA |
| 하키 | NHL |
| 야구 | MLB |
| 풋볼 | NFL |
| 소프트볼 | NCAA 소프트볼 |
| 축구 | MLS |

꼭 맞춰야 하는 건 `sportType` 하나예요. `league`가 무엇이든 시그널이 하는 일의 대부분을 이 값이 좌우해요. 인식되지 않는 `sportType`은 별도로 농구의 시그널 설정으로 대체돼요. 두 대체 규칙 모두 오류를 던지지 않고 경기에 점수를 매기게 해줘요.

기본값이 리그와 맞지 않으면 호출마다 덮어쓰세요.

```ts
scoreGame(game, context, {
	league: { regularPeriods: 3, periodDurationSecs: 15 * 60 },
});
```

`options.league`는 `LeagueConfig`의 어느 부분이든 받아요. 보통은 피리어드 수와 길이예요. `options.sport`는 `SportTypeConfig`의 어느 부분이든 받아요. 접전 점수 차, 모멘텀 임계값, 반감기 같은 것들이에요. 덮어쓰기는 그 호출에만 적용되고, 내보내진 맵은 그대로 남아요.

`sportTypeConfigMap`과 `leagueConfigMap`은 평범한 내보내진 객체이고, 캐시된 사본이 아니라 호출마다 읽어요. 실행 중에 바꾸면 점수 계산 동작이 실제로 바뀌지만, 패키지의 타입이나 내보내기 어디에도 이를 지원되는 확장 지점으로 다루지 않아요. 이후 버전에서 계속 동작하리라는 보장도 없어요. 옵션을 쓰세요.
