export type Voice = 'vyras' | 'moteris';

export interface SoundEntry {
  /** Basename of the MP3 file, also used in the shared file name. */
  readonly id: string;
  /** Corrected phrase, without a gender suffix (docs/ux/phrases.md). */
  readonly text: string;
  /** `nezinoma` clips are listed under both voices. */
  readonly voice: Voice | 'nezinoma';
  /** Path relative to the base href, with no leading slash. */
  readonly file: string;
  /** 1-based number, set only when a phrase has more than one clip per voice. */
  readonly variant?: number;
}

/** Row label: the phrase text, plus " (n)" for numbered variants. */
export function soundLabel(sound: Pick<SoundEntry, 'text' | 'variant'>): string {
  return sound.variant ? `${sound.text.replace(/[.!?]+$/u, '')} (${sound.variant})` : sound.text;
}

export const SOUND_CATALOG: readonly SoundEntry[] = [
  {
    id: 'atleisk-nepatampysiu-vyras',
    text: 'Atleisk, nepatempsiu.',
    voice: 'vyras',
    file: 'sounds/atleisk-nepatampysiu-vyras.mp3',
  },
  {
    id: 'atleisk-nepatampysiu-moteris',
    text: 'Atleisk, nepatempsiu.',
    voice: 'moteris',
    file: 'sounds/atleisk-nepatampysiu-moteris.mp3',
  },
  {
    id: 'bandetai-lipant-kuo-nors-pagelbek-virsininke-vyras',
    text: 'Banditai lipa ant kulnų, pagelbėk, viršininke!',
    voice: 'vyras',
    file: 'sounds/bandetai-lipant-kuo-nors-pagelbek-virsininke-vyras.mp3',
  },
  {
    id: 'bandetai-lipant-kuo-nors-pagelbek-virsininke-moteris',
    text: 'Banditai lipa ant kulnų, pagelbėk, viršininke!',
    voice: 'moteris',
    file: 'sounds/bandetai-lipant-kuo-nors-pagelbek-virsininke-moteris.mp3',
  },
  { id: 'be-sansu-vyras', text: 'Be šansų!', voice: 'vyras', file: 'sounds/be-sansu-vyras.mp3' },
  {
    id: 'be-sansu-moteris',
    text: 'Be šansų!',
    voice: 'moteris',
    file: 'sounds/be-sansu-moteris.mp3',
  },
  {
    id: 'brangoka-virsininke-vyras',
    text: 'Brangoka, viršininke.',
    voice: 'vyras',
    file: 'sounds/brangoka-virsininke-vyras.mp3',
  },
  {
    id: 'brangoka-virsininke-moteris',
    text: 'Brangoka, viršininke.',
    voice: 'moteris',
    file: 'sounds/brangoka-virsininke-moteris.mp3',
  },
  {
    id: 'gal-susitarsim-virsininke-vyras',
    text: 'Gal susitarsim, viršininke?',
    voice: 'vyras',
    file: 'sounds/gal-susitarsim-virsininke-vyras.mp3',
  },
  {
    id: 'gal-susitarsim-virsininke-moteris',
    text: 'Gal susitarsim, viršininke?',
    voice: 'moteris',
    file: 'sounds/gal-susitarsim-virsininke-moteris.mp3',
  },
  {
    id: 'gerai-kita-karta-vyras',
    text: 'Gerai, kitą kartą.',
    voice: 'vyras',
    file: 'sounds/gerai-kita-karta-vyras.mp3',
  },
  {
    id: 'gerai-kita-karta-moteris',
    text: 'Gerai, kitą kartą.',
    voice: 'moteris',
    file: 'sounds/gerai-kita-karta-moteris.mp3',
  },
  {
    id: 'iki-kito-karto-vyras',
    text: 'Iki kito karto.',
    voice: 'vyras',
    file: 'sounds/iki-kito-karto-vyras.mp3',
  },
  {
    id: 'iki-kito-karto-moteris',
    text: 'Iki kito karto.',
    voice: 'moteris',
    file: 'sounds/iki-kito-karto-moteris.mp3',
  },
  {
    id: 'iki-pasimatimo-vyras',
    text: 'Iki pasimatymo.',
    voice: 'vyras',
    file: 'sounds/iki-pasimatimo-vyras.mp3',
  },
  {
    id: 'iki-pasimatimo-moteris',
    text: 'Iki pasimatymo.',
    voice: 'moteris',
    file: 'sounds/iki-pasimatimo-moteris.mp3',
  },
  { id: 'imusyta-vyras', text: 'Imu šitą.', voice: 'vyras', file: 'sounds/imusyta-vyras.mp3' },
  {
    id: 'imusyta-moteris',
    text: 'Imu šitą.',
    voice: 'moteris',
    file: 'sounds/imusyta-moteris.mp3',
  },
  {
    id: 'ir-is-cia-po-to-vyras',
    text: 'Ryšio pabaiga.',
    voice: 'vyras',
    file: 'sounds/ir-is-cia-po-to-vyras.mp3',
  },
  {
    id: 'ir-is-cia-po-to-moteris',
    text: 'Ryšio pabaiga.',
    voice: 'moteris',
    file: 'sounds/ir-is-cia-po-to-moteris.mp3',
  },
  {
    id: 'ir-neprasyk-vyras',
    text: 'Ir neprašyk.',
    voice: 'vyras',
    file: 'sounds/ir-neprasyk-vyras.mp3',
  },
  {
    id: 'ir-neprasyk-moteris',
    text: 'Ir neprašyk.',
    voice: 'moteris',
    file: 'sounds/ir-neprasyk-moteris.mp3',
  },
  {
    id: 'kas-nutiko-vyras',
    text: 'Kas nutiko?',
    voice: 'vyras',
    file: 'sounds/kas-nutiko-vyras.mp3',
  },
  {
    id: 'kas-nutiko-moteris',
    text: 'Kas nutiko?',
    voice: 'moteris',
    file: 'sounds/kas-nutiko-moteris.mp3',
  },
  { id: 'klausau-vyras', text: 'Klausau!', voice: 'vyras', file: 'sounds/klausau-vyras.mp3' },
  { id: 'klausau-moteris', text: 'Klausau!', voice: 'moteris', file: 'sounds/klausau-moteris.mp3' },
  {
    id: 'klok-babkes-vyras',
    text: 'Klok babkes!',
    voice: 'vyras',
    file: 'sounds/klok-babkes-vyras.mp3',
  },
  {
    id: 'klok-babkes-moteris',
    text: 'Klok babkes!',
    voice: 'moteris',
    file: 'sounds/klok-babkes-moteris.mp3',
  },
  { id: 'koreke-vyras', text: 'Ko reikia?', voice: 'vyras', file: 'sounds/koreke-vyras.mp3' },
  { id: 'koreke-moteris', text: 'Ko reikia?', voice: 'moteris', file: 'sounds/koreke-moteris.mp3' },
  {
    id: 'labai-daug-nori-vyras',
    text: 'Labai daug nori.',
    voice: 'vyras',
    file: 'sounds/labai-daug-nori-vyras.mp3',
  },
  {
    id: 'labai-daug-nori-moteris',
    text: 'Labai daug nori.',
    voice: 'moteris',
    file: 'sounds/labai-daug-nori-moteris.mp3',
  },
  {
    id: 'mes-krovini-susitarsim-vyras',
    text: 'Mes krovinį susitarsim.',
    voice: 'vyras',
    file: 'sounds/mes-krovini-susitarsim-vyras.mp3',
  },
  {
    id: 'mes-krovini-susitarsim-moteris',
    text: 'Mes krovinį susitarsim.',
    voice: 'moteris',
    file: 'sounds/mes-krovini-susitarsim-moteris.mp3',
  },
  {
    id: 'mokek-didvyri-vyras',
    text: 'Mokėk, didvyri!',
    voice: 'vyras',
    file: 'sounds/mokek-didvyri-vyras.mp3',
  },
  {
    id: 'mokek-didvyri-moteris',
    text: 'Mokėk, didvyri!',
    voice: 'moteris',
    file: 'sounds/mokek-didvyri-moteris.mp3',
  },
  { id: 'mokek-vyras', text: 'Mokėk!', voice: 'vyras', file: 'sounds/mokek-vyras.mp3' },
  { id: 'mokek-moteris', text: 'Mokėk!', voice: 'moteris', file: 'sounds/mokek-moteris.mp3' },
  {
    id: 'nesijaudink-vyras',
    text: 'Nesiimsiu.',
    voice: 'vyras',
    file: 'sounds/nesijaudink-vyras.mp3',
  },
  {
    id: 'nesijaudink-moteris',
    text: 'Nesiimsiu.',
    voice: 'moteris',
    file: 'sounds/nesijaudink-moteris.mp3',
  },
  {
    id: 'nori-pakeisti-ratus-vyras',
    text: 'Noriu pakeisti ratus.',
    voice: 'vyras',
    file: 'sounds/nori-pakeisti-ratus-vyras.mp3',
  },
  {
    id: 'nori-pakeisti-ratus-moteris',
    text: 'Noriu pakeisti ratus.',
    voice: 'moteris',
    file: 'sounds/nori-pakeisti-ratus-moteris.mp3',
  },
  {
    id: 'noriu-uzsakyti-masina-vyras',
    text: 'Noriu užsakyti mašiną.',
    voice: 'vyras',
    file: 'sounds/noriu-uzsakyti-masina-vyras.mp3',
  },
  {
    id: 'noriu-uzsakyti-masina-moteris',
    text: 'Noriu užsakyti mašiną.',
    voice: 'moteris',
    file: 'sounds/noriu-uzsakyti-masina-moteris.mp3',
  },
  { id: 'ok-vyras', text: 'OK.', voice: 'vyras', file: 'sounds/ok-vyras.mp3' },
  { id: 'ok-moteris', text: 'OK.', voice: 'moteris', file: 'sounds/ok-moteris.mp3' },
  {
    id: 'pamerk-vyras',
    text: 'Pamiršk.',
    voice: 'vyras',
    file: 'sounds/pamerk-vyras.mp3',
    variant: 1,
  },
  {
    id: 'pamerk-vyras-2',
    text: 'Pamiršk.',
    voice: 'vyras',
    file: 'sounds/pamerk-vyras-2.mp3',
    variant: 2,
  },
  {
    id: 'pamerk-moteris',
    text: 'Pamiršk.',
    voice: 'moteris',
    file: 'sounds/pamerk-moteris.mp3',
    variant: 1,
  },
  {
    id: 'pamerk-moteris-2',
    text: 'Pamiršk.',
    voice: 'moteris',
    file: 'sounds/pamerk-moteris-2.mp3',
    variant: 2,
  },
  {
    id: 'priekyje-vyras',
    text: 'Pinigus į priekį!',
    voice: 'vyras',
    file: 'sounds/priekyje-vyras.mp3',
  },
  {
    id: 'priekyje-moteris',
    text: 'Pinigus į priekį!',
    voice: 'moteris',
    file: 'sounds/priekyje-moteris.mp3',
  },
  {
    id: 'problemos-su-masina-padesi-vyras',
    text: 'Problemos su mašina. Padėsi?',
    voice: 'vyras',
    file: 'sounds/problemos-su-masina-padesi-vyras.mp3',
  },
  {
    id: 'problemos-su-masina-padesi-moteris',
    text: 'Problemos su mašina. Padėsi?',
    voice: 'moteris',
    file: 'sounds/problemos-su-masina-padesi-moteris.mp3',
  },
  {
    id: 'rinkis-vyras',
    text: 'Rinkis!',
    voice: 'vyras',
    file: 'sounds/rinkis-vyras.mp3',
    variant: 1,
  },
  {
    id: 'rinkis-vyras-2',
    text: 'Rinkis!',
    voice: 'vyras',
    file: 'sounds/rinkis-vyras-2.mp3',
    variant: 2,
  },
  {
    id: 'rinkis-moteris',
    text: 'Rinkis!',
    voice: 'moteris',
    file: 'sounds/rinkis-moteris.mp3',
    variant: 1,
  },
  {
    id: 'rinkis-moteris-2',
    text: 'Rinkis!',
    voice: 'moteris',
    file: 'sounds/rinkis-moteris-2.mp3',
    variant: 2,
  },
  {
    id: 'skambink-drauge-atsiskaitysim-vyras',
    text: 'Stabtelk, drauguži, atsiskaitysim.',
    voice: 'vyras',
    file: 'sounds/skambink-drauge-atsiskaitysim-vyras.mp3',
  },
  {
    id: 'skambink-drauge-atsiskaitysim-moteris',
    text: 'Stabtelk, drauguži, atsiskaitysim.',
    voice: 'moteris',
    file: 'sounds/skambink-drauge-atsiskaitysim-moteris.mp3',
  },
  { id: 'sutarta-vyras', text: 'Sutarta.', voice: 'vyras', file: 'sounds/sutarta-vyras.mp3' },
  { id: 'sutarta-moteris', text: 'Sutarta.', voice: 'moteris', file: 'sounds/sutarta-moteris.mp3' },
  { id: 'sutinku-vyras', text: 'Sutinku.', voice: 'vyras', file: 'sounds/sutinku-vyras.mp3' },
  { id: 'sutinku-moteris', text: 'Sutinku.', voice: 'moteris', file: 'sounds/sutinku-moteris.mp3' },
  {
    id: 'turi-problemu-vyras',
    text: 'Turi problemų?',
    voice: 'vyras',
    file: 'sounds/turi-problemu-vyras.mp3',
  },
  {
    id: 'turi-problemu-moteris',
    text: 'Turi problemų?',
    voice: 'moteris',
    file: 'sounds/turi-problemu-moteris.mp3',
  },
  { id: 'tvarka-vyras', text: 'Tvarka!', voice: 'vyras', file: 'sounds/tvarka-vyras.mp3' },
  { id: 'tvarka-moteris', text: 'Tvarka!', voice: 'moteris', file: 'sounds/tvarka-moteris.mp3' },
  {
    id: 'vaikinai-man-nereikia-nemalonumu-vyras',
    text: 'Vaikinai, man nereikia nemalonumų.',
    voice: 'vyras',
    file: 'sounds/vaikinai-man-nereikia-nemalonumu-vyras.mp3',
  },
  {
    id: 'vaikinai-man-nereikia-nemalonumu-moteris',
    text: 'Vaikinai, man nereikia nemalonumų.',
    voice: 'moteris',
    file: 'sounds/vaikinai-man-nereikia-nemalonumu-moteris.mp3',
  },
  {
    id: 'verciau-papurti-kita-mano-konkurenta-vyras',
    text: 'Verčiau papurtyk kitą – mano konkurentą.',
    voice: 'vyras',
    file: 'sounds/verciau-papurti-kita-mano-konkurenta-vyras.mp3',
  },
  {
    id: 'verciau-papurti-kita-mano-konkurenta-moteris',
    text: 'Verčiau papurtyk kitą – mano konkurentą.',
    voice: 'moteris',
    file: 'sounds/verciau-papurti-kita-mano-konkurenta-moteris.mp3',
  },
  {
    id: 'virsininke-prispaus-konkurenta-vyras',
    text: 'Viršininke, prispausk konkurentą.',
    voice: 'vyras',
    file: 'sounds/virsininke-prispaus-konkurenta-vyras.mp3',
  },
  {
    id: 'virsininke-prispaus-konkurenta-moteris',
    text: 'Viršininke, prispausk konkurentą.',
    voice: 'moteris',
    file: 'sounds/virsininke-prispaus-konkurenta-moteris.mp3',
  },
  {
    id: 'tuoj-jau-sustabdykite-automobili-arba-mes-sausime-nezinoma',
    text: 'Tučtuojau sustabdykite automobilį arba mes šausime!',
    voice: 'nezinoma',
    file: 'sounds/tuoj-jau-sustabdykite-automobili-arba-mes-sausime-nezinoma.mp3',
  },
  {
    id: 'tuoj-jau-sustabdysite-automobili-nezinoma',
    text: 'Tučtuojau sustabdykite automobilį!',
    voice: 'nezinoma',
    file: 'sounds/tuoj-jau-sustabdysite-automobili-nezinoma.mp3',
  },
];
