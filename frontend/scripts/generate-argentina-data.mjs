/**
 * Fetches provinces and localities from georef-ar API and generates
 * src/data/argentina.json for offline use in the app.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = 'https://apis.datos.gob.ar/georef/api';

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function main() {
  console.log('Fetching provinces...');
  const provData = await fetchJSON(`${BASE}/provincias?orden=nombre&campos=id,nombre&max=100`);
  const provinces = provData.provincias.map((p) => ({ id: p.id, nombre: p.nombre }));
  console.log(`  Got ${provinces.length} provinces`);

  const BATCH = 1000;
  const total_localities_estimate = 4500;
  let allLocalities = [];
  let inicio = 0;

  while (true) {
    console.log(`Fetching localities ${inicio}–${inicio + BATCH - 1}...`);
    const data = await fetchJSON(
      `${BASE}/localidades?orden=nombre&campos=id,nombre,provincia.id&max=${BATCH}&inicio=${inicio}`
    );
    allLocalities = allLocalities.concat(data.localidades);
    console.log(`  Fetched ${data.localidades.length}, total so far: ${allLocalities.length} / ${data.total}`);
    if (allLocalities.length >= data.total) break;
    inicio += BATCH;
  }

  // Group cities by province id, deduplicating names
  const citiesByProvince = {};
  for (const loc of allLocalities) {
    const provId = loc.provincia.id;
    if (!citiesByProvince[provId]) citiesByProvince[provId] = new Set();
    citiesByProvince[provId].add(loc.nombre);
  }

  // Build final structure
  const result = {
    provinces: provinces,
    citiesByProvince: {},
  };

  for (const prov of provinces) {
    const cities = citiesByProvince[prov.id];
    result.citiesByProvince[prov.id] = cities
      ? Array.from(cities).sort((a, b) => a.localeCompare(b, 'es'))
      : [];
  }

  const totalCities = Object.values(result.citiesByProvince).reduce((acc, c) => acc + c.length, 0);
  console.log(`\nTotal unique cities: ${totalCities}`);
  console.log('Cities per province:');
  for (const p of provinces) {
    console.log(`  ${p.nombre}: ${result.citiesByProvince[p.id].length}`);
  }

  const outDir = join(__dirname, '..', 'src', 'data');
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, 'argentina.json');
  writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');
  console.log(`\nSaved to ${outPath}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
