// scripts/merge-boss-maps.js
// Usage: node scripts/merge-boss-maps.js exports/*.json > bosses.json
// This merges many per-boss tilemap exports into one JSON object.

const fs = require('fs');

const files = process.argv.slice(2);
if (!files.length) {
  console.error('Usage: node scripts/merge-boss-maps.js exports/*.json > bosses.json');
  process.exit(1);
}

const out = {};
for (const f of files) {
  try {
    const data = JSON.parse(fs.readFileSync(f, 'utf8'));
    const key = (data.boss || f).replace(/\s+/g, '_');
    out[key] = {
      boss: data.boss || key,
      grid: data.grid,
      bounds: data.bounds,
      tiles: data.tiles,
      worldZ: data.worldZ,
      camera: data.camera
    };
  } catch (e) {
    console.error('Failed:', f, e.message);
  }
}

process.stdout.write(JSON.stringify(out, null, 2));
