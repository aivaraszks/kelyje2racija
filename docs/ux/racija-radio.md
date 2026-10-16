# UX spec: RACIJA radio

Plan: `docs/plans/racija-radio.md` (D5, D9-D12). Source behaviour: `kelyje` (Angular 19) `walkie-talkie.component.*`.
Language of all UI: Lithuanian (`lang="lt"`). Status: for review at checkpoint A.

## 1. Users and goal

- **Who:** Lithuanian players and fans of the game _Kelyje 2_, mostly on a phone, who want to hear a RACIJA line and send it to a friend (Messenger and similar apps). Secondary: desktop visitors.
- **Goal:** find a phrase in a few seconds, hear it, send it as an audio file. Nothing to learn, no account, no permissions.
- **Not in scope:** text-to-speech (KURTI is removed), favourites, history, playlists.

## 2. Key decisions (summary)

| #   | Decision                                                                                                                                                                                                                                                                                      |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U1  | **A row tap selects AND plays** (one step, same as the old app). It deviates from the wording of D5 ("tap selects, second tap plays"): the common action should not cost two taps. Tapping the playing row restarts it.                                                                        |
| U2  | **PRIIMTI** = stop if anything is playing, otherwise play the selected clip (replay). It never starts a different clip than the highlighted row.                                                                                                                                              |
| U3  | **Button row, left to right: PAIEŠKA (pill) - PRIIMTI (round, largest, centre) - SIŲSTI (pill, same size as PAIEŠKA).** PRIIMTI is the primary control and sits at the thumb's natural centre; the two pills are symmetric. SIŲSTI is not a side key (keeps one row, no extra thumb reach). |
| U4  | PRIIMTI and SIŲSTI with nothing selected use `aria-disabled` (not `disabled`): they stay focusable and a tap explains why ("Pirmiausia pasirinkite frazę.").                                                                                                                                  |
| U5  | The phrase list is an ARIA **listbox** with roving focus (section 9).                                                                                                                                                                                                                         |
| U6  | Variants of the same phrase and voice are numbered **"Pamerk (1)", "Pamerk (2)"**. Numbers appear only when a group has more than one clip. The catalog `variant` is a number; the label is derived (`text` + ` (n)`).                                                                        |
| U7  | Switching voice keeps the selection when the same phrase (same `text` and `variant`) exists in the other voice. It does not autoplay. Otherwise the selection is cleared. Any playing clip is stopped on a voice switch.                                                                       |
| U8  | Closing the search field clears the query. The visible list always equals what PRIIMTI and SIŲSTI act on: if typing hides the selected clip, the selection is cleared, but a clip already playing is allowed to finish (PRIIMTI then stops it).                                                |
| U9  | Messages appear in a toast outside the radio and in a hidden live region. Counters are not in a live region (too noisy).                                                                                                                                                                       |
| U10 | The voice choice is remembered in `localStorage` (`racija-voice`). Default: Vyras.                                                                                                                                                                                                            |

## 3. User flow

### Happy path: open, find, hear, send

1. User opens the site. The pixel cabin scene animates behind the radio. Nothing plays. The list shows the **Vyras** voice (or the remembered one), no row selected. On touch devices the hint "Įjunkite garsą" is visible.
2. User scrolls the LCD list, or taps **PAIEŠKA**, types a few letters (diacritics are optional: "sansu" finds "šansų"). The list filters live.
3. User taps a row. The row becomes selected and the clip starts playing. The PRIIMTI LED lights up, the row shows the playing marker, and the hint disappears.
4. The clip ends. The LED goes out. The row stays selected.
5. User taps **PRIIMTI** to hear it again, or taps another row to switch.
6. User taps **SIŲSTI**. On mobile the system share sheet opens with `racija-<id>.mp3`. The user picks Messenger. The toast says "Išsiųsta." and the counter increases.

### Alternatives

| Case                                       | Behaviour                                                                                                                                |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Tap another row while a clip plays         | The old clip stops, the new one starts. One clip at a time.                                                                               |
| Tap the playing row                        | The clip restarts from the beginning (it is not a toggle).                                                                                |
| PRIIMTI while playing                      | Stops the clip. LED off. Selection stays.                                                                                                 |
| PRIIMTI / SIŲSTI with nothing selected     | Nothing plays or shares. Toast "Pirmiausia pasirinkite frazę."                                                                            |
| Switch voice with a selection              | See U7. The list is replaced, the matching row is selected (no sound) and scrolled into view.                                             |
| Search with no match                       | The list area shows "Nieko nerasta". No row is selected.                                                                                  |
| Desktop, share not supported               | SIŲSTI downloads the file. Toast "Atsisiųsta – pridėkite failą prie žinutės."                                                             |
| User cancels the share sheet               | Silent. No toast, no counter change.                                                                                                      |
| Counter API down                           | The counters show "—". Everything else works.                                                                                             |
| Tab hidden / user leaves                   | Playback is not stopped by the app (the browser decides). The pixel scene pauses.                                                         |

