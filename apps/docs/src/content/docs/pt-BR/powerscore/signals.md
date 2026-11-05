---
sourceHash: '1aa0123b3860'
title: Sinais do PowerScore em cada modo
description: Os sinais por trás do PowerScore Clássico, Atropelos e Fantasy, com o teto de cada um, o que mede e o que ignora. E como desligar sinais.
section: powerscore
order: 3
navLabel: Sinais por modo
---

Um sinal mede uma coisa sobre o jogo e ignora todo o resto, inclusive os outros sinais do seu modo. Um modo é uma lista de sinais mais os impulsos que combinam com ele. O PowerScore 3 traz três, e cada um faz uma pergunta diferente.

| Modo | A pergunta | Sinais (teto) |
|---|---|---|
| `'classic'` (o padrão) | Está apertado, perto do fim e oscilando? | Equilíbrio 42, Fase final 38, Dinâmica 38, Mudanças de liderança 18, Virada 20 |
| `'blowouts'` | Alguém está abrindo uma vantagem enorme? | Diferença 50, Vantagem mantida 30, Atropelo cedo 25, Sem dó 15 |
| `'fantasy'` | Algo está prestes a acontecer com os meus jogadores? | Em campo 50, Pontos de fantasy 35, Seus jogadores 15 |

Escolha um com `options.mode`. Nos ids como aparecem em `score.signals`, são `closeness`, `lateGame`, `momentum`, `leadChanges`, `comeback`; `blowoutMargin`, `sustained`, `timing`, `pileOn`; e `situation`, `production`, `exposure`.

