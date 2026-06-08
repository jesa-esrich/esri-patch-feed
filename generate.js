const fs = require("fs");

function extractVersionsFromFiles(files) {
  const versions = new Set();

  (files || []).forEach(f => {
    const match = f.match(/ArcGIS-(\d+)/i);
    if (match) {
      const raw = match[1];

      let version;

      if (raw.length === 3) {
        // e.g. 106 → 10.6
        const major = raw.substring(0, 2);
        const minor = raw.substring(2);
        version = `${major}.${minor}`;
      } else if (raw.length === 4) {
        // e.g. 1061 → 10.6.1
        const major = raw.substring(0, 2);
        const minor = raw.substring(2, 3);
        const patch = raw.substring(3);
        version = `${major}.${minor}.${patch}`;
      } else {
        // fallback (just in case)
        version = raw;
      }

      versions.add(version);
    }
  });

  return Array.from(versions);
}

function sortVersions(versions) {
  return versions.sort((a, b) => {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);

    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const diff = (pa[i] || 0) - (pb[i] || 0);
      if (diff !== 0) return diff;
    }

    return 0;
  });
}

function buildVersionRange(versionList, fallback) {
  const all = [...new Set(versionList)];

  if (all.length === 0) return fallback || "N/A";

  const sorted = sortVersions(all);

  if (sorted.length === 1) return sorted[0];

  return `${sorted[0]} - ${sorted[sorted.length - 1]}`;
}

async function run() {
  const res = await fetch("https://content.esri.com/patch_notification/patches.json");
  const data = await res.json();

  const patchMap = new Map();

  if (data.Product) {
    for (const group of data.Product) {
      const fallbackVersion = group.version;

      for (const p of (group.patches || [])) {

        // Use URL as unique key (logical patch identity)
        const key = p.url;

        const versionList = extractVersionsFromFiles(p.PatchFiles);

        if (patchMap.has(key)) {
          // Merge into existing patch
          const existing = patchMap.get(key);

          existing.versions.push(...versionList);

          // Optional: track all QFE IDs
          if (p.QFE_ID) {
            existing.qfes.add(p.QFE_ID);
          }

        } else {
          // Create new patch entry
          patchMap.set(key, {
            name: p.Name,
            url: p.url,
            guid: p.url, // stable GUID (important for Power Automate)
            date: p.ReleaseDate,
            products: p.Products,
            platform: p.Platform,
            critical: p.Critical || "N/A",
            versions: [...versionList],
            fallbackVersion: fallbackVersion,
            qfes: new Set(p.QFE_ID ? [p.QFE_ID] : [])
          });
        }
      }
    }
  }

  // Build RSS items
  const items = [];

  for (const patch of patchMap.values()) {

    const version = buildVersionRange(
      patch.versions,
      patch.fallbackVersion
    );

    const date = new Date(patch.date);

    items.push(`
    <item>
      <title><![CDATA[${patch.name}]]></title>
      <link>${patch.url}</link>
      <guid>${patch.guid}</guid>
      <pubDate>${date.toUTCString()}</pubDate>
      <description><![CDATA[
${patch.products} | ${patch.platform} | ${patch.critical} | Version: ${version}
      ]]></description>
    </item>
    `);
  }

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>Esri Patch Feed</title>
  <link>https://support.esri.com</link>
  <description>Latest Esri patches</description>
  ${items.join("\n")}
</channel>
</rss>`;

  fs.writeFileSync("EsriPatchFeed.xml", rss);
}

run();