## 4. Control mapping (final)

| Control                | Action                                                                                                                                            | Keyboard                                       | State cues                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| LCD row                | Select + play (restart if already playing). Tap target at least 44 px tall.                                                                        | Arrows move focus, Enter / Space select + play | Selected: inverted bar. Playing: inverted bar + animated "play" marker. Focus: outline.          |
| PAIEŠKA (pill, left)   | Toggle the search field at the top of the LCD. Opening moves focus into the field.                                                                 | Enter / Space                                  | `aria-expanded`. Pressed look while open.                                                        |
| PRIIMTI (round, centre)| Playing: stop. Not playing: play the selected clip. Nothing selected: toast.                                                                       | Enter / Space                                  | Green ring is an LED: lit while playing (plus a stop icon in the button, play icon when idle).    |
| SIŲSTI (pill, right)   | Share the selected clip as `racija-<id>.mp3` (share sheet, otherwise download). Nothing selected: toast.                                           | Enter / Space                                  | `aria-busy` and a pulsing label while the share is in progress. Repeat taps are ignored.         |
| Vyras / Moteris        | Choose the voice. Two-state segmented control in the LCD footer.                                                                                   | Tab to each, Enter / Space                     | `aria-pressed`. Active segment inverted (not colour alone).                                      |
| Search clear "×"       | Clears the text, keeps the field open, focus stays in the field. Visible only when the field has text.                                             | Enter / Space                                  | -                                                                                                |

State never relies on colour alone: selected = inverted bar, playing = marker shape + animation, LED = also icon change.

## 5. Screens

There is one screen. Layout in layers, back to front: pixel cabin scene (decorative), radio, page furniture under the radio (hint, counters, footer note), toast.

### 5.1 Radio anatomy (top to bottom)

1. **Cap:** SVG "RACIJA" logo (the page `h1`) and the cable (decorative).
2. **LCD** (flexible height, see 5.3):
   1. Search row (only when open).
   2. List area (scrolls).
   3. LCD footer: voice toggle on the left, "Įrašų: N" on the right.
3. **Button row:** PAIEŠKA, PRIIMTI, SIŲSTI.
4. **Speaker grille** (decorative, below the buttons; may be shrunk or hidden when the viewport is short).

Under the radio, outside it: sound hint (touch devices, until the first play), counters, footer note.

### 5.2 Phone wireframe, 360x740 (portrait)

```
+------------------------------------+  360
| (pixel scene: sky, trees, dashboard)|
|   +----------------------------+   |
|   |  R A C I J A        ~~cable|   |  cap
|   +----------------------------+   |
|   | +------------------------+ |   |
|   | |[ Ieškoti…          ][x]| |   |  search row (only when open)
|   | |------------------------| |   |
|   | |  Atleisk, nepatampysiu | |   |
|   | |  Be šansų              | |   |  LCD list, scrolls
|   | |##> Pamerk (1)         ##| |   |  selected + playing
|   | |  Pamerk (2)            | |   |
|   | |  Brangioka viršininke  | |   |
|   | |  Gal susitarsim,       | |   |  long text wraps
|   | |  viršininke            | |   |
|   | |  Iki kito karto        | |   |
|   | |------------------------| |   |
|   | |[Vyras|Moteris] Įrašų: 39| |   |  LCD footer
|   | +------------------------+ |   |
|   |                            |   |
|   | [PAIEŠKA]  ( PRIIMTI )  [SIŲSTI]|   button row
|   |  ::::::::::::::::::::::    |   |  grille
|   +----------------------------+   |
|     Įjunkite garsą                 |  hint (touch only)
|     Paleista: 1 234 · Išsiųsta: 56 |  counters
|   Fanų projektas, nesusijęs su     |  footer note
|   žaidimo kūrėjais                 |
+------------------------------------+  740
```

Sizing rules (all viewports):

- The radio is one column, width `min(100% - 24px, 480px)`, centred, with `env(safe-area-inset-*)` padding. The page uses `100dvh`.
- The LCD takes all remaining height (`flex: 1`), minimum about 4 rows, maximum about 70 dvh. The page does not scroll when the radio fits; on very short viewports (landscape phone) the page scrolls vertically and the LCD keeps its 4-row minimum.
- While the search field is open and the on-screen keyboard is shown, the cap, cable and grille may shrink or hide so that at least 3 rows and the search field stay visible. Frontend: set `interactive-widget=resizes-content` in the viewport meta so the layout follows the keyboard.
- Layout must work from 320 px wide, and at 200% zoom (an effective width of 180-360 px): the LCD list wraps text, never truncates, and the three buttons keep their labels (the pills may shrink, the labels may not clip; if 320 px is too narrow for three labels at 200%, the row may wrap PRIIMTI to its own line above the two pills).

