---
sourceHash: '9c4dba756b81'
title: Impulsos e penalizações do PowerScore
navLabel: Impulsos e penalizações
description: Todos os impulsos e penalizações que o PowerScore 3 aplica por cima dos sinais de um modo, com a condição que ativa cada um, o seu máximo e os limites que partilham.
section: powerscore
order: 4
---

Os sinais medem como o jogo está a correr. Os impulsos e as penalizações tratam das coisas mais pequenas, com forma de momento, que os sinais não veem: um corredor na terceira base na 9.ª entrada, um guarda-redes retirado, um azarão pré-jogo ainda vivo. Ficam por cima dos sinais e nunca substituem nenhum.

Um impulso não paga nada enquanto o jogo não está em direto (`status: 'in'`) ou enquanto o jogo está parado, no intervalo, numa paragem ou num atraso. Cada um é recalculado a partir do estado atual do jogo em cada chamada, por isso não há nada para limpar quando o momento passa.

Cada impulso que um modo paga aparece em `score.boosts` como `{ id, points, meta?, details? }`, onde `details` guarda os fragmentos de razão que o descrevem, a `0` quando não está a pagar. Consulta um com `boostPoints(score, 'noHitter')`.

## Que modo mantém que impulsos

| Modo | Impulsos |
|---|---|
| Clássico | Todos os impulsos desta página, mais o modificador de probabilidade de vitória e a dedução por pausa publicitária |
| Goleadas | No-hitter e Surpresa esmagadora (Upset Rout), mais a dedução por pausa publicitária. Sem impulso de pós-temporada, porque uma goleada nos playoffs já tem o resultado decidido. |
| Fantasy | Nenhum, e sem dedução por pausa |

