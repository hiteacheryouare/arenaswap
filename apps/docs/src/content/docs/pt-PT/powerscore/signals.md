---
sourceHash: '1aa0123b3860'
title: Os sinais do PowerScore em cada modo
description: Os sinais por trás do PowerScore Clássico, Goleadas e Fantasy, com o máximo de cada um, o que mede e o que ignora. E como desligar sinais.
section: powerscore
order: 3
navLabel: Sinais por modo
---

Um sinal mede uma coisa de um jogo e ignora tudo o resto, incluindo os outros sinais do seu modo. Um modo é uma lista de sinais mais os impulsos que lhe assentam bem. O PowerScore 3 traz três, e cada um faz uma pergunta diferente.

| Modo | A pergunta | Sinais (máximo) |
|---|---|---|
| `'classic'` (o predefinido) | Está equilibrado, tardio e a oscilar? | Equilíbrio 42, Pressão da fase final 38, Dinâmica 38, Mudanças de liderança 18, Fator de remontada 20 |
| `'blowouts'` | Alguém está a fugir? | Diferença 50, Vantagem mantida 30, Goleada cedo 25, A esticar 15 |
| `'fantasy'` | Vai acontecer alguma coisa aos meus jogadores? | Em ação 50, Pontos de fantasy 35, Os teus jogadores 15 |

Escolhe um com `options.mode`. Nos ids tal como aparecem em `score.signals`, isto é `closeness`, `lateGame`, `momentum`, `leadChanges`, `comeback`; `blowoutMargin`, `sustained`, `timing`, `pileOn`; e `situation`, `production`, `exposure`.

