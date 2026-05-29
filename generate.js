const fs = require("fs");

async function run() {
  const res = await fetch("https://content.esri.com/patch_notification/patches.json");
  const data = await res.json();

  const patches = data.patches || [];

  const items = patches.map(p => `
    <item>
      <title><![CDATA[${p.name}]]></title>
      <link>${p.url}</link>
      <description><![CDATA[Product: ${p.product}]]></description>
      <guid>${p.id}</guid>
      <pubDate>${new Date(p.released).toUTCString()}</pubDate>
    </item>
  `).join("\n");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>Esri Patch Feed</title>
  <link>https://content.esri.com</link>
  <description>Latest Esri patches</description>
  ${items}
</channel>
</rss>`;

  fs.writeFileSync("feed.xml", rss);
}

run();
