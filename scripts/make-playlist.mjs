/**
 * 生成播放器歌单（并在缺封面时自动生成封面）
 *
 * 用法：
 *   pnpm run music          ← 手动执行
 *   （pnpm run build 时也会自动执行，所以推送到 Cloudflare 后歌单一定是最新的）
 *
 * 约定：
 *   1. 音频放进 public/music/（可以再分子目录）
 *   2. 文件名写成「曲名 - 歌手.mp3」；没有「 - 」时整段当曲名
 *   3. 同目录、同名的 jpg / png / webp 会被当作封面；**没有就自动生成一张**
 *   4. 结果写入 src/music-playlist.ts，播放器直接读它
 *
 * 说明：文件名里用中文、空格、顿号都没问题，脚本会把 URL 正确编码。
 */
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const musicDir = path.join(repoRoot, "public", "music");
const outFile = path.join(repoRoot, "src", "music-playlist.ts");

const AUDIO_EXT = new Set([".mp3", ".m4a", ".aac", ".flac", ".wav", ".ogg", ".opus"]);
const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

/** 递归列出目录下的所有文件（只往下钻一层子目录也支持，防止误扫太深） */
async function listFiles(dir, depth = 0) {
	if (depth > 3) return [];
	let entries;
	try {
		entries = await readdir(dir, { withFileTypes: true });
	} catch {
		return [];
	}
	const out = [];
	for (const entry of entries) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			out.push(...(await listFiles(full, depth + 1)));
		} else if (entry.isFile()) {
			out.push(full);
		}
	}
	return out;
}

/** 把文件路径转成站点 URL（逐段编码，中文与空格都安全） */
function toUrl(absPath) {
	const rel = path.relative(path.join(repoRoot, "public"), absPath).split(path.sep);
	return "/" + rel.map((seg) => encodeURIComponent(seg)).join("/");
}

/** 从文件名解析曲名与歌手：「曲名 - 歌手」取最后一个「 - 」分隔 */
function parseName(baseName) {
	const idx = baseName.lastIndexOf(" - ");
	if (idx === -1) {
		return { title: baseName.trim(), artist: "" };
	}
	return {
		title: baseName.slice(0, idx).trim(),
		artist: baseName.slice(idx + 3).trim(),
	};
}

const xmlEscape = (s) =>
	s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** 自动生成一张 600×600 的方形封面 */
async function generateCover(outPath, title, artist) {
	// 标题太长就缩小字号，保证不溢出
	const len = [...title].length;
	const titleSize = len <= 10 ? 46 : len <= 14 ? 38 : len <= 18 ? 32 : 27;
	const shown = len <= 26 ? title : [...title].slice(0, 25).join("") + "…";
	const artistShown = [...artist].length <= 30 ? artist : [...artist].slice(0, 29).join("") + "…";

	const accent = "#4f9cf9";
	const accent2 = "#7cc0ff";
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#131b2c"/>
      <stop offset="55%" stop-color="#18233a"/>
      <stop offset="100%" stop-color="#1e2c48"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${accent}"/>
      <stop offset="100%" stop-color="${accent2}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.8" cy="0.15" r="0.75">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.34"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M40 0H0V40" fill="none" stroke="#ffffff" stroke-opacity="0.05" stroke-width="1"/>
    </pattern>
  </defs>

  <rect width="600" height="600" fill="url(#bg)"/>
  <rect width="600" height="600" fill="url(#grid)"/>
  <rect width="600" height="600" fill="url(#glow)"/>

  <circle cx="470" cy="128" r="86" fill="none" stroke="${accent}" stroke-opacity="0.3" stroke-width="2"/>
  <circle cx="470" cy="128" r="54" fill="${accent}" fill-opacity="0.12"/>

  <text x="300" y="352" font-family="Microsoft YaHei, Segoe UI Symbol, sans-serif" font-size="240"
        fill="#ffffff" fill-opacity="0.06" text-anchor="middle">&#9834;</text>

  <rect x="54" y="392" width="8" height="96" rx="4" fill="url(#accent)"/>
  <text x="82" y="432" font-family="Microsoft YaHei, sans-serif" font-size="${titleSize}" font-weight="bold"
        fill="#ffffff">${xmlEscape(shown)}</text>
  <text x="82" y="470" font-family="Microsoft YaHei, sans-serif" font-size="23"
        fill="#a7b8d4">${xmlEscape(artistShown)}</text>

  <line x1="54" y1="524" x2="546" y2="524" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2"/>
  <text x="54" y="560" font-family="Microsoft YaHei, sans-serif" font-size="20" fill="#7c8fae">Nskdfh 的博客</text>
</svg>`;

	await sharp(Buffer.from(svg, "utf8")).webp({ quality: 90 }).toFile(outPath);
}

async function exists(p) {
	try {
		await stat(p);
		return true;
	} catch {
		return false;
	}
}

const files = await listFiles(musicDir);
const audioFiles = files
	.filter((f) => AUDIO_EXT.has(path.extname(f).toLowerCase()))
	.sort((a, b) => a.localeCompare(b, "zh"));

const tracks = [];
let generatedCovers = 0;

for (const audio of audioFiles) {
	const dir = path.dirname(audio);
	const ext = path.extname(audio);
	const base = path.basename(audio, ext);
	const { title, artist } = parseName(base);

	// 找封面：同名图片 → 同目录 cover.*
	let coverPath = null;
	for (const candidate of files) {
		if (path.dirname(candidate) !== dir) continue;
		const cExt = path.extname(candidate).toLowerCase();
		if (!IMAGE_EXT.has(cExt)) continue;
		const cBase = path.basename(candidate, cExt);
		if (cBase === base || cBase === "cover") {
			coverPath = candidate;
			break;
		}
	}

	// 没有封面就自动生成一张
	if (!coverPath) {
		coverPath = path.join(dir, `${base}.webp`);
		await generateCover(coverPath, title, artist);
		generatedCovers++;
	}

	const track = { title, artist, url: toUrl(audio), cover: toUrl(coverPath) };
	if (!artist) delete track.artist;
	tracks.push(track);
}

const header = `// 本文件由 scripts/make-playlist.mjs 自动生成，请不要手动修改。
// 新增音乐：把音频放进 public/music/（文件名建议「曲名 - 歌手.mp3」），
// 然后执行 pnpm run music；构建时也会自动执行，所以推送后歌单一定是最新的。
// 封面：同目录放同名图片即可；没有的话脚本会自动生成一张。
import type { MusicTrack } from "./types/config";

`;

const body = `export const generatedPlaylist: MusicTrack[] = ${JSON.stringify(tracks, null, "\t")};\n`;

await mkdir(path.dirname(outFile), { recursive: true });
await writeFile(outFile, header + body, "utf8");

console.log(`🎵 歌单已生成：${path.relative(repoRoot, outFile)}`);
if (tracks.length === 0) {
	console.log("   ⚠ public/music/ 里还没有音频文件，播放器会回退到示例曲目");
} else {
	tracks.forEach((t, i) => {
		console.log(`   ${String(i + 1).padStart(2)}. ${t.title}${t.artist ? ` — ${t.artist}` : ""}`);
		console.log(`       ${t.url}`);
	});
}
if (generatedCovers > 0) {
	console.log(`   自动生成了 ${generatedCovers} 张封面（缺封面时）`);
}
