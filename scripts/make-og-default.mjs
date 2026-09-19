/**
 * 一次性脚本：生成站点默认分享图 public/images/og-default.webp（1200×630）
 * 设计与系列封面保持一致（深蓝底 + 主题色）。
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const accent = "#4f9cf9";
const accent2 = "#7cc0ff";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
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
    <pattern id="grid" width="44" height="44" patternUnits="userSpaceOnUse">
      <path d="M44 0H0V44" fill="none" stroke="#ffffff" stroke-opacity="0.05" stroke-width="1"/>
    </pattern>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#grid)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>

  <circle cx="1000" cy="165" r="150" fill="none" stroke="${accent}" stroke-opacity="0.28" stroke-width="2"/>
  <circle cx="1000" cy="165" r="95" fill="${accent}" fill-opacity="0.10"/>
  <circle cx="1105" cy="480" r="70" fill="none" stroke="${accent2}" stroke-opacity="0.20" stroke-width="2"/>

  <rect x="76" y="196" width="9" height="112" rx="4.5" fill="url(#accent)"/>

  <text x="115" y="228" font-family="Microsoft YaHei, sans-serif" font-size="26" font-weight="bold" fill="${accent2}" letter-spacing="6">个人博客</text>
  <text x="115" y="330" font-family="Microsoft YaHei, sans-serif" font-size="72" font-weight="bold" fill="#ffffff">Nskdfh 的博客</text>
  <text x="115" y="396" font-family="Microsoft YaHei, sans-serif" font-size="30" fill="#a7b8d4">记录技术、折腾与踩过的坑</text>

  <line x1="115" y1="500" x2="720" y2="500" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2"/>
  <text x="115" y="552" font-family="Microsoft YaHei, sans-serif" font-size="24" fill="#7c8fae">56076077.xyz</text>
</svg>`;

const outDir = path.join("public", "images");
await mkdir(outDir, { recursive: true });
const out = path.join(outDir, "og-default.webp");
await sharp(Buffer.from(svg, "utf8")).webp({ quality: 92 }).toFile(out);
const meta = await sharp(out).metadata();
console.log(`✅ ${out}  ${meta.width}x${meta.height}  ${meta.format}`);