### 5.3 Desktop wireframe, 1440x900

```
+--------------------------------------------------------------------------------+
|  (pixel cabin scene fills the whole window, dimmed)                             |
|                                                                                |
|                       +------------------------------+                         |
|                       |  R A C I J A          ~~cable|                         |
|                       |------------------------------|                         |
|                       | +--------------------------+ |                         |
|                       | |[ Ieškoti…            ][x]| |                         |
|                       | |  Atleisk, nepatampysiu   | |                         |
|                       | |  Be šansų                | |                         |
|                       | |##> Pamerk (1)          ##| |   radio: max 480 px wide|
|                       | |  Pamerk (2)              | |   LCD: grows, max 70dvh |
|                       | |  Brangioka viršininke    | |                         |
|                       | |  ...                     | |                         |
|                       | |[Vyras|Moteris]  Įrašų: 39| |                         |
|                       | +--------------------------+ |                         |
|                       | [PAIEŠKA]  (PRIIMTI) [SIŲSTI]| |                         |
|                       |  ::::::::::::::::::::::::    | |                         |
|                       +------------------------------+                         |
|                           Paleista: 1 234 · Išsiųsta: 56                       |
|                  Fanų projektas, nesusijęs su žaidimo kūrėjais                 |
+--------------------------------------------------------------------------------+
```

- No "Įjunkite garsą" hint on desktop (shown only when `(pointer: coarse)`).
- Hover: rows get a light tint, buttons a lighter face. Cursor `pointer` on all controls. Hover is never the only cue.
- The radio keeps the phone proportions; extra width shows the scene. Scale the radio up to a height of about `100dvh - 96px`, capped at about 820 px.

### 5.4 LCD list rows

| State                | Look (designer decides exact tokens)                                                                              | Notes                                                                 |
| -------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Default              | Ink text on LCD green-grey, row min height 44 px, text wraps to as many lines as needed.                          | Divider line between rows (1 px, low contrast, decorative).            |
| Hover (pointer)      | Light tint.                                                                                                       |                                                                        |
| Focus-visible        | 2-3 px outline inside the row, at least 3:1 against the LCD and against the selected fill.                        | Must be distinguishable from "selected" (outline vs fill).             |
| Selected             | Inverted bar (light text on dark ink).                                                                            | `aria-selected="true"`.                                                |
| Playing              | Selected look + a "play" marker (SVG, not a font glyph) at the row start. The marker bars animate.                 | Static marker under reduced motion. Marker is `aria-hidden`; the state is in the accessible name. |
| Loading (audio)      | Marker replaced by a small blinking dots icon if the clip is not ready after 300 ms.                              | `aria-busy="true"` on the row.                                         |
| Error                | Row returns to "selected, not playing". The toast explains.                                                       |                                                                        |

- **Scroll:** the list area scrolls with touch, wheel and keyboard. A thin visible scrollbar (styled to the LCD) on desktop; on touch, the partly visible last row is the scroll cue. Use `overscroll-behavior: contain` so a flick at the list end does not scroll the page.
- **New selection** (voice switch, closing search): scroll the selected row into view with `block: 'nearest'` (instant when reduced motion is on, smooth otherwise).
- **Filter changes:** scroll position resets to the top.
- **Text:** the corrected phrase from the catalog, sentence case as written in the catalog, plus ` (n)` for numbered variants. Rows keep catalog order (not alphabetical) so that the voice switch keeps the user oriented.

### 5.5 Search

- **PAIEŠKA** shows or hides the search row at the top of the LCD (list height shrinks accordingly).
- The field: `type="search"`, label "Ieškoti įrašų", placeholder "Ieškoti…", `autocomplete="off"`, `autocapitalize="off"`, `spellcheck="false"`, `enterkeyhint="search"`. **Font size at least 16 px** (iOS Safari zooms the page on smaller inputs).
- Filters as the user types (D12): case- and diacritics-insensitive, combined with the voice filter. Matching is on the phrase text (also the numbered label, so "pamerk 2" works if easy to do; not required).
- **Enter** in the field: closes the on-screen keyboard and moves focus to the first row (no sound). Nothing else.
- **Esc** (or PAIEŠKA again): closes the field, clears the query, returns focus to PAIEŠKA.
- **"×"** clears the text and keeps focus in the field.
- Empty result: the list is replaced by the centred text "Nieko nerasta". The count shows "Įrašų: 0".
- Selection while searching: see U8.

