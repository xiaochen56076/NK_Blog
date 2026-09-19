/**
 * 给一篇文章生成系列风格封面图
 *
 * 用法：
 *   node scripts/make-cover.mjs <文章文件夹名> "<主标题>" ["<副标题>"] ["<角标>"] ["<主色>"]
 *
 * 例：
 *   node scripts/make-cover.mjs blog-setup "从零搭一个博客" "Astro + Fuwari + Cloudflare Pages" "建站篇 · 01 / 03" "#4f9cf9"
 *
 * 输出：src/content/posts/<文章文件夹名>/cover.webp（2048 宽以内的 2:1 图）
 * 然后在文章 frontmatter 里写：image: cover.webp
 *
 * 说明：标题里的中文依赖系统字体（Windows 上用「微软雅黑」），换机器渲染时注意。
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const [slug, title, sub = "", badge = "", accent = "#4f9cf9"] = process.argv.slice(2);

if (!slug || !title) {
	console.error(
		'用法: node scripts/make-cover.mjs <文章文件夹名> "<主标题>" ["<副标题>"] ["<角标>"] ["<主色>"]',
	);
	process.exit(1);
}

// 由主色推导一个更亮的强调色（简单提亮，够用即可）
function lighten(hex, amount = 0.45) {
	const n = Number.parseInt(hex.replace("#", ""), 16);
	const r = (n >> 16) & 255;
	const g = (n >> 8) & 255;
	const b = n & 255;
	const mix = (c) => Math.round(c + (255 - c) * amount);
	return `#${((mix(r) << 16) | (mix(g) << 8) | mix(b)).toString(16).padStart(6, "0")}`;
}

const accent2 = lighten(accent);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="800">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#131b2c"/>
      <stop offset="55%" stop-color="#18233a"/>
      <stop offset="100%" stop-color="#1e2c48"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${accent2}"/>
      <stop offset="100%" stop-color="${accent}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.85" cy="0.15" r="0.7">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M48 0H0V48" fill="none" stroke="#ffffff" stroke-opacity="0.05" stroke-width="1"/>
    </pattern>
  </defs>

  <rect width="1600" height="800" fill="url(#bg)"/>
  <rect width="1600" height="800" fill="url(#grid)"/>
  <rect width="1600" height="800" fill="url(#glow)"/>

  <circle cx="1340" cy="210" r="190" fill="none" stroke="${accent}" stroke-opacity="0.28" stroke-width="2"/>
  <circle cx="1340" cy="210" r="120" fill="${accent}" fill-opacity="0.10"/>
  <circle cx="1470" cy="600" r="90" fill="none" stroke="${accent2}" stroke-opacity="0.20" stroke-width="2"/>

  <rect x="96" y="236" width="10" height="132" rx="5" fill="url(#accent)"/>

  ${badge ? `<text x="140" y="268" font-family="Microsoft YaHei, sans-serif" font-size="30" font-weight="bold" fill="${accent2}" letter-spacing="6">${badge}</text>` : ""}
  <text x="140" y="386" font-family="Microsoft YaHei, sans-serif" font-size="82" font-weight="bold" fill="#ffffff">${title}</text>
  ${sub ? `<text x="140" y="462" font-family="Microsoft YaHei, sans-serif" font-size="34" fill="#a7b8d4" letter-spacing="1">${sub}</text>` : ""}

  <line x1="140" y1="626" x2="880" y2="626" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2"/>
  <text x="140" y="686" font-family="Microsoft YaHei, sans-serif" font-size="26" fill="#7c8fae">Nskdfh 的博客 · 56076077.xyz</text>
</svg>`;

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(repoRoot, "src", "content", "posts", slug);
await mkdir(dir, { recursive: true });
const out = path.join(dir, "cover.webp");
await sharp(Buffer.from(svg, "utf8")).webp({ quality: 92 }).toFile(out);
const meta = await sharp(out).metadata();
console.log(`✅ ${path.relative(repoRoot, out)}  ${meta.width}x${meta.height}  ${meta.format}`);
console.log(`   在文章 frontmatter 里写：image: cover.webp`);
