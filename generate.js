
const fs = require("fs");

function extractVersionsFromFiles(files) {
  const versions = new Set();

  (files || []).forEach(f => {
    const match = f.match(/ArcGIS-(\d+)/i);
    if (match) {
      const raw = match[1];

      if (raw.length >= 3) {
        const major = raw.substring(0, 2);
        const minor = raw.substring(2);
        versions.add(`${major}.${minor}`);
      }
    }
  });

  return Array.from(versions).sort();
}

function buildVersionRange(versionList, fallback) {
  if (versionList.length === 0) {
    return fallback || "N/A";
  }

  if (versionList.length === 1) {
    return versionList[0];
  }

  return `${versionList[0]} - ${versionList[versionList.length - 1]}`;
}

async function run() {
  const res = await fetch("https://content.esri.com/patch_notification/patches.json");
  const data = await res.json();

  let patches = [];

  if (data.Product) {
    for (const group of data.Product) {
      const fallbackVersion = group.version;

      for (const p of (group.patches || [])) {

        const versionList = extractVersionsFromFiles(p.PatchFiles);
        const version = buildVersionRange(versionList, fallbackVersion);

        const date = new Date(p.ReleaseDate);

        patches.push(`
        <item>
          <title><![CDATA[${p.Name}]]></title>
          <link>${p.url}</link>
          <guid>${p.QFE_ID}</guid>
          <pubDate>${date.toUTCString()}</pubDate>
          <description><![CDATA[
${p.Products} | ${p.Platform} | ${p.Critical || "N/A"} | Version: ${version}
          ]]></description>
        </item>
        `);
      }
    }
  }

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>Esri Patch Feed</title>
  <link>https://support.esri.com</link>
  <description>Latest Esri patches</description>
  ${patches.join("\n")}
</channel>
</rss>`;

  fs.writeFileSync("EsriPatchFeed.xml", rss);
}

run();