### 5.6 Voice toggle and count (LCD footer)

- Group label (accessible): "Balsas". Segments: "Vyras", "Moteris". Exactly one is active.
- `nezinoma` clips (the two "Tuoj jau sustabdykite..." lines, speaker unknown) are listed under **both** voices, with no special marker.
- Right side of the footer: "Įrašų: N" = number of visible rows (changes with search and voice).

### 5.7 Counters

- Under the radio, one line: **"Paleista: N · Išsiųsta: N"**. The numbers use the Lithuanian thousands separator, a non-breaking space ("1 234"). The middle dot and the two parts wrap as separate spans if the line is too narrow.
- While the first request is in flight: "…" in place of the number. Unavailable (error, timeout, offline): "—" in place of the number. Each counter is independent.
- After a successful action the shown number goes up by 1 locally (only when a number is known). It is not re-fetched.
- Not a live region. Plain `<p>`.

### 5.8 Sound hint

- Text: "Įjunkite garsą", with a small speaker icon (decorative), directly under the radio, above the counters.
- Shown only on touch-primary devices (`(pointer: coarse)`), no user-agent sniffing. The reason: iOS silent mode (and a muted media volume on Android) mute web audio.
- Hidden after the first clip starts in the current visit. It comes back on the next visit (silent mode can bite again).
- Plain text, not a live region, no close button.

### 5.9 Footer note

- Text: "Fanų projektas, nesusijęs su žaidimo kūrėjais". Last element of the page, centred, in a `<footer>`.
- It sits on top of the pixel scene, so the designer must give it a scrim or a solid chip so that its text contrast is at least 4.5:1. Same rule for the hint and the counters.

### 5.10 Toast

- One toast at a time, centred above the bottom edge (above the safe-area inset), outside the radio, so it never covers the LCD rows. It has no buttons.
- Duration: 6 s for success and info, 10 s for errors. A new message replaces the old one. No slide animation when reduced motion is on.
- The same text goes to the live region (section 10). The toast element itself is `aria-hidden` to avoid double announcements.

## 6. States

| Area                    | Empty                              | Loading                                   | Error                                                   | Success                                    | Disabled / permissions                                                  |
| ----------------------- | ---------------------------------- | ----------------------------------------- | ------------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------- |
| Phrase list             | "Nieko nerasta" (search only)      | None (catalog is bundled)                 | Not applicable                                          | Rows shown                                 | -                                                                       |
| Playback                | Nothing selected: toast on PRIIMTI | Row blinking dots after 300 ms            | Toast "Nepavyko paleisti garso." Row not playing.       | LED on, marker animated                    | Autoplay blocked: not possible, plays only on tap                       |
| Clip file fetch (share) | -                                  | SIŲSTI `aria-busy`                        | Toast "Nepavyko įkelti garso. Patikrinkite ryšį."       | -                                          | -                                                                       |
| Share                   | Toast "Pirmiausia pasirinkite frazę." | `aria-busy`, repeat taps ignored       | See 7                                                   | See 7                                      | `aria-disabled` while nothing is selected                               |
| Counters                | -                                  | "…"                                       | "—"                                                     | Number                                     | -                                                                       |
| Page without JS         | `<noscript>`: "Racijai reikalinga JavaScript." | -                             | -                                                       | -                                          | -                                                                       |

Permissions: none requested (no microphone, no notifications). Sharing needs HTTPS (the site is served over it) and a user tap.

## 7. Share outcomes

| Outcome                                           | Trigger                                                                  | Counter       | Toast (and live message)                          | Focus                    |
| ------------------------------------------------- | ------------------------------------------------------------------------ | ------------- | ------------------------------------------------- | ------------------------ |
| **Shared**                                        | `navigator.share` resolves                                               | +1 share      | "Išsiųsta."                                       | Back on SIŲSTI           |
| **Downloaded**                                    | `canShare` false or share unsupported; file downloaded                   | +1 share      | "Atsisiųsta – pridėkite failą prie žinutės."      | Stays on SIŲSTI          |
| **Cancelled**                                     | `AbortError`                                                             | none          | none (silent)                                     | Back on SIŲSTI           |
| **Blocked (gesture lost)**                        | `NotAllowedError`                                                        | none          | "Bandykite dar kartą."                            | Stays on SIŲSTI          |
| **Error (any other)**                             | Other exception                                                          | none          | "Nepavyko išsiųsti. Bandykite dar kartą."         | Stays on SIŲSTI          |
| **Clip could not be fetched**                     | Prefetch / fetch failed                                                  | none          | "Nepavyko įkelti garso. Patikrinkite ryšį."       | Stays on SIŲSTI          |
| **Nothing selected**                              | Tap with no selection                                                    | none          | "Pirmiausia pasirinkite frazę."                   | Stays on SIŲSTI          |

