#!/usr/bin/env node
/**
 * Extract pipeline: reads original source files and generates JSON catalogs to src/data/
 */
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { writeCatalog } from './lib/writeCatalog.mjs';

import { extractHouseTypes } from './extractors/houseTypes.mjs';
import { extractCompanies } from './extractors/companies.mjs';
import { extractAchievements } from './extractors/achievements.mjs';
import { extractFood } from './extractors/food.mjs';
import { extractResources } from './extractors/resources.mjs';
import { extractJobs } from './extractors/jobs.mjs';
import { extractBuildings } from './extractors/buildings.mjs';
import { extractGoods } from './extractors/goods.mjs';
import { extractMilitary } from './extractors/military.mjs';
import { extractPopulation } from './extractors/population.mjs';
import { extractBalance } from './extractors/balance.mjs';
import { extractTechs } from './extractors/techs.mjs';
import { extractZones } from './extractors/zones.mjs';
import { extractSkills } from './extractors/skills.mjs';
import { extractSectors } from './extractors/sectors.mjs';
import { extractMarketBaseline } from './extractors/marketBaseline.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', '..', 'src', 'data');

/** @type {Array<[string, () => object]>} */
const tasks = [
  ['houseTypes.json', extractHouseTypes],
  ['companies.json', extractCompanies],
  ['achievements.json', extractAchievements],
  ['food.json', extractFood],
  ['resources.json', extractResources],
  ['jobs.json', extractJobs],
  ['buildings.json', extractBuildings],
  ['goods.json', extractGoods],
  ['military.json', extractMilitary],
  ['population.json', extractPopulation],
  ['balance.json', extractBalance],
  ['techs.json', extractTechs],
  ['zones.json', extractZones],
  ['skills.json', extractSkills],
  ['sectors.json', extractSectors],
  ['marketBaseline.json', extractMarketBaseline],
];

let ok = 0;
let fail = 0;

for (const [filename, extractor] of tasks) {
  try {
    const data = extractor();
    writeCatalog(join(dataDir, filename), data);
    console.log(`  OK  ${filename}`);
    ok++;
  } catch (e) {
    console.error(`  FAIL ${filename}: ${e instanceof Error ? e.message : String(e)}`);
    fail++;
  }
}

console.log(`\nextract: ${ok} ok, ${fail} failed`);
if (fail > 0) process.exit(1);
