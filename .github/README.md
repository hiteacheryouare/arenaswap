![arenaswap logo](../apps/extension/public/images/full_logo_white_on_black.png)


**ArenaSwap** (stylized as arenaswap.) is a browser extension that automatically scans the status of sports games and then swaps your tabs automatically so you are always watching the most exciting game.

Think [NFL RedZone](https://www.nfl.com/redzone) but for everything!

> [!WARNING]
> As of right now, this extension is in an extremely early beta stage. It is not yet available on the Chrome Web Store, and you will need to load it locally to use it.  Use at your own risk, and please report any bugs you find!


## The Story
Inspired by [this TikTok](https://www.tiktok.com/@gfedgocrazy/video/7620585631143496974?is_from_webapp=1&sender_device=pc&web_id=7621724919189866014) from one of my favorite TikTokers, [@gfedgocrazy](https://www.tiktok.com/@gfedgocrazy), I realized that there was a gap in the market for optimizing the way you watch sports.

I was also inspired by NFL RedZone, which is a channel that covers the most exicing plays and games all day on every NFL Sunday of the regular season.

These things in mind, I basically created ArenaSwap to be like a RedZone for all sports, and to be the ultimate tool for sports fans who want to stay on top of all the action without having to constantly switch between tabs or channels manually (yuck!).

## How it Works
ArenaSwap sits on top of the public ESPN scoreboard API. From your browser, it calls the API every 15 seconds to get the latest game status. It then calculates a PowerScore for each game based on a variety of factors, such as the current score, time remaining, and momentum shifts. 

ArenaSwap operates on the "bring your own tabs" model. This means you have to provide the means for actually watching each game. Once you have them open in seperate tabs, use the settings panel to assign each tab to a game. Then ArenaSwap will automatically switch to the tab of the most exciting game based on our scoring algorithm.


## How to Use
1. We are not on the Chrome Web Store yet, but you can load the extension locally:
   - Clone this repository and run `npm install` at the root.
   - Run `npm run dev --workspace @arenaswap/extension` to start the extension in development mode.
2. Once the extension is loaded, it will automatically show a list of currently ongoing sports games.
3. Turn on the extension using the switch in the top right corner of the popup. Then, using the settings icon right next to the switch, you can assign a tab to each game.
4. The extension will automatically switch to the tab of the most exciting game based on our scoring algorithm. 
5. If you want to get more granular, you can adjust the sensitiity of the scoring algorith, as well as the cooldown between tab switches.

## License
We use the ISC License. See the [LICENSE](../LICENSE) file for more details.

## Authors

Primary Author: [Ryan Mullin](https://github.com/hiteacheryouare)
