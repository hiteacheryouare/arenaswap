---
sourceHash: '099498900e89'
title: ArenaSwap-Fehlerbehebung
description: Schnelle Hilfe bei leerer Spieleliste, Wechseln, die nie passieren, Tabs, die im Dropdown fehlen, und ausbleibenden Benachrichtigungen.
section: extension
order: 9
navLabel: Fehlerbehebung
faq:
  - q: Warum zeigt ArenaSwap keine Spiele an?
    a: Siehst du Wähle Ligen zum Starten, ist noch keine Liga eingeschaltet. Klick auf Ligen in den Einstellungen wählen und schalte welche ein. Hast du Ligen an und siehst trotzdem eine leere Liste, läuft gerade nichts Live darin. Klick auf Aktualisieren oder probier den Demo-Modus.
  - q: Warum wechselt ArenaSwap die Tabs nicht?
    a: Prüf, ob Automatisches Wechseln aktivieren in der oberen Leiste an ist und ob mindestens einem Live-Spiel ein Tab zugewiesen ist. ArenaSwap wechselt nur zwischen Tabs, die du ihm gegeben hast.
---

Die meisten Probleme laufen auf eine ausgeschaltete Einstellung oder einen nie zugewiesenen Tab hinaus. Fang mit dem an, der nach deinem klingt.

## Die Spieleliste ist leer

Siehst du **Wähle Ligen zum Starten**, ist noch keine Liga an. Klick auf **Ligen in den Einstellungen wählen** und schalte mindestens eine ein.

Siehst du eine Meldung wie „Ein ruhiger Sporttag.“, läuft in deinen Ligen gerade nichts Live. Klick auf **Aktualisieren**, um noch einmal nachzusehen. Oder schalte den [Demo-Modus](/arenaswap/docs/extension/demo-mode/) ein, dann hast du etwas zum Spielen.

Sagt ein Banner **Funkstille bei unseren Quellen. Nichts geladen.**, klick auf **Erneut versuchen**. Passiert es immer wieder, prüf deine Internetverbindung.

## ArenaSwap wechselt die Tabs nicht

Prüf der Reihe nach:

1. **Automatisches Wechseln aktivieren** in der oberen Leiste ist an.
2. Mindestens einem Live-Spiel ist ein Tab zugewiesen. Nutz dafür das Dropdown **Tab zuweisen** auf seiner Karte.
3. Du hast ein zweites Spiel zugewiesen. Mit nur einem kann ArenaSwap dich von einem Tab, der kein Spiel ist, zu ihm bringen, hat aber nichts, zwischen dem es wechseln könnte.

Immer noch nichts? Vielleicht ist die **Wechselempfindlichkeit** niedrig eingestellt oder der **Wechsel-Cooldown** oder die **Wechselverzögerung** lang. [So steuerst du, wann ArenaSwap wechselt](/arenaswap/docs/extension/switching-and-sensitivity/) zeigt, was du ändern kannst.

## ArenaSwap hat mich von dem weggeholt, was ich gerade gemacht habe

Gehört der Tab, auf dem du bist, zu keinem Spiel, betrachtet ArenaSwap dich als frei und setzt dich zum besten zugewiesenen Spiel um, sobald eines heiß wird. Um in Ruhe zu stöbern, schalte zuerst **Automatisches Wechseln aktivieren** aus.

## Es springt ständig zwischen zwei Spielen hin und her

Zwei deiner Spiele liegen Kopf an Kopf, und ArenaSwap folgt jedem Ausschlag. Erhöh in den Einstellungen den **Wechsel-Cooldown**, damit der Führende länger durchhalten muss, bevor der nächste Wechsel kommt. [So steuerst du, wann ArenaSwap wechselt](/arenaswap/docs/extension/switching-and-sensitivity/) nennt den Bereich.

## Ein Tab fehlt im Dropdown oder ist ausgegraut

Das Dropdown **Tab zuweisen** listet die Tabs im Fenster, aus dem du ArenaSwap geöffnet hast. Öffne den Stream zuerst in einem eigenen Tab. Für einen Tab in einem anderen Fenster öffnest du ArenaSwap aus diesem Fenster. Ein Tab, den du öffnest, während das Popup offen ist, erscheint beim nächsten Öffnen.

Ein Tab mit **(belegt)** ist einem anderen Spiel zugewiesen. Heb die Zuweisung dort zuerst auf.

## Ein Tab wurde nach einem Spielende geschlossen oder freigegeben

Das hat deine Einstellung **Wenn ein Spiel endet** getan. Du findest sie in den Einstellungen unter **Wechseln**. Stell sie auf **Tab in Ruhe lassen**, damit es aufhört. [Was passiert, wenn ein Spiel endet](/arenaswap/docs/extension/watching-multiple-games/#choose-what-happens-when-a-game-ends) nennt die Optionen.

## Ich habe eine Benachrichtigung „Als Nächstes“ bekommen, aber keinen Wechsel

**Wechsel bei Spielpause** wartet auf eine Spielunterbrechung, etwa einen Pfiff oder das Ende eines At-Bats. Die Benachrichtigung sagt, worauf es wartet. ArenaSwap wechselt, wenn das Spiel stoppt, oder nach kurzer Wartezeit. Um sofort zu wechseln, schalte in den Einstellungen **Wechsel bei Spielpause** aus. Mehr dazu unter [Nicht mitten im Spielzug abgeschnitten werden](/arenaswap/docs/extension/switching-and-sensitivity/#dont-get-cut-off-mid-play).

## Multiview hat sich nicht geöffnet

Die [Multiview-Seite](/arenaswap/docs/extension/multiview/) hat die Checkliste.

## Standby Stream tut nichts

Standby Stream braucht zwei Dinge:

1. Einen Tab, gewählt im Dropdown **Standby-Tab** unter Einstellungen, dann **Standby Stream**. Steht dort noch **Tab auswählen**, wähl einen.
2. Mindestens ein Live-Spiel mit zugewiesenem Tab.

Es wartet außerdem, solange **Automatisches Wechseln aktivieren** aus ist und solange Multiview offen ist. [So richtest du Standby Stream ein](/arenaswap/docs/extension/standby-stream/) hat alle Schritte.

## Keine Wechsel-Benachrichtigungen

Schalte in den Einstellungen unter **Wechseln** die **Wechsel-Benachrichtigungen** ein. Ist das schon der Fall, prüf die Benachrichtigungseinstellungen deines Computers und stell sicher, dass dein Browser sie anzeigen darf.

## Verwandt

- [Mehrere Spiele gleichzeitig schauen](/arenaswap/docs/extension/watching-multiple-games/) behandelt das Zuweisen von Tabs.
- [So steuerst du, wann ArenaSwap die Tabs wechselt](/arenaswap/docs/extension/switching-and-sensitivity/) behandelt Empfindlichkeit, Cooldown und Verzögerung.
- [Die ArenaSwap-Einstellungen im Überblick](/arenaswap/docs/extension/settings/) führt Standardwert und Bereich jeder Einstellung auf.
- Die [FAQ](/arenaswap/faq/) behandelt Ligen, Streaming-Dienste und Daten.
