/**
 * Achievement catalog extractor — iter-019 M8 T3.
 * Produces achievements.json with declarative `when` predicates (K18 design).
 * Texts: vlastní / parafráze (R-G). Numeric thresholds from original source.
 */
import { readConfigExtract } from '../lib/sources.mjs';

/**
 * Declarative `when` predicate map per achievement ID.
 * Built from original triggers (structure from config.js/home.js, text ownership stays with us).
 * Achievements wired to world.takeOver counters (M9) use { kind:'never' } as placeholder.
 */
const WHEN_MAP = {
  achieveSettlement:       { kind: 'settlementLevel', atLeast: 1 },
  achieveVillage:          { kind: 'settlementLevel', atLeast: 2 },
  achieveTown:             { kind: 'settlementLevel', atLeast: 3 },
  achieveCity:             { kind: 'settlementLevel', atLeast: 4 },
  achieveCenturion:        { kind: 'sumGte', paths: ['player.totWarriors', 'player.totArchers'], value: 100 },
  achieveCohort:           { kind: 'sumGte', paths: ['player.totWarriors', 'player.totArchers'], value: 500 },
  achieveLegion:           { kind: 'sumGte', paths: ['player.totWarriors', 'player.totArchers'], value: 5000 },
  achieveBenevolence:      { kind: 'never' }, // world.takeOver benevolence counter — M9 wiring
  achieveFeared:           { kind: 'never' }, // world.takeOver feared counter — M9 wiring
  achieveMight:            { kind: 'never' }, // world.takeOver might counter — M9 wiring
  achieveGoldHoarder:      { kind: 'stateGte', path: 'player.gold', value: 1000000 },
  achieveLuxury:           { kind: 'buildingBuilt', id: 'chateau' },
  achieveExtravagance:     { kind: 'buildingBuilt', id: 'estate' },
  achieveUnhygienic:       { kind: 'flagTrue', path: 'home.health.diseaseActive' },
  achievementSurvivedWinter: { kind: 'stateGte', path: 'season.curYear', value: 2 },
};

/**
 * Custom R-G texts per achievement ID (vlastní / parafráze, not 1:1 from original).
 * Design §9 (R-G licence): names/descriptions rewritten; numeric thresholds = factual data.
 */
const TEXT_MAP = {
  achieveSettlement:       { name: 'Zárodek civilizace',   description: 'Tábor přerostl v usedlost. Váš lid zapustil kořeny — a nic už nebude jako dřív.' },
  achieveVillage:          { name: 'Vesnické zátiší',       description: 'Usedlost vyrostla ve vesnici s fungující ekonomikou a pevnými základy. Hrdost přichází sama.' },
  achieveTown:             { name: 'Město na mapě',         description: 'Vaše sídlo si vydobylo místo na obchodních mapách. Svět o vás ví.' },
  achieveCity:             { name: 'Stavitel města',        description: 'Přes všechny překážky jste vybudovali skutečné město. Legendy se rodí takto.' },
  achieveCenturion:        { name: 'Centurion',             description: 'Sto ostří pod vaším velením. Nepřátelé váš pochod začínají brát vážně.' },
  achieveCohort:           { name: 'Kohorta',               description: 'Pět set vojáků pochoduje pod vaší zástavou. Menší království se radí, zda raději vyjednávat.' },
  achieveLegion:           { name: 'Legie',                 description: 'Pět tisíc hrdel. Jděte a podrobte si svět — nikdo vám nestojí v cestě.' },
  achieveBenevolence:      { name: 'Laskavý vůdce',         description: 'Dobyli jste srdce svých protivníků. Mír přišel bez jediné zbytečně prolité kapky krve.' },
  achieveFeared:           { name: 'Obávaný vůdce',         description: 'Vaše pověst otevírá brány dříve, než k nim dorazíte. Nikdo se neopováží klást odpor.' },
  achieveMight:            { name: 'Mocný vůdce',           description: 'Vojenská síla promluvila za všechno. Váš protivník nemá na výběr — složí zbraně.' },
  achieveGoldHoarder:      { name: 'Zlatý hromadič',        description: 'Milion zlatých. Vaše truhly se pod tíhou mincí prohýbají — snad to zvládnou.' },
  achieveLuxury:           { name: 'Luxusní bydlení',       description: 'Panský dům byl pro vás příliš skromný. Přesunuli jste se do zámečku s výhledem na celé město.' },
  achieveExtravagance:     { name: 'Nóbl extravagance',     description: 'Město je příliš hlučné pro vás. Přestěhovali jste se na venkovské sídlo — s veškerým přepychem.' },
  achieveUnhygienic:       { name: 'Šiřitel nákazy',        description: 'Epidemie nezná hranic — nakažení jsou lidé i dobytek. Příště možná zkuste mýdlo.' },
  achievementSurvivedWinter: { name: 'Přežili jsme zimu',  description: 'Celý rok přišel a odešel, a vy jste stále tady. To se počítá.' },
};

export function extractAchievements() {
  const raw = readConfigExtract();
  /** @type {Record<string, {id:string,name:string,description:string,level:number}>} */
  const achievements = /** @type {any} */ (raw['achievements']);
  const items = Object.values(achievements).map((/** @type {any} */ { id, level }) => {
    const texts = /** @type {any} */ (TEXT_MAP)[id] ?? {};
    const when = /** @type {any} */ (WHEN_MAP)[id] ?? { kind: 'never' };
    return {
      id,
      name:        texts.name        ?? id,
      description: texts.description ?? '',
      level,
      when,
      onUnlock: [],
    };
  });
  return {
    _meta: {
      provenance: 'original-paraphrased',
      source: 'doc/original_source/extracted/config-extract.json (IDs, numeric thresholds); texty vlastní parafrázované (R-G)',
      note: 'Numeric thresholds (army 100/500/5000, gold 1M, year >=2) = factual data, preserved as-is. Names and descriptions rewritten.',
    },
    achievements: items,
  };
}
