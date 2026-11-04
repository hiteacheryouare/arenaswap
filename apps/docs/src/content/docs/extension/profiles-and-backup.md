---
title: How to use profiles and back up your settings
description: Keep separate ArenaSwap setups for different nights, then export one to a file and import it in another browser or after a reinstall.
section: extension
order: 12
navLabel: Profiles and backup
faq:
  - q: How do I move my ArenaSwap settings to another browser?
    a: Open Settings, choose Profiles & Backup, click Back up or restore, and download a backup. In the other browser, open the same page, drop the file in, and add it as a new profile or replace the one in use.
  - q: Do ArenaSwap profiles sync between browsers?
    a: Only the profile in use syncs, whenever sync is on in your browser. Your other profiles stay in the browser where you made them. Export one to a file to take it with you.
---

A playoff night and a Sunday of fantasy football want different setups. Profiles let you keep both and switch in a click. Backups let you take any of them somewhere else.

Both live under **Profiles & Backup** in Settings, in every browser ArenaSwap ships for.

## Create a profile

Everyone starts with one profile named **main**.

1. Open Settings, then **Profiles & Backup**.
2. Click **New profile**.
3. Type a name. The box starts with a suggestion like "Profile 2".
4. Click **Copy main** (it carries the name of the profile you're in) to start from your current settings, or **Start fresh** for ArenaSwap's defaults.

Names run up to 40 characters, and two profiles can't share a name, even if the capital letters differ. If a name is taken you see "You already have a profile called…", and you can't save until you change it.

A profile holds your settings and your Fantasy roster. The new profile becomes the one in use.

## Switch profiles

In the **Profiles** list, click a profile's name. A checkmark marks the one in use. A toast confirms "Switched to…", and ArenaSwap uses that profile's leagues, favorite teams, scoring mode and the rest straight away.

## Rename, export or delete a profile

Click the three dots next to a profile.

- **Rename** opens a name box. Save it with **Save**.
- **Export** opens the backup page with that profile picked. See below.
- **Delete** asks you to confirm. The profile's settings and Fantasy roster go with it, so export it first if you want a copy.

The profile in use has no **Delete**. Switch to another profile first.

## What syncs

Under **Syncs With Your Browser**, ArenaSwap lists what's in the profile in use: leagues on, favorite teams, scoring mode, theme and Fantasy roster. Every setting in that profile syncs whenever sync is on in your browser.

Only the profile in use syncs. Your other profiles stay in the browser where you made them.

## Download a backup

1. Open **Profiles & Backup** and click **Back up or restore…**. It opens in a new tab.
2. If you have more than one profile, choose the one to export from the **Profile** menu.
3. Click **Download backup**.

The file is named like `arenaswap-settings-main-2026-11-03.json`, with the profile's name and today's date. The card beside the buttons shows what's inside.

## Import a backup

Open **Back up or restore…** in the browser you're moving to. During first-run setup, click **Have a backup file? Skip setup and import it** instead.

1. Drop the file onto **Drop a backup here**, or click **Choose a file**.
2. ArenaSwap shows the file's profile name and export date, with its setup next to your current one.
3. Pick one:
   - **Add as a new profile** keeps everything you have and adds the file as another profile. It brings the file's settings and Fantasy roster.
   - **Replace** (followed by your profile's name) swaps every setting in your current profile for the ones in the file. The profile takes the file's name, and the file's Demo mode choice and setup progress come along, so a backup taken in Demo mode puts you back in it.
4. When you see "is all moved in", click **Close tab**.

**Choose another file** starts over if you picked the wrong one.

If something goes wrong, you'll see one of these:

- "…held that file up to the light and couldn't make out a word": the file is damaged. Export a fresh one.
- "…a perfectly good file, just not one of ours": it didn't come from ArenaSwap. Pick one you exported.
- "This file came from a newer ArenaSwap": update the extension, then try again.
- "That didn't save": try again.

## Related

- [ArenaSwap settings reference](/arenaswap/docs/extension/settings/) lists the Profiles and Back up or restore settings.
- [Get started with ArenaSwap](/arenaswap/docs/extension/getting-started/) covers first-run setup.
