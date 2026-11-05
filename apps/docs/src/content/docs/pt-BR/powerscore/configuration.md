---
sourceHash: '854afd07d71b'
title: Configuração de esporte e liga
description: Todos os campos de SportTypeConfig e LeagueConfig, seus padrões nos seis esportes e nas 31 ligas, e como se define o que é "apertado" em cada esporte.
section: powerscore
order: 5
navLabel: Configuração
---

O `scoreGame` consulta dois mapas exportados no começo de toda chamada. O `sportTypeConfigMap`, indexado por `SportType`, guarda como um esporte é jogado. O `leagueConfigMap`, indexado por `LeagueId`, guarda quanto dura cada período de uma liga. Se os valores embutidos não servem para os seus dados, você pode sobrescrever qualquer um dos dois a cada chamada com `options.sport` e `options.league`. [Ajuste para a sua liga](#tune-it-for-a-league-powerscore-doesnt-ship) mostra como.

## SportTypeConfig

Uma entrada por `SportType`, exportada como `sportTypeConfigs` (uma lista) e `sportTypeConfigMap` (indexado por `id`). Esta tabela traz os valores reais dos seis esportes, e [o que os campos significam](#what-the-sport-fields-mean) vem logo depois. O Clássico lê tudo isso. O Atropelos lê `closenessMargins`, `momentumBigRun` e `momentumSmallRun`, a meia-vida da dinâmica e `historyWindowMs`.

| Campo | basketball | football | hockey | soccer | baseball | softball |
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
| `decayHalfLifeMs.momentum` | 45.000 | 135.000 | 180.000 | 240.000 | 150.000 | 150.000 |
| `decayHalfLifeMs.leadChange` | 60.000 | 180.000 | 240.000 | 300.000 | 180.000 | 180.000 |
| `decayHalfLifeMs.comeback` | 60.000 | 180.000 | 240.000 | 300.000 | 180.000 | 180.000 |
| `historyWindowMs` | 300.000 (5 min) | 720.000 (12 min) | 960.000 (16 min) | 1.200.000 (20 min) | 720.000 (12 min) | 720.000 (12 min) |
| `lateGameCurve` | nenhuma | nenhuma | nenhuma | nenhuma | 9 entradas, começa na 6ª | 7 entradas, começa na 5ª |

O `historyWindowMs` é o trecho de histórico de placar que cada esporte precisa guardar para a dinâmica, as mudanças de liderança e a virada funcionarem. O sinal Vantagem mantida do Atropelos é medido na mesma janela. Ela tem pelo menos quatro vezes a maior meia-vida do esporte. Essa folga deixa um sinal decair por completo antes de sair da janela, não importa com que frequência quem chama consulta os dados.

### O que os campos do esporte significam

| Campo | Significado |
|---|---|
| `clockBased` | O esporte tem relógio de jogo. Beisebol e softbol não têm, então a pressão da fase final corre pelas entradas. |
| `closenessMargins` | As três diferenças em que o Equilíbrio vai descendo: até t1 é apertadíssimo, até t2 é apertado, até t3 é o limite, e acima de t3 não paga nada. Outros sinais e impulsos reaproveitam esses valores, como o corte de atropelo da Virada em t2 e o portão do Atropelo cedo acima de t3. |
| `momentumBigRun`, `momentumSmallRun` | A parcial líquida, dentro da janela de histórico, que paga a faixa cheia e a metade da Dinâmica. |
| `comebackThresholdBig`, `comebackThresholdSmall` | A virada de placar que paga a faixa grande e a moderada da Virada. |
| `clockCountsUp` | O relógio mostra o tempo jogado, não o tempo que falta. Só no futebol. |
| `clockIsFullGameElapsed` | O relógio corre pela partida inteira (de 0' a 90'+) em vez de recomeçar a cada período, então os períodos completos são subtraídos antes de calcular o tempo que falta. Só no futebol. |
| `zeroZeroAsFullTie` | Um jogo 0 a 0 ganha o crédito cheio de empate no Equilíbrio. Com `false`, o 0 a 0 ganha a faixa reduzida `zeroZero`. |
| `zeroZeroPenaltyPeriods` | Períodos em que o 0 a 0 ainda ganha a faixa reduzida, mesmo com `zeroZeroAsFullTie` em `true`. O hóquei usa 1 e 2, o futebol o primeiro tempo. |
| `otPreBoostWindowSecs` | Os últimos segundos do período final do tempo normal em que um jogo empatado sobe rumo ao pré-impulso de prorrogação. `0` desliga. |
| `decayHalfLifeMs` | A rapidez com que Dinâmica, Mudanças de liderança e Virada esmaecem depois do último ponto. Mais longa nos esportes de pouca pontuação, para um gol manter os sinais vivos até o próximo. |
| `historyWindowMs` | Quanto histórico de placar os sinais de histórico leem. Veja acima. |
| `lateGameCurve` | Só beisebol e softbol: quantas entradas tem o tempo normal e em qual entrada a rampa da fase final começa. |

## LeagueConfig

Uma entrada por `LeagueId`, exportada como `leagueConfigs` (uma lista) e `leagueConfigMap` (indexado por `id`), mais `allLeagueIds` para a lista pura. O `periodFormat` é só texto de exibição e não afeta a pontuação. Cada entrada também traz alguns campos que o ArenaSwap usa para buscar dados e para saber quanto tempo um jogo ocupa numa barra da programação. O pontuador não os lê, então eles não estão na tabela.

| Liga | Esporte | Períodos | Duração do período |
|---|---|---|---|
| NBA (`nba`) | basketball | 4 | 720s |
| WNBA (`wnba`) | basketball | 4 | 600s |
| Basquete da NCAA (`ncaab`) | basketball | 2 | 1200s |
| Basquete feminino da NCAA (`ncaaw`) | basketball | 4 | 600s |
| Basquete masculino olímpico (`olybkm`) | basketball | 4 | 600s |
| Basquete feminino olímpico (`olybkw`) | basketball | 4 | 600s |
| NFL (`nfl`) | football | 4 | 900s |
| Futebol americano da NCAA (`ncaaf`) | football | 4 | 900s |
| UFL (`ufl`) | football | 4 | 900s |
| NHL (`nhl`) | hockey | 3 | 1200s |
| Hóquei masculino da NCAA (`ncaamh`) | hockey | 3 | 1200s |
| Hóquei no gelo masculino olímpico (`olymih`) | hockey | 3 | 1200s |
| Hóquei no gelo feminino olímpico (`olywih`) | hockey | 3 | 1200s |
| MLB (`mlb`) | baseball | 9 entradas | 0 |
| Beisebol da NCAA (`cbase`) | baseball | 9 entradas | 0 |
| Beisebol masculino olímpico (`olybb`) | baseball | 9 entradas | 0 |
| World Baseball Classic (`wbbc`) | baseball | 9 entradas | 0 |
| Softbol da NCAA (`csoft`) | softball | 7 entradas | 0 |
| MLS (`mls`) | soccer | 2 | 2700s |
| Premier League (`epl`) | soccer | 2 | 2700s |
| La Liga (`laliga`) | soccer | 2 | 2700s |
| Bundesliga (`bundesliga`) | soccer | 2 | 2700s |
| Serie A (`seriea`) | soccer | 2 | 2700s |
| Liga MX (`ligamx`) | soccer | 2 | 2700s |
| Liga dos Campeões da UEFA (`ucl`) | soccer | 2 | 2700s |
| Liga Europa da UEFA (`uel`) | soccer | 2 | 2700s |
| NWSL (`nwsl`) | soccer | 2 | 2700s |
| Copa do Mundo da FIFA (`fifawc`) | soccer | 2 | 2700s |
| Copa do Mundo Feminina da FIFA (`fifawwc`) | soccer | 2 | 2700s |
| Futebol masculino olímpico (`olysocm`) | soccer | 2 | 2700s |
| Futebol feminino olímpico (`olysocw`) | soccer | 2 | 2700s |

São 31 ligas no total, batendo com os 31 membros de `LeagueId`.

## Como se define o que é "apertado" em cada esporte

Uma única tupla, `closenessMargins: [t1, t2, t3]`, decide várias coisas de um esporte. Ela escolhe em qual faixa de equilíbrio uma diferença cai: apertadíssimo em `t1`, apertado em `t2`, no limite em `t3`, fora de alcance além disso. Também escolhe o teto para o qual a pressão da fase final sobe, a faixa em que o impulso de red zone do futebol americano paga, onde o Atropelos começa a pagar (dois placares de diferença, acima de `t2`) e quanto peso o Em jogo recebe.

O `[5, 10, 18]` do basquete quer dizer que um jogo de 2 pontos está apertadíssimo e um de 9 pontos está apertado. Um jogo de 18 pontos é o último que ainda conta como limite. O `[1, 2, 3]` do hóquei e do futebol trata um jogo de 2 gols do jeito que o basquete trata um de 9 pontos. Mudar o que é "apertado" num esporte é mudar uma tupla, não um punhado de limites separados.

## Ajuste para uma liga que o PowerScore não traz

O `Game` é genérico sobre o id da liga, então um feed com ids próprios funciona do jeito que está: `Game<string>`. Uma liga que a tabela não conhece é pontuada com os padrões do esporte dela. Cada esporte aponta para a liga mais conhecida dele em número de períodos e relógio:

| Esporte | Padrão |
|---|---|
| Basquete | NBA |
| Hóquei | NHL |
| Beisebol | MLB |
| Futebol americano | NFL |
| Softbol | Softbol da NCAA |
| Futebol | MLS |

O `sportType` é a única coisa que você precisa acertar. Ele governa quase tudo que um sinal faz, seja qual for a `league`. Um `sportType` não reconhecido cai à parte, na calibragem de sinais do basquete. Os dois recursos garantem que o jogo ainda seja pontuado em vez de lançar um erro.

Se os padrões não servem para a sua liga, sobrescreva a cada chamada:

```ts
scoreGame(game, context, {
	league: { regularPeriods: 3, periodDurationSecs: 15 * 60 },
});
```

O `options.league` aceita qualquer parte de um `LeagueConfig`, normalmente o número e a duração dos períodos. O `options.sport` aceita qualquer parte de um `SportTypeConfig`, como as diferenças de equilíbrio, os limites de dinâmica ou as meias-vidas. As sobrescritas valem só para aquela chamada, e os mapas exportados continuam como estavam.

O `sportTypeConfigMap` e o `leagueConfigMap` são objetos exportados simples, lidos a cada chamada em vez de uma cópia em cache. Alterá-los em tempo de execução muda mesmo a pontuação, mas nada nos tipos ou nos exports do pacote trata isso como ponto de extensão suportado, e uma versão futura não é obrigada a manter isso funcionando. Use as opções.
