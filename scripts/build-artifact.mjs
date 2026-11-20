// claude.ai の Artifact として公開するための dist/index.html を作る。
// Artifact では外部の CSS/JS/画像を読めないので、CSS・データ・スクリプトをすべてインライン化する。
// 画像の sprites.png は dist/ にコピーし、Artifact の補助ファイルとして一緒に公開する。
// また Artifact 側が <!doctype>/<html>/<head>/<body> を付けるので、それらのタグは取り除く。
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(join(root, f), "utf8");
const html = read("index.html");

const title = html.match(/<title>.*?<\/title>/)[0];
// Google Fonts は Artifact でも読み込めるので <link> をそのまま持っていく
const fontLinks = html.match(/<link [^>]*fonts\.(googleapis|gstatic)\.com[^>]*>/g) ?? [];
let body = html.match(/<body>([\s\S]*)<\/body>/)[1];
body = body.replace(/<script src="([^"]+)"><\/script>/g, (_, src) => `<script>\n${read(src).replaceAll("</script", "<\\/script")}\n</script>`);

const out = [
  '<meta charset="utf-8">',
  title,
  '<meta name="claude:viewport-fit-sides" content="cover">',
  ...fontLinks,
  `<style>\n${read("style.css")}\n</style>`,
  body.trim(),
  "",
].join("\n");

mkdirSync(join(root, "dist"), { recursive: true });
writeFileSync(join(root, "dist", "index.html"), out);
copyFileSync(join(root, "sprites.png"), join(root, "dist", "sprites.png"));
console.log(`wrote dist/index.html (${Math.round(out.length / 1024)} KiB) and dist/sprites.png`);