As Goleadas e o Fantasy não substituem o Clássico. Cada um assenta nele, por isso um jogo sem nada para dizer no modo novo continua a ter uma pontuação sensata. [Como os modos se misturam](#how-the-modes-blend-with-classic) trata da aritmética.

## Porque é que os máximos somam mais do que o total

Os máximos do Clássico somam 156, e o total está limitado a 100. Uma escala que só pagasse 60 dos seus 100 pontos desperdiçaria os outros 40 em jogos que nunca podem chegar ao topo. Somar os máximos acima do limite mantém todos os pontos em jogo. Um jogo equilibrado, a trocar de liderança e com uma série de pontos às costas põe vários sinais perto dos seus próprios máximos ao mesmo tempo e chega aos 80 ou 90 muito antes do apito final. Um verdadeiro clássico, empatado no fim e com uma série de pontos atrás, satura nos 100. Um jogo aborrecido continua a pontuar baixo, porque nenhum dos seus sinais dispara.

O mesmo vale para as Goleadas (120) e o Fantasy (100). As somas são `scoreMaxSignalsSubtotal` para o Clássico e `signalCeiling` em qualquer resultado `PowerScore` para o modo que o pontuou.

## Desligar um sinal

Passa o id dele em `options.disabledSignals`. Os sinais que continuam ligados são reescalados para o intervalo completo do modo, por isso um modo com um sinal desligado continua a ir de 0 a 100 em vez de ficar a meio caminho. Desliga-os todos e nenhum fica ligado: não há nada para onde reescalar.

```ts
scoreGame(game, context, { disabledSignals: ['momentum', 'comeback'] });
```

Cada entrada em `score.signals` traz `disabled: true` quando fizeres isto, para uma decomposição a poder esbater. Quando um modo se mistura com o Clássico, `options.classicDisabledSignals` é a lista de desligados do próprio Clássico.

## Clássico

O modelo 2.x, com os impulsos de momento de [Impulsos e penalizações](/arenaswap/docs/powerscore/boosts-and-penalties/) por cima.

### Equilíbrio

Máximo: `scoreMaxCloseness`, 42.

Compara a diferença no marcador com limiares específicos de cada desporto para escolher um escalão, e depois escala esse escalão pelo avanço do jogo. A curva chega a quase todo o seu valor a meio do jogo em vez de esperar pelo apito final: `floor + (tierCeiling − floor) × progress^0.55`. Um pequeno piso fixo de 12 paga sempre, limitado ao máximo do próprio escalão. Por causa dele, um jogo empatado no primeiro minuto já vale alguma coisa.

Os máximos de cada escalão:

| Estado | Basquetebol | Futebol americano | Hóquei e futebol | Basebol e softbol | Máximo |
|---|---|---|---|---|---|
| Empatado | | | | | 42 |
| Apertado | ≤ 5 pontos | ≤ 3 pontos | ≤ 1 golo | ≤ 1 corrida | 34 |
| Equilibrado | ≤ 10 pontos | ≤ 9 pontos | ≤ 2 golos | ≤ 3 corridas | 20 |
| Limite | ≤ 18 pontos | ≤ 14 pontos | ≤ 3 golos | ≤ 5 corridas | 8 |
| Fora de alcance | > 18 pontos | > 14 pontos | > 3 golos | > 5 corridas | 0 |

O 0-0 é pontuado à parte de um empate normal, porque no início quer normalmente dizer que ainda não aconteceu nada e não que o jogo está disputado. O hóquei dá o crédito total de empate ao 0-0 a partir do terceiro período, e o futebol a partir da segunda parte. Antes disso, e em todos os outros desportos, o 0-0 ganha um máximo reduzido de 22.

**Dez jogadores.** No futebol, uma equipa com menos um jogador a defender uma vantagem de um golo sofre muito mais golos do que uma equipa completa. Por isso o jogo está mais equilibrado do que o marcador diz, e o Equilíbrio soma 4 pontos (ainda limitado a 42) enquanto essa for a situação. É o único sítio onde um cartão vermelho toca num sinal. O impulso de cartão vermelho é à parte, e está em [Impulsos e penalizações](/arenaswap/docs/powerscore/boosts-and-penalties/#red-card).

O que o equilíbrio ignora: que equipa está à frente e o nível absoluto do marcador. Um jogo de 2 pontos aos 12-10 lê-se como um aos 112-110, porque o equilíbrio só olha para o número no marcador neste momento.

### Pressão da fase final

Máximo: `scoreMaxLateGame`, 38.

Sobe quase em linha reta ao longo de todo o último período de um jogo equilibrado, em vez de disparar só nos segundos finais. A tensão acumula-se de forma constante em vez de chegar toda de uma vez. O máximo para onde sobe depende de quão equilibrado o jogo já está, porque um jogo de 30 pontos no último minuto já não tem tensão para acumular:

| Diferença | Máximo no apito final |
|---|---|
| Empatado, apertado ou equilibrado | 36 |
| Limite | 22 |
| Fora de alcance | 15 |

Os jogos empatados passam dos 36 no último minuto, rumo a um pré-impulso de prolongamento que atinge o máximo de 38. Separa um jogo a caminhar para tempo extra de um que é só equilibrado. O prolongamento e as entradas extra pagam os 38 completos de imediato, até uma vantagem construída lá dentro passar a margem de equilíbrio do desporto. Depois pagam o mesmo máximo que um jogo em tempo regulamentar com essa diferença, por isso cinco corridas na parte alta da 10.ª ficam limitadas onde ficam cinco corridas na 9.ª.

O basebol e o softbol não têm relógio, por isso a mesma rampa condicionada pelo equilíbrio corre ao longo das entradas. Começa na 6.ª entrada no basebol, ou na 5.ª no softbol, e chega ao máximo no fim do tempo regulamentar.

O futebol nunca diz "prolongamento". O tempo extra lê-se *Empate no tempo extra*, o desempate lê-se *Desempate por penáltis* e um jogo nivelado já tarde lê-se *Empate aos 85 minutos*. Um empate é um resultado normal de campeonato, não uma paragem a caminho do prolongamento. O pré-impulso continua a aplicar-se, porque um impasse tardio é genuinamente tenso.

O que a pressão da fase final ignora: o ritmo recente de pontuação, que é trabalho da dinâmica, e tudo o que se passou nos três primeiros quartos de um jogo que entretanto ficou desnivelado.

### Dinâmica, Mudanças de liderança e Fator de remontada

Estes três leem todos de `context.history`, a lista dos resultados passados de um jogo, e cada um precisa de pelo menos três instantâneos para se ativar. Cada um dispara com um evento e depois esbate-se com uma semivida adaptada ao desporto. O esbatimento mantém uma linha em movimento entre golos, mesmo num desporto de poucos golos, em vez de uma linha plana. As semividas, tal como tudo o que varia por desporto, estão em [Configuração de desportos e ligas](/arenaswap/docs/powerscore/configuration/).

A **Dinâmica** (máximo 38) mede a oscilação da diferença no marcador entre o instantâneo mais antigo e o mais recente da janela. Se uma equipa marca 10 e a outra responde com 2, isso é uma oscilação de 8, não uma série de 10-0. A razão nomeia os dois números, porque uma diferença não é um jogo sem resposta. O que conta como grande oscilação escala com o desporto: 8 pontos no basquetebol, 2 golos no hóquei, 3 corridas no basebol. Ignora que equipa está realmente à frente. Uma equipa pode estar a perder por 20 e ainda assim registar um pico de dinâmica por marcar mais do que o adversário ao longo da janela.

As **Mudanças de liderança** (máximo 18) contam quantas vezes a liderança mudou de mãos ao longo da janela: 18 pontos para duas ou mais, 12 para uma. Um empate não conta como liderança por si só. Estar atrás, empatar e depois passar à frente é uma mudança. Passar à frente, empatar e voltar a passar à frente é nenhuma. Ignora a dimensão de qualquer oscilação. Duas viragens ou vinte pontuam o mesmo, porque a partir daí o jogo já provou que é imprevisível. Se o teu feed conta mudanças de liderança a partir do registo de jogadas, passa `context.recentLeadChanges` (`{ count, lastAt? }`). Quando a contagem dele é maior do que a dos instantâneos, ganha, o que apanha viragens que aconteceram entre consultas.

O **Fator de remontada** (máximo 20) mede a oscilação da equipa que perdia no instantâneo mais antigo da janela: a desvantagem que apagou, mais qualquer vantagem que tenha tomado desde então. Uma equipa a perder por 5 que agora ganha por 6 oscilou 11. Não paga nada se a janela abriu empatada. Quando a equipa da remontada lidera por mais do que a segunda margem de equilíbrio do desporto (10 no basquetebol), o jogo passou a goleada e só conta a desvantagem que apagou, menos essa vantagem. A oscilação é escalada pelo avanço do jogo da mesma forma que o equilíbrio. Cortar uma vantagem no primeiro quarto vale menos do que cortar a mesma vantagem com dois minutos no relógio. Pontua a tendência enquanto está a acontecer, sem esperar para ver se a equipa que perde a completa.

### Dois modificadores que não são sinais

O Clássico também aplica o modificador de probabilidade de vitória (±5) e a dedução por pausa publicitária. Ambos pertencem ao pipeline do Clássico, e ambos estão em [Impulsos e penalizações](/arenaswap/docs/powerscore/boosts-and-penalties/#win-probability-balance).

## Goleadas

O Equilíbrio do avesso. As Goleadas não pagam nada até o jogo ter duas pontuações de diferença (a segunda margem de equilíbrio do desporto) e depois sobem até ao crédito total numa goleada.

| Sinal | Máximo | O que mede |
|---|---|---|
| Diferença | 50 | A diferença, escalada à medida que o jogo avança, para uma goleada tardia ser mais certa do que uma cedo. Crédito total aos 30 pontos no basquetebol, 28 no futebol americano, 5 golos no hóquei e no futebol, 10 corridas no basebol e no softbol. |
| Vantagem mantida | 30 | Quanto da janela de histórico o líder atual passou com mais de duas pontuações de vantagem. Uma vantagem construída e mantida pontua aqui. Uma série que pode reverter, não. Precisa de 3 instantâneos, e só paga por inteiro quando o histórico cobre a janela toda. |
| Goleada cedo | 25 | Uma goleada cedo tem mais castigo para ver do que uma quase a acabar. Cai para 0 à medida que o tempo regulamentar termina. Só paga quando a diferença passa a terceira margem de equilíbrio do desporto, e só quando o `period` é conhecido. |
| A esticar | 15 | O líder continua a alargar. Lê a dinâmica só na direção do líder, por isso uma equipa a agarrar-se a uma grande vantagem não pontua nada aqui. Precisa de 3 instantâneos. |

O que as Goleadas ignoram: como vai um jogo equilibrado. Um jogo a menos de duas pontuações de diferença pontua quase nada aqui. É aí que entra a mistura.

As Goleadas também não pagam impulso de pós-temporada. Uma goleada nos playoffs já tem o resultado decidido, por isso a ronda não lhe acrescenta nada. O modo define `paysPostseason: false`.

## Fantasy

Pontua o que os teus jogadores estão a fazer. Lê `context.fantasy`, uma entrada por jogador do plantel, por isso não tem nada para dizer até lhe entregares um plantel.

| Sinal | Máximo | O que mede |
|---|---|---|
| Em ação | 50 | Onde estão os teus jogadores no jogo. Futebol americano: quem tem a bola, red zone, linha de golo, o teu kicker ao alcance, a tua defesa em campo. Basebol: ao bastão, em deck ou a lançar com corredores nas bases. Basquetebol, hóquei e futebol: quão equilibrado e tardio é o jogo. O jogador com mais coisas a acontecer conta por inteiro e todos os outros a um quarto. |
| Pontos de fantasy | 35 | Pontos de fantasy que os teus jogadores marcaram há pouco, a esbater-se como uma mudança de liderança. Uma explosão completa (um touchdown, um home run, um golo) enche-o. As jogadas negativas não contam: ninguém muda para ver uma interceção que já perdeu. |
| Os teus jogadores | 15 | Quantos dos teus jogadores estão no jogo: 5 por cada um, até 15. |

O futebol americano é o único desporto com uma noção em direto de quem tem a bola. O basquetebol, o hóquei e o futebol não têm dados em direto do campo, por isso um jogador do plantel num jogo destes vale o que o jogo vale em equilíbrio e em fase final. Um jogador marcado com `active: false` (no banco, lesionado, expulso) não conta para nada.

## Como os modos se misturam com o Clássico

Nenhum dos dois modos novos se aguenta sozinho. Cada um é combinado com o Clássico, para um jogo calmo nunca cair do mapa.

| Modo | Mistura | Fórmula | Porquê |
|---|---|---|---|
| Goleadas | Piso | `total = max(blowouts, 0.3 × classic)` | Um jogo equilibrado mantém 30% da sua pontuação Clássico, por isso uma noite sem goleada continua a ter algo para onde mudar. Qualquer goleada a sério ultrapassa a melhor de todos eles. |
| Fantasy | Impulso | `total = min(100, classic + 0.6 × fantasy)` | Os jogos dos teus jogadores só podem subir acima da pontuação Clássico, e um jogo sem eles é Clássico simples. Uma mistura 0.6/0.4 anterior punha um jogo tardio de um ponto com o teu jogador abaixo do jogo idêntico sem ele. |

Muda o peso do Fantasy com `options.classicBlend`:

```ts
scoreGame(game, context, {
	mode: 'fantasy',
	classicBlend: { kind: 'boost', weight: 0.8 },
});
```

Um jogo sem nenhum jogador ativo não dá nada ao Fantasy para dizer. É pontuado como Clássico, e `score.modeId` diz `'classic'` para o poderes distinguir. `score.classicTotal` traz o total do próprio Clássico sempre que um modo se mistura com ele, e `score.blend` traz a aritmética: `{ kind, weight, ownTotal, classicTotal, floorApplied? }`. Uma decomposição pode usá-lo para mostrar "Clássico 70 × 30% = 21" quando o piso ganhou, ou "+30" para uma pontuação Fantasy de 50 com um peso de 0.6.

## De onde vêm estes números

Os máximos do Clássico são constantes exportadas: `scoreMaxCloseness`, `scoreMaxLateGame`, `scoreMaxMomentum`, `scoreMaxLeadChanges`, `scoreMaxComeback` e `scoreMaxTotal`. Os máximos das Goleadas e do Fantasy vivem nas definições dos seus sinais, `blowoutsSignals` e `fantasySignals`, por isso os podes ler em tempo de execução. Se nenhum dos três modos fizer a tua pergunta, [constrói o teu com `defineMode`](/arenaswap/docs/powerscore/api-reference/#definemode). As assinaturas completas estão na [referência da API](/arenaswap/docs/powerscore/api-reference/).