Notes for the frontend:

- The clip is prefetched when a row is selected, so `share()` runs inside the tap. If the user taps SIŲSTI before the prefetch is ready, wait for it and share; if that ends in `NotAllowedError`, show the "Bandykite dar kartą." message (the second tap then works).
- Share only the file and `title` (the phrase label); leave out `text` because some targets insert it as an extra message. The tester confirms on a device.
- File name: `racija-<id>.mp3`, type `audio/mpeg`.
- The old toast text "Dalinimasis nepavyko – bandyk mobiliajame naršyklėje" is dropped. Desktop is no longer an error: it downloads.

## 8. Copy (all Lithuanian UI text)

| Key                       | Text                                                         | Where / notes                                                        |
| ------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------- |
| page title                | Racija – Kelyje 2                                            | `<title>` (plan task 11)                                             |
| h1 (logo accessible name) | RACIJA                                                       | `h1` wrapping the logo SVG                                           |
| radio region label        | Racija                                                       | `role="group"` `aria-label`                                          |
| btn.search                | PAIEŠKA                                                      | Pill, left                                                           |
| btn.accept                | PRIIMTI                                                      | Round, centre. Visible text is always PRIIMTI.                       |
| btn.accept.sr.play        | , groti                                                      | Visually hidden suffix, so the name is "PRIIMTI, groti"              |
| btn.accept.sr.stop        | , sustabdyti                                                 | Hidden suffix while playing                                          |
| btn.share                 | SIŲSTI                                                       | Pill, right                                                          |
| voice.group               | Balsas                                                       | `aria-label` of the toggle group                                     |
| voice.male                | Vyras                                                        |                                                                      |
| voice.female              | Moteris                                                      |                                                                      |
| list.label                | Frazių sąrašas                                               | `aria-label` of the listbox                                          |
| row.sr.playing            | , grojama                                                    | Hidden suffix on the playing row                                     |
| count                     | Įrašų: {n}                                                   | LCD footer (invariable form avoids Lithuanian plural rules)          |
| search.label              | Ieškoti įrašų                                                | `aria-label` of the field                                            |
| search.placeholder        | Ieškoti…                                                     |                                                                      |
| search.clear              | Išvalyti paiešką                                             | `aria-label` of the "×" button                                       |
| search.empty              | Nieko nerasta                                                | List area when 0 results                                             |
| counter.plays             | Paleista: {n}                                                | {n} = number, "…" or "—"                                             |
| counter.shares            | Išsiųsta: {n}                                                | Joined with " · "                                                    |
| hint.sound                | Įjunkite garsą                                               | Touch devices, until the first play                                  |
| footer.note               | Fanų projektas, nesusijęs su žaidimo kūrėjais                | `<footer>`; no full stop                                             |
| msg.select-first          | Pirmiausia pasirinkite frazę.                                | Toast + live                                                         |
| msg.shared                | Išsiųsta.                                                    | Toast + live                                                         |
| msg.downloaded            | Atsisiųsta – pridėkite failą prie žinutės.                   | Toast + live                                                         |
| msg.share-retry           | Bandykite dar kartą.                                         | `NotAllowedError`                                                    |
| msg.share-error           | Nepavyko išsiųsti. Bandykite dar kartą.                      | Any other share error                                                |
| msg.fetch-error           | Nepavyko įkelti garso. Patikrinkite ryšį.                    | Clip fetch failed                                                    |
| msg.play-error            | Nepavyko paleisti garso.                                     | `audio.play()` rejected / media error                                |
| live.playing              | Grojama: {label}                                             | Live region, see section 10                                          |
| live.stopped              | Sustabdyta.                                                  | Live region, see section 10                                          |
| live.results              | Įrašų: {n}                                                   | After search / voice change                                          |
| live.no-results           | Nieko nerasta.                                               |                                                                      |
| live.voice                | Balsas: {Vyras\|Moteris}. Įrašų: {n}.                         | After a voice switch                                                 |
| noscript                  | Racijai reikalinga JavaScript.                               | `<noscript>`                                                         |

Copy rules: short sentences with a full stop (messages), UPPERCASE only for the three radio buttons (they mimic the game), "jūs" form (imperative plural: "Pasirinkite", "Bandykite") throughout, no exclamation marks, no emoji.

## 9. Accessibility

### 9.1 ARIA pattern: listbox (decision)

**Chosen: `role="listbox"` with `role="option"` rows and roving focus** (real DOM focus moves, `tabindex="0"` on the current option, `-1` on the others), not 76 tab-stop buttons.

Why:

