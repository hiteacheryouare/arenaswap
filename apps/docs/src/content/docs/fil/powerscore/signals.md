---
sourceHash: '1aa0123b3860'
title: Mga PowerScore signal sa bawat mode
description: Ang mga signal sa likod ng Classic, Blowouts at Fantasy na PowerScore, kasama ang ceiling ng bawat isa, kung ano ang sinusukat nito at kung ano ang hindi nito nakikita. Pati kung paano i-off ang mga signal.
section: powerscore
order: 3
navLabel: Mga signal ayon sa mode
---

Isang bagay lang sa laro ang sinusukat ng signal at binabalewala nito ang lahat ng iba, pati ang ibang signal sa mode nito. Ang mode ay listahan ng mga signal at ng mga boost na bagay sa kanila. Tatlo ang dala ng PowerScore 3, at magkakaiba ang tanong ng bawat isa.

| Mode | Ang tanong | Mga signal (ceiling) |
|---|---|---|
| `'classic'` (ang default) | Dikit ba, huling yugto na ba, at pabago-bago ba? | Closeness 42, Late-Game Pressure 38, Momentum 38, Lead Changes 18, Comeback Factor 20 |
| `'blowouts'` | May tumatakbo na ba palayo? | Blowout Margin 50, Sustained 30, Timing 25, Pile-On 15 |
| `'fantasy'` | May mangyayari ba sa mga player ko? | Situation 50, Production 35, Exposure 15 |

Pumili ng isa gamit ang `options.mode`. Sa mga id na lumalabas sa `score.signals`, ito ay `closeness`, `lateGame`, `momentum`, `leadChanges`, `comeback`; `blowoutMargin`, `sustained`, `timing`, `pileOn`; at `situation`, `production`, `exposure`.

