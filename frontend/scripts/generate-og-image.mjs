// One-off generator for static/og-image.png — run manually with
// `npm run generate:og` whenever the brand design changes. Not part of the
// build or test suite: it just uses the Playwright browser we already have
// to render our real fonts/colors pixel-perfectly, rather than approximating
// them in a separate rasterizer.
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fontDir = join(__dirname, "..", "..", "node_modules", "@fontsource");
const bebas = join(fontDir, "bebas-neue", "files", "bebas-neue-latin-400-normal.woff2");
const interRegular = join(fontDir, "inter", "files", "inter-latin-400-normal.woff2");
const interBold = join(fontDir, "inter", "files", "inter-latin-700-normal.woff2");

const toDataUri = (path) => `data:font/woff2;base64,${readFileSync(path).toString("base64")}`;

const html = `
<!doctype html>
<html>
<head>
<style>
  @font-face { font-family: "Bebas Neue"; src: url(${toDataUri(bebas)}) format("woff2"); }
  @font-face { font-family: "Inter"; font-weight: 400; src: url(${toDataUri(interRegular)}) format("woff2"); }
  @font-face { font-family: "Inter"; font-weight: 700; src: url(${toDataUri(interBold)}) format("woff2"); }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1200px;
    height: 630px;
    background: #FBF6EC;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
  }
  .glow {
    position: absolute;
    top: -120px;
    left: 50%;
    transform: translateX(-50%);
    width: 520px;
    height: 520px;
    border-radius: 50%;
    background: rgba(196, 63, 39, 0.28);
    filter: blur(90px);
  }
  .content { position: relative; text-align: center; }
  .eyebrow {
    font-family: "Bebas Neue";
    font-size: 26px;
    letter-spacing: 0.3em;
    text-transform: uppercase;
    color: #1F5C5C;
  }
  h1 {
    font-family: "Bebas Neue";
    font-size: 148px;
    letter-spacing: 0.03em;
    color: #201C18;
    line-height: 1;
    margin-top: 8px;
  }
  p {
    font-family: "Inter";
    font-weight: 400;
    font-size: 28px;
    color: rgba(32, 28, 24, 0.8);
    margin-top: 20px;
  }
</style>
</head>
<body>
  <div class="glow"></div>
  <div class="content">
    <p class="eyebrow">Step right up</p>
    <h1>Pic Perfecto</h1>
    <p>Photo booth filters. Every platform's perfect size.</p>
  </div>
</body>
</html>
`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
await page.waitForTimeout(200); // let @font-face finish rasterizing
await page.screenshot({ path: join(__dirname, "..", "static", "og-image.png") });
await browser.close();

console.log("Wrote frontend/static/og-image.png");
