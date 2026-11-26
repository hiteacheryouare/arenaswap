---
sourceHash: 'b8d43b70dd47'
title: Impulsos e penalidades do PowerScore
navLabel: Impulsos e penalidades
description: Todo impulso e toda penalidade que o PowerScore 3 aplica por cima dos sinais de um modo, com a condição que dispara cada um, o máximo e os tetos que eles dividem.
section: powerscore
order: 4
---

Os sinais medem como um jogo está indo. Os impulsos e as penalidades cuidam das coisas menores, em forma de momento, que os sinais não enxergam: um corredor na terceira base na 9ª entrada, um goleiro retirado, um azarão de pré-jogo ainda vivo. Eles ficam por cima dos sinais e nunca substituem nenhum.

Um impulso não paga nada enquanto o jogo não está ao vivo (`status: 'in'`) ou enquanto a partida está parada no intervalo, numa pausa ou num atraso. Cada um é recalculado a partir do estado atual do jogo a cada chamada, então não há nada para limpar quando o momento passa.

Todo impulso que um modo paga aparece em `score.boosts` como `{ id, points, meta?, details? }`, onde `details` guarda os trechos de motivo que o descrevem, em `0` quando não está pagando. Consulte um com `boostPoints(score, 'noHitter')`.

## Qual modo fica com quais impulsos

| Modo | Impulsos |
|---|---|
| Clássico | Todos os impulsos desta página, mais o modificador de probabilidade de vitória e o desconto por intervalo comercial |
| Atropelos | No-hitter e Zebra, mais o desconto por intervalo comercial. Sem impulso de pós-temporada, porque um massacre de playoff já tem o resultado decidido. |
| Fantasy | Nenhum, e sem desconto por intervalo |