Hindi pinapalitan ng Blowouts at Fantasy ang Classic. Nakapatong ang bawat isa rito, kaya may makatwirang score pa rin ang larong walang masabi sa bagong mode. Sakop ng [Paano hinahalo ng mga mode ang Classic](#how-the-modes-blend-with-classic) ang kuwenta.

## Bakit mas malaki sa total ang kabuuan ng mga ceiling

156 ang kabuuan ng mga ceiling ng Classic, at naka-cap sa 100 ang total. Kung 60 lang sa 100 puntos ang kayang bayaran ng scale, masasayang ang natitirang 40 sa mga larong hindi aabot sa itaas. Dahil lampas sa cap ang kabuuan ng mga ceiling, buhay ang bawat puntos. Ang dikitang larong pabalik-balik ang lead at sakay ng run ay sabay-sabay na nagpapatong ng ilang signal na malapit sa kani-kanilang maximum, at umaabot sa 80s o 90s bago pa ang final buzzer. Ang tunay na classic, tabla sa huling yugto at may run sa likod, ay sumasagad sa 100. Mababa pa rin ang score ng nakakabagot na laro, dahil walang pumapalo sa mga signal nito sa simula pa lang.

Ganoon din sa Blowouts (120) at Fantasy (100). Ang mga kabuuan ay `scoreMaxSignalsSubtotal` para sa Classic at `signalCeiling` sa anumang `PowerScore` na resulta para sa mode na nag-score nito.

## I-off ang isang signal

Ipasa ang id nito sa `options.disabledSignals`. Ang mga signal na naka-on pa ay iri-rescale sa buong range ng mode, kaya ang mode na may isang signal na naka-off ay umaabot pa rin sa 0 hanggang 100 at hindi humihinto nang maaga. Kung i-off mo silang lahat, wala nang naka-on: wala nang pagre-rescale-an.

```ts
scoreGame(game, context, { disabledSignals: ['momentum', 'comeback'] });
```

May `disabled: true` ang bawat entry sa `score.signals` kapag ginawa mo ito, para ma-grey out ito ng breakdown. Kapag hinahalo ang isang mode sa Classic, ang `options.classicDisabledSignals` ang sariling switch list ng Classic.

## Classic

Ang 2.x na modelo, na may mga moment boost mula sa [Mga boost at penalty](/arenaswap/docs/powerscore/boosts-and-penalties/) na nakapatong.

### Kalapitan

Ceiling: `scoreMaxCloseness`, 42.

Inihahambing ang margin ng score sa mga threshold na para sa bawat sport para pumili ng tier, tapos isinasaayos ang tier na iyon ayon sa lawak ng itinakbo ng laro. Nakukuha ng curve ang halos buong value nito pagdating ng gitna ng laro at hindi naghihintay ng final buzzer: `floor + (tierCeiling − floor) × progress^0.55`. Laging nagbabayad ang maliit na flat floor na 12, naka-clamp sa sariling ceiling ng tier. Dahil dito, may basa na agad ang tabla sa unang minuto.

Ang mga ceiling ng tier:

| Estado | Basketball | Football | Hockey at soccer | Baseball at softball | Ceiling |
|---|---|---|---|---|---|
| Tabla | | | | | 42 |
| Mahigpit | ≤ 5 puntos | ≤ 3 puntos | ≤ 1 goal | ≤ 1 run | 34 |
| Dikit | ≤ 10 puntos | ≤ 9 puntos | ≤ 2 goal | ≤ 3 run | 20 |
| Gilid | ≤ 18 puntos | ≤ 14 puntos | ≤ 3 goal | ≤ 5 run | 8 |
| Wala nang abot | > 18 puntos | > 14 puntos | > 3 goal | > 5 run | 0 |

Hiwalay na ini-score ang 0-0 sa karaniwang tabla, dahil sa simula ay kadalasang ibig sabihin nito ay wala pang nangyayari at hindi na pinaglalabanan ang laro. Binibigyan ng hockey ng buong tie credit ang 0-0 mula sa ikatlong period, at ng soccer mula sa ikalawang half. Bago iyon, at sa lahat ng ibang sport, mas mababang ceiling na 22 ang nakukuha ng 0-0.

**Kulang ng isang player.** Sa soccer, mas madalas na natatalo ang team na kulang ng isang player habang pinoprotektahan ang isang goal na lamang kaysa sa buong team. Kaya mas dikit ang laro kaysa sa sinasabi ng score, at nagdadagdag ang Closeness ng 4 na puntos (naka-cap pa rin sa 42) habang ganoon ang sitwasyon. Ito lang ang lugar kung saan may epekto ang red card sa isang signal. Hiwalay ang red card boost, at nasa [Mga boost at penalty](/arenaswap/docs/powerscore/boosts-and-penalties/#red-card).

Ang hindi nakikita ng kalapitan: kung aling team ang lamang, at ang absolutong lebel ng score. Pareho ang basa sa larong 2 puntos ang pagitan na 12-10 at sa 112-110, dahil ang number lang sa board ngayon ang tinitingnan ng kalapitan.

### Late-Game Pressure

Ceiling: `scoreMaxLateGame`, 38.

Halos linear ang akyat nito sa buong huling period ng dikitang laro, at hindi lang sumisirit sa huling mga segundo. Unti-unting tumataas ang tensyon at hindi dumarating nang sabay-sabay. Nakadepende ang ceiling na inaakyat nito sa kung gaano na ka-dikit ang laro, dahil wala nang tensyong mabubuo sa larong 30 puntos ang lamang sa huling minuto:

| Margin | Ceiling sa buzzer |
|---|---|
| Tabla, mahigpit o dikit | 36 |
| Gilid | 22 |
| Wala nang abot | 15 |

Lumalampas sa 36 ang mga tabla sa huling minuto, papunta sa overtime pre-boost na humihinto sa 38. Ito ang naghihiwalay sa larong papunta sa extra basketball at sa larong dikit lang. Buong 38 agad ang binabayaran ng overtime at extra innings, hanggang sa lumampas sa close margin ng sport ang lead na nabuo sa loob nila. Pagkatapos, ang ceiling na ibinabayad ay kapareho ng sa regulation na laro na may ganoong margin, kaya ang limang run sa top ng 10th ay naka-cap sa parehong lugar ng limang run sa 9th.

Walang clock ang baseball at softball, kaya ang parehong ramp na nakakabit sa kalapitan ay tumatakbo sa mga inning. Nagsisimula ito sa 6th inning sa baseball, o 5th sa softball, at umaabot sa ceiling pagdating ng dulo ng regulation.

Hindi kailanman sinasabi ng soccer ang "overtime." *Tied in extra time* ang nakasulat sa extra time, *Penalty shootout* sa shootout, at *Tied in the 85th minute* sa laro na patas pa rin sa huli. Karaniwang resulta sa liga ang draw, hindi hintuan papuntang overtime. Nalalapat pa rin ang pre-boost, dahil talagang nakakakaba ang bakbakang walang bumibitaw sa huli.

Ang hindi nakikita ng late-game pressure: ang bilis ng kamakailang pag-score, na trabaho ng momentum, at anumang tungkol sa unang tatlong quarter ng larong naging lopsided na.

### Momentum, Lead Changes at Comeback Factor

Lahat ng tatlong ito ay nagbabasa mula sa `context.history`, ang listahan ng mga nakaraang score ng laro, at bawat isa ay nangangailangan ng hindi bababa sa tatlong snapshot bago sumali. Sumisirit ang bawat isa sa isang pangyayari, tapos humihina ayon sa half-life na iniaayon sa sport. Dahil sa paghina, may gumagalaw na linya sa pagitan ng mga goal kahit sa sport na kaunti ang score, hindi patag na linya. Ang mga half-life, kasama ang lahat ng iba pang nag-iiba kada sport, ay nasa [Configuration ng sport at liga](/arenaswap/docs/powerscore/configuration/).

Sinusukat ng **Momentum** (ceiling 38) ang swing sa differential ng score sa pagitan ng pinakamatanda at pinakabagong snapshot sa window. Kung 10 ang na-score ng isang team at 2 ang itinugon ng kabila, swing iyon na 8, hindi 10-0 na run. Pinapangalanan ng reason string ang dalawang numero, dahil hindi shutout ang differential. Nag-iiba ayon sa sport kung ano ang malaking swing: 8 puntos sa basketball, 2 goal sa hockey, 3 run sa baseball. Hindi nito tinitingnan kung sino talaga ang lamang. Puwedeng natatalo ang team ng 20 at magparehistro pa rin ng momentum spike dahil mas marami itong na-score kaysa sa kalaban sa loob ng window.

Binibilang ng **Lead Changes** (ceiling 18) kung ilang beses nagpalit ng kamay ang lead sa window: 18 puntos para sa dalawa o higit pa, 12 para sa isa. Hindi lead ang tabla. Ang paghabol, pagtabla, at pag-angkin ng lead ay isang pagbabago. Ang pag-angkin ng lead, pagtabla, at pagbawi nito ay wala. Hindi nito tinitingnan ang laki ng swing. Pareho ang score ng dalawang palitan at ng dalawampu, dahil lampas doon ay napatunayan na ng laro na hindi ito mahuhulaan. Kung binibilang ng feed mo ang mga pagbabago ng lead mula sa play log nito, ipasa ang `context.recentLeadChanges` (`{ count, lastAt? }`). Kapag mas mataas ang bilang nito kaysa sa ipinapakita ng mga snapshot, ito ang nananaig, na sumasalo sa mga palitang nangyari sa pagitan ng mga poll.

Sinusukat ng **Comeback Factor** (ceiling 20) ang swing ng team na nahuhuli sa pinakamatandang snapshot sa window: ang deficit na nabura nito, kasama ang anumang lead na nakuha nito mula noon. Ang team na nahuhuli ng 5 na ngayon ay lamang ng 6 ay nag-swing ng 11. Walang binabayaran kung tabla ang simula ng window. Kapag lumampas sa pangalawang closeness margin ng sport (10 sa basketball) ang lead ng team na bumawi, naging rout na ang laro, at ang nabura lang na deficit ang binibilang, bawas ang lead na iyon. Isinasaayos ang swing ayon sa itinakbo ng laro, gaya ng kalapitan. Mas mababa ang bilang ng pagbawas ng lead sa unang quarter kaysa sa parehong lead na binawasan na may dalawang minuto sa clock. Ini-score nito ang trend habang nangyayari ito, nang hindi naghihintay kung matatapos ito ng team na nahuhuli.

### Dalawang modifier na hindi signal

Naglalapat din ang Classic ng win probability modifier (±5) at ng bawas sa commercial break. Parehong bahagi ng pipeline ng Classic ang dalawa, at sakop ang mga ito sa [Mga boost at penalty](/arenaswap/docs/powerscore/boosts-and-penalties/#win-probability-balance).

## Blowouts

Kalapitan na baligtad. Walang binabayaran ang Blowouts hanggang dalawang score na ang pagitan ng laro (ang pangalawang closeness margin ng sport), tapos aakyat sa buong credit sa rout.

| Signal | Ceiling | Ano ang sinusukat |
|---|---|---|
| Blowout Margin | 50 | Ang margin, inaakyat habang tumatagal ang laro para mas sigurado ang rout sa huli kaysa sa simula. Buong credit sa 30 puntos sa basketball, 28 sa football, 5 goal sa hockey at soccer, 10 run sa baseball at softball. |
| Sustained | 30 | Gaano karami sa history window ang lamang ng kasalukuyang leader ng higit sa dalawang score. Nakakakuha rito ang lead na nabuo at napanatili. Hindi ang run na maaaring bumalik. Kailangan ng 3 snapshot, at buo lang ang bayad kapag sakop na ng history ang buong window. |
| Timing | 25 | Mas marami pang mapapanood na beatdown sa maagang rout kaysa sa rout na malapit nang matapos. Bumababa papunta sa 0 habang nagtatapos ang regulation. Nagbabayad lang kapag lampas na ang margin sa pangatlong closeness margin ng sport, at kapag alam lang ang `period`. |
| Pile-On | 15 | Dinadagdagan pa rin ng leader ang lead. Momentum lang sa direksyon ng leader ang binabasa nito, kaya walang nakukuha rito ang team na nakakapit sa malaking lead. Kailangan ng 3 snapshot. |

Ang hindi nakikita ng Blowouts: kung paano ang takbo ng dikitang laro. Halos walang score rito ang larong nasa loob ng dalawang score. Doon pumapasok ang paghahalo.

Wala ring binabayarang postseason boost ang Blowouts. Tapos na ang resulta ng playoff blowout, kaya wala nang idinadagdag ang round. Itinatakda ng mode ang `paysPostseason: false`.

## Fantasy

Ini-score ang ginagawa ng mga player mo. Binabasa nito ang `context.fantasy`, isang entry kada player sa roster, kaya wala itong masasabi hangga't hindi mo ibinibigay ang roster.

| Signal | Ceiling | Ano ang sinusukat |
|---|---|---|
| Situation | 50 | Kung nasaan ang mga player mo sa laro. Football: sino ang may bola, red zone, goal line, ang kicker mo na abot, ang defense mo na nasa field. Baseball: at bat, on deck, o pitching na may runner. Basketball, hockey at soccer: gaano ka-dikit at gaano ka-late ang laro. Buo ang bilang ng player na pinakamaraming nangyayari, at kapat lang ang bilang ng iba. |
| Production | 35 | Mga fantasy point na na-score kamakailan ng mga player mo, humihina gaya ng pagbabago ng lead. Punô ito ng isang buong sirit (touchdown, home run, goal). Hindi binibilang ang mga negatibong play: walang lilipat para manood ng interception na na-miss na niya. |
| Exposure | 15 | Ilan sa mga player mo ang nasa laro: 5 bawat isa, hanggang 15. |

Football lang ang sport na may live na pakiramdam kung sino ang may bola. Walang live na data sa court o yelo o field ang basketball, hockey at soccer, kaya ang player sa roster na nasa laro doon ay may halagang kasing-dikit at kasing-late ng laro mismo. Wala namang halaga ang player na may markang `active: false` (nakabangko, injured, na-eject).

## Paano hinahalo ng mga mode ang Classic

Hindi nakatayo nang mag-isa ang alinman sa dalawang bagong mode. Bawat isa ay pinagsasama sa Classic, kaya hindi kailanman nawawala sa mapa ang tahimik na laro.

| Mode | Paghahalo | Formula | Bakit |
|---|---|---|---|
| Blowouts | Floor | `total = max(blowouts, 0.3 × classic)` | Napapanatili ng dikitang laro ang 30% ng Classic score nito, kaya may malilipatan pa rin sa gabing walang beatdown. Ang anumang tunay na beatdown ay nananaig sa pinakamahusay sa kanila. |
| Fantasy | Boost | `total = min(100, classic + 0.6 × fantasy)` | Tataas lang ang mga laro ng mga player mo sa ibabaw ng Classic score nila, at ang larong wala sila ay plain Classic. Ang naunang 0.6/0.4 na halo ay nagraranggo sa late na larong isang puntos ang pagitan na may player mo sa ibaba ng parehong laro na wala. |

Palitan ang timbang ng Fantasy gamit ang `options.classicBlend`:

```ts
scoreGame(game, context, {
	mode: 'fantasy',
	classicBlend: { kind: 'boost', weight: 0.8 },
});
```

Walang masasabi ang Fantasy sa larong walang aktibong player mo. Ini-score ito bilang Classic, at `'classic'` ang sinasabi ng `score.modeId` para malaman mo. Dala ng `score.classicTotal` ang sariling total ng Classic tuwing hinahalo ang isang mode rito, at dala ng `score.blend` ang kuwenta: `{ kind, weight, ownTotal, classicTotal, floorApplied? }`. Magagamit ito ng breakdown para ipakita ang "Classic 70 × 30% = 21" kapag nanalo ang floor, o "+30" para sa Fantasy score na 50 sa timbang na 0.6.

## Saan galing ang mga numerong ito

Mga exported na constant ang mga ceiling ng Classic: `scoreMaxCloseness`, `scoreMaxLateGame`, `scoreMaxMomentum`, `scoreMaxLeadChanges`, `scoreMaxComeback` at `scoreMaxTotal`. Nasa mga definition ng signal nila ang mga ceiling ng Blowouts at Fantasy, `blowoutsSignals` at `fantasySignals`, kaya mababasa mo sila sa runtime. Kung walang tanong ang tatlong mode na tugma sa gusto mo, [bumuo ng sarili mo gamit ang `defineMode`](/arenaswap/docs/powerscore/api-reference/#definemode). Nasa [API reference](/arenaswap/docs/powerscore/api-reference/) ang kumpletong mga signature.
