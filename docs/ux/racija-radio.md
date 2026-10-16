# UX spec: RACIJA radio

Plans: `docs/plans/racija-radio.md` (D5, D9-D12) and **`docs/plans/legacy-radio.md` (approved 2026-10-16; supersedes D4, D5, D16)**. Source behaviour: `kelyje` (Angular 19) `walkie-talkie.component.*`, `tts.service.ts`.
Language of all UI: Lithuanian (`lang="lt"`).

**How to read this file after the legacy-radio update.** Items that the legacy-radio plan replaced are kept in place, struck through and marked **SUPERSEDED (legacy-radio Lx / user decision)**, so the history is visible. The current rule is always the text that is not struck through. New material is in sections 5.11 (bottom strip and search), 5.12 (mode switch) and 5.13 (KURTI panel), and in the copy, keyboard, live-region and checklist sections.

## 1. Users and goal

- **Who:** Lithuanian players and fans of the game _Kelyje 2_, mostly on a phone, who want to hear a RACIJA line and send it to a friend (Messenger and similar apps). Secondary: desktop visitors.
- **Goal:** find a phrase in a few seconds, hear it, send it as an audio file. Or type their own line, hear it spoken in a Lithuanian voice and send it. Nothing to learn, no account, no permissions.
- **Not in scope:** favourites, history, playlists, saving own phrases.
- ~~**Not in scope: text-to-speech (KURTI is removed).**~~ **SUPERSEDED (legacy-radio, D16 reversed):** KURTI is back.

## 2. Key decisions (summary)