- Keyboard users reach the whole list with one Tab stop and move with arrows; with a list of buttons they would need up to 39 Tab presses to get past the list to the voice toggle and the radio buttons (WCAG 2.4.3, efficiency; also a failure of the "easy to reach controls" goal).
- The rows have no nested interactive content, which is the main restriction of options.
- Single selection is exactly the app's model (`aria-selected` = the selected clip).
- Screen readers announce "N of M" automatically for options, which helps in a long list.

Why real focus and not `aria-activedescendant`: iOS VoiceOver and TalkBack explore by touch and handle moving focus more reliably than a virtual cursor.

Risks and mitigations: some mobile screen readers announce listbox semantics less richly than a plain list of buttons. Exploring by touch and double-tap still activates the option (a `click` event). The tester checks this (section 12). If VoiceOver/TalkBack testing shows trouble, fall back to a `<ul>` of `<button aria-pressed>` and add a "skip list" link; keep the visual design identical.

Details:

- Listbox: `role="listbox"`, `aria-label="Frazių sąrašas"`, `aria-orientation="vertical"`. No `aria-multiselectable`.
- Option: `role="option"`, `aria-selected="true|false"`, `aria-posinset` / `aria-setsize` only if the list is virtualised (it is not). The name is the row text; the playing row adds a visually hidden ", grojama".
- Selection does **not** follow focus: arrows only move focus; Enter / Space select and play (playing a sound on every arrow press would be hostile).
- The empty state ("Nieko nerasta") is a sibling `<p>` outside the listbox; the listbox is removed or `hidden` when there are 0 rows.
- The search row is not inside the listbox.

### 9.2 Keyboard

Tab order follows the visual order:

1. Search field (only when open) - then its clear "×" button (when visible)
2. Listbox (one stop, lands on the selected option, or the first option if none)
3. Vyras
4. Moteris
5. PAIEŠKA
6. PRIIMTI
7. SIŲSTI

| Key                           | Where           | Effect                                                                     |
| ----------------------------- | --------------- | -------------------------------------------------------------------------- |
| Up / Down                     | Listbox         | Move focus one row (no wrap), scrolls it into view                         |
| Home / End                    | Listbox         | First / last row                                                           |
| PageUp / PageDown             | Listbox         | Move focus about one screen of rows                                        |
| Enter / Space                 | Option          | Select and play (Space must not scroll the page: `preventDefault`)         |
| Enter / Space                 | Buttons         | Activate                                                                   |
| Enter                         | Search field    | Focus the first row (keyboard closes on touch), no sound                   |
| Esc                           | Search field or "×" | Close the search, clear the query, focus PAIEŠKA                       |
| Tab / Shift+Tab               | Everywhere      | Standard. No keyboard traps; no custom shortcuts.                          |

The first option that receives Tab focus is the selected one, or the first row when there is none (so the Tab entry point is predictable).

### 9.3 Focus management

- **PAIEŠKA opens:** focus goes to the search input. **Closes** (button or Esc): focus goes to PAIEŠKA (it was the opener).
- **Voice switch:** focus stays on the pressed segment. The selected row, if kept, is scrolled into view but not focused.
- **Filter results change** while typing: focus stays in the field. If the row that holds the roving `tabindex="0"` disappears, move it to the first visible row (not focus, only the tab stop).
- **Share sheet closes** (any outcome): the browser returns focus to SIŲSTI; verify and call `focus()` if it does not.
- **Toast:** never takes focus.
- **Focus indicator:** visible on every control, at least 2 px, contrast at least 3:1 against both neighbours (WCAG 2.4.11 / 1.4.11). The focus ring is not clipped by the radio's `overflow: hidden`. Buttons must not be hidden behind sticky UI (2.4.11).
- **Target size:** rows and buttons at least 44x44 CSS px; the minimum allowed is 24 px (2.5.8) only for the tiny "×", which still gets a 44 px hit area.

### 9.4 Semantics and landmarks

- `<main>` wraps the radio, hint and counters. `<footer>` wraps the note. The page has one `h1` (the logo).
- Voice toggle: `<div role="group" aria-label="Balsas">` with two `<button aria-pressed>`.
- PAIEŠKA: `aria-expanded`, `aria-controls="<search row id>"`.
- PRIIMTI / SIŲSTI when nothing is selected: `aria-disabled="true"` (not `disabled`), activation shows the message. SIŲSTI during sharing: `aria-busy="true"`.
- Label in name (2.5.3): visible text PRIIMTI / PAIEŠKA / SIŲSTI is at the start of each accessible name.
- Decorative graphics (pixel scene canvas, grille, cable, LED ring, speaker icon in the hint, playing marker) are `aria-hidden="true"`; the logo SVG has an accessible name via its parent `h1`.
- `lang="lt"` on `<html>`. Status messages in the live region use plain Lithuanian text.

