#!/usr/bin/env node
/**
 * 从 GitHub 同步头像到本地资源目录，避免依赖 GitHub 图片 CDN（国内常加载失败）。
 *
 * 用法：
 *   pnpm run sync-avatar            # 使用下方 DEFAULT_USER
 *   pnpm run sync-avatar -- <用户名> # 临时指定其他 GitHub 用户名
 *
 * 同步后头像文件为 src/assets/images/github-avatar.png，
 * 由 src/config.ts 的 profileConfig.avatar 引用。
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_USER = "xiaochen56076";
const OUTPUT = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../src/assets/images/github-avatar.png",
);

const user = process.argv[2] || DEFAULT_USER;
const url = `https://github.com/${user}.png?size=512`;

console.log(`正在从 ${url} 同步头像...`);

const res = await fetch(url, { redirect: "follow" });
if (!res.ok) {
	console.error(`同步失败：HTTP ${res.status}`);
	process.exit(1);
}

const buf = Buffer.from(await res.arrayBuffer());
await writeFile(OUTPUT, buf);
console.log(
	`同步完成：${user} 的头像已写入 ${path.relative(process.cwd(), OUTPUT)}（${buf.length} 字节）`,
);