| #   | Decision                                                                                                                                                                                                                                                                                                                                                                                 |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U1  | **A row tap selects AND plays** (one step, same as the old app). Tapping the playing row restarts it. There is no stop control (clips are 1-3 s). _Kept._                                                                                                                                                                                                                                  |
| U2  | ~~**PRIIMTI** = stop if anything is playing, otherwise play the selected clip (replay).~~ **SUPERSEDED (legacy-radio L4: no PRIIMTI).** Replay = tap the selected row again. In KURTI mode, replay = PALEISTI again.                                                                                                                                                                       |
| U3  | ~~Button row: PAIEŠKA (pill) - PRIIMTI (round, centre) - SIŲSTI (pill).~~ **SUPERSEDED (legacy-radio L4).** Two keys on the bitmap: the **pill** (left) is **KURTI** in phrase mode and **GARSAI** in KURTI mode; the **round key** (right) is **SIŲSTI** in both modes. Search is no longer a key; it is always visible in the LCD.                                                         |
| U4  | ~~PRIIMTI and SIŲSTI with nothing selected use `aria-disabled`.~~ **PRIIMTI part SUPERSEDED (no PRIIMTI).** The rule stays for **SIŲSTI** (phrase mode: nothing selected; KURTI mode: empty text) and for **PALEISTI** (empty text, or the voice is not ready): `aria-disabled`, focusable, a tap explains why.                                                                              |
| U5  | The phrase list is an ARIA **listbox** with roving focus (section 9). _Kept._                                                                                                                                                                                                                                                                                                             |
| U6  | Variants of the same phrase and voice are numbered **"Pamerk (1)", "Pamerk (2)"**, only when a group has more than one clip. _Kept._                                                                                                                                                                                                                                                      |
| U7  | Switching voice keeps the selection when the same phrase exists in the other voice. No autoplay. Otherwise the selection is cleared. A playing clip is stopped. _Kept._ In KURTI mode the voice toggle is the same single global voice (section 5.13).                                                                                                                                     |
| U8  | Closing the search field clears the query. ~~"Closing" the search.~~ **The "closing search" part is SUPERSEDED (legacy-radio L5: the search field is always visible).** Still true: the visible list always equals what SIŲSTI acts on; if typing hides the selected clip, the selection is cleared, but a clip already playing finishes. New: **Esc clears the text** (section 5.11).     |
| U9  | Messages appear in a toast outside the radio and in a hidden live region. Counters are not in a live region. _Kept._ Persistent TTS states (download, preparing, errors) live **inside the KURTI panel** and are announced once (section 9.5).                                                                                                                                             |
| U10 | The voice choice is remembered in `localStorage` (`racija-voice`). Default: Vyras. _Kept._ One voice for both modes.                                                                                                                                                                                                                                                                       |
| U11 | **New.** The query is kept when switching modes. Switching mode stops any sound that is playing. Own-phrase text is kept for the page session.                                                                                                                                                                                                                                            |
| U12 | **New.** **The voice model download starts as soon as KURTI opens** (user decision, overrides the plan's L8 default). The size ("apie 71 MB") and the progress are always shown. Leaving KURTI does not cancel the download; the finish (or failure) is announced even from phrase mode.                                                                                                    |
| U13 | **New.** On iOS the first share of newly generated speech takes two taps (platform limit, accepted by the user): the first SIŲSTI generates, the second shares.                                                                                                                                                                                                                           |
| U14 | **New.** A small credit "Balsas: Coqui TTS (lt/cv/vits)" is shown in KURTI mode (user accepted the licence risk).                                                                                                                                                                                                                                                                         |
| U15 | **New.** LCD rows and LCD controls are **32 px** tall, not 44 px (legacy-radio L6). WCAG 2.5.8 AA (24 px) is still met. The two keys over the bitmap are far above 44 px.                                                                                                                                                                                                                  |

## 3. User flow

### 3.1 Happy path: open, find, hear, send

1. User opens the site. The pixel cabin scene animates behind the legacy bitmap radio. Nothing plays. The LCD list shows the **Vyras** voice (or the remembered one), no row selected, the search field and the voice toggle at the bottom of the LCD. On touch devices the hint "Įjunkite garsą" is visible. No model is requested.
2. User scrolls the LCD list, or types a few letters in the always-visible search field (diacritics optional: "sansu" finds "šansų"). The list filters live.
3. User taps a row. The row becomes selected and the clip plays. The row shows the playing marker. The hint disappears.
4. The clip ends. The row stays selected. ~~User taps PRIIMTI to hear it again.~~ User taps the row again to hear it again, or taps another row.
5. User taps the round key **SIŲSTI**. On mobile the share sheet opens with `racija-<id>.mp3`. The user picks Messenger. The toast says "Išsiųsta." and the counter increases.

### 3.2 KURTI flow: type, hear, send

1. User taps the pill **KURTI**. The LCD switches to the KURTI panel, the pill now reads **GARSAI**. Any sound is stopped. On keyboard/screen reader the focus moves to the textarea; on touch it does not (so the keyboard does not pop up uninvited, see 5.12).
2. **The voice download starts at once** if the model is not cached: the panel shows "Atsisiunčiamas balsas (apie 71 MB). Tai tik pirmą kartą." and a progress bar. If the model is cached, nothing is downloaded; the panel is idle.
3. User types a Lithuanian line (up to 220 characters). The counter shows "n / 220".
4. User taps **PALEISTI**.
   - Voice not ready yet (downloading or preparing): a message asks to wait (section 6). Nothing starts. The user can keep typing.
   - Voice ready: the panel shows "Kuriama kalba…" (generating, 1-3 s, the screen may freeze briefly), then the speech plays. The result is kept for this text and voice.
5. User taps the round key **SIŲSTI**.
   - If the speech for this exact text and voice already exists (the user pressed PALEISTI before), the share sheet opens now with `racija-<slug>-<voice>.wav`.
   - If not, the app generates the speech, does not share, and shows "Paruošta. Spauskite SIŲSTI dar kartą." The next SIŲSTI shares at once (iOS needs the tap, U13).
6. Share outcomes are as in section 7 (the counter is "Išsiųsta"; PALEISTI counts as "Paleista").
7. User taps **GARSAI** to return to the list. Focus moves to the list (keyboard) and the previous selection and query are still there.

### 3.3 Alternatives

| Case                                                      | Behaviour                                                                                                                                                            |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tap another row while a clip plays                        | The old clip stops, the new one starts. One sound at a time.                                                                                                          |
| Tap the playing row                                       | The clip restarts from the beginning (not a toggle).                                                                                                                  |
| SIŲSTI with nothing selected (phrase mode)                | Nothing shares. Toast "Pirmiausia pasirinkite frazę."                                                                                                                 |
| Switch voice with a selection                             | See U7. The list is replaced, the matching row is selected (no sound) and scrolled into view.                                                                          |
| Search with no match                                      | The list area shows "Nieko nerasta". No row is selected.                                                                                                              |
| Desktop, share not supported                              | SIŲSTI downloads the file. Toast "Atsisiųsta – pridėkite failą prie žinutės."                                                                                         |
| User cancels the share sheet                              | Silent. No toast, no counter change.                                                                                                                                  |
| Counter API down                                          | The counters show "—". Everything else works.                                                                                                                         |
| Tab hidden / user leaves                                  | Playback is not stopped by the app. The pixel scene pauses. A running model download continues.                                                                        |
| User leaves KURTI while the model downloads               | The download continues. The live region says "Balsas paruoštas." (or the error) when it ends, even in phrase mode. When the user returns, the panel shows the current state. |
| User leaves KURTI while speech is being generated         | Generation finishes and the result is cached, but it is **not played** automatically.                                                                                 |
| User edits the text after "Paruošta"                      | The cached speech no longer matches. The next SIŲSTI generates again and asks for another tap.                                                                        |
| Voice switched in KURTI after "Paruošta"                  | Same: the cache key is (text, voice), so the next SIŲSTI generates again.                                                                                              |

## 4. Control mapping (final, legacy-radio L4)

| Control                              | Action                                                                                                                                                                          | Keyboard                                       | State cues                                                                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| LCD row                              | Select + play (restart if already playing). ~~Tap target at least 44 px tall.~~ **SUPERSEDED (L6): row at least 32 px tall.**                                                    | Arrows move focus, Enter / Space select + play | Selected: inverted bar. Playing: inverted bar + animated play marker. Focus: outline.                                            |
| ~~PAIEŠKA (pill, left)~~             | ~~Toggle the search field at the top of the LCD.~~ **SUPERSEDED: no PAIEŠKA key.** The search field is always visible at the bottom of the LCD (5.11).                            | -                                              | -                                                                                                                                |
| **Pill (left): KURTI / GARSAI**      | Phrase mode: open KURTI mode. KURTI mode: back to the phrase list. Visible text is KURTI or GARSAI (the name changes with the mode).                                            | Enter / Space                                  | Real `<button>` over the bitmap face. Pressed look (`translateY(1px)` + inner darkening). 3 px focus ring. No `aria-pressed` (the label itself names the target mode). |
| ~~PRIIMTI (round, centre)~~          | ~~Stop / replay.~~ **SUPERSEDED: no PRIIMTI.** There is no stop control.                                                                                                         | -                                              | -                                                                                                                                |
| **Round key (right): SIŲSTI**        | Phrase mode: share the selected clip as `racija-<id>.mp3`. KURTI mode: share the generated speech as `racija-<slug>-<voice>.wav` (second tap on first use, U13). Share sheet, otherwise download. | Enter / Space                                  | `aria-disabled` when nothing to send. `aria-busy` + pulsing ring overlay while sharing or generating. Repeat taps are ignored.   |
| Vyras / Moteris                      | Choose the voice (both modes). Two-state segmented control in the bottom strip.                                                                                                 | Tab to each, Enter / Space                     | `aria-pressed`. Active segment inverted (not colour alone). Min 32 px tall.                                                       |
| Search field                         | Filters the list as you type (phrase mode only; hidden in KURTI mode).                                                                                                          | Type; Enter -> first row; Esc clears          | -                                                                                                                                |
| Search clear "×"                     | Clears the text, focus stays in the field. Visible only when the field has text.                                                                                                | Enter / Space                                  | Min 32 px tall, hit area at least 24 px.                                                                                         |
| PALEISTI (KURTI mode only)           | Generate (if needed) and play the typed text. Tapping while playing restarts.                                                                                                   | Enter / Space                                  | `aria-disabled` when text is empty or the voice is not ready; `aria-busy` while generating; play marker while playing.           |

State never relies on colour alone: selected = inverted bar, playing = marker shape + animation, busy = pulsing ring plus text in the status area.

## 5. Screens

There is one screen with two modes (**sounds** = phrase list, **create** = KURTI). Layers, back to front: pixel cabin scene (decorative, transparent radio backdrop so the scene shows around the body), the legacy bitmap radio with HTML controls on top, page furniture under the radio (hint, counters, footer note), toast.

### 5.1 Radio anatomy (top to bottom)

1. **Logo area** (bitmap). The page `h1` "RACIJA" is visually hidden and placed over the bitmap logo.
2. **LCD** (overlay with its own surface; height 1.0x to 1.4x of the legacy LCD, see L2):
   - Phrase mode: list area (scrolls) on top, **bottom strip** below it (search field + × + Vyras/Moteris).
   - KURTI mode: textarea and counter, PALEISTI, status/progress area, credit line, and the same Vyras/Moteris toggle in the bottom strip.
3. **Key row** (bitmap faces, real buttons on top): pill KURTI/GARSAI on the left, round key SIŲSTI on the right.
4. **Grille and cable** (bitmap, decorative).

~~Old anatomy: SVG cap, search row at the top, "Įrašų: N" footer, button row PAIEŠKA/PRIIMTI/SIŲSTI.~~ **SUPERSEDED.** The visible "Įrašų: N" count is dropped (no room); counts are still announced in the live region.

Under the radio, outside it: sound hint (touch devices, until the first play), counters, footer note.

### 5.2 Phone wireframe, 360x740 (portrait), phrase mode

```
+------------------------------------+  360
| (pixel scene: sky, trees, dashboard)|
|      +------------------------+    |
|      | R A C I J A  (bitmap)  |    |  logo (h1 hidden text)
|      |  +------------------+  |    |
|      |  |Atleisk, nepatamp.|  |    |  LCD list, rows 32 px,
|      |  |Be šansų          |  |    |  4+ rows, scrolls
|      |  |##>Pamerk (1)    ##|  |    |  selected + playing
|      |  |Pamerk (2)        |  |    |
|      |  |Brangioka viršin. |  |    |
|      |  |------------------|  |    |
|      |  |[Ieškoti…     ][x]|  |    |  bottom strip, line 1
|      |  |[Vyras | Moteris ]|  |    |  bottom strip, line 2
|      |  +------------------+  |    |
|      |  [ KURTI ]    ( SIŲSTI)|    |  pill left, round key right
|      |   ::::: grille ::::    |    |
|      +------------~cable------+    |
|     Įjunkite garsą                 |  hint (touch only)
|     Paleista: 1 234 · Išsiųsta: 56 |  counters
|   Fanų projektas, nesusijęs su     |
|   žaidimo kūrėjais                 |
+------------------------------------+  740
```

Sizing rules:

- The radio size and the 1.0x-1.4x LCD growth follow legacy-radio L2 (one unit `--u` = shell width / 556; shell never wider than 556 px nor narrower than 300 px). This spec only adds the UX requirements below.
- At 360x740 the list shows at least 4 full rows plus the bottom strip. On shorter or narrower viewports the page scrolls vertically (the LCD never drops below the legacy proportion) and the list keeps at least 2 rows.
- While the on-screen keyboard is shown (search or textarea), the page may scroll so that the focused field and the one line above it stay visible. Frontend: `interactive-widget=resizes-content` in the viewport meta, and `scrollIntoView({ block: 'nearest' })` on focus of the field.
- Works from 320 px wide and at 200% zoom (effective width 180-360 px): list text wraps, never truncates; the key labels (KURTI/GARSAI, SIŲSTI) may not clip: use `max(1rem, ...)`; if they cannot fit the bitmap face at 200% text zoom they may overflow onto the bezel but must stay fully readable (L6).

### 5.3 Desktop wireframe, 1440x900, KURTI mode

```
+--------------------------------------------------------------------------------+
|  (pixel cabin scene fills the whole window, dimmed)                             |
|                                                                                |
|                       +------------------------------+                         |
|                       |   R A C I J A   (bitmap)     |                         |
|                       |  +------------------------+  |                         |
|                       |  | Jūsų frazė             |  |   shell: max 556 px wide|
|                       |  | [Labas, kaip sekasi?  ]|  |   (height-limited here: |
|                       |  | [                     ]|  |   LCD at 1.4x)          |
|                       |  |              17 / 220  |  |                         |
|                       |  | [ PALEISTI ]           |  |                         |
|                       |  | Atsisiunčiama: 23 iš 71|  |                         |
|                       |  | [=========>        ]   |  |   progress bar          |
|                       |  | Balsas: Coqui TTS ...  |  |   credit (small)        |
|                       |  | [ Vyras | Moteris ]    |  |                         |
|                       |  +------------------------+  |                         |
|                       |  [ GARSAI ]       ( SIŲSTI ) |                         |
|                       |   ::::: grille :::::         |                         |
|                       +-----------~cable-------------+                         |
|                           Paleista: 1 234 · Išsiųsta: 56                       |
|                  Fanų projektas, nesusijęs su žaidimo kūrėjais                 |
+--------------------------------------------------------------------------------+
```

- No "Įjunkite garsą" hint on desktop (shown only when `(pointer: coarse)`).
- Hover: rows get a light tint; keys a slightly lighter face. Cursor `pointer` on all controls. Hover is never the only cue.
- In phrase mode on desktop the bottom strip is a single line: search field (flexible) + × + Vyras/Moteris (see 5.11 for the width rule).

### 5.4 LCD list rows

| State                | Look (designer decides exact tokens)                                                                               | Notes                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Default              | Ink text on LCD surface, ~~row min height 44 px~~ **row min height 32 px (L6)**, text wraps to as many lines as needed. | Divider line between rows (1 px, decorative).                                                   |
| Hover (pointer)      | Light tint.                                                                                                        |                                                                                                 |
| Focus-visible        | 2-3 px outline inside the row, at least 3:1 against the LCD and against the selected fill.                         | Distinguishable from "selected" (outline vs fill).                                              |
| Selected             | Inverted bar (light text on dark ink).                                                                             | `aria-selected="true"`.                                                                         |
| Playing              | Selected look + a play marker (SVG, not a font glyph) at the row start. The marker bars animate.                    | Static marker under reduced motion. Marker is `aria-hidden`; the state is in the accessible name. |
| Loading (audio)      | Marker replaced by blinking dots if the clip is not ready after 300 ms.                                            | `aria-busy="true"` on the row.                                                                  |
| Error                | Row returns to "selected, not playing". The toast explains.                                                        |                                                                                                 |

- **Scroll:** the list scrolls with touch, wheel and keyboard. Thin LCD-styled scrollbar on desktop; on touch the partly visible last row is the cue. `overscroll-behavior: contain`.
- **New selection** (voice switch, returning from KURTI): scroll the selected row into view, `block: 'nearest'` (instant under reduced motion).
- **Filter changes:** scroll resets to the top.
- **Text:** the corrected phrase from the catalog, plus ` (n)` for numbered variants. Catalog order, not alphabetical.

### 5.5 Search -- SUPERSEDED (legacy-radio L5, user decision: no PAIEŠKA)

> **SUPERSEDED.** The PAIEŠKA flow below is replaced by the always-visible search in the bottom strip (5.11). Kept for history only. Do not build it.
>
> - ~~PAIEŠKA shows or hides the search row at the top of the LCD.~~
> - ~~Esc (or PAIEŠKA again): closes the field, clears the query, returns focus to PAIEŠKA.~~
> - ~~"×" clears the text and keeps focus in the field.~~ (Kept, see 5.11.)
> - ~~Enter closes the keyboard and moves focus to the first row.~~ (Kept, see 5.11.)
>
> Still valid from the old section: the field attributes and 16 px font, the normalisation (D12), the empty result "Nieko nerasta".

### 5.6 Voice toggle

- Group label (accessible): "Balsas". Segments: "Vyras", "Moteris". Exactly one is active. It lives in the bottom strip in both modes, in the same position, so it does not jump when the mode changes.
- `nezinoma` clips (the two "Tuoj jau sustabdykite..." lines) are listed under **both** voices.
- ~~Right side of the footer: "Įrašų: N".~~ **SUPERSEDED: removed (no room).** The count is announced in the live region.

### 5.7 Counters

- One line: **"Paleista: N · Išsiųsta: N"**, Lithuanian thousands separator (non-breaking space). The two parts wrap as separate spans if too narrow.
- In flight: "…". Unavailable: "—". Each counter independent.
- A successful action increases the shown number by 1 locally. Not re-fetched.
- A speech preview (PALEISTI) counts as a play. A successful share or download of speech counts as a share.
- Not a live region. Plain `<p>`.

### 5.8 Sound hint

- Text: "Įjunkite garsą", small speaker icon (decorative), directly under the radio, above the counters.
- Only on `(pointer: coarse)` devices. Hidden after the first clip or speech starts in this visit.
- Plain text, not a live region, no close button.

### 5.9 Footer note

- Text: "Fanų projektas, nesusijęs su žaidimo kūrėjais". Last element, centred, in a `<footer>`. Scrim or chip so contrast is at least 4.5:1 over the scene. Same for the hint and counters.

### 5.10 Toast

- One toast at a time, centred above the bottom edge (above the safe-area inset), outside the radio. No buttons.
- 6 s for success and info, 10 s for errors. A new message replaces the old one. No slide animation under reduced motion.
- The same text goes to the live region. The toast element is `aria-hidden`.
- Used for short outcomes (shared, downloaded, "select first", "Paruošta. Spauskite SIŲSTI dar kartą.", "Įveskite tekstą."). **Persistent TTS states are not toasts**: they sit in the KURTI panel (5.13).

### 5.11 Bottom strip and search (phrase mode)

Purpose: always-available search and the voice toggle, fixed under the scrolling list.

Layout:

```
Narrow LCD (phone, LCD container < 340 px):      Wide LCD (container >= 340 px):
+----------------------+                         +--------------------------------+
| [Ieškoti…        [x]]|  line 1: search         | [Ieškoti…      [x]] [Vyras|Moteris]|
| [ Vyras | Moteris  ] |  line 2: toggle         +--------------------------------+
+----------------------+
```

- Each line is at least 32 px tall; the two segments share the line equally (each at least 32 px high and wide enough for the word at 1rem).
- The strip is never part of the scrolling area and never hidden by the list. The layout is chosen by an LCD **container query**, not a viewport media query.
- Search field: `type="search"`, accessible label "Ieškoti įrašų", placeholder "Ieškoti…", `autocomplete="off"`, `autocapitalize="off"`, `spellcheck="false"`, `enterkeyhint="search"`, Doto 800 at **1rem (16 px)** (iOS does not zoom). The native clear button of `type="search"` is hidden; our × button replaces it.
- "×" (accessible name "Išvalyti paiešką") appears inside the field's right edge only when the field has text. Activating it clears the text and returns focus to the field. If it has focus when it disappears, focus must go to the field (never to `body`).
- Filtering: as the user types, case- and diacritics-insensitive (D12), combined with the voice filter. Whitespace-only = no filter. Scroll resets to the top.
- **Enter** in the field: closes the on-screen keyboard and moves focus to the first visible row. No sound.
- **Esc** in the field (or on ×): clears the text, **focus stays where it is** (field), the list shows everything. With an already empty field Esc does nothing. Esc is not captured anywhere else (not in the list, not in the textarea) so it never fights browser or dialog behaviour.
- Empty result: the list area shows centred "Nieko nerasta"; no listbox in the DOM.
- Selection while searching: U8.
- The search field and × are removed from the DOM and the tab order in KURTI mode. The query is kept in state and restored when the user returns.

### 5.12 Mode switch: KURTI <-> GARSAI

- The pill is one button whose text and accessible name change with the mode: **KURTI** (phrase mode) / **GARSAI** (KURTI mode). Nothing else about the key changes, so users can find it in the same place.
- On switch:
  1. Any playing sound stops (one sound at a time, new context).
  2. The LCD content is replaced (no animation under reduced motion; otherwise a short 100 ms fade at most).
  3. The live region announces the new mode (9.5).
  4. **Focus rules:**
     - Into KURTI, **keyboard or screen-reader activation** (`click` with `event.detail === 0`): focus moves to the textarea.
     - Into KURTI, **pointer or touch** activation: focus does **not** move, so the on-screen keyboard does not open without the user asking. The user taps the textarea. The pill keeps focus.
     - Back to GARSAI, keyboard / screen reader: focus moves to the listbox's current tab stop (the selected option, or the first option). If the list is empty ("Nieko nerasta"), focus goes to the search field.
     - Back to GARSAI, pointer/touch: focus stays on the pill.
  5. The reason for moving focus (keyboard users): the pressed control's content area has just been replaced; leaving focus on the pill would make the user Tab through the whole new region from the start in the wrong direction. The reason for not moving it on touch: a surprise keyboard covers the LCD.
- The selection, query and the typed text are all kept. Voice is one global value.
- The pill never loses its place or size between modes. It is not disabled in any state (also not during download).

### 5.13 KURTI panel (create mode)

Purpose: type a line, hear it, send it. Content hierarchy (top to bottom inside the LCD surface):

1. **Textarea** with a visible label "Jūsų frazė" (visible text, not only `aria-label`), placeholder "Įveskite frazę…", `maxlength="220"`, 3 visible rows (grows no further; scrolls inside), 1rem, `autocapitalize="sentences"`, `spellcheck="false"`, `enterkeyhint="done"`. Enter inserts a newline (no submit). Newlines are turned into spaces when generating.
2. **Counter** "n / 220" under the textarea, right-aligned. It is associated through `aria-describedby`. At 220 it also shows the text "Pasiekta riba." (not colour alone). It is not live.
3. **PALEISTI** button (full LCD width on narrow LCDs, 32 px or taller).
4. **Status / progress area** (`min-height` reserved so the layout does not jump): one state at a time, see the table.
5. **Credit** in small print: "Balsas: Coqui TTS (lt/cv/vits)". 16 px is not required for this static caption but contrast stays at least 4.5:1 and the size no smaller than 12 px; it hides first (never truncates) if the LCD is very short.
6. **Bottom strip:** Vyras / Moteris toggle (same as phrase mode; no search).

If the LCD is too short for all of this, the panel scrolls inside the LCD; the toggle (strip) stays fixed, the credit scrolls away first.

#### Status area states

| State                    | Trigger                                              | Panel content                                                                                                                  | PALEISTI                                   | SIŲSTI                                       | Announced (live region)                                    |
| ------------------------ | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ | -------------------------------------------- | ---------------------------------------------------------- |
| Empty text (idle)        | Open KURTI, model ready or cached, no text           | Hint line "Įveskite frazę ir spauskite PALEISTI."                                                                              | `aria-disabled`; tap: toast "Įveskite tekstą." | `aria-disabled`; tap: toast "Įveskite tekstą." | -                                                          |
| Size note + downloading  | KURTI opened, model not cached                       | "Atsisiunčiamas balsas (apie 71 MB). Tai tik pirmą kartą." + progress bar + "Atsisiunčiama: {a} iš {b} MB"                    | `aria-disabled`; tap: toast "Balsas dar atsisiunčiamas. Palaukite." | Same as PALEISTI                  | On open: "Kūrimo režimas. Pradedamas balso atsisiuntimas, apie 71 MB." |
| Preparing                | Download finished (or cached model being loaded)     | "Ruošiamas balsas…" + indeterminate bar                                                                                        | `aria-disabled`; tap: toast "Balsas dar ruošiamas. Palaukite." | Same                        | None (merged into the "ready" message)                     |
| Ready (voice)            | Model ready                                          | "Balsas paruoštas." Fades into the idle/hint line after 3 s of the panel being visible (text stays in DOM for screen readers) | Enabled when text is not empty             | Enabled when text is not empty               | "Balsas paruoštas." (once per download, also if the user is in phrase mode) |
| Generating               | PALEISTI or SIŲSTI (no cached speech)                | "Kuriama kalba…" + indeterminate bar                                                                                           | `aria-busy`; repeat taps ignored           | `aria-busy` + pulsing ring; repeat taps ignored | "Kuriama kalba." (only if it takes longer than 400 ms)     |
| Playing                  | Speech playback                                      | Play marker next to PALEISTI label; status "Grojama."                                                                          | Tap restarts                               | Enabled                                      | None (the sound itself is the feedback)                    |
| Press SIŲSTI again       | SIŲSTI generated the speech but could not share      | "Paruošta. Spauskite SIŲSTI dar kartą."                                                                                        | Enabled                                    | Enabled; the SIŲSTI key gets a **steady** (not pulsing) ring until the next tap or until the text/voice changes | Same text (toast + live)                                   |
| Unsupported browser      | No WebAssembly, no `fetch`/`Blob`/`AudioContext` etc. | "Ši naršyklė nepalaiko kalbos kūrimo. Išbandykite naujesnę." No download starts. No progress.                                  | `aria-disabled`; tap: same message in toast | `aria-disabled`; same                       | "Ši naršyklė nepalaiko kalbos kūrimo."                     |
| Download error           | Network error, wrong size, HTTP error                | "Nepavyko atsisiųsti balso. Patikrinkite ryšį." + button **"Bandyti dar kartą"** (sentence case, 32 px+, after PALEISTI in tab order). The half-downloaded data is discarded. | `aria-disabled`                            | `aria-disabled`                              | "Nepavyko atsisiųsti balso. Patikrinkite ryšį."            |
| Offline, not cached      | `navigator.onLine === false` and model not cached    | "Nėra ryšio. Balsui atsisiųsti reikia interneto." + "Bandyti dar kartą". When the browser fires `online`, the download restarts automatically and the state becomes "downloading". | `aria-disabled`                            | `aria-disabled`                              | "Nėra ryšio. Balsui atsisiųsti reikia interneto." (and "Pradedamas balso atsisiuntimas." on reconnect) |
| Offline, cached          | Offline, model in cache                              | No message. Everything works.                                                                                                  | Enabled                                    | Enabled                                      | -                                                          |
| Create-voice error       | `InferenceSession.create` or inference failed (memory) | "Šiame įrenginyje balso sukurti nepavyko." + "Bandyti dar kartą"                                                                | Enabled again after retry                  | Enabled again                                | Same text                                                  |
| Generation error         | Inference failed for this text                       | "Nepavyko sukurti kalbos. Bandykite dar kartą."                                                                                | Enabled                                    | Enabled                                      | Same text (toast + live)                                   |
| No Lithuanian characters | Text contains nothing the voice can say (e.g. only emoji or digits-only symbols) | Inline under the counter: "Tekste nėra lietuviškam balsui tinkamų simbolių." The textarea gets `aria-invalid="true"` and `aria-describedby` pointing at the message. Nothing is generated. | Stays enabled; the message clears when the text changes | Same                                         | Same text (toast + live)                                   |
| Text too long            | Paste above 220                                      | The browser truncates at `maxlength`. Message "Daugiausia 220 simbolių. Tekstas sutrumpintas." appears once under the counter and is announced. Typing at 220 just stops accepting characters; the counter reads "220 / 220 Pasiekta riba." | Enabled                                    | Enabled                                      | "Daugiausia 220 simbolių." (on paste only, not on every blocked key) |

Rules:

- Only one status line is shown at a time; priority: unsupported > errors > offline > downloading > preparing > generating > ready/idle.
- **Progress bar:** `role="progressbar"`, `aria-label="Balso atsisiuntimas"`, `aria-valuemin="0"`, `aria-valuemax="{total MB}"`, `aria-valuenow="{loaded MB}"`, `aria-valuetext="{a} iš {b} MB"`. When the total is unknown the known size (71) is used. For preparing and generating, the bar is indeterminate (no `aria-valuenow`) with a label "Ruošiamas balsas" or "Kuriama kalba". Text next to the bar repeats the numbers visibly (not colour or width alone). The bar updates at most 4 times per second. Percent changes are never sent to the live region.
- **Download starts when KURTI opens (U12).** It starts once; re-opening KURTI while a download runs just shows the current progress; leaving does not cancel. If the model is already cached, no size note is shown and nothing downloads. If Safari evicted the cache, the size note shows again and the download restarts.
- The preparing step may start right after the download finishes (frontend decides whether on a cached visit it prepares at open or at the first PALEISTI/SIŲSTI; if the latter, the first tap shows "Ruošiamas balsas…" and then continues by itself, but on iOS the first PALEISTI can then need a second tap if it takes long, same as U13). The UX requirement is only that every step is visible.
- While the voice is not ready, PALEISTI and SIŲSTI use `aria-disabled` (focusable, explain on tap), not `disabled`.
- Copy in the status area is plain text. No colour-only error cue: errors start with an alert icon (SVG, `aria-hidden`) and the message text.
- The status area is `aria-live="off"`. The announcements come only from the app-level live region (9.5), so there is no double reading.

### 5.14 Phone wireframes of KURTI states (360x740, LCD contents only)

```
Downloading                      Generating                       Press SIŲSTI again
+----------------------+         +----------------------+         +----------------------+
| Jūsų frazė           |         | Jūsų frazė           |         | Jūsų frazė           |
| [Labas, kaip sekasi?]|         | [Labas, kaip sekasi?]|         | [Labas, kaip sekasi?]|
|            19 / 220  |         |            19 / 220  |         |            19 / 220  |
| [ PALEISTI ]  (grey) |         | [ PALEISTI ] (busy)  |         | [ PALEISTI ]         |
| Atsisiunčiamas balsas|         | Kuriama kalba…       |         | Paruošta. Spauskite  |
| (apie 71 MB). Tik    |         | [~~~~>             ] |         | SIŲSTI dar kartą.    |
| pirmą kartą.         |         | Balsas: Coqui TTS... |         | Balsas: Coqui TTS... |
| 23 iš 71 MB [====>  ]|         | [ Vyras | Moteris  ] |         | [ Vyras | Moteris  ] |
| [ Vyras | Moteris  ] |         +----------------------+         +----------------------+
+----------------------+
```

(Layouts are schematic. The credit line is dropped first when space is short.)

## 6. States

| Area                    | Empty                                   | Loading                                         | Error                                                       | Success                                  | Disabled / permissions                                                    |
| ----------------------- | --------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------- |
| Phrase list             | "Nieko nerasta" (search only)           | None (catalog is bundled)                       | Not applicable                                              | Rows shown                               | -                                                                         |
| Clip playback           | -                                       | Row blinking dots after 300 ms                  | Toast "Nepavyko paleisti garso." Row not playing.           | Marker animated                          | Autoplay is not possible; plays only on tap                               |
| Clip file fetch (share) | -                                       | SIŲSTI `aria-busy`                              | Toast "Nepavyko įkelti garso. Patikrinkite ryšį."           | -                                        | -                                                                         |
| Share (phrase mode)     | Toast "Pirmiausia pasirinkite frazę."   | `aria-busy`, repeat taps ignored                | See 7                                                       | See 7                                    | `aria-disabled` while nothing is selected                                 |
| KURTI panel             | "Įveskite frazę ir spauskite PALEISTI." | Downloading / preparing / generating (5.13)     | Download, create-voice, generation, no characters (5.13)    | Voice ready, playing, "Paruošta…" (5.13) | Unsupported browser: PALEISTI and SIŲSTI `aria-disabled`                  |
| Counters                | -                                       | "…"                                             | "—"                                                         | Number                                   | -                                                                         |
| Page without JS         | `<noscript>`: "Racijai reikalinga JavaScript." | -                                        | -                                                           | -                                        | -                                                                         |

Permissions: none requested (no microphone, no notifications). Sharing needs HTTPS and a user tap. Storage (OPFS / Cache Storage) is used silently for the voice model; no prompt is shown by browsers for it. If neither storage works the model is downloaded again every visit (the size note shows each time).

## 7. Share outcomes

| Outcome                                           | Trigger                                                                  | Counter       | Toast (and live message)                          | Focus                    |
| ------------------------------------------------- | ------------------------------------------------------------------------ | ------------- | ------------------------------------------------- | ------------------------ |
| **Shared**                                        | `navigator.share` resolves                                               | +1 share      | "Išsiųsta."                                       | Back on SIŲSTI           |
| **Downloaded**                                    | `canShare` false or share unsupported; file downloaded                   | +1 share      | "Atsisiųsta – pridėkite failą prie žinutės."      | Stays on SIŲSTI          |
| **Cancelled**                                     | `AbortError`                                                             | none          | none (silent)                                     | Back on SIŲSTI           |
| **Blocked (gesture lost)**                        | `NotAllowedError`                                                        | none          | "Bandykite dar kartą."                            | Stays on SIŲSTI          |
| **Error (any other)**                             | Other exception                                                          | none          | "Nepavyko išsiųsti. Bandykite dar kartą."         | Stays on SIŲSTI          |
| **Clip could not be fetched**                     | Prefetch / fetch failed (phrase mode)                                    | none          | "Nepavyko įkelti garso. Patikrinkite ryšį."       | Stays on SIŲSTI          |
| **Nothing selected**                              | Tap with no selection (phrase mode)                                      | none          | "Pirmiausia pasirinkite frazę."                   | Stays on SIŲSTI          |
| **Empty text**                                    | Tap with empty text (KURTI mode)                                         | none          | "Įveskite tekstą."                                | Stays on SIŲSTI          |
| **Speech generated, share needs another tap**     | KURTI mode, no cached speech for (text, voice)                           | none          | "Paruošta. Spauskite SIŲSTI dar kartą."           | Stays on SIŲSTI          |

Notes for the frontend:

- Phrase mode: the clip is prefetched when a row is selected, so `share()` runs inside the tap. If the user taps SIŲSTI before the prefetch is ready, wait for it and share; if that ends in `NotAllowedError`, show "Bandykite dar kartą." (the second tap works).
- KURTI mode: share synchronously in the tap when the speech is cached (U13, legacy-radio L10). Never call `share()` after a long await.
- Share only the file and `title` (the phrase label or the typed text, cut to 60 characters); leave out `text`.
- File names: `racija-<id>.mp3` (`audio/mpeg`); `racija-<slug>-<voice>.wav` (`audio/wav`).

## 8. Copy (all Lithuanian UI text)

Copy rules: short sentences with a full stop (messages), UPPERCASE only for radio keys and PALEISTI, "jūs" form (imperative plural: "Pasirinkite", "Įveskite", "Bandykite", "Palaukite") throughout, no exclamation marks, no emoji. The legacy copy was in the "tu" form ("Įvesk frazę…", "Įvesk tekstą", "bandyk mobiliajame naršyklėje"); every such string is converted below.

| Key                          | Text                                                         | Where / notes                                                                                   |
| ---------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| page title                   | Racija – Kelyje 2                                            | `<title>`                                                                                       |
| h1 (logo accessible name)    | RACIJA                                                       | Visually hidden `h1` over the bitmap logo                                                       |
| radio region label           | Racija                                                       | `role="group"` `aria-label`                                                                     |
| ~~btn.search~~               | ~~PAIEŠKA~~                                                  | **Removed** (legacy-radio)                                                                      |
| ~~btn.accept (+ sr suffixes)~~ | ~~PRIIMTI, groti / sustabdyti~~                            | **Removed** (legacy-radio)                                                                      |
| btn.create                   | KURTI                                                        | Pill, phrase mode                                                                               |
| btn.back                     | GARSAI                                                       | Pill, KURTI mode                                                                                |
| btn.share                    | SIŲSTI                                                       | Round key, both modes                                                                           |
| btn.play                     | PALEISTI                                                     | KURTI panel                                                                                     |
| btn.play.sr.playing          | , grojama                                                    | Hidden suffix while speech plays                                                                |
| btn.retry                    | Bandyti dar kartą                                            | Download and create-voice errors                                                                |
| voice.group                  | Balsas                                                       | `aria-label` of the toggle group (legacy: "Kalbėtojo lytis", replaced for consistency)         |
| voice.male                   | Vyras                                                        |                                                                                                 |
| voice.female                 | Moteris                                                      |                                                                                                 |
| list.label                   | Frazių sąrašas                                               | `aria-label` of the listbox                                                                     |
| row.sr.playing               | , grojama                                                    | Hidden suffix on the playing row                                                                |
| ~~count~~                    | ~~Įrašų: {n}~~                                               | **Removed from the LCD**; kept only as live text `live.results`                                |
| search.label                 | Ieškoti įrašų                                                | `aria-label` of the field                                                                       |
| search.placeholder           | Ieškoti…                                                     |                                                                                                 |
| search.clear                 | Išvalyti paiešką                                             | `aria-label` of "×"                                                                             |
| search.empty                 | Nieko nerasta                                                | List area when 0 results                                                                        |
| tts.label                    | Jūsų frazė                                                   | Visible label of the textarea (legacy had only a placeholder)                                   |
| tts.placeholder              | Įveskite frazę…                                              | Legacy "Įvesk frazę…" converted                                                                 |
| tts.counter                  | {n} / 220                                                    | Under the textarea                                                                              |
| tts.counter.max              | Pasiekta riba.                                               | Appended at 220                                                                                 |
| tts.hint                     | Įveskite frazę ir spauskite PALEISTI.                        | Idle, empty text                                                                                |
| tts.size-note                | Atsisiunčiamas balsas (apie 71 MB). Tai tik pirmą kartą.     | Shown while the model downloads (download starts on opening KURTI)                              |
| tts.progress.label           | Balso atsisiuntimas                                          | `aria-label` of the progress bar                                                                |
| tts.progress                 | Atsisiunčiama: {a} iš {b} MB                                 | Next to the bar; `aria-valuetext` is "{a} iš {b} MB"                                            |
| tts.preparing                | Ruošiamas balsas…                                            |                                                                                                 |
| tts.generating               | Kuriama kalba…                                               | Visible form. Live form has a full stop.                                                        |
| tts.voice-ready              | Balsas paruoštas.                                            | Live + status area                                                                              |
| tts.playing                  | Grojama.                                                     | Status area only                                                                                |
| tts.ready-share              | Paruošta. Spauskite SIŲSTI dar kartą.                        | Toast + live + status area                                                                      |
| tts.credit                   | Balsas: Coqui TTS (lt/cv/vits)                               | Small print in KURTI mode                                                                       |
| tts.wait-download            | Balsas dar atsisiunčiamas. Palaukite.                        | Toast when PALEISTI/SIŲSTI is tapped during download                                            |
| tts.wait-prepare             | Balsas dar ruošiamas. Palaukite.                             | Toast when tapped during preparing                                                              |
| tts.empty                    | Įveskite tekstą.                                             | Toast on PALEISTI/SIŲSTI with empty text (legacy "Įvesk tekstą")                                |
| tts.too-long                 | Daugiausia 220 simbolių. Tekstas sutrumpintas.               | After a paste above the limit                                                                   |
| tts.too-long.live            | Daugiausia 220 simbolių.                                     |                                                                                                 |
| tts.no-chars                 | Tekste nėra lietuviškam balsui tinkamų simbolių.             | Legacy "Tekste nėra palaikomų simbolių lietuviškam balsui", reworded                            |
| tts.unsupported              | Ši naršyklė nepalaiko kalbos kūrimo. Išbandykite naujesnę.   | Status area + toast on tap                                                                      |
| tts.download-error           | Nepavyko atsisiųsti balso. Patikrinkite ryšį.                | Status area (no toast)                                                                          |
| tts.offline                  | Nėra ryšio. Balsui atsisiųsti reikia interneto.              | Status area (no toast)                                                                          |
| tts.create-error             | Šiame įrenginyje balso sukurti nepavyko.                     | Status area                                                                                     |
| tts.generate-error           | Nepavyko sukurti kalbos. Bandykite dar kartą.                | Toast + live (legacy "Nepavyko sugeneruoti garso")                                              |
| mode.create.live             | Kūrimo režimas.                                              | Live, on opening KURTI                                                                          |
| mode.create.live.download    | Kūrimo režimas. Pradedamas balso atsisiuntimas, apie 71 MB.  | Live, on opening KURTI when the download starts                                                 |
| mode.sounds.live             | Frazių sąrašas. Įrašų: {n}.                                  | Live, on returning                                                                              |
| tts.download-resume.live     | Pradedamas balso atsisiuntimas.                              | Live, after reconnecting                                                                        |
| counter.plays                | Paleista: {n}                                                | {n} = number, "…" or "—"                                                                        |
| counter.shares               | Išsiųsta: {n}                                                | Joined with " · "                                                                               |
| hint.sound                   | Įjunkite garsą                                               | Touch devices, until the first play                                                             |
| footer.note                  | Fanų projektas, nesusijęs su žaidimo kūrėjais                | `<footer>`; no full stop                                                                        |
| msg.select-first             | Pirmiausia pasirinkite frazę.                                | Toast + live                                                                                    |
| msg.shared                   | Išsiųsta.                                                    | Toast + live                                                                                    |
| msg.downloaded               | Atsisiųsta – pridėkite failą prie žinutės.                   | Toast + live                                                                                    |
| msg.share-retry              | Bandykite dar kartą.                                         | `NotAllowedError`                                                                               |
| msg.share-error              | Nepavyko išsiųsti. Bandykite dar kartą.                      | Any other share error                                                                           |
| msg.fetch-error              | Nepavyko įkelti garso. Patikrinkite ryšį.                    | Clip fetch failed                                                                               |
| msg.play-error               | Nepavyko paleisti garso.                                     | `audio.play()` rejected / media error (legacy had no full stop)                                 |
| live.stopped                 | Sustabdyta.                                                  | Only when a mode switch stops a sound? **No: not announced** (see 9.5). Key kept for the stop-by-voice-switch if the frontend wants it; default is silence. |
| live.results                 | Įrašų: {n}                                                   | After search / voice change                                                                     |
| live.no-results              | Nieko nerasta.                                               |                                                                                                 |
| live.voice                   | Balsas: {Vyras\|Moteris}. Įrašų: {n}.                         | After a voice switch in phrase mode                                                             |
| live.voice.create            | Balsas: {Vyras\|Moteris}.                                    | After a voice switch in KURTI mode (no count)                                                   |
| noscript                     | Racijai reikalinga JavaScript.                               | `<noscript>`                                                                                    |

Legacy strings dropped on purpose: "Kraunama…", "Dar nėra garsų.", "Nėra garsų šiai lyčiai." (the catalog is bundled, never loading or empty), "Dalinimasis nepavyko – bandyk mobiliajame naršyklėje" (desktop downloads instead).

## 9. Accessibility

### 9.1 ARIA pattern: listbox (decision, unchanged)

**Chosen: `role="listbox"` with `role="option"` rows and roving focus** (real DOM focus moves, `tabindex="0"` on the current option, `-1` on the others), not 76 tab-stop buttons.

Why: one Tab stop for a 39-row list (WCAG 2.4.3, efficiency); rows have no nested interactive content; single selection matches the model; screen readers announce "N of M". Real focus rather than `aria-activedescendant` because iOS VoiceOver and TalkBack handle it more reliably.

Risk: some mobile screen readers announce listbox semantics less richly. The tester checks (section 12). Fallback: a `<ul>` of `<button aria-pressed>` and a "skip list" link, same visual design.

Details:

- Listbox: `role="listbox"`, `aria-label="Frazių sąrašas"`, `aria-orientation="vertical"`. No `aria-multiselectable`.
- Option: `role="option"`, `aria-selected="true|false"`. The name is the row text; the playing row adds a hidden ", grojama".
- Selection does **not** follow focus: arrows only move focus; Enter / Space select and play.
- The empty state ("Nieko nerasta") is a sibling `<p>` outside the listbox; the listbox is removed when there are 0 rows.
- The search field and strip are not inside the listbox. The listbox has no `aria-controls` from the search field any more (legacy-radio: no `SEARCH_ID`/`aria-controls`).

### 9.2 Keyboard

Tab order follows the visual and DOM order.

**Phrase mode:**

1. Listbox (one stop, lands on the selected option, or the first option if none)
2. Search field
3. "×" (only when the field has text)
4. Vyras
5. Moteris
6. KURTI (pill)
7. SIŲSTI (round key)

**KURTI mode:**

1. Textarea
2. PALEISTI
3. "Bandyti dar kartą" (only in the two error states that show it)
4. Vyras
5. Moteris
6. GARSAI (pill)
7. SIŲSTI

~~Old order: search field - ×  - listbox - Vyras - Moteris - PAIEŠKA - PRIIMTI - SIŲSTI.~~ **SUPERSEDED.**

The status area, progress bar, credit and counter are not tab stops. The progress bar is read when the screen-reader user explores to it.

| Key                           | Where           | Effect                                                                      |
| ----------------------------- | --------------- | --------------------------------------------------------------------------- |
| Up / Down                     | Listbox         | Move focus one row (no wrap), scrolls it into view                          |
| Home / End                    | Listbox         | First / last row                                                            |
| PageUp / PageDown             | Listbox         | Move focus about one screen of rows                                         |
| Enter / Space                 | Option          | Select and play (Space must not scroll the page: `preventDefault`)          |
| Enter / Space                 | Buttons         | Activate                                                                    |
| Enter                         | Search field    | Focus the first visible row (keyboard closes on touch), no sound            |
| Esc                           | Search field or "×" | Clear the text; focus stays in the field. No effect when already empty |
| Enter                         | Textarea        | New line (no submit)                                                        |
| Tab / Shift+Tab               | Everywhere      | Standard. No keyboard traps; no custom shortcuts. Esc does nothing elsewhere. |

The first option that receives Tab focus is the selected one, or the first row when there is none.

### 9.3 Focus management

- **Mode switch:** see 5.12 (keyboard/screen reader: move to the textarea / listbox; touch: stay on the pill).
- **Voice switch:** focus stays on the pressed segment. The selected row, if kept, is scrolled into view but not focused.
- **Filter results change** while typing: focus stays in the field. If the row that holds the roving `tabindex="0"` disappears, move the tab stop (not focus) to the first visible row.
- **"×" activation or Esc:** focus ends in the search field.
- **Retry button** (download / create-voice error): after activation, focus moves to PALEISTI (the retry button is removed from the DOM; focus must not fall to `body`). The status area change is announced through the live region.
- **Share sheet closes** (any outcome): the browser returns focus to SIŲSTI; verify and call `focus()` if it does not.
- **Toast:** never takes focus.
- **Focus indicator:** visible on every control, 3 px on the two keys (legacy-radio L4), at least 2 px elsewhere, contrast at least 3:1 against both neighbours. The ring is not clipped by the radio's `overflow: hidden` (the key rings sit over the bitmap, which has transparent margins). The ring on the pill and round key must be visible against the bitmap faces.
- **Target size:** keys far above 44 px. ~~Rows and buttons at least 44x44 CSS px.~~ **SUPERSEDED (L6, U15): LCD rows, strip controls, PALEISTI and the retry button are at least 32 px tall; the "×" and toggle segments have a hit area of at least 24x24 px and 32 px tall (WCAG 2.5.8 AA).**

### 9.4 Semantics and landmarks

- `<main>` wraps the radio, hint and counters. `<footer>` wraps the note. One `h1` (the hidden "RACIJA" over the bitmap logo; it is visually hidden but not `display:none`).
- Voice toggle: `<div role="group" aria-label="Balsas">` with two `<button aria-pressed>`.
- Pill KURTI/GARSAI: a plain `<button>`; the name is the visible text (label in name, 2.5.3). Its visible text is exactly KURTI or GARSAI.
- SIŲSTI and PALEISTI when not actionable: `aria-disabled="true"` (not `disabled`); activation shows the message. While busy: `aria-busy="true"`.
- Textarea: a real `<label for>` with the visible text "Jūsų frazė"; `aria-describedby` points to the counter (and to the "no characters" message when shown); `aria-invalid="true"` only for the no-characters case.
- Progress: `role="progressbar"` with the attributes in 5.13. The status text next to it is a normal paragraph.
- Decorative graphics (pixel scene canvas, bitmap images with `alt=""`, key pulse ring, speaker icon, play marker, alert icon) are `aria-hidden`. The three bitmap `<img>` slices have empty alt.
- `lang="lt"` on `<html>`. The credit "Coqui TTS (lt/cv/vits)" is a proper name, no `lang` change needed.

### 9.5 Live region (single, app-level)

One visually hidden `<div role="status" aria-live="polite" aria-atomic="true">`, always in the DOM, text replaced on each message (clear it first, then set it on the next frame, so a repeated message is re-announced).

| Event                                              | Announcement                                              | Why / when not                                                                                           |
| -------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Row activated (play starts)                        | None                                                      | The clip is the feedback.                                                                                |
| Clip ends / stops by a switch                      | None                                                      | Noise.                                                                                                   |
| Search text changes                                | "Įrašų: {n}" or "Nieko nerasta."                          | Debounced by 500 ms after the last keystroke.                                                            |
| Voice switch (phrase mode)                         | "Balsas: Moteris. Įrašų: 39."                             | Immediately.                                                                                             |
| Voice switch (KURTI mode)                          | "Balsas: Moteris."                                        | Immediately.                                                                                             |
| Open KURTI, download starts                        | "Kūrimo režimas. Pradedamas balso atsisiuntimas, apie 71 MB." | One message instead of two.                                                                          |
| Open KURTI, model cached or already downloading    | "Kūrimo režimas."                                         | A running download is not re-announced.                                                                  |
| Back to GARSAI                                     | "Frazių sąrašas. Įrašų: {n}."                             |                                                                                                          |
| Download progress                                  | **None** (the progress bar holds the value)               | Percent changes would flood the region.                                                                  |
| Preparing                                          | None                                                      | Merged into the "ready" message.                                                                         |
| Download + prepare finished                        | "Balsas paruoštas."                                       | Once, also while the user is in phrase mode.                                                             |
| Download / offline / unsupported / create error    | The error text                                            | Once per state change.                                                                                   |
| Reconnect restarts the download                    | "Pradedamas balso atsisiuntimas."                         |                                                                                                          |
| Generating longer than 400 ms                      | "Kuriama kalba."                                          | Short runs stay silent.                                                                                  |
| Speech starts playing                              | None                                                      | The sound is the feedback; no talk-over.                                                                 |
| SIŲSTI generated speech, needs a second tap        | "Paruošta. Spauskite SIŲSTI dar kartą."                   | Same as toast.                                                                                           |
| Empty text / wait messages / no characters / too long | The toast text                                         |                                                                                                          |
| Share / error messages                             | Same text as the toast                                    | See section 7.                                                                                           |
| Counter changes                                    | None                                                      |                                                                                                          |
| Nothing selected                                   | "Pirmiausia pasirinkite frazę."                           |                                                                                                          |

~~Old rows "PRIIMTI starts / stops a clip".~~ **SUPERSEDED (no PRIIMTI).**

### 9.6 Contrast, zoom, motion

- Text contrast at least 4.5:1: LCD ink on the overlay LCD surface (the overlay paints its own surface, so this never depends on the bitmap), inverted selected row, the key labels on the bitmap faces, the status and credit text, the hint, counters and footer note on their scrim. UI component boundaries, the progress bar and the focus ring at least 3:1.
- The LCD font (Doto) covers `ąčęėįšųūž ĄČĘĖĮŠŲŪŽ`. Minimum LCD text size 1rem (16 px); `rem`, not `px` or `cqw`, so browser zoom and text zoom work. The credit may be 0.75rem.
- Reflow (1.4.10): no horizontal scroll at 320 px wide; no content lost at 200% text zoom. The page scrolls vertically if the shell is limited to its 300 px minimum width.
- Orientation: both work; do not lock orientation.
- Motion: `prefers-reduced-motion: reduce` gives a static pixel scene, static play marker, no pulsing ring (a static ring is used for "busy"), indeterminate bars shown as a static striped bar, instant scrolling, no mode fade, no toast animation. Nothing flashes more than 3 times per second.
- No timing limits other than the toast (also in the live region; errors stay 10 s).
- Colour is never the only cue.

## 10. Implementation notes for frontend (UX-relevant)

- Audio: `play()` is called synchronously inside the click handler (D9). `AudioPlayerService.unlock()` runs synchronously in PALEISTI (L10) before any await. One audio element: only one sound at a time.
- A play is counted once when playback starts (a restart counts again; a speech preview counts).
- Remember the voice in `localStorage` (`racija-voice`, `vyras` / `moteris`); ignore storage errors.
- Search normalisation as in D12; trim whitespace; empty or whitespace-only shows all rows.
- Feature-detect `navigator.canShare({ files })` with the real `File` before choosing share or download.
- No `alert`, `confirm` or modal anywhere.
- The download starts in the KURTI-open handler, but must be owned by `TtsService` (not by the panel component), so leaving KURTI never cancels it. The service state drives both the panel and the live-region messages.
- Do not trigger a model download or import `onnxruntime-web` before KURTI is opened (initial load stays small; L12).
- Detect "unsupported" without downloading anything (WebAssembly, `AudioContext`, `fetch`, `Blob`); do it before starting the download.

## 11. Edge cases

- **Rapid taps on different rows:** the last tap wins; never more than one sound audible.
- **Double tap on SIŲSTI / PALEISTI:** ignored while `aria-busy`.
- **Voice switch while sharing:** the share continues with what was chosen at tap time.
- **Very long phrase on 320 px:** wraps to up to 3 lines; the row grows.
- **Holding a key on a row:** ignore `event.repeat` on Enter.
- **Back-forward cache / tab revisit:** state is kept; the UI follows the audio element's `pause` / `ended` events. A download interrupted by the browser while the tab was in the background shows the download error with retry.
- **Counters failing while the user shares:** the share still succeeds.
- **Text with line breaks or only spaces:** spaces/newlines collapse; whitespace-only counts as empty.
- **Text with digits or Latin letters outside Lithuanian:** the voice says what it can; only text with nothing sayable triggers "no characters".
- **Mode switch during a share:** the share continues; the toast appears in either mode.
- **Download completes while the user is in phrase mode:** live "Balsas paruoštas."; nothing visible changes in the list.
- **Cache storage full or blocked:** the speech still works this visit; the model is downloaded again next visit (size note shows again). No error is shown for the failed cache write.
- **Old iPhones reloading the tab on memory pressure:** if the page reloads during preparing, KURTI starts over from the cached file (if the file was fully written) or from the download.

## 12. Manual test checklist (for the tester, legacy-radio task 13)

Mark each item pass / fail with device, OS and browser version.

### Core, on every device

- [ ] First load: nothing plays, no row selected, Vyras active, the search field and toggle are visible at the bottom of the LCD, counters show numbers or "—". Network panel: no `onnxruntime`, `.wasm` or huggingface.co request.
- [ ] Radio is the transparent legacy bitmap over the animated scene; no black box, no star mark, no dark fringe.
- [ ] Tap a row: selected and plays on the first tap, marker shows. Clip end: row stays selected.
- [ ] Tap another row during playback: the first stops, the second plays. Tap the playing row: restarts.
- [ ] SIŲSTI with no selection shows "Pirmiausia pasirinkite frazę." and shares nothing.
- [ ] Voice switch: list changes; the matching phrase stays selected (no sound); a playing clip stops. The two "Tuoj jau sustabdykite..." clips are in both voices.
- [ ] Numbered variants: "Pamerk (1)" / "(2)" and "Rinkis (1)" / "(2)" in both voices, only those numbered.
- [ ] Search (always visible): "sansu" finds "šansų"; uppercase works; "zzz" shows "Nieko nerasta"; "×" appears only with text and clears it with focus staying in the field; Esc clears and focus stays; Enter moves focus to the first row.
- [ ] Search that hides the selected clip clears the selection; a playing clip finishes.
- [ ] Bottom strip: two lines on a phone width, one line on desktop; the strip never overlaps rows.
- [ ] Pill reads KURTI in phrase mode and GARSAI in KURTI mode; the query is still there after returning.
- [ ] Counters: a play +1 "Paleista", a share/download +1 "Išsiųsta", a cancelled share +0. Reload: persists. Block `countapi.mileshilliard.com`: "—", app still works.
- [ ] Footer note and the touch hint are readable over the scene; the hint disappears after the first play.
- [ ] Layout: no page scroll at 412x915 and 1440x900; at 360x740 at least 4 rows plus the strip are visible; the LCD is never shorter than 1.0x or taller than 1.4x of the legacy LCD.

### KURTI, on every device

- [ ] Open KURTI (first time, empty cache): the download starts immediately; the note "Atsisiunčiamas balsas (apie 71 MB). Tai tik pirmą kartą." and a moving progress bar with "a iš b MB" are visible.
- [ ] While downloading: PALEISTI and SIŲSTI explain "Balsas dar atsisiunčiamas. Palaukite."; typing works.
- [ ] Leave KURTI (GARSAI) during the download and wait: "Balsas paruoštas." is announced; return to KURTI: ready, no restart of the download.
- [ ] After "Balsas paruoštas.": empty text + PALEISTI shows "Įveskite tekstą."
- [ ] Type "Labas, kaip sekasi?" and PALEISTI: "Kuriama kalba…", then speech plays. PALEISTI again: replays (restarts). Counter "Paleista" +1 each.
- [ ] Voice switch Moteris/Vyras changes the speech voice (clearly different pitch).
- [ ] 220-character limit: typing stops at 220, counter reads "220 / 220 Pasiekta riba."; pasting 300 characters truncates and shows "Daugiausia 220 simbolių. Tekstas sutrumpintas."
- [ ] Only emoji (for example "😀😀"): "Tekste nėra lietuviškam balsui tinkamų simbolių." Nothing plays.
- [ ] Text with ąčęėįšųūž plays without mispronounced gaps.
- [ ] Edit text after PALEISTI, tap SIŲSTI: "Paruošta. Spauskite SIŲSTI dar kartą."; second tap opens the share sheet (or downloads on desktop). File is `racija-<slug>-<voice>.wav` and plays.
- [ ] PALEISTI first, then SIŲSTI without edits: share opens on the first SIŲSTI tap.
- [ ] Reload the page, open KURTI: no network download (model from cache; check the Network panel and record which cache was used: OPFS or Cache Storage). The size note does not show.
- [ ] Offline (dev tools), cached: KURTI works fully. Offline, cleared cache: "Nėra ryšio. Balsui atsisiųsti reikia interneto." with "Bandyti dar kartą"; going online restarts the download.
- [ ] Interrupt the download (offline during download): "Nepavyko atsisiųsti balso. Patikrinkite ryšį." + retry; retry works; no half-written file is used (reload after a failed attempt starts a clean download).
- [ ] Unsupported browser (for example an old browser or WebAssembly disabled): "Ši naršyklė nepalaiko kalbos kūrimo. Išbandykite naujesnę." No download starts.
- [ ] Mode switch with a sound playing: the sound stops.
- [ ] Credit "Balsas: Coqui TTS (lt/cv/vits)" visible in KURTI mode and readable.

### iOS Safari (iPhone, silent switch on and off)

- [ ] Silent switch on: the hint is visible; with the switch off the sound plays.
- [ ] Phrase share: tap SIŲSTI on the first try; the sheet opens with `racija-<id>.mp3`; Messenger plays it.
- [ ] Tap SIŲSTI immediately after selecting a row (prefetch race): either the sheet opens or "Bandykite dar kartą." appears, and the second tap works.
- [ ] Focusing the search field or the textarea does not zoom the page. The keyboard does not hide the focused field.
- [ ] Opening KURTI by touch does not open the keyboard until the textarea is tapped.
- [ ] KURTI first download over Wi-Fi, then reload: cache hit (record OPFS or Cache Storage).
- [ ] PALEISTI plays audio on the first tap, also the first time after the download (the unlock works).
- [ ] SIŲSTI with new text: first tap shows "Paruošta. Spauskite SIŲSTI dar kartą."; second tap opens the share sheet. Send the WAV to Messenger and check that it plays inline.
- [ ] Memory: generate 5 phrases in a row without reloading; record whether the tab reloads. Check the "Šiame įrenginyje balso sukurti nepavyko." state if it appears.
- [ ] Safe areas respected in portrait and landscape.

### Android Chrome

- [ ] Share sheet opens with the MP3; Messenger receives it.
- [ ] Same KURTI checks as iOS (download, cache, generate, two-tap rule not required but acceptable, share the WAV to Messenger and check playback).
- [ ] Media volume muted: the hint is shown; unmuted: sound plays.
- [ ] Back gesture does not break the page; the keyboard resizes the layout and the field stays visible.
- [ ] Data saver / metered connection: note that the KURTI download starts without asking (U12) and shows the size.

### Desktop (Chrome, Firefox, Safari; Windows and macOS if available)

- [ ] SIŲSTI shares (Chrome) or downloads (Firefox) and the toast matches the outcome; the downloaded MP3 / WAV plays.
- [ ] KURTI: download, cache hit after reload, generate, play, download of the WAV. Record how long the page freezes while generating a 220-character text.
- [ ] No sound hint (fine pointer).
- [ ] Hover and focus states visible; cursor pointer on controls.
- [ ] 1440x900: the radio is centred, the LCD is at its 1.4x cap, the scene fills the window.

### Keyboard only (desktop)

- [ ] Phrase mode tab order: listbox - search - "×" (only when text) - Vyras - Moteris - KURTI - SIŲSTI; Shift+Tab reverses; no traps.
- [ ] KURTI mode tab order: textarea - PALEISTI - (retry, only in the two error states) - Vyras - Moteris - GARSAI - SIŲSTI.
- [ ] Enter on KURTI moves focus into the textarea; Enter on GARSAI moves focus to the selected option (or the first option, or the search field when the list is empty).
- [ ] Listbox: Up/Down/Home/End/PageUp/PageDown move focus; Enter and Space select and play; the page does not scroll on Space; holding Enter does not retrigger.
- [ ] Esc in the search field clears it and keeps focus; Esc elsewhere does nothing.
- [ ] After "Bandyti dar kartą", focus lands on PALEISTI.
- [ ] The focus ring is visible on every control, including the selected row, the pill and the round key over the bitmap.

### Reduced motion

- [ ] With "reduce motion": static scene frame, static play marker, no pulsing ring on SIŲSTI (a static busy state instead), static progress stripes, instant scrolling, no toast or mode animation.
- [ ] Without it: the scene animates at roughly 12 fps and pauses in a hidden tab.

### 200% zoom and small screens

- [ ] Browser zoom 200% on desktop and text size 200% on Android: no horizontal scroll, no clipped labels on KURTI / GARSAI / SIŲSTI (they may overflow the bitmap face but stay readable), rows wrap, the strip wraps to two lines.
- [ ] 320 px wide viewport: layout holds; the page may scroll vertically.
- [ ] Landscape phone (about 740x360): the page scrolls; the LCD list shows at least 2 rows; the keys are reachable.

### Screen readers

- [ ] VoiceOver (iOS, Safari): the listbox is announced with its label; options read as "Pamerk (1), selected, 5 of 39" or similar; double-tap plays it; the playing row reads ", grojama".
- [ ] VoiceOver: toggle reads "Balsas, group; Vyras, toggle button, on"; switching announces "Balsas: Moteris. Įrašų: 39."
- [ ] VoiceOver: search results count is announced once after typing stops.
- [ ] VoiceOver / TalkBack: activating KURTI announces "Kūrimo režimas. Pradedamas balso atsisiuntimas, apie 71 MB." and focus moves into the textarea; the textarea reads "Jūsų frazė" and the counter.
- [ ] The progress bar reads "Balso atsisiuntimas, a iš b MB"; percent changes are not announced during the download; "Balsas paruoštas." is announced at the end.
- [ ] "Paruošta. Spauskite SIŲSTI dar kartą." and the error messages are announced exactly once.
- [ ] TalkBack (Android, Chrome): same checks; if options are hard to use, report it (fallback in 9.1).
- [ ] NVDA or JAWS with Firefox/Chrome: listbox navigation works in focus mode; messages are announced; the clip is not talked over on activation.
- [ ] axe reports no violations in phrase mode, in KURTI mode and in the downloading state; Lighthouse accessibility is 100; contrast of the hint, counters and footer note is at least 4.5:1 over the animated scene at several moments.