### 9.5 Live region (single, app-level)

One visually hidden `<div role="status" aria-live="polite" aria-atomic="true">`, always in the DOM, text replaced on each message (clear it first, then set it on the next frame, so repeating the same message is re-announced).

| Event                                     | Announcement                                      | Why / when not                                                                                                                  |
| ----------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Row activated (play starts)               | None                                              | The clip itself is the feedback; speech would talk over it. The option's state and the ", grojama" name carry the information.  |
| PRIIMTI starts a clip                     | "Grojama: {label}"                                | The focused button does not change its announced state.                                                                        |
| PRIIMTI stops a clip                      | "Sustabdyta."                                     | Same.                                                                                                                          |
| Clip ends by itself                       | None                                              | Noise.                                                                                                                          |
| Search text changes                       | "Įrašų: {n}" or "Nieko nerasta."                  | Debounced by 500 ms after the last keystroke, so it is not read per letter.                                                    |
| Voice switch                              | "Balsas: Moteris. Įrašų: 39."                     | Immediately.                                                                                                                    |
| Share / error messages                    | Same text as the toast                            | See section 7 and the copy table.                                                                                               |
| Counter changes                           | None                                              | Not a status message the user needs.                                                                                            |
| Nothing selected message                  | "Pirmiausia pasirinkite frazę."                   |                                                                                                                                 |

### 9.6 Contrast, zoom, motion

- Text contrast at least 4.5:1: LCD ink on LCD, the inverted selected row, the three button labels on their faces, the hint, counters and footer note on their scrim (the animated scene must not reduce this: use a solid or high-opacity chip). UI component boundaries and focus ring at least 3:1.
- The LCD font must cover `ąčęėįšųūž ĄČĘĖĮŠŲŪŽ` (D14). The minimum LCD text size is 16 CSS px (so 200% zoom stays readable and iOS does not zoom the field); use `rem`, not `px`, for text.
- Reflow (1.4.10): no horizontal scroll at 320 px wide (equals 400% zoom of 1280 px); no content lost at 200% text zoom.
- Orientation: portrait and landscape both work; do not lock orientation.
- Motion: `prefers-reduced-motion: reduce` gives a static pixel scene frame, a static play marker and LED glow (no pulse), instant scrolling, no toast animation. Nothing flashes more than 3 times per second.
- No timing limits other than the toast (it is also in the live region, and errors stay 10 s).
- Colour is never the only cue (section 4).

## 10. Implementation notes for frontend (UX-relevant)

- Audio: `play()` is called synchronously inside the click handler (D9). Only one clip at a time. `ended` resets the playing state, LED and marker.
- A play is counted once when playback starts (a restart by tapping the playing row counts again; PRIIMTI replay counts).
- Remember the voice in `localStorage` (`racija-voice`, values `vyras` / `moteris`); ignore storage errors (private mode).
- Search normalisation as in D12; trim whitespace; an empty or whitespace-only query shows all rows.
- Feature-detect `navigator.canShare({ files })` with the real `File` before choosing share or download.
- Do not use `window.alert`, `confirm`, or a modal anywhere.

## 11. Edge cases

- **Rapid taps on different rows:** the last tap wins, there is never more than one clip audible.
- **Double tap on SIŲSTI:** the second tap is ignored while `aria-busy`.
- **Voice switch while sharing:** the share continues with the clip chosen at tap time.
- **Very long phrase on 320 px:** wraps to up to 3 lines; the row grows.
- **Holding a key on a row:** `keydown` repeat on Enter must not restart the clip repeatedly (ignore `event.repeat`).
- **Back-forward cache / tab revisit:** state is kept; playback may have been stopped by the browser; the UI follows the audio element's `pause` / `ended` events.
- **Counters failing while the user shares:** the share still succeeds; nothing is shown for the counter.

## 12. Manual test checklist (for the tester, plan task 15)

Mark each item pass / fail with device, OS and browser version.

### Core, on every device

