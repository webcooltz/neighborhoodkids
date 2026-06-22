# Future Upgrades — Roadmap

Running list of planned features / improvements. Not yet built.

## Chat
- ~~**Fade-out messages.**~~ ✅ Done. Lines fade after 8s; click chat box for full
  history modal. Fade pauses while typing.
- ~~**Speech bubbles.**~~ ✅ Done. Chat messages pop as a bubble over the sender's head
  (local + remote), projected to screen, auto-fade after 5s.

## Lobby
- ~~**Fix ride animations.**~~ ✅ Done. Bike + skateboard wheels spin, unicorn legs
  gallop while moving; all synced to movement via shared `animateRide`.
- **Creative mode.** Some form of build/sandbox mode in the lobby. At minimum, a
  **community board** players can post messages to (persists between sessions).
- ~~**Jump button.**~~ ✅ Done. Space (desktop) + JUMP button (mobile); gravity arc,
  height synced to others over the network.
- **Multiplayer game modes.** Ideas to flesh out:
  - Tag / freeze tag
  - Races around the town (with the rides)
  - Hide and seek in the park
  - Co-op mini challenges

## Tyler level (the hidden bonus)
- ~~**Built: `tyler.html` — "Last Stand".**~~ ✅ 3rd-person zombie shooter. Play as adult
  Tyler with a water blaster in an abandoned, boarded-up town. 5 waves of zombies that
  shamble in and "die" when soaked. Wins set `tuck_tyler_beat` + `tuck_stars_9`. Card
  auto-reveals once all 8 kid levels are beaten.
- **Boss fight.** Old-school arcade / Mortal Kombat style showdown. _(future idea)_
- **Character powers.** Each kid has unique powers based on their level:
  - Dawson — soccer (projectile kicks?)
  - TJ — web shots
  - Marshall — sound/violin attacks
  - Brady — skateboard dash
  - Brooklynn — paint/art attacks
  - Mackayla — karate combos
  - Wyatt — fishing-line grapple/hook
  - Sawyer — unicorn flight / magic

## Achievements ✅ Done
Achievements modal on main menu (🏆 button), tracked via localStorage:
- ~~Earn 3 stars on a level~~ (any `tuck_stars_n>=3`)
- ~~Beat all levels~~ (all `tuck_stars_1..8>=1`)
- ~~Beat all levels with 3 stars~~ (all `==3`)
- ~~Beat the Tyler level~~ (`tuck_tyler_beat` flag — set when Tyler level ships)
- ~~Play in the lobby with a friend~~ (`tuck_lobby_friend`, set when 2+ online)
- ~~Catch Air~~ (`tuck_skatepark`, set when launching off a ramp/half-pipe)

---
_Maintained as a living doc. Add/expand items as ideas come up._
