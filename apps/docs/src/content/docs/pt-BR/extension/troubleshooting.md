---
sourceHash: '099498900e89'
title: Solução de problemas do ArenaSwap
description: Soluções rápidas para uma lista de jogos vazia, trocas que nunca acontecem, abas faltando no menu e notificações que não chegam.
section: extension
order: 9
navLabel: Solução de problemas
faq:
  - q: Por que o ArenaSwap não mostra nenhum jogo?
    a: Se você vê Escolha ligas para começar, ainda não há nenhuma liga ativada. Clique em Escolher ligas nas Configurações e ative algumas. Se você tem ligas ativadas e a lista continua vazia, não há nada ao vivo nelas agora. Clique em Atualizar ou experimente o Modo demonstração.
  - q: Por que o ArenaSwap não troca de aba?
    a: Confira se Ativar troca automática está ligado na barra superior e se pelo menos um jogo ao vivo tem uma aba atribuída. O ArenaSwap só troca entre abas que você deu a ele.
---

Quase todo problema se resume a uma configuração desligada ou a uma aba que nunca foi atribuída. Comece pelo que parece com o seu.

## A lista de jogos está vazia

Se você vê **Escolha ligas para começar**, ainda não há ligas ativadas. Clique em **Escolher ligas nas Configurações** e ative pelo menos uma.

Se aparece uma mensagem como "Dia calmo no esporte.", suas ligas não têm nada ao vivo agora. Clique em **Atualizar** para conferir de novo. Ou ative o [Modo demonstração](/arenaswap/docs/extension/demo-mode/) para ter com o que brincar.

Se um banner diz **Nossas fontes ficaram mudas. Sem jogos.**, clique em **Tentar novamente**. Se continuar acontecendo, confira a sua conexão com a internet.

## O ArenaSwap não está trocando de aba

Confira nesta ordem:

1. **Ativar troca automática** na barra superior está ligado.
2. Pelo menos um jogo ao vivo tem uma aba atribuída. Use o menu **Atribuir uma aba** no card dele.
3. Você tem um segundo jogo atribuído. Com só um, o ArenaSwap pode te levar até ele a partir de uma aba que não é de jogo, mas não tem entre o que trocar.

Ainda nada? A **Sensibilidade de troca** pode estar baixa, ou o **Cooldown entre trocas** ou o **Atraso de troca** podem estar longos. [Controlando quando o ArenaSwap troca](/arenaswap/docs/extension/switching-and-sensitivity/) mostra o que mudar.

## O ArenaSwap me tirou do que eu estava fazendo

Se a aba em que você está não está atribuída a um jogo, o ArenaSwap entende que você está livre e te leva para o melhor jogo atribuído assim que algum esquentar. Para navegar em paz, desligue **Ativar troca automática** antes.

## Ele fica pulando entre dois jogos

Dois dos seus jogos estão cabeça a cabeça, e o ArenaSwap acompanha cada reviravolta. Aumente o **Cooldown entre trocas** nas Configurações para o líder precisar segurar por mais tempo antes da próxima troca. [Controlando quando o ArenaSwap troca](/arenaswap/docs/extension/switching-and-sensitivity/) mostra a faixa de valores.

## Uma aba sumiu do menu, ou está acinzentada

O menu **Atribuir uma aba** lista as abas abertas na janela em que você abriu o ArenaSwap. Abra a transmissão na própria aba primeiro. Para uma aba em outra janela, abra o ArenaSwap a partir dela. Uma aba que você abre com o popup aberto aparece na próxima vez que você abri-lo.

Uma aba marcada com **(em uso)** está atribuída a outro jogo. Desatribua-a lá primeiro.

## Uma aba foi fechada ou liberada depois de um jogo acabar

Foi a sua configuração **Quando um jogo termina**. Você a encontra nas Configurações, em **Trocas**. Defina como **Deixar a aba como está** para parar. [O que acontece quando um jogo termina](/arenaswap/docs/extension/watching-multiple-games/#choose-what-happens-when-a-game-ends) mostra as opções.

## Recebi uma notificação "A seguir", mas nenhuma troca

A **Troca nas pausas** está esperando uma pausa no jogo, como um apito ou o fim de uma vez no bastão. A notificação diz o que ela está esperando. O ArenaSwap troca quando o jogo para, ou depois de uma espera curta. Para trocar na hora, desligue **Troca nas pausas** nas Configurações. [Não seja cortado no meio da jogada](/arenaswap/docs/extension/switching-and-sensitivity/#dont-get-cut-off-mid-play) tem mais detalhes.

## O Multiview não abriu

A [página do Multiview](/arenaswap/docs/extension/multiview/) tem a lista de conferência.

## O Standby Stream não está fazendo nada

O Standby Stream precisa de duas coisas:

1. Uma aba escolhida no menu **Aba de espera**, em Configurações e depois **Standby Stream**. Se ainda mostra **Selecione uma aba**, escolha uma.
2. Pelo menos um jogo ao vivo com uma aba atribuída.

Ele também espera enquanto **Ativar troca automática** está desligado e enquanto o Multiview está aberto. [Como configurar o Standby Stream](/arenaswap/docs/extension/standby-stream/) tem o passo a passo completo.

## Sem notificações de troca

Ative **Notificações de troca** nas Configurações, em **Trocas**. Se já estiver ativado, confira as configurações de notificação do seu computador e veja se o navegador tem permissão para mostrá-las.

## Relacionados

- [Como assistir a vários jogos ao mesmo tempo](/arenaswap/docs/extension/watching-multiple-games/) explica como atribuir abas.
- [Como controlar quando o ArenaSwap troca de aba](/arenaswap/docs/extension/switching-and-sensitivity/) explica sensibilidade, cooldown e atraso.
- [Referência das configurações do ArenaSwap](/arenaswap/docs/extension/settings/) lista o padrão e a faixa de cada configuração.
- O [FAQ](/arenaswap/faq/) explica ligas, serviços de streaming e dados.