O Atropelos e o Fantasy não substituem o Clássico. Cada um se apoia nele, então um jogo sem nada a dizer no novo modo ainda tem uma pontuação sensata. [Como os modos se misturam](#how-the-modes-blend-with-classic) cobre a conta.

## Por que os tetos somam mais que o total

Os tetos do Clássico somam 156, e o total é limitado a 100. Uma escala que só pagasse 60 dos seus 100 pontos desperdiçaria os outros 40 em jogos que nunca chegam ao topo. Somar os tetos além do limite mantém todos os pontos em jogo. Um jogo apertado, com a liderança trocando de mão e uma parcial em andamento, empilha vários sinais perto dos seus próprios máximos ao mesmo tempo e chega aos 80 ou 90 bem antes da sirene final. Um clássico de verdade, empatado no fim e com uma parcial nas costas, satura em 100. Um jogo morno continua pontuando baixo, porque nenhum dos sinais dispara.

Vale o mesmo para o Atropelos (120) e o Fantasy (100). As somas são `scoreMaxSignalsSubtotal` para o Clássico e `signalCeiling` em qualquer resultado `PowerScore` para o modo que pontuou.

## Desligue um sinal

Passe o id dele em `options.disabledSignals`. Os sinais que continuam ligados são reescalados para a faixa inteira do modo, então um modo com um sinal desligado ainda vai de 0 a 100 em vez de parar cedo. Desligue todos e não sobra nenhum: não há para onde reescalar.

```ts
scoreGame(game, context, { disabledSignals: ['momentum', 'comeback'] });
```

Cada entrada em `score.signals` traz `disabled: true` quando você faz isso, para uma análise poder esmaecê-la. Quando um modo se mistura com o Clássico, `options.classicDisabledSignals` é a lista de desligados do próprio Clássico.

## Clássico

O modelo 2.x, com os impulsos de momento de [Impulsos e penalidades](/arenaswap/docs/powerscore/boosts-and-penalties/) somados por cima.

### Equilíbrio

Teto: `scoreMaxCloseness`, 42.

Compara a diferença de placar com limites específicos do esporte para escolher uma faixa, e depois escala essa faixa pelo quanto o jogo já avançou. A curva chega à maior parte do valor no meio do jogo em vez de esperar a sirene final: `floor + (tierCeiling − floor) × progress^0.55`. Um piso fixo pequeno, de 12, sempre paga, limitado ao teto da própria faixa. Por causa dele, um jogo empatado no primeiro minuto já vale alguma coisa.

Os tetos das faixas:

| Situação | Basquete | Futebol americano | Hóquei e futebol | Beisebol e softbol | Teto |
|---|---|---|---|---|---|
| Empatado | | | | | 42 |
| Apertadíssimo | ≤ 5 pontos | ≤ 3 pontos | ≤ 1 gol | ≤ 1 corrida | 34 |
| Apertado | ≤ 10 pontos | ≤ 9 pontos | ≤ 2 gols | ≤ 3 corridas | 20 |
| No limite | ≤ 18 pontos | ≤ 14 pontos | ≤ 3 gols | ≤ 5 corridas | 8 |
| Fora de alcance | > 18 pontos | > 14 pontos | > 3 gols | > 5 corridas | 0 |

O 0 a 0 é pontuado à parte de um empate comum, porque no começo ele costuma significar que nada aconteceu ainda, e não que o jogo está disputado. O hóquei dá o crédito cheio de empate ao 0 a 0 a partir do terceiro período, e o futebol a partir do segundo tempo. Antes disso, e em todos os outros esportes, o 0 a 0 ganha um teto reduzido de 22.

**Dez contra onze.** No futebol, um time com um jogador a menos protegendo uma vantagem de um gol sofre gol muito mais do que um time completo. Então o jogo está mais apertado do que o placar diz, e o Equilíbrio soma 4 pontos (ainda limitado a 42) enquanto essa for a situação. É o único lugar em que um cartão vermelho toca num sinal. O impulso de cartão vermelho é separado, e está em [Impulsos e penalidades](/arenaswap/docs/powerscore/boosts-and-penalties/#red-card).

O que o equilíbrio ignora: qual time está na frente e o nível absoluto do placar. Um jogo de 2 pontos em 12 a 10 vale o mesmo que um em 112 a 110, porque o equilíbrio só olha o número que está no placar agora.

### Fase final

Teto: `scoreMaxLateGame`, 38.

Sobe quase em linha reta ao longo do período final inteiro de um jogo apertado, em vez de disparar só nos segundos finais. A tensão cresce de forma contínua, em vez de chegar toda de uma vez. O teto para o qual ela sobe depende de quão apertado o jogo já está, porque um jogo com 30 pontos de diferença no último minuto não tem mais tensão para crescer:

| Diferença | Teto na sirene |
|---|---|
| Empatado, apertadíssimo ou apertado | 36 |
| No limite | 22 |
| Fora de alcance | 15 |

Jogos empatados passam de 36 no último minuto, rumo a um pré-impulso de prorrogação que chega a 38 no máximo. Ele separa um jogo que vai para a prorrogação de um que só está apertado. A prorrogação e as entradas extras pagam os 38 inteiros de cara, até uma vantagem construída dentro delas passar da diferença de jogo apertado do esporte. Aí elas pagam o mesmo teto que um jogo do tempo normal com aquela diferença, então uma vantagem de cinco corridas na parte alta da 10ª fica limitada no mesmo ponto que uma na 9ª.

Beisebol e softbol não têm relógio, então a mesma rampa, travada pelo equilíbrio, corre pelas entradas. Ela começa na 6ª entrada no beisebol, ou na 5ª no softbol, e chega ao teto no fim do tempo normal.

O futebol nunca diz "overtime". O tempo extra aparece como *Empate na prorrogação*, uma disputa de pênaltis como *Disputa de pênaltis*, e uma partida igual no fim como *Empate no minuto 85*. Um empate é um resultado comum de liga, não uma parada no caminho da prorrogação. O pré-impulso continua valendo, porque um impasse no fim é tenso de verdade.

O que a fase final ignora: o ritmo recente de pontuação, que é trabalho da dinâmica, e qualquer coisa dos três primeiros quartos de um jogo que depois virou um passeio.

### Dinâmica, Mudanças de liderança e Virada

Esses três leem o `context.history`, a lista dos placares passados de um jogo, e cada um precisa de pelo menos três fotos para ativar. Cada um dispara num evento e depois esmaece numa meia-vida escalada pelo esporte. O esmaecer mantém uma linha em movimento entre os gols, mesmo num esporte de pouca pontuação, em vez de uma linha reta. As meias-vidas, junto com tudo o mais que varia por esporte, estão em [Configuração de esporte e liga](/arenaswap/docs/powerscore/configuration/).

A **Dinâmica** (teto 38) mede a oscilação da diferença de placar entre a foto mais antiga e a mais nova da janela. Se um time marca 10 e o outro responde com 2, a oscilação é de 8, não uma parcial de 10 a 0. O texto do motivo cita os dois números, porque uma diferença não é um massacre. O que conta como oscilação grande escala com o esporte: 8 pontos no basquete, 2 gols no hóquei, 3 corridas no beisebol. Ela ignora qual time está de fato na frente. Um time pode estar perdendo por 20 e mesmo assim registrar um pico de dinâmica por marcar mais que o adversário na janela.

As **Mudanças de liderança** (teto 18) contam quantas vezes a liderança trocou de mãos na janela: 18 pontos para duas ou mais, 12 para uma. Um empate não conta como liderança por si só. Estar atrás, empatar e passar à frente é uma troca. Passar à frente, ser empatado e retomar a liderança é nenhuma. Ela ignora o tamanho de qualquer oscilação. Duas viradas ou vinte pontuam igual, porque a partir daí o jogo já provou que é imprevisível. Se o seu feed conta as mudanças de liderança a partir do registro de lances, passe `context.recentLeadChanges` (`{ count, lastAt? }`). Quando a contagem dele é maior que a das fotos, ela vale, o que pega as viradas que aconteceram entre uma consulta e outra.

A **Virada** (teto 20) mede a oscilação do time que estava perdendo na foto mais antiga da janela: a desvantagem que ele apagou, mais a liderança que tomou desde então. Um time que perdia por 5 e agora ganha por 6 oscilou 11. Nada é pago se a janela abriu empatada. Quando o time da virada passa a liderar por mais que a segunda diferença de equilíbrio do esporte (10 no basquete), o jogo virou um massacre, e só a desvantagem que ele apagou conta, menos essa liderança. A oscilação é escalada pelo andamento do jogo do mesmo jeito que o equilíbrio. Reduzir uma vantagem no primeiro quarto vale menos do que reduzir a mesma vantagem com dois minutos no relógio. Ela pontua a tendência enquanto acontece, sem esperar para ver se o time que perdia vai completá-la.

### Dois modificadores que não são sinais

O Clássico também aplica o modificador de probabilidade de vitória (±5) e o desconto por intervalo comercial. Os dois pertencem ao fluxo do Clássico, e os dois estão em [Impulsos e penalidades](/arenaswap/docs/powerscore/boosts-and-penalties/#win-probability-balance).

## Atropelos

O Equilíbrio do avesso. O Atropelos não paga nada até o jogo ter dois placares de diferença (a segunda diferença de equilíbrio do esporte), e depois sobe até o crédito cheio num massacre.

| Sinal | Teto | O que mede |
|---|---|---|
| Diferença | 50 | A diferença, escalada para cima conforme o jogo avança, então um massacre no fim é mais certo que um no começo. Crédito cheio com 30 pontos no basquete, 28 no futebol americano, 5 gols no hóquei e no futebol, 10 corridas no beisebol e no softbol. |
| Vantagem mantida | 30 | Quanto da janela de histórico o líder atual passou com mais de dois placares de vantagem. Uma vantagem construída e mantida pontua aqui. Uma parcial que pode reverter, não. Precisa de 3 fotos, e só paga por inteiro quando o histórico cobre a janela toda. |
| Atropelo cedo | 25 | Um massacre cedo tem mais atropelo para assistir do que um que já está acabando. Cai rumo a 0 conforme o tempo normal termina. Só paga quando a diferença passa da terceira diferença de equilíbrio do esporte, e só quando o `period` é conhecido. |
| Sem dó | 15 | O líder ainda está ampliando. Lê só a dinâmica na direção do líder, então um time que se agarra a uma vantagem grande não pontua nada aqui. Precisa de 3 fotos. |

O que o Atropelos ignora: como está um jogo apertado. Um jogo dentro de dois placares pontua quase nada aqui. É aí que entra a mistura.

O Atropelos também não paga impulso de pós-temporada. Um massacre de playoff já tem o resultado decidido, então a fase não soma nada a ele. O modo define `paysPostseason: false`.

## Fantasy

Pontua o que os seus jogadores estão fazendo. Lê o `context.fantasy`, uma entrada por jogador do elenco, então não tem nada a dizer até você entregar um elenco.

| Sinal | Teto | O que mede |
|---|---|---|
| Em campo | 50 | Onde os seus jogadores estão no jogo. Futebol americano: quem está com a bola, red zone, linha de gol, o seu kicker ao alcance, a sua defesa em campo. Beisebol: na rebatida, no círculo de espera ou arremessando com corredores nas bases. Basquete, hóquei e futebol: o quanto o jogo está apertado e avançado. O jogador com mais coisa acontecendo conta por inteiro e os outros por um quarto. |
| Pontos de fantasy | 35 | Pontos de fantasy que os seus jogadores fizeram há pouco, esmaecendo do jeito que uma mudança de liderança esmaece. Uma explosão cheia (um touchdown, um home run, um gol) enche o sinal. Lances negativos não contam: ninguém troca de jogo para assistir a uma interceptação que já perdeu. |
| Seus jogadores | 15 | Quantos dos seus jogadores estão no jogo: 5 cada, até 15. |

O futebol americano é o único esporte com uma leitura ao vivo de quem está com a bola. Basquete, hóquei e futebol não têm dados ao vivo de quem está em quadra, então um jogador do elenco num jogo desses vale tanto quanto o jogo está apertado e avançado. Um jogador marcado com `active: false` (no banco, lesionado, expulso) não conta nada.

## Como os modos se misturam com o Clássico

Nenhum dos dois modos novos se sustenta sozinho. Cada um é combinado com o Clássico, então um jogo tranquilo nunca some do mapa.

| Modo | Mistura | Fórmula | Por quê |
|---|---|---|---|
| Atropelos | Piso | `total = max(blowouts, 0.3 × classic)` | Um jogo apertado mantém 30% da pontuação Clássica, então uma noite sem atropelo ainda tem para onde trocar. Qualquer atropelo de verdade passa na frente do melhor deles. |
| Fantasy | Impulso | `total = min(100, classic + 0.6 × fantasy)` | O jogo dos seus jogadores só pode subir acima da pontuação Clássica, e um jogo sem eles é Clássico puro. Uma mistura 0,6/0,4 anterior colocava um jogo de um ponto no fim, com o seu jogador, abaixo do mesmo jogo sem ele. |

Mude o peso do Fantasy com `options.classicBlend`:

```ts
scoreGame(game, context, {
	mode: 'fantasy',
	classicBlend: { kind: 'boost', weight: 0.8 },
});
```

Um jogo sem nenhum jogador ativo seu não tem nada para o Fantasy dizer. Ele é pontuado como Clássico, e o `score.modeId` diz `'classic'` para você saber. O `score.classicTotal` traz o total do próprio Clássico sempre que um modo se mistura com ele, e o `score.blend` traz a conta: `{ kind, weight, ownTotal, classicTotal, floorApplied? }`. Uma análise pode usar isso para mostrar "Clássico 70 × 30% = 21" quando o piso venceu, ou "+30" para uma pontuação Fantasy de 50 com peso 0,6.

## De onde vêm estes números

Os tetos do Clássico são constantes exportadas: `scoreMaxCloseness`, `scoreMaxLateGame`, `scoreMaxMomentum`, `scoreMaxLeadChanges`, `scoreMaxComeback` e `scoreMaxTotal`. Os tetos do Atropelos e do Fantasy ficam nas definições dos sinais, `blowoutsSignals` e `fantasySignals`, para você lê-los em tempo de execução. Se nenhum dos três modos faz a sua pergunta, [monte o seu com `defineMode`](/arenaswap/docs/powerscore/api-reference/#definemode). As assinaturas completas estão na [referência da API](/arenaswap/docs/powerscore/api-reference/).
