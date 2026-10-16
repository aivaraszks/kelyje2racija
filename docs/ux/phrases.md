# RACIJA phrase list

Status: **approved by the user at checkpoint A, 2026-10-16**. The catalog (`src/app/core/sounds/sound-catalog.ts`, task 7) is built from the **New text** column after approval.

## How the texts were derived

- **Old** = the titles on the old site (`kelyje/src/assets/sounds.json`), from faster-whisper `small`.
- **large-v3** = a new transcription with faster-whisper `large-v3`, Lithuanian, with a short domain hint (`tools/transcribe-phrases.py` → `tools/transcripts/large-v3.json`, gitignored).
- Each phrase exists in a male and a female recording, so the two recordings cross-check each other. Grammar and the game's context (a truck driver talking over the radio with the boss, bandits and police) settled the rest.
- Both voices of a phrase get the same text and punctuation. The file ids do not change, even where the text did (for example `priekyje-*` now reads "Pinigus į priekį!").

**Confidence:** high = both recordings and grammar agree; medium = one small doubt, the text is the best reading; **check** = sources still disagree, please listen.

## Phrases

| Phrase id (files `-vyras`/`-moteris` unless noted) | Old title | large-v3 (vyras / moteris) | New text | Confidence |
| --- | --- | --- | --- | --- |
| `atleisk-nepatampysiu` | Atleisk, nepatampysiu. | Atleisk, nepatemsiu. / Atleisk, nepatempsiu. | **Atleisk, nepatempsiu.** | medium |
| `bandetai-lipant-kuo-nors-pagelbek-virsininke` | Bandėtai, lipant, kuo nors pagelbėk, viršininke. | Banditai lipant kulnų, pagelbėk viršininkę. / (same) | **Banditai lipa ant kulnų, pagelbėk, viršininke!** | high |
| `be-sansu` | Be šansų! | Be šansų. / Be šansų! | **Be šansų!** | high |
| `brangoka-virsininke` | Brangoka, viršininke. | Brangoka, viršininkė. / (same) | **Brangoka, viršininke.** | high |
| `gal-susitarsim-virsininke` | Gal susitarsim, viršininke? | Gal susitarsim viršininkę? / (same) | **Gal susitarsim, viršininke?** | high |
| `gerai-kita-karta` | Gerai, kitą kartą! / … kartą. | Gerai, kita karta. / (same) | **Gerai, kitą kartą.** | high |
| `iki-kito-karto` | Iki kito karto? / … karto. | Iki kito karto. / (same) | **Iki kito karto.** | high |
| `iki-pasimatimo` | Iki pasimatimo! / … pasimatimo. | Iki pasimatymo. / (same) | **Iki pasimatymo.** | high |
| `imusyta` | Įmušyta. | Imo šitą. / Imušyta. | **Imu šitą.** | user-confirmed |
| `ir-is-cia-po-to` | Ir iš čia po to. | Ar į šio pabaiga? / Ryšio pabaiga. | **Ryšio pabaiga.** | medium |
| `ir-neprasyk` | Ir neprašyk. | Ir neprasik. / Ir neprašyk. | **Ir neprašyk.** | high |
| `kas-nutiko` | Kas nutiko? | Kas nutiko? / (same) | **Kas nutiko?** | high |
| `klausau` | Klausau! | Klausau. / Klausau! | **Klausau!** | high |
| `klok-babkes` | Klok babkes! | Klokbapkas / Klok babkes! | **Klok babkes!** | high |
| `koreke` | Korekė! | Kuo reikia? / Ko reikia? | **Ko reikia?** | medium |
| `labai-daug-nori` | Labai daug nori. | Labai daug nori. / Labai daug noriu. | **Labai daug nori.** | high |
| `mes-krovini-susitarsim` | Mes krovinį susitarsim. | Mes krovinį susitarsim. / (same) | **Mes krovinį susitarsim.** | medium |
| `mokek-didvyri` | Mokėk, didvyri! | Mokek didbyri. / Mokėgdi dviri. | **Mokėk, didvyri!** | user-confirmed |
| `mokek` | Mokėk! | Mokek / Mokėk. | **Mokėk!** | high |
| `nesijaudink` | Nesijaudink. | Nesimsio. / Nesimsiu. | **Nesiimsiu.** | user-confirmed |
| `nori-pakeisti-ratus` | Nori pakeisti ratus? | Noriu pakeisti ratus. / (same) | **Noriu pakeisti ratus.** | high |
| `noriu-uzsakyti-masina` | Noriu užsakyti mašiną? / … mašiną. | Noriu užsakyti mašiną. / (same) | **Noriu užsakyti mašiną.** | high |
| `ok` | Ok. | OK. / OK? | **OK.** | high |
| `pamerk` (+ `-2` variants) | Pamerk. | Pamėrašk. / Pamiršk. | **Pamiršk.** | medium |
| `priekyje` | Priekyje. | Pinigus į priekį. / Pinigus į priekį! | **Pinigus į priekį!** | high |
| `problemos-su-masina-padesi` | Problemos su mašina, padėsi? | Problemo su mašina. Padėsi? / Problemos su mašina. Padėsi? | **Problemos su mašina. Padėsi?** | high |
| `rinkis` (+ `-2` variants) | Rinkis! | Rinkis / Rinkis. | **Rinkis!** | high |
| `skambink-drauge-atsiskaitysim` | Skambink, drauge, atsiskaitysim. | Staptilk drugužiai. Atsiskaitėsim. / Stebtelk, drauguži, atsiskaitysim. | **Stabtelk, drauguži, atsiskaitysim.** | medium |
| `sutarta` | Sutarta. | Sutarta. / (same) | **Sutarta.** | high |
| `sutinku` | Sutinku. | Sutinko. / Sutinku. | **Sutinku.** | high |
| `turi-problemu` | Turi problemų? | Turi problemų? / (same) | **Turi problemų?** | high |
| `tvarka` | Tvarka! | Tvarka. / Tvarka | **Tvarka!** | high |
| `vaikinai-man-nereikia-nemalonumu` | Vaikinai, man nereikia nemalonumų. | Vaikinai, man nereikia nemalonumu. / (same) | **Vaikinai, man nereikia nemalonumų.** | high |
| `verciau-papurti-kita-mano-konkurenta` | Verčiau papurti kitą mano konkurentą. / …? | Verčiau papurti kitą mano konkurentą. / Verčiau papurtikite mano konkurentą. | **Verčiau papurtyk kitą – mano konkurentą.** | medium |
| `virsininke-prispaus-konkurenta` | Viršininke, prispaus konkurentą. | Viršininkė. Prispaus konkurentą. / Viršininkė, prispausk konkurentą. | **Viršininke, prispausk konkurentą.** | high |
| `tuoj-jau-sustabdykite-automobili-arba-mes-sausime-nezinoma` (one file, voice `nezinoma`) | Tuoj jau sustabdykite automobilį arba mes šausime. | Tučtojau sustabdykite automobilį arba mes šausime. | **Tučtuojau sustabdykite automobilį arba mes šausime!** | high |
| `tuoj-jau-sustabdysite-automobili-nezinoma` (one file, voice `nezinoma`) | Tuoj jau sustabdysite automobilį? | Tuo šito jau sustabdykite automobilyje. | **Tučtuojau sustabdykite automobilį!** | medium |

Totals: 37 phrases, 76 files (35 phrases × 2 voices, plus the `-2` variants of `pamerk` and `rinkis` (4 files), plus 2 `nezinoma` files).

## User decisions (checkpoint A)

- `imusyta` → **"Imu šitą."** (user's own reading).
- `mokek-didvyri` → **"Mokėk, didvyri!"**, `nesijaudink` → **"Nesiimsiu."** (proposals accepted).