Os impulsos de favorito, de pós-temporada e manual, no [fundo da página](#favorite-postseason-and-manual-boosts), aplicam-se em todos os modos, exceto que as Goleadas ignoram o impulso de pós-temporada.

## Impulsos de momento do Clássico

| Impulso | Id | Paga por | Máx. |
|---|---|---|---|
| [Oportunidade de marcar](#scoring-opportunity) | `scoringOpportunity` | Corredores nas bases, uma série ofensiva de futebol americano dentro da red zone, ou uma superioridade numérica ou baliza vazia no hóquei | 20 |
| [Corrida da vantagem](#go-ahead-run) | `goAheadRun` | A corrida da vantagem ou do empate na base, no basebol e no softbol | 10 |
| [Ataque de dois minutos](#two-minute-drill) | `twoMinuteDrill` | Uma equipa de futebol americano com a bola, empatada ou a perder por uma pontuação, nos minutos finais | 12 |
| [Cartão vermelho](#red-card) | `redCard` | Uma expulsão num jogo de futebol empatado ou com um golo de diferença | 15 |
| [No-hitter](#no-hitter) | `noHitter` | Um jogo de basebol ou softbol em que uma equipa ainda não tem nenhuma batida | 70 |
| [Atenção à surpresa](#upset-watch) | `upsetWatch` | O azarão pré-jogo a ganhar ou a uma pontuação de distância | 12 |
| [Em jogo](#stakes) | `stakes` | Uma eliminatória no fio da navalha, duas equipas no ranking, uma corrida no fim da época | 10 |

Estes máximos são por impulso. A secção seguinte explica porque não se acumulam todos.

## Limites dos grupos

Os impulsos partilham limites, para que muitas coisas pequenas a acontecer ao mesmo tempo não consigam levar um jogo além do que uma reviravolta de uma pontuação no último minuto valeria.

| Grupo | Limite | O que tem | Porquê |
|---|---|---|---|
| Momentos | 20 | Oportunidade de marcar, corrida da vantagem, ataque de dois minutos, cartão vermelho | Um jogo empatado no apito final pontua cerca de 80 antes dos impulsos, por isso um momento completo leva-o a 100. Um último minuto com uma pontuação de diferença fica nos 80 altos, e nem todos os jogos apertados chegam aos 100. |
| No-hitter | 70 | No-hitter | Uma tentativa dura entradas, não um momento, e tem de levantar um jogo de 6-0 acima dos empatados. |
| Contexto | 16 | Atenção à surpresa, em jogo | Podem acontecer juntos (um azarão no ranking), mas juntos ficam abaixo de uma reviravolta tardia de uma pontuação, para que o contexto nunca passe à frente da ação em direto. |

Dentro de um grupo, os impulsos que vêm primeiro na tabela acima são pagos primeiro e o limite corta o que sobrar. A Surpresa esmagadora (Upset Rout), a versão das Goleadas da atenção à surpresa, não tem grupo.

## Oportunidade de marcar

Uma ameaça de pontuar que o marcador ainda não mostra.

**Basebol e softbol**, pelo número de corredores:

| Corredores nas bases | Impulso |
|---|---|
| Nenhum | 0 |
| Um | 3 |
| Dois | 6 |
| Três (bases cheias) | 10 |

Não paga nada com 3 outs. Os corredores podem ficar no marcador durante uma consulta depois do último out, e nada pode acontecer com eles.

**Futebol americano**, condicionado pela proximidade do jogo. Só se aplica quando `isRedZone` é verdadeiro.

| Diferença | Valor base |
|---|---|
| Dentro da faixa de jogo equilibrado (futebol americano: 9 pontos) | 10 |
| Dentro da faixa marginal (14 pontos) | 5 |
| Além disso | 0 |

O valor base é depois ponderado pelo down:

| Situação | Multiplicador |
|---|---|
| 4.º down e goal-to-go | ×1.5 |
| 4.º down (sem goal-to-go) | ×1.35 |
| 3.º down, 3 jardas ou menos para a frente | ×1.15 |
| Qualquer outra coisa, incluindo um `down` em falta | ×1 |

Um valor base de `0` continua `0`, seja qual for o down. Um impulso incondicional por cima de uma goleada desfaria o que o equilíbrio e a pressão da fase final já pontuaram corretamente em baixo. O goal-to-go só aumenta o multiplicador no 4.º down, porque num down anterior descreve as hipóteses de pontuar, não o que decide a posse de bola.

O **hóquei** paga por uma [superioridade numérica ou baliza vazia](#power-play-and-empty-net).

As constantes exportadas por trás destas tabelas são `scoringOpportunityBaseRunnerBoosts`, `scoringOpportunityRedZoneBoost`, `scoringOpportunityRedZoneFringeBoost`, `redZoneDownMultipliers` e `thirdAndShortDistance`.

### Superioridade numérica e baliza vazia

A oportunidade de marcar do hóquei. Ambas leem o `context`, porque vêm do feed de situação e não do marcador. Um 6 contra 4 é as duas coisas ao mesmo tempo, por isso somam-se e o limite dos momentos segura a soma em 20.

A **baliza vazia** paga nos últimos 4 minutos do 3.º período quando o jogo tem um ou dois golos de diferença: **12** com um golo, **7** com dois. Quando o feed diz de quem é a baliza vazia, só paga pela da equipa que perde. A baliza vazia de quem ganha significa uma penalização diferida, e o guarda-redes volta em segundos. Define `context.emptyNet` só depois de o feed o ter reportado em duas consultas seguidas, pela mesma razão.

A **superioridade numérica** paga em jogos empatados e com um ou dois golos de diferença. Tarde (3.º período ou depois) paga mais:

| Jogo | Tarde | Mais cedo |
|---|---|---|
| Empatado | 10 | 4 |
| Um golo, a equipa que perde tem a vantagem numérica | 10 | 4 |
| Um golo, a equipa que ganha tem-na | 5 | 2 |
| Dois golos, a equipa que perde tem-na | 5 | 2 |
| Dois golos, a equipa que ganha tem-na | 0 | 0 |

Quando o feed só diz que há uma superioridade numérica, mas não de quem, o impulso assume que a equipa que perde tem tantas hipóteses de a ter como não e paga um pouco menos: 7 ou 3 com um golo, 3 ou 2 com dois.

## Corrida da vantagem

Basebol e softbol. Precisa de `baseRunners`, `topOfInning`, `outs` e `period`. Paga por cima da contagem de corredores acima, e só quando a equipa ao bastão tem na base a corrida que importa:

| Na base | Paga |
|---|---|
| A corrida da vantagem: empate com alguém na base, a perder por um com dois na base, a perder por dois com as bases cheias | 8 |
| A corrida do empate: a perder por um com um na base, a perder por dois com dois na base, a perder por três com as bases cheias | 5 |

Só se aplica a linha mais alta. O valor base é depois ponderado pela entrada:

- Antes da 6.ª entrada (a 5.ª no softbol), metade. Uma ameaça na 3.ª é real, mas o jogo tem muitas entradas para lhe responder.
- Daí até à última entrada regulamentar, de 50% a subir para 100%.
- Entradas extra, 100%.
- ×1.25 quando é a última oportunidade: a equipa da casa ao bastão na última entrada ou depois, onde a corrida da vantagem é a corrida da vitória, ou uma equipa visitante a perder na parte alta dela, que pode não voltar a bater.

O máximo é 10: um 8 com peso total, vezes o aumento da última oportunidade. Com 3 outs não paga nada.

## Ataque de dois minutos

Futebol americano. Precisa de `possession`, `yardsToEndZone` e de um `down` em jogo. Paga no 4.º quarto e no prolongamento, só à equipa com a bola, e só quando ainda pode empatar ou ganhar com uma pontuação:

- **Empatado:** os últimos 2 minutos.
- **A perder por uma pontuação** (8 pontos, ou 9 na UFL, onde uma conversão pode valer 3): os últimos 4 minutos.

Uma equipa a gastar o relógio com vantagem não paga nada. Um prolongamento da NCAA ou da UFL, que não tem relógio de jogo, também não.

Os 12 pontos são ajustados por quatro coisas: quão pouco tempo resta (completo aos 40 segundos), a posição no campo (completo a partir das 35 jardas do adversário, ou 30 no universitário, até 40% nas 20 da própria equipa), os tempos mortos que restam (85% sem nenhum, 100% com três, 92.5% quando o feed não diz) e a diferença (completo quando está empatado ou a perder por 1 ou 2, a diminuir até 70% a perder por 8). Entre jogadas, depois de uma pontuação, o feed envia um down que não quer dizer nada, e o impulso paga 0 até ao snap seguinte.

## Cartão vermelho

Futebol. Precisa de `redCards`, uma lista de `{ side, minute }`. Um cartão vermelho num jogo empatado ou com um golo de diferença é daquelas coisas pelas quais um adepto muda de canal, e paga mais logo depois de acontecer:

| Quando saiu o cartão | Paga |
|---|---|
| Empatado, ou a equipa com o cartão ganha por um | 10 |
| A equipa com o cartão perde por um | 7 |
| A equipa com o cartão ganha por dois | 5 |
| Qualquer diferença maior | 0 |

Paga por inteiro durante 2 minutos de jogo e depois desvanece até 0 ao 10.º. Um segundo cartão para a mesma equipa paga 1.5 vezes mais, que é o máximo de 15. É reavaliado contra o marcador em cada consulta, por isso um golo que abre o jogo termina o impulso mais cedo.

**Dez jogadores.** Um cartão vermelho também aumenta o [Equilíbrio](/arenaswap/docs/powerscore/signals/#closeness) em 4 pontos quando a equipa com menos um jogador é a que defende uma vantagem de um golo. Sofre golos muito mais vezes do que uma equipa completa, por isso o jogo está mais equilibrado do que o marcador diz. Isto mantém-se enquanto essa for a situação, não só durante dez minutos.

## No-hitter

Basebol e softbol. Precisa de `hits` em cada equipa, mais `period` e `topOfInning`. Uma equipa sem batidas paga por uma **tentativa de no-hitter**, que começa tarde e cresce com cada entrada sem batidas:

- **Começa** depois da 5.ª entrada completa de um jogo de 9 entradas, e depois da 3.ª no softbol.
- **Sobe** com cada entrada completa sem batidas: 10, 22, 38 e depois 52, onde fica. Enquanto os lançadores que perseguem a tentativa estão em campo, também soma pontos out a out, por isso continua a crescer dentro de uma entrada.
- **Pesa menos** 30% enquanto esses lançadores estão no banco, já que nada está a acontecer à tentativa. As tentativas de softbol são ajustadas a 60%.

Quando as duas equipas estão sem batidas, a tentativa maior paga por inteiro e a outra a metade. O no-hitter tem o seu próprio limite de 70, fora dos momentos, porque uma tentativa dura entradas e tem de levantar um jogo de 6-0 acima dos empatados.

## Atenção à surpresa

Qualquer desporto. Precisa de `context.pregameLine`, e tem de ser a linha de antes do jogo. Uma linha em direto mexe-se com o marcador e apagaria justamente a surpresa que queres ver.

Paga quando o azarão pré-jogo está a ganhar, empatado ou a uma pontuação de distância, depois de o jogo passar a metade. Três coisas definem o número, até um máximo de 12:

- **Probabilidades.** Um jogo de moeda ao ar não paga nada. Quanto mais longas as probabilidades, mais paga, e é completo para um tiro no escuro. As moneylines funcionam em qualquer desporto e um spread funciona para basquetebol e futebol americano. Um empate no futebol conta como meia surpresa.
- **Tempo.** Nada antes de metade, metade a partir de metade e completo quando o jogo já vai tarde (três quartos no basquetebol e no futebol americano, dois terços na maioria dos outros desportos).
- **Estado.** Completo quando o azarão ganha, 80% quando está empatado (70% no futebol) e metade quando perde por uma pontuação ou menos.

### Surpresa esmagadora (Upset Rout)

A versão das Goleadas. O azarão não anda por ali: está a correr com o favorito do campo. Paga quando o azarão pré-jogo ganha por mais do que a margem fora de alcance do desporto (18 pontos no basquetebol, 14 no futebol americano, 3 golos no hóquei e no futebol, 5 corridas no basebol), com as mesmas probabilidades e o mesmo ajuste de tempo da atenção à surpresa e o mesmo máximo de 12.

## Em jogo

O que o resultado decide. O máximo é 10, e o número é ajustado pela proximidade do jogo: completo dentro da faixa de jogo equilibrado do desporto, a metade para um jogo de diferença marginal ou uma goleada ainda na primeira parte, e nada para uma goleada que já vai tarde. Um 7.º jogo decidido já não tem nada para decidir.

O "Em jogo" é mantido separado por época, para nunca contar a dobrar com o impulso de pós-temporada. Nos playoffs lê a eliminatória. Fora deles lê os rankings e a tabela.

| Em jogo | Precisa de | Paga |
|---|---|---|
| Uma eliminatória no fio da navalha | `game.series`, só nos playoffs | 10 quando as duas equipas estão a uma vitória da eliminatória num melhor de 7 (9 num melhor de 5, 8 num melhor de 3). 4 a 7 quando uma equipa enfrenta a eliminação: 7 para uma série de 3-2 num melhor de 7, 4 para uma tentativa de varrimento. |
| Duas equipas no ranking | `rank` em cada equipa, só na época regular | 6 quando a equipa pior classificada está no top 5. 5 quando está no top 10. 4 quando uma equipa está no top 10. 3 para qualquer outro par no top 25. |
| Uma corrida no fim da época | `context.stakes`, só na época regular | 5 quando ganhar garante algo ou perder elimina uma equipa. 6 a poucos pontos do título ou da linha de despromoção. 4 para os primeiros lugares europeus. 3 para qualquer outra linha da tabela ou quando ainda está na luta. |

Numa corrida, a equipa com mais em jogo paga por inteiro e a outra a metade, limitado a 6. O ranking e a corrida somam-se e o total é limitado a 10.

## Equilíbrio da probabilidade de vitória

Só Clássico. `computeWinProbVarianceScore(winProbHistory)` devolve um modificador de `-scoreWinProbVarianceMax` a `+scoreWinProbVarianceMax` (±5). Passa `context.winProbability` ao `scoreGame` e o modificador é incorporado no total por si só.

Precisa de pelo menos `minDataPoints` (5) valores finitos. Qualquer outra coisa devolve `undefined`, e o campo `winProbabilityVariance` do resultado é deixado de fora por completo em vez de ser posto a `0`. As entradas não finitas (`NaN`, `Infinity`) são descartadas antes de essa contagem ser verificada.

O modificador é a distância absoluta média dos valores fornecidos a 0.5, mapeada no intervalo ±5:

| Distância média a 50% | Modificador |
|---|---|
| 0 (moeda ao ar) | +5 |
| `maxAvgDist` ÷ 2 (0.175) | 0 |
| ≥ `maxAvgDist` (0.35) | −5 |

Apesar do nome, o modificador mede a distância média a 50%, não a variância. Uma linha de probabilidade de vitória que oscila entre 10% e 90% leva a mesma penalização que uma mantida estável nos 90%. Ambas têm a mesma distância média ao ponto médio.

O modificador é somado depois da dedução por pausa, não antes, e o resultado é limitado a 0 a 100 antes de qualquer impulso ser somado.

## Dedução por pausa publicitária

Uma dedução fixa sai do subtotal dos sinais enquanto um jogo está numa pausa publicitária, para o ArenaSwap não mudar para um jogo que está a mostrar anúncios. Quem chama passa `context.onBreak`, e o motor tira 15 pontos fixos ao subtotal dos sinais enquanto for `true`. É o `breakPenalty`. Se alguns sinais estiverem desativados, a dedução aumenta com o resto do subtotal: 30 com metade do teto dos sinais desligado.

Sai depois dos sinais e antes do modificador de probabilidade de vitória, e é uma dedução, não um multiplicador. O Clássico e as Goleadas pagam-na. O Fantasy não. O `onBreak` e o `breakPenalty` do resultado dizem se foi aplicada e quanto saiu. Ambos são `false` e `0` num marcador parado de intervalo ou paragem.

O `signalsSubtotal` do resultado guarda a soma antes da dedução, para uma análise poder mostrar o que a pausa custou. O `scoreGame` não deteta pausas sozinho. Quem chama é que deteta. O ArenaSwap lê pausas entre entradas, trocas de lançador e tempos mortos de TV a partir do seu feed de marcador e passa a resposta.

## Impulsos de favorito, de pós-temporada e manuais

Estes três vêm de ti, não do jogo, e funcionam em todos os modos. A única exceção são as Goleadas, que nunca pagam o impulso de pós-temporada. Passa-os em `options`:

| Opção | O que faz |
|---|---|
| `favoriteTeamCount` e `favoriteBoostPoints` | Pontos por cada equipa favorita no jogo, por isso um confronto de duas favoritas paga duas vezes. |
| `postseasonBoostPoints` e `game.postseasonRound` | Pontos por uma ronda que decide o título (`0`), com uma parte para as anteriores: `1` meia-final 75%, `2` quartos de final 50%, `3` qualquer anterior 25%. |
| `gameBoost` | Um impulso manual fixo, como o que um espectador define num jogo. |

Aparecem em `score.boosts` como `favoriteBoost`, `postseasonBoost` e `gameBoost`, depois de os pedires. Os impulsos de favorito e de pós-temporada são somados depois dos impulsos do próprio modo e da sua mistura, e o total volta a ser limitado a 100. O `gameBoost` é somado em último e é a única coisa autorizada a passar dos 100. É de propósito: um jogo que um espectador fixa deve poder bater uma pontuação perfeita.

Nenhum paga nada se não lhe deres pontos. O pacote não tem valor predefinido para nenhum. Como o ArenaSwap transforma as definições guardadas de um espectador nestes números está nas [suas próprias docs](/arenaswap/docs/extension/settings/#scoring), não neste pacote.

## Se ainda estás na API 2.x

O `computePowerScore` mantém o comportamento 2.x: sinais e probabilidade de vitória, sem nenhum dos impulsos de momento. O `computeScoringOpportunityBoost(game)` continua a devolver sozinho o número da oportunidade de marcar, e o `normalizePowerScoreResult` continua a limitar e a passar `favoriteBonus`, `gameBoost` e `postseasonBoost` para um resultado que construas à mão. Tudo isto está obsoleto, mas a funcionar. Vê [a referência da API](/arenaswap/docs/powerscore/api-reference/#the-2x-api) para a lista completa.
