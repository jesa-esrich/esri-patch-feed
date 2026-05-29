const fs = require("fs");

async function run() {
  const res = await fetch("https://content.esri.com/patch_notification/patches.json");
  const data = await res.json();

  let patches = [];

  
  // Flatten nested JSON structure
  if (data.Product && Array.isArray(data.Product)) {
    for (const product of data.Product) {
      if (product.patches && Array.isArray(product.patches)) {
        patches = patches.concat(product.patches);
      }
    }
  }

  console.log("TOTAL PATCHES:", patches.length);

  const items = patches.map(p => {
    const name = p.Name || "No name";
    const product = p.Products || "Unknown product";
    const platform = p.Platform || "Unknown platform";
    const url = p.url || "";
    const date = p.ReleaseDate || "";
    const critical = p.Critical || "N/A";

    return `
    <item>
      <title><![CDATA[${name}]]></title>
      <link>${url}</link>
      <guid>${p.QFE_ID || url}</guid>
      <pubDate>${new Date(date).toUTCString()}</pubDate>
      <description><![CDATA[
        Product: ${product}
        Platform: ${platform}
        Critical: ${critical}
        ReleaseDate: ${date}
        URL: ${url}
      ]]></description>
    </item>`;
  }).join("\n");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>Esri Patch Feed</title>
  <link>https://support.esri.com</link>
  <description>Latest Esri patches</description>
  ${items}
</channel>
</rss>`;

  fs.writeFileSync("EsriPatchFeed.xml", rss);
}

run();
