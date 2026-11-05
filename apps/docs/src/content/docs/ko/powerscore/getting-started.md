---
sourceHash: '1cae3a43d11e'
title: PowerScore로 첫 경기에 점수 매기기
navLabel: 시작하기
description: powerscore 패키지를 설치하고 코드 몇 줄로 scoreGame에 라이브 경기 하나를 넣어, 터미널에서 숫자와 그 이유를 확인해요.
section: powerscore
order: 1
faq:
  - q: powerscore에 API 키나 계정이 필요한가요?
    a: 아니요. 넘겨준 경기 상태에 점수를 매길 뿐이에요. 그 상태를 어디서 가져올지, 점수 데이터를 어떻게 받을지는 직접 작성하는 코드의 몫이에요.
  - q: powerscore는 브라우저에서 실행되나요?
    a: 네. 런타임 의존성이 없고 평범한 객체와 수학만 다뤄요. Node에서 돌아가는 것과 똑같이 브라우저 확장 프로그램에도 번들돼요.
  - q: PowerScore 3 때문에 2.x 코드를 다시 써야 하나요?
    a: 아니요. computePowerScore와 2.x 타입은 여전히 작동하고 같은 합계를 돌려줘요. 모드나 새 부스트가 필요해지면 scoreGame으로 옮기세요.
---

`powerscore`를 설치하고 라이브 경기 하나에 점수를 매겨서, 숫자와 그 뒤의 이유를 확인해요.

## 패키지 설치

```bash
npm install powerscore
```

패키지는 [npm](https://www.npmjs.com/package/powerscore)에도 올라와 있어요. 오늘 밤 실제 경기에 점수가 매겨지는 모습을 보려면 [PowerScore 페이지](/arenaswap/powerscore/)로 가세요.

## 경기 설명하기

`scoreGame`에는 `Game` 객체가 필요해요. 두 팀의 점수, 어느 리그와 종목인지, 지금 경기가 어디까지 왔는지예요. 라이브 경기라면 `status: 'in'`으로 설정하세요. 부스트가 점수를 주기 전에 이 값을 확인하거든요.

```ts
import { scoreGame } from 'powerscore';
import type { Game } from 'powerscore';

const game: Game = {
	id: 'demo-1',
	league: 'nba',
	sportType: 'basketball',
	status: 'in',
	homeTeam: { score: 101, abbreviation: 'BOS' },
	awayTeam: { score: 99, abbreviation: 'LAL' },
	period: 4,
	clockSeconds: 45,
};
```

보스턴이 4쿼터 45초를 남기고 2점 앞서 있어요. 접전이고 막판이에요. PowerScore가 찾는 바로 그 상황이에요.

## 점수 매기기

```ts
const score = scoreGame(game);
console.log(score.total);
console.log(score.reason);
```

실행하면 터미널에 이렇게 나와요.

```text
68
BOS up 2 with 0:45 left
```

`scoreGame`에는 선택 인수가 두 개 더 있어요. 경기가 담고 있지 않은 모든 것(득점 기록, 승리 확률, 경기 전 배당, 판타지 로스터)을 담는 `context`, 그리고 어떻게 점수를 매길지(어떤 모드로, 어떤 시그널을 끌지)를 정하는 `options`예요. 둘 다 없으면 접전이고 막판인지를 묻는 모드인 클래식으로 계산돼요.

## 세부 내역 읽기

`score`에는 헤드라인 숫자보다 많은 것이 들어 있어요. 모든 시그널이 각자의 점수와 상한을 가진 목록 항목으로 들어 있고, 부스트와 이유도 함께 있어요.

```ts
console.log(score.signals);
// [
//   { id: 'closeness',   points: 34, ceiling: 42, disabled: false },
//   { id: 'lateGame',    points: 34, ceiling: 38, disabled: false },
//   { id: 'momentum',    points: 0,  ceiling: 38, disabled: false },
//   { id: 'leadChanges', points: 0,  ceiling: 18, disabled: false },
//   { id: 'comeback',    points: 0,  ceiling: 20, disabled: false },
// ]
```

이 경기는 접전도와 종반 압박이 점수 전부예요. 돌아볼 득점 기록이 없어서 모멘텀, 리드 변화, 추격은 아직 측정할 게 없고 0이에요. `scoreGame`에 컨텍스트로 `history`를 넘겨주면 이 시그널들이 깨어나요. 부스트는 `score.boosts`에 있고 이 경기는 모두 0이에요. 농구 경기에는 주자도, 레드존도, 골리를 뺀 상황도 없어서 점수를 줄 게 없으니까요.

`signalPoints(score, 'momentum')`과 `boostPoints(score, 'noHitter')`로 id별로 하나씩 조회할 수 있어요.

## 다른 모드로 해보기

같은 경기도 다른 질문에 답할 수 있어요. 모드는 `options.mode`로 골라요.

```ts
scoreGame(game, {}, { mode: 'blowouts' }).total; // 20
```

압승은 누군가 멀찍이 달아나고 있는지를 물어요. 2점 차 경기는 그렇지 않으니, 클래식 68의 30%만 받고 더는 없어요. 이 바닥 덕분에 대패가 없는 밤에도 접전이 후보로 남아요. 판타지는 내 선수들에게 곧 무슨 일이 생기는지를 물어요. 세 가지 모드는 모두 [시그널 페이지](/arenaswap/docs/powerscore/signals/)에서 다뤄요.

직접 폴링하는 경기에 점수를 매기려면 [라이브 데이터로 경기 점수 매기기](/arenaswap/docs/powerscore/scoring-a-game/)를 읽어보세요. 각 시그널이 무엇을 왜 측정하는지는 [모드별 PowerScore 시그널](/arenaswap/docs/powerscore/signals/)에서 읽을 수 있어요.