- [ ] First load: nothing plays, no row selected, Vyras active, counters show numbers or "—".
- [ ] Tap a row: it is selected, it plays on the first tap, LED lights, marker shows. Clip end: LED off, row stays selected.
- [ ] Tap another row during playback: the first stops, the second plays. Only one clip audible.
- [ ] Tap the playing row: restarts.
- [ ] PRIIMTI while playing stops; PRIIMTI idle with a selection replays; PRIIMTI with no selection shows "Pirmiausia pasirinkite frazę." and plays nothing.
- [ ] SIŲSTI with no selection shows the same message.
- [ ] Voice switch: list changes; the matching phrase stays selected (no sound); a playing clip stops. The two "Tuoj jau sustabdykite..." clips are in both voices.
- [ ] Numbered variants: "Pamerk (1)" / "(2)" and "Rinkis (1)" / "(2)" are in both voices, and only those are numbered.
- [ ] Search: "sansu" finds "šansų"; uppercase works; "Nieko nerasta" for "zzz"; "×" clears; Esc closes and clears and returns focus to PAIEŠKA; Enter moves focus to the first row.
- [ ] Search that hides the selected clip clears the selection; a playing clip finishes; PRIIMTI stops it.
- [ ] Counters: a play increases "Paleista" by 1, a share/download increases "Išsiųsta" by 1, a cancelled share does not. Reload: the numbers persist (server). Block `countapi.mileshilliard.com` in dev tools: "—" appears, the app still works.
- [ ] Footer note and (on phone) the hint are readable over the scene; the hint disappears after the first play.
- [ ] Layout: the LCD grows with the window height, no page scroll at 360x740 and 1440x900, 4+ rows visible at 360x560.

### iOS Safari (iPhone, silent switch on and off)

- [ ] Silent switch on: the hint "Įjunkite garsą" is visible; with the switch off the sound plays.
- [ ] Share: tap SIŲSTI on the first try (no earlier test taps), the share sheet opens with `racija-<id>.mp3`; send to Messenger; the file plays as an audio attachment.
- [ ] Tap SIŲSTI immediately after selecting a row (prefetch race): either the sheet opens or "Bandykite dar kartą." appears, and the second tap works.
- [ ] Focusing the search field does not zoom the page. The keyboard does not hide the field or the first rows.
- [ ] Safe areas (notch, home bar) are respected in portrait and landscape.

### Android Chrome

- [ ] Share sheet opens with the MP3; Messenger receives it.
- [ ] Media volume muted: the hint is shown; unmuted: sound plays.
- [ ] Back gesture does not break the page; the keyboard resizes the layout (field stays visible).

### Desktop (Chrome, Firefox, Safari; Windows and macOS if available)

- [ ] SIŲSTI shares (Chrome) or downloads (Firefox) and the toast matches the outcome; the downloaded file plays.
- [ ] No sound hint is shown (fine pointer).
- [ ] Hover and focus states are visible; cursor is a pointer on controls.
- [ ] 1440x900: the radio is centred, the LCD fills the height, the scene fills the window.

### Keyboard only (desktop)

- [ ] Tab order: search field (when open) - listbox - Vyras - Moteris - PAIEŠKA - PRIIMTI - SIŲSTI; Shift+Tab reverses; no traps.
- [ ] Listbox: Up/Down/Home/End/PageUp/PageDown move focus; Enter and Space select and play; the page does not scroll on Space; holding Enter does not retrigger.
- [ ] The focus ring is visible on every control, including on the selected (inverted) row.
- [ ] PAIEŠKA focuses the field; Esc returns focus to PAIEŠKA.

### Reduced motion

- [ ] Enable "reduce motion" in the OS: the pixel scene is a single static frame, the playing marker and LED do not animate, scrolling is instant, the toast appears without animation.
- [ ] Without it: the scene animates at roughly 12 fps and pauses in a hidden tab (check CPU).

### 200% zoom and small screens

- [ ] Browser zoom 200% on desktop and text size 200% on Android: no horizontal scroll, no clipped labels, rows wrap, all three buttons usable.
- [ ] 320 px wide viewport: layout holds.
- [ ] Landscape phone (about 740x360): the page scrolls; the LCD shows 4 rows or more; the buttons are reachable.

### Screen readers

- [ ] VoiceOver (iOS, Safari): swipe through the page in order; the listbox is announced with its label; options read as "Pamerk (1), selected, 5 of 39" or similar; double-tap on an option plays it; the playing row reads ", grojama".
- [ ] VoiceOver: voice toggle reads as "Balsas, group; Vyras, toggle button, on"; switching announces "Balsas: Moteris. Įrašų: 39."
- [ ] VoiceOver: PAIEŠKA reads "expanded / collapsed"; focus enters the field when opened; search results count is announced once after typing stops.
- [ ] TalkBack (Android, Chrome): same checks; explore by touch and double-tap work on options. If options are hard to use, report it (fallback in 9.1).
- [ ] NVDA or JAWS with Firefox/Chrome on desktop (if available): listbox navigation works in focus mode; messages are announced; the clip is not talked over on row activation.
- [ ] PRIIMTI start / stop announces "Grojama: ..." / "Sustabdyta."; share outcomes are announced; nothing is announced for counters.
- [ ] axe reports no violations; Lighthouse accessibility is 100; the contrast of the hint, counters and footer note is at least 4.5:1 over the animated scene at several moments of the animation.
