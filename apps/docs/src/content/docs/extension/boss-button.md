---
title: How to use the boss button
description: One click or Alt+Shift+X mutes every game tab ArenaSwap manages, pauses auto-switching, and puts a decoy page on screen. Set the page and the shortcut here.
section: extension
order: 11
navLabel: Boss button
faq:
  - q: What does the boss button do in ArenaSwap?
    a: It mutes every tab ArenaSwap manages, pauses auto-switching, and takes you to a decoy page you chose in advance. Turn Enable auto-switching back on when you're ready for the games again.
  - q: What is the keyboard shortcut for the boss button?
    a: Alt+Shift+X by default. You can change it in your browser's extension shortcuts page. The popup shows the shortcut your browser registered.
---

Somebody walks past with a clipboard, and a tab full of overtime is the wrong thing to be looking at. The boss button hides the games in one move.

## What it does

Press it and ArenaSwap does three things at once:

- Mutes every tab it manages.
- Pauses auto-switching, so nothing switches back to a game on its own.
- Takes you to your decoy page.

The popup closes, and **Enable auto-switching** shows as off the next time you open it.

## Press it

Two ways:

- Click the incognito icon in the popup's top bar. Hover over it to see the shortcut.
- Press **Alt+Shift+X** from any tab, with the popup closed. The shortcut works without opening ArenaSwap at all.

## Choose a decoy page

Open Settings and find **Decoy page** under **Switching**. Type any web address, such as a spreadsheet or a doc, anything that looks busy. A bare address like `docs.google.com` works, and ArenaSwap fills in `https://`. Press Enter or click out of the field to save it.

- If the page is already open in a tab, the boss button jumps to that tab and brings its window forward.
- If it isn't, ArenaSwap opens it in a new tab.
- If you leave the field empty, you get a blank tab.
- Only http and https addresses are accepted. Anything else shows "That doesn't look like a web address."

## Get the games back

The boss button pauses auto-switching but doesn't undo itself. When the coast is clear, open the popup and turn **Enable auto-switching** back on. Switching resumes and your tabs unmute the usual way, with the tab you're on audible and the rest muted. Your tabs and their game assignments are still there.

## Change the shortcut

The default is Alt+Shift+X. To change it, open your browser's extension shortcuts page and set a new key for **Boss is coming**:

- Chrome: `chrome://extensions/shortcuts`
- Edge: `edge://extensions/shortcuts`
- Firefox: Add-ons Manager, the gear menu, then **Manage Extension Shortcuts**

If you clear the shortcut, or another extension already uses it, the popup shows no shortcut and the button works by clicking only.

## Related

- [How to watch multiple games at once](/arenaswap/docs/extension/watching-multiple-games/) covers the tabs the boss button mutes.
- [ArenaSwap settings reference](/arenaswap/docs/extension/settings/) lists the Decoy page setting with the rest of Switching.