Os impulsos de favorito, de pós-temporada e manual, no [fim da página](#favorite-postseason-and-manual-boosts), valem em todos os modos, só que o Atropelos pula o de pós-temporada.

## Os impulsos de momento do Clássico

| Impulso | Id | Paga por | Máx. |
|---|---|---|---|
| [Oportunidade de pontuar](#scoring-opportunity) | `scoringOpportunity` | Corredores nas bases, uma campanha de futebol americano dentro da red zone, ou um power play ou goleiro retirado no hóquei | 20 |
| [Corrida da vantagem](#go-ahead-run) | `goAheadRun` | A corrida da vantagem ou do empate em base no beisebol e no softbol | 10 |
| [Two-minute drill](#two-minute-drill) | `twoMinuteDrill` | Um time de futebol americano com a bola, empatado ou perdendo por um placar, nos minutos finais | 12 |
| [Último arremesso](#last-shot) | `lastShot` | Um jogo de basquete com até 3 pontos de diferença e menos tempo do que no relógio de posse | 12 |
| [Morte súbita](#sudden-death) | `suddenDeath` | Prorrogação dos playoffs de hóquei, prorrogação universitária e da UFL, e shootouts | 12 |
| [Cartão vermelho](#red-card) | `redCard` | Uma expulsão num jogo de futebol empatado ou com um gol de diferença | 15 |
| [No-hitter](#no-hitter) | `noHitter` | Um jogo de beisebol ou softbol com um time ainda sem hit | 70 |
| [Alerta de zebra](#upset-watch) | `upsetWatch` | O azarão de pré-jogo na frente ou a um placar de distância | 12 |
| [Em jogo](#stakes) | `stakes` | Uma série à beira do fim, dois times ranqueados, uma disputa de fim de temporada | 10 |

Esses máximos são por impulso. A próxima seção explica por que nem todos se acumulam.

## Tetos dos baldes

Os impulsos dividem tetos, então muita coisa pequena acontecendo ao mesmo tempo não consegue levar um jogo além do que uma virada de um placar no último minuto renderia.

| Balde | Teto | O que tem nele | Por quê |
|---|---|---|---|
| Momentos | 20 | Oportunidade de pontuar, corrida da vantagem, two-minute drill, último arremesso, morte súbita, cartão vermelho | Um jogo empatado na sirene pontua uns 80 antes dos impulsos, então um momento cheio o leva a 100. Um último minuto com um placar de diferença cai nos 80 e poucos, e nem todo jogo apertado trava em 100. |
| No-hitter | 70 | No-hitter | Uma tentativa dura entradas, não um momento, e precisa levar um jogo de 6 a 0 acima dos empatados. |
| Contexto | 16 | Alerta de zebra, Em jogo | Os dois podem acontecer juntos (um azarão ranqueado), mas juntos ficam abaixo de uma virada de um placar no fim, então o contexto nunca passa na frente da ação ao vivo. |

Dentro de um balde, os impulsos que aparecem antes na tabela acima são pagos primeiro, e o teto apara o que sobra. A Zebra, a versão do Atropelos para o alerta de zebra, não tem balde.

## Oportunidade de pontuar

Uma ameaça de pontuar que o placar ainda não mostra.

**Beisebol e softbol**, pela quantidade de corredores:

| Corredores nas bases | Impulso |
|---|---|
| Nenhum | 0 |
| Um | 3 |
| Dois | 6 |
| Três (bases lotadas) | 10 |

Não paga nada com 3 outs. Os corredores podem ficar no placar por uma consulta depois do último out, e nada pode acontecer com eles.

**O corredor das entradas extras.** Onde as regras começam cada entrada extra com um corredor na segunda (a MLB na temporada regular e o World Baseball Classic a partir da 10ª, o softbol universitário a partir da 8ª), esse corredor vale metade até a entrada ter alguma coisa: um out, ou outro corredor em base.

**Futebol americano**, travado pelo quanto o jogo já está apertado. Só vale quando `isRedZone` é verdadeiro.

| Diferença | Valor-base |
|---|---|
| Dentro da faixa apertada (futebol americano: 9 pontos) | 10 |
| Dentro da faixa do limite (14 pontos) | 5 |
| Além disso | 0 |

O valor-base é então ponderado pelo down:

| Situação | Multiplicador |
|---|---|
| 4º down e goal-to-go | ×1,5 |
| 4º down (sem goal-to-go) | ×1,35 |
| 3º down, 3 jardas ou menos para ir | ×1,15 |
| Qualquer outra coisa, inclusive um `down` ausente | ×1 |

Um valor-base `0` continua `0`, seja qual for o down. Um impulso incondicional por cima de um massacre desfaria o que o equilíbrio e a pressão da fase final já pontuaram corretamente baixo. O goal-to-go só aumenta o multiplicador no 4º down, porque num down anterior ele descreve as chances de pontuar, não o que decide a posse.

O **Hóquei** paga por um [power play ou goleiro retirado](#power-play-and-empty-net).

As constantes exportadas por trás dessas tabelas são `scoringOpportunityBaseRunnerBoosts`, `scoringOpportunityRedZoneBoost`, `scoringOpportunityRedZoneFringeBoost`, `redZoneDownMultipliers` e `thirdAndShortDistance`.

### Power play e goleiro retirado

A oportunidade de pontuar do hóquei. Os dois leem o `context`, porque vêm do feed de situação e não do placar. Um 6 contra 4 é os dois ao mesmo tempo, então eles se somam e o teto de momentos segura a soma em 20.

O **goleiro retirado** paga nos últimos 4 minutos do 3º período quando o jogo está a um ou dois gols de diferença: **12** com um gol, **7** com dois. Quando o feed diz de quem é o gol vazio, ele só paga o do time que está perdendo. O gol vazio de quem está na frente significa uma penalidade adiada, e o goleiro volta em segundos. Defina `context.emptyNet` só depois que o feed informar isso em duas consultas seguidas, pelo mesmo motivo.

O **power play** paga em jogos empatados e com um ou dois gols de diferença. Tarde (3º período em diante) ele paga mais:

| Jogo | Tarde | Antes |
|---|---|---|
| Empatado | 10 | 4 |
| Um gol, o time que está perdendo tem a vantagem numérica | 10 | 4 |
| Um gol, o time que está na frente tem | 5 | 2 |
| Dois gols, o time que está perdendo tem | 5 | 2 |
| Dois gols, o time que está na frente tem | 0 | 0 |

Quando o feed só diz que há um power play, sem dizer de quem, o impulso assume que o time que está perdendo tem tanta chance de tê-lo quanto de não tê-lo, e paga um pouco menos: 7 ou 3 com um gol, 3 ou 2 com dois.

## Corrida da vantagem

Beisebol e softbol. Precisa de `baseRunners`, `topOfInning`, `outs` e `period`. Paga por cima da contagem de corredores acima, e só quando o time que rebate tem em base a corrida que importa:

| Em base | Paga |
|---|---|
| A corrida da vantagem: empatado com qualquer um em base, perdendo por um com dois em base, perdendo por dois com as bases lotadas | 8 |
| A corrida do empate: perdendo por um com um em base, perdendo por dois com dois em base, perdendo por três com as bases lotadas | 5 |

Só a linha mais alta vale. O valor-base é então ponderado pela entrada:

- Antes da 6ª entrada (a 5ª no softbol), metade. Uma ameaça na 3ª é real, mas o jogo ainda tem muitas entradas para responder.
- Dali até a última entrada do tempo normal, de 50% subindo a 100%.
- Entradas extras, 100%.
- ×1,25 quando é a última chance: o time da casa rebatendo na última entrada ou depois dela, em que a corrida da vantagem é a corrida da vitória, ou um visitante perdendo na parte alta dela, que pode não rebater de novo.

O máximo é 10: um 8 com peso cheio, vezes o acréscimo de última chance. Com 3 outs não paga nada.

O corredor das entradas extras ainda intocado de [Oportunidade de pontuar](#scoring-opportunity) vale metade aqui também.

## Two-minute drill

Futebol americano. Precisa de `possession`, `yardsToEndZone` e um `down` ao vivo. Paga no 4º quarto e na prorrogação, só para o time com a bola, e só quando ele ainda pode empatar ou vencer com um placar:

- **Empatado:** os últimos 2 minutos.
- **Perdendo por um placar** (8 pontos, ou 9 na UFL, onde uma conversão pode valer 3): os últimos 4 minutos.

Um time que gasta o relógio com a vantagem não paga nada. Uma prorrogação da NCAA ou da UFL, que não tem relógio de jogo, também não.

Os 12 pontos são escalados por quatro coisas: quão pouco tempo resta (cheio aos 40 segundos), a posição em campo (cheio a partir da jarda 35 do adversário, ou 30 na universidade, caindo a 40% na sua própria jarda 20), os pedidos de tempo que sobram (85% sem nenhum, 100% com três, 92,5% quando o feed não diz) e a diferença (cheia quando empatado ou perdendo por 1 ou 2, caindo a 70% com 8 de desvantagem). Entre jogadas, depois de um ponto, um feed manda um down que não significa nada, e o impulso paga 0 até a próxima bola em jogo.

**O kickoff.** Uma exceção: quando o time que acabou de pontuar ainda perde por uma posse nos últimos 4 minutos do 4º quarto, o impulso paga pelo kickoff que vem aí, a três quartos do que uma campanha pagaria com o mesmo relógio e a mesma diferença. Ele lê `context.history` para saber quem pontuou e para 5 minutos depois da pontuação.

## Último arremesso

Basquete. Paga no último período ou na prorrogação quando a diferença é de até 3 pontos e resta menos tempo do que no relógio de posse: 24 segundos, ou 30 no universitário.

Começa em 60% de 12 assim que o relógio do jogo fica abaixo do relógio de posse e sobe até os 12 cheios com 5 segundos restantes. Um jogo de 3 pontos, em que o time perdendo precisa de uma bola de três só para empatar, paga três quartos. Em 0:00 não paga nada.

## Morte súbita

Prorrogações em que a próxima pontuação pode encerrar o jogo, e shootouts.

| Situação | Paga |
|---|---|
| Prorrogação dos playoffs de hóquei | 4 na primeira prorrogação, 8 na segunda, 12 da terceira em diante |
| Um shootout de hóquei na temporada regular | 10 |
| Uma disputa de pênaltis | 12 empatada, 8 com um gol de diferença, 4 com dois, 0 além disso |
| Prorrogação do futebol americano universitário, com até uma posse de diferença | 4, depois 8, depois 12 a partir da terceira prorrogação, quando ficam só as tentativas de dois pontos |
| Prorrogação da UFL | 12, porque começa nas tentativas de dois pontos |

A prorrogação 3 contra 3 da temporada regular de hóquei e a prorrogação da NFL não pagam nada. Os gols da disputa de pênaltis vêm de `shootoutScore` em cada time, e sem eles uma disputa de pênaltis paga 10 fixos. Os dados de hóquei não trazem os gols do shootout, então um shootout de hóquei sempre paga 10.

## Cartão vermelho

Futebol. Precisa de `redCards`, uma lista de `{ side, minute }`. Um cartão vermelho num jogo empatado ou com um gol de diferença é o tipo de coisa que faz o torcedor trocar de jogo, e paga mais logo depois de acontecer:

| Quando veio o cartão | Paga |
|---|---|
| Empatado, ou o time do cartão está na frente por um | 10 |
| O time do cartão está perdendo por um | 7 |
| O time do cartão está na frente por dois | 5 |
| Qualquer diferença maior | 0 |

Paga por inteiro durante 2 minutos de jogo e depois esmaece até 0 no 10º. Um segundo cartão para o mesmo time paga 1,5 vez mais, que é o máximo de 15. É conferido de novo contra o placar a cada consulta, então um gol que abre o jogo encerra o impulso mais cedo.

**Dez contra onze.** Um cartão vermelho também soma 4 pontos ao [Equilíbrio](/arenaswap/docs/powerscore/signals/#closeness) quando o time com um a menos é o que protege uma vantagem de um gol. Esse time sofre gol muito mais do que um time completo, então o jogo está mais apertado do que o placar diz. Isso continua enquanto essa for a situação, não só por dez minutos.

## No-hitter

Beisebol e softbol. Precisa de `hits` em cada time, mais `period` e `topOfInning`. Um time sem hits paga por uma **tentativa de no-hitter**, que começa tarde e cresce a cada entrada sem hit:

- **Começa** depois da 5ª entrada completa de um jogo de 9 entradas, e depois da 3ª no softbol.
- **Sobe** a cada entrada completa sem hit: 10, 22, 38, depois 52 e para. Enquanto a equipe de arremessadores atrás da tentativa está em campo, ela também soma pontos out a out, então continua crescendo dentro de uma entrada.
- **Pesa menos** em 30% enquanto essa equipe está no banco, já que nada acontece com a tentativa. As tentativas no softbol são escaladas a 60%.

Quando os dois times estão sem hits, a tentativa maior paga por inteiro e a outra pela metade. O no-hitter tem o seu próprio teto de 70, fora dos momentos, porque uma tentativa dura entradas e precisa levar um jogo de 6 a 0 acima dos empatados.

## Alerta de zebra

Qualquer esporte. Precisa de `context.pregameLine`, e tem de ser a linha de antes do jogo. Uma linha ao vivo se mexe com o placar e apagaria justamente a zebra que você quer ver.

Paga quando o azarão de pré-jogo está na frente, empatado ou a um placar de distância, depois que o jogo passa da metade. Três coisas definem o número, até um máximo de 12:

- **Odds.** Um jogo de cara ou coroa não paga nada. Quanto mais longas as odds, mais paga, e é cheio para uma zebra improvável. As moneylines funcionam em qualquer esporte, e um spread funciona para basquete e futebol americano. Um empate no futebol conta como meia zebra.
- **Tempo.** Nada antes da metade, metade a partir da metade e cheio quando o jogo está avançado (três quartos no basquete e no futebol americano, dois terços na maioria dos outros esportes).
- **Estado.** Cheio quando o azarão está na frente, 80% quando está empatado (70% no futebol) e metade quando está perdendo por um placar ou menos.

### Zebra

A versão do Atropelos. O azarão não está só por perto: está botando o favorito para correr. Paga quando o azarão de pré-jogo lidera por mais que a diferença fora de alcance do esporte (18 pontos no basquete, 14 no futebol americano, 3 gols no hóquei e no futebol, 5 corridas no beisebol), com as mesmas odds e a mesma escala de tempo do alerta de zebra e o mesmo máximo de 12.

## Em jogo

O que o resultado decide. O máximo é 10, e o número é escalado pelo quanto o jogo está apertado: cheio dentro da faixa apertada do esporte, pela metade para um jogo com diferença de limite ou um massacre ainda na primeira metade, e nada para um massacre que já está avançado. Um Jogo 7 decidido não tem mais nada para decidir.

O Em jogo é separado por época, para nunca contar em dobro com o impulso de pós-temporada. Na pós-temporada ele lê a série. Fora dela, lê os rankings e a tabela.

| Em jogo | Precisa de | Paga |
|---|---|---|
| Uma série à beira do fim | `game.series`, só pós-temporada | 10 quando os dois times estão a uma vitória da série numa melhor de 7 (9 numa melhor de 5, 8 numa melhor de 3). De 4 a 7 quando um time enfrenta a eliminação: 7 para uma série em 3 a 2 numa melhor de 7, 4 para uma tentativa de varrida. |
| Dois times ranqueados | `rank` em cada time, só temporada regular | 6 quando o de ranking mais baixo está no top 5. 5 quando está no top 10. 4 quando um time está no top 10. 3 para qualquer outra dupla do top 25. |
| Uma disputa de fim de temporada | `context.stakes`, só temporada regular | 5 quando vencer garante alguma coisa ou perder elimina um time. 6 a poucos pontos do título ou da linha do rebaixamento. 4 para as primeiras vagas europeias. 3 para qualquer outra linha da tabela ou quando ainda está na briga. |

Numa disputa, o time com mais coisa em jogo paga por inteiro e o outro pela metade, limitado a 6. Ranking e disputa se somam, e o total é limitado a 10.

## Oscilações da probabilidade de vitória

Só no Clássico. O `computeWinProbVarianceScore(line, nowProgress?, sport?)` devolve um modificador de `-scoreWinProbVarianceMax` a `+scoreWinProbVarianceMax` (±5). Passe `context.winProbability` ao `scoreGame` e o modificador entra sozinho no total, medido a partir do ponto atual do jogo em [`getTimelineProgress`](/arenaswap/docs/powerscore/api-reference/#config-and-progress).

A linha é a probabilidade de vitória do time da casa, uma leitura por lance, da mais antiga para a mais nova. Cada leitura é um [`WinProbabilityReading`](/arenaswap/docs/powerscore/types/#winprobabilityreading): `homeWinProbability`, de 0 a 1, e `progress`, quanto do jogo já tinha passado quando aquele lance aconteceu. Um `number[]` simples continua funcionando, e as leituras se distribuem por igual do começo do jogo até agora.

Precisa de 3 leituras e de um décimo do jogo disputado. Antes disso devolve `undefined`, e o campo `winProbabilityVariance` do resultado fica de fora em vez de ser definido como `0`. As leituras não finitas são descartadas primeiro.

O modificador paga o maior de dois bônus, ambos medidos no trecho recente do jogo. Tudo cai pela metade a cada `halfLife`, um décimo do tempo normal: cerca de 4 minutos de basquete universitário, 5 da NBA, 6 do futebol americano ou uma entrada de beisebol.

O **bônus de cara ou coroa** paga por um jogo que ficou apertado. Vale +5 quando a probabilidade de vitória ficou em 50% nas últimas quatro meias-vidas, e cai a 0 quando a distância média de 50% chega a `coinFlipZeroDistance` (0,175).

O **bônus de oscilação** paga por um jogo que vem se mexendo. Ele mistura duas medidas:

| Medida | O que soma | Cheia em | Parte da mistura |
|---|---|---|---|
| Movimento | Toda variação da probabilidade de vitória de um lance para o outro nas últimas quatro meias-vidas, cada uma limitada a 0,5 | `movementFullScale` | 70% |
| Oscilação | A maior distância entre a leitura atual e qualquer leitura das últimas três meias-vidas, reduzida pela metade a cada duas meias-vidas | `swingFullScale` | `swingWeight` (30%) |

Uma mistura em `neutralBlend` paga 0 e uma mistura cheia paga +5. Uma leitura que salta mais de 0,15 e volta logo para até 0,05 de onde estava é um lance corrigido, e é ignorada.

Cada esporte tem suas próprias escalas em `winProbabilityScales`, porque um jogo de basquete registra cerca de três vezes mais lances por minuto que um de futebol americano, e cada lance soma movimento:

| Esporte | `movementFullScale` | `swingFullScale` | `neutralBlend` |
|---|---|---|---|
| Basquete | 1,77 | 0,27 | 0,52 |
| Futebol americano | 0,77 | 0,23 | 0,54 |
| Beisebol | 0,67 | 0,29 | 0,46 |

Os outros esportes usam as do basquete, vindas de `scorerTunables.scores.winProbabilityVariance.scales`.

O bônus de oscilação some aos poucos conforme a probabilidade de vitória de quem está na frente sobe de `openLead` (80%) a `decidedLead` (97%), então um soluço num jogo decidido não rende nada.

Quando nenhum dos bônus paga, o modificador é 0 no primeiro tempo. A partir de `penaltyFromProgress` (a metade do tempo normal), vira uma penalidade de até −5 que cresce conforme o jogo está decidido e quieto: nada enquanto o jogo ainda está aberto, os −5 inteiros quando um jogo que não se mexeu chega a 97%.

Um começo desigual não custa nada quando o jogo vira. Um jogo que ficou em 98% quase a noite toda e depois oscila até um cara ou coroa ganha o bônus assim que as oscilações se acumulam, porque só o trecho recente conta.

O `neutralBlend` de cada esporte é a mistura mediana dos momentos ao vivo e ainda indefinidos em 565 jogos encerrados (275 de basquete, 193 de futebol americano, 97 de beisebol), e as escalas cheias são os percentis 90 dos mesmos momentos.

## Desconto por intervalo comercial

Um desconto fixo sai do subtotal dos sinais enquanto um jogo está num intervalo comercial, para o ArenaSwap não trocar para um jogo que está mostrando anúncios. Quem chama passa `context.onBreak`, e o motor tira 15 pontos fixos do subtotal dos sinais enquanto ele for `true`. Esse é o `breakPenalty`. Se alguns sinais estão desligados, o desconto cresce junto com o resto do subtotal: 30 com metade do teto dos sinais desligada.

Ele sai depois dos sinais e antes do modificador de probabilidade de vitória, e é um desconto, não um multiplicador. O Clássico e o Atropelos pagam. O Fantasy não. O `onBreak` e o `breakPenalty` do resultado dizem se ele foi aplicado e quanto saiu. Os dois são `false` e `0` numa pontuação congelada de intervalo ou pausa.

O `signalsSubtotal` do resultado guarda a soma antes do desconto, para uma análise poder mostrar quanto o intervalo custou. O `scoreGame` não detecta intervalos sozinho. Quem chama detecta. O ArenaSwap lê pausas entre entradas, trocas de arremessador e pedidos de tempo de TV no feed do placar e passa a resposta.

## Impulsos de favorito, de pós-temporada e manuais

Estes três vêm de você, não do jogo, e funcionam em todos os modos. A única exceção é o Atropelos, que nunca paga o impulso de pós-temporada. Passe-os em `options`:

| Opção | O que faz |
|---|---|
| `favoriteTeamCount` e `favoriteBoostPoints` | Pontos para cada time favorito no jogo, então um confronto de dois favoritos paga duas vezes. |
| `postseasonBoostPoints` e `game.postseasonRound` | Pontos para uma fase que decide o título (`0`), com uma parte para as anteriores: `1` semifinal 75%, `2` quartas de final 50%, `3` qualquer fase anterior 25%. |
| `gameBoost` | Um impulso manual fixo, como o que quem assiste define num jogo. |

Eles aparecem em `score.boosts` como `favoriteBoost`, `postseasonBoost` e `gameBoost`, depois que você os pede. Os impulsos de favorito e de pós-temporada são somados depois dos impulsos do próprio modo e da sua mistura, e o total é limitado a 100 de novo. O `gameBoost` é somado por último e é a única coisa que pode passar de 100. É de propósito: um jogo fixado por quem assiste deve poder superar uma pontuação perfeita.

Nenhum deles paga nada se você não der pontos. O pacote não tem padrão para nenhum. Como o ArenaSwap transforma as configurações salvas de quem assiste nesses números está [na própria documentação dele](/arenaswap/docs/extension/settings/#scoring), não neste pacote.

## Se você ainda está na API 2.x

O `computePowerScore` mantém o comportamento 2.x: sinais e probabilidade de vitória, sem nenhum dos impulsos de momento. O `computeScoringOpportunityBoost(game)` ainda devolve o número de oportunidade de pontuar sozinho, e o `normalizePowerScoreResult` ainda limita e repassa `favoriteBonus`, `gameBoost` e `postseasonBoost` para um resultado que você monta à mão. Tudo isso está obsoleto, mas funcionando. Veja [a referência da API](/arenaswap/docs/powerscore/api-reference/#the-2x-api) para a lista completa.
