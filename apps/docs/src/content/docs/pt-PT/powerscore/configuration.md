---
sourceHash: '854afd07d71b'
title: Configuração de desportos e ligas
description: Todos os campos de SportTypeConfig e LeagueConfig, os seus valores predefinidos nos seis desportos e 31 ligas, e como se define o que um desporto entende por "equilibrado".
section: powerscore
order: 5
navLabel: Configuração
---

O `scoreGame` consulta dois mapas exportados no início de cada chamada. O `sportTypeConfigMap`, indexado por `SportType`, guarda como um desporto se joga. O `leagueConfigMap`, indexado por `LeagueId`, guarda quanto duram os períodos de uma liga. Se os valores incluídos não se ajustarem aos teus dados, podes substituir qualquer um deles em cada chamada através de `options.sport` e `options.league`. [Ajusta-o para a tua própria liga](#tune-it-for-a-league-powerscore-doesnt-ship) mostra como.

## SportTypeConfig

Uma entrada por `SportType`, exportada como `sportTypeConfigs` (uma lista) e `sportTypeConfigMap` (indexado por `id`). Esta tabela guarda os valores reais dos seis desportos, e [o que significam os campos](#what-the-sport-fields-mean) vem a seguir. O Clássico lê tudo. As Goleadas leem `closenessMargins`, `momentumBigRun` e `momentumSmallRun`, a semivida da dinâmica e `historyWindowMs`.

| Campo | basquetebol | futebol americano | hóquei | futebol | basebol | softbol |
|---|---|---|---|---|---|---|
| `clockBased` | true | true | true | true | false | false |
| `closenessMargins` (t1, t2, t3) | 5, 10, 18 | 3, 9, 14 | 1, 2, 3 | 1, 2, 3 | 1, 3, 5 | 1, 3, 5 |
| `momentumBigRun` / `momentumSmallRun` | 8 / 4 | 10 / 4 | 2 / 1 | 2 / 1 | 3 / 1 | 3 / 1 |
| `comebackThresholdBig` / `comebackThresholdSmall` | 6 / 3 | 7 / 3 | 2 / 1 | 2 / 1 | 2 / 1 | 2 / 1 |
| `clockCountsUp` | false | false | false | true | false | false |
| `clockIsFullGameElapsed` | false | false | false | true | false | false |
| `zeroZeroAsFullTie` | false | false | true | true | false | false |
| `zeroZeroPenaltyPeriods` | nenhum | nenhum | 1, 2 | 1 | nenhum | nenhum |
| `otPreBoostWindowSecs` | 60 | 60 | 60 | 60 | 0 | 0 |
| `decayHalfLifeMs.momentum` | 45,000 | 135,000 | 180,000 | 240,000 | 150,000 | 150,000 |
| `decayHalfLifeMs.leadChange` | 60,000 | 180,000 | 240,000 | 300,000 | 180,000 | 180,000 |
| `decayHalfLifeMs.comeback` | 60,000 | 180,000 | 240,000 | 300,000 | 180,000 | 180,000 |
| `historyWindowMs` | 300,000 (5 min) | 720,000 (12 min) | 960,000 (16 min) | 1,200,000 (20 min) | 720,000 (12 min) | 720,000 (12 min) |
| `lateGameCurve` | nenhuma | nenhuma | nenhuma | nenhuma | 9 entradas, começa na 6.ª | 7 entradas, começa na 5.ª |

O `historyWindowMs` é o intervalo de histórico de resultados que cada desporto precisa de guardar para a dinâmica, as mudanças de liderança e a remontada funcionarem. O sinal Vantagem mantida das Goleadas é medido sobre a mesma janela. É pelo menos quatro vezes a semivida mais longa do desporto. Essa margem deixa um sinal esbater-se por completo antes de sair da janela, por mais que quem chama consulte.

### O que significam os campos do desporto

| Campo | Significado |
|---|---|
| `clockBased` | O desporto tem relógio de jogo. O basebol e o softbol não têm, por isso a pressão da fase final corre ao longo das entradas. |
| `closenessMargins` | As três margens por onde o Equilíbrio desce: dentro de t1 é apertado, dentro de t2 é equilibrado, dentro de t3 é o limite, além de t3 não paga nada. Outros sinais e impulsos reutilizam-nas, como o corte de goleada do Fator de remontada em t2 e a porta da Goleada cedo das Goleadas além de t3. |
| `momentumBigRun`, `momentumSmallRun` | A série líquida dentro da janela de histórico que paga o escalão completo e o meio escalão da Dinâmica. |
| `comebackThresholdBig`, `comebackThresholdSmall` | A oscilação que paga o escalão grande e o moderado do Fator de remontada. |
| `clockCountsUp` | O relógio mostra o tempo jogado, não o tempo que falta. Só o futebol. |
| `clockIsFullGameElapsed` | O relógio corre ao longo do jogo inteiro (de 0' a 90'+) em vez de recomeçar a cada período, por isso os períodos completos são subtraídos antes de calcular o tempo que falta. Só o futebol. |
| `zeroZeroAsFullTie` | Um jogo 0–0 ganha o crédito total de empate no Equilíbrio. Quando `false`, o 0–0 ganha o escalão reduzido `zeroZero`. |
| `zeroZeroPenaltyPeriods` | Períodos em que o 0–0 ainda ganha o escalão reduzido mesmo com `zeroZeroAsFullTie` a `true`. O hóquei usa 1 e 2, o futebol a primeira parte. |
| `otPreBoostWindowSecs` | Os últimos segundos do último período regulamentar em que um jogo empatado sobe rumo ao pré-impulso de prolongamento. `0` desliga-o. |
| `decayHalfLifeMs` | A rapidez com que a Dinâmica, as Mudanças de liderança e o Fator de remontada se esbatem depois da última pontuação. Mais longa nos desportos de poucos golos, para um golo os manter vivos até ao seguinte. |
| `historyWindowMs` | Quanto histórico de resultados os sinais de histórico leem. Vê acima. |
| `lateGameCurve` | Só basebol e softbol: quantas entradas tem o tempo regulamentar e em que entrada começa a rampa da fase final. |

## LeagueConfig

Uma entrada por `LeagueId`, exportada como `leagueConfigs` (uma lista) e `leagueConfigMap` (indexado por `id`), mais `allLeagueIds` para a lista simples. O `periodFormat` é só texto para mostrar, e não afeta a pontuação. Cada entrada também traz alguns campos que o ArenaSwap usa para as suas próprias consultas e para quanto tempo um jogo ocupa numa barra de calendário. O pontuador não os lê, por isso não estão tabelados aqui.

| Liga | Desporto | Períodos | Duração do período |
|---|---|---|---|
| NBA (`nba`) | basquetebol | 4 | 720s |
| WNBA (`wnba`) | basquetebol | 4 | 600s |
| NCAA Basketball (`ncaab`) | basquetebol | 2 | 1200s |
| NCAA Women's Basketball (`ncaaw`) | basquetebol | 4 | 600s |
| Olympic Men's Basketball (`olybkm`) | basquetebol | 4 | 600s |
| Olympic Women's Basketball (`olybkw`) | basquetebol | 4 | 600s |
| NFL (`nfl`) | futebol americano | 4 | 900s |
| NCAA Football (`ncaaf`) | futebol americano | 4 | 900s |
| UFL (`ufl`) | futebol americano | 4 | 900s |
| NHL (`nhl`) | hóquei | 3 | 1200s |
| NCAA Men's Hockey (`ncaamh`) | hóquei | 3 | 1200s |
| Olympic Men's Ice Hockey (`olymih`) | hóquei | 3 | 1200s |
| Olympic Women's Ice Hockey (`olywih`) | hóquei | 3 | 1200s |
| MLB (`mlb`) | basebol | 9 entradas | 0 |
| NCAA Baseball (`cbase`) | basebol | 9 entradas | 0 |
| Olympic Men's Baseball (`olybb`) | basebol | 9 entradas | 0 |
| World Baseball Classic (`wbbc`) | basebol | 9 entradas | 0 |
| NCAA Softball (`csoft`) | softbol | 7 entradas | 0 |
| MLS (`mls`) | futebol | 2 | 2700s |
| English Premier League (`epl`) | futebol | 2 | 2700s |
| La Liga (`laliga`) | futebol | 2 | 2700s |
| Bundesliga (`bundesliga`) | futebol | 2 | 2700s |
| Serie A (`seriea`) | futebol | 2 | 2700s |
| Liga MX (`ligamx`) | futebol | 2 | 2700s |
| UEFA Champions League (`ucl`) | futebol | 2 | 2700s |
| UEFA Europa League (`uel`) | futebol | 2 | 2700s |
| NWSL (`nwsl`) | futebol | 2 | 2700s |
| FIFA World Cup (`fifawc`) | futebol | 2 | 2700s |
| FIFA Women's World Cup (`fifawwc`) | futebol | 2 | 2700s |
| Olympic Men's Soccer (`olysocm`) | futebol | 2 | 2700s |
| Olympic Women's Soccer (`olysocw`) | futebol | 2 | 2700s |

31 ligas no total, tantas quantos os membros de `LeagueId`.

## Como se define o que um desporto entende por "equilibrado"

Um só tuplo, `closenessMargins: [t1, t2, t3]`, decide várias coisas de um desporto. Escolhe em que escalão de equilíbrio cai uma diferença: apertado em `t1`, equilibrado em `t2`, limite em `t3`, fora de alcance além disso. Escolhe também o máximo para onde a pressão da fase final sobe, a faixa em que o impulso de red zone do futebol americano paga, onde as Goleadas começam a pagar (duas pontuações de diferença, além de `t2`) e quanto peso tem o Em jogo.

O `[5, 10, 18]` do basquetebol quer dizer que um jogo de 2 pontos é apertado e um de 9 pontos é equilibrado. Um jogo de 18 pontos é o último que ainda conta como limite. O `[1, 2, 3]` do hóquei e do futebol trata um jogo de 2 golos como o basquetebol trata um de 9 pontos. Mudar o que "equilibrado" quer dizer num desporto é mudar um tuplo, não um punhado de limiares separados.

## Ajusta-o para uma liga que o PowerScore não inclui

O `Game` é genérico quanto ao id da liga, por isso um feed com ids próprios funciona tal como está: `Game<string>`. Uma liga que a tabela não conhece é pontuada com os valores predefinidos do seu desporto. Cada desporto mapeia para a sua liga mais conhecida quanto ao número de períodos e ao relógio:

| Desporto | Predefinição |
|---|---|
| Basquetebol | NBA |
| Hóquei | NHL |
| Basebol | MLB |
| Futebol americano | NFL |
| Softbol | NCAA Softball |
| Futebol | MLS |

O `sportType` é a única coisa que tens de acertar. Governa a maior parte do que um sinal faz, seja qual for a `league`. Um `sportType` não reconhecido recorre separadamente ao ajuste de sinais do basquetebol. Ambos os recursos querem dizer que o jogo continua a ser pontuado em vez de lançar um erro.

Se os valores predefinidos estiverem errados para a tua liga, substitui-os em cada chamada:

```ts
scoreGame(game, context, {
	league: { regularPeriods: 3, periodDurationSecs: 15 * 60 },
});
```

O `options.league` aceita qualquer parte de um `LeagueConfig`, normalmente o número e a duração dos períodos. O `options.sport` aceita qualquer parte de um `SportTypeConfig`, como as margens de equilíbrio, os limiares de dinâmica ou as semividas. As substituições aplicam-se só a essa chamada, e os mapas exportados ficam como estavam.

O `sportTypeConfigMap` e o `leagueConfigMap` são objetos exportados simples, lidos em cada chamada e não a partir de uma cópia em cache. Alterá-los em tempo de execução muda mesmo o comportamento da pontuação, mas nada nos tipos ou nas exportações do pacote trata isso como um ponto de extensão suportado, e uma versão futura não é obrigada a mantê-lo a funcionar. Usa as opções.
