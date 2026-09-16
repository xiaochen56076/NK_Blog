#!/usr/bin/env node
/**
 * 把 Markdown 文档转成 Word（.docx）。
 *
 * 原理：Markdown --(本脚本)--> 带样式的 HTML --(本机 Word COM)--> .docx
 * 只在 Windows 上可用，依赖本机已安装 Microsoft Word，不需要 pandoc / python-docx。
 *
 * 用法：
 *   node scripts/md-to-docx.mjs docs/汉化与配置说明.md
 *   node scripts/md-to-docx.mjs docs/汉化与配置说明.md docs/输出.docx
 *
 * 支持的 Markdown 子集：标题(#~####)、段落、无序/有序列表、任务列表、表格、
 * 围栏代码块、引用块、分隔线、**粗体**、`行内代码`、[链接](url)、<自动链接>
 */
import { spawnSync } from "node:child_process";
import { readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const CSS = `
  body { font-family: "Microsoft YaHei", "微软雅黑", "Segoe UI", sans-serif; font-size: 11pt; line-height: 1.55; }
  h1 { font-size: 20pt; }
  h2 { font-size: 15pt; margin-top: 18pt; }
  h3 { font-size: 13pt; }
  h4 { font-size: 11.5pt; }
  code, pre { font-family: Consolas, "Courier New", monospace; font-size: 9.5pt; }
  pre { background: #f5f5f5; border: 1px solid #dddddd; padding: 8px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #999999; padding: 4px 6px; font-size: 10pt; vertical-align: top; }
  th { background: #eeeeee; }
  blockquote { margin-left: 0; padding-left: 10px; border-left: 3px solid #cccccc; color: #555555; }
  a { color: #0b5cad; }
`;

const escapeHtml = (s) =>
	s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** 处理行内语法；先抽出行内代码，避免其中内容被当作 Markdown */
function inline(text) {
	const codes = [];
	let t = escapeHtml(text);
	t = t.replace(/`([^`]+)`/g, (_, code) => {
		codes.push(code);
		return `\u0000${codes.length - 1}\u0000`;
	});
	t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
	t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
	t = t.replace(/<((?:https?|mailto):[^>]+)>/g, '<a href="$1">$1</a>');
	t = t.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[Number(i)]}</code>`);
	return t;
}

function mdToHtml(md, title) {
	const lines = md.replace(/\r\n/g, "\n").split("\n");
	const out = [];
	const para = [];
	const flush = () => {
		if (para.length > 0) {
			out.push(`<p>${inline(para.join(" "))}</p>`);
			para.length = 0;
		}
	};
	const isTableRow = (l) => /^\s*\|/.test(l);
	const isTableSep = (l) => /^\s*\|[\s:|-]+\|\s*$/.test(l);
	const splitRow = (l) =>
		l
			.trim()
			.replace(/^\|/, "")
			.replace(/\|$/, "")
			.split("|")
			.map((c) => c.trim());

	let i = 0;
	while (i < lines.length) {
		const line = lines[i];

		// 围栏代码块
		if (/^```/.test(line)) {
			flush();
			const buf = [];
			i++;
			while (i < lines.length && !/^```/.test(lines[i])) {
				buf.push(lines[i]);
				i++;
			}
			i++;
			out.push(`<pre><code>${escapeHtml(buf.join("\n"))}</code></pre>`);
			continue;
		}

		// 表格
		if (isTableRow(line) && i + 1 < lines.length && isTableSep(lines[i + 1])) {
			flush();
			const head = splitRow(line);
			i += 2;
			const rows = [];
			while (i < lines.length && isTableRow(lines[i])) {
				rows.push(splitRow(lines[i]));
				i++;
			}
			const th = head.map((h) => `<th>${inline(h)}</th>`).join("");
			const tb = rows
				.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`)
				.join("");
			out.push(`<table><thead><tr>${th}</tr></thead><tbody>${tb}</tbody></table>`);
			continue;
		}

		// 标题
		const heading = /^(#{1,4})\s+(.*)$/.exec(line);
		if (heading) {
			flush();
			const level = heading[1].length;
			out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
			i++;
			continue;
		}

		// 分隔线
		if (/^-{3,}\s*$/.test(line)) {
			flush();
			out.push("<hr/>");
			i++;
			continue;
		}

		// 引用块
		if (/^>\s?/.test(line)) {
			flush();
			const buf = [];
			while (i < lines.length && /^>\s?/.test(lines[i])) {
				buf.push(lines[i].replace(/^>\s?/, ""));
				i++;
			}
			const body = buf
				.filter((b) => b.trim() !== "")
				.map((b) => `<p>${inline(b)}</p>`)
				.join("");
			out.push(`<blockquote>${body}</blockquote>`);
			continue;
		}

		// 列表（含任务列表）
		if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
			flush();
			const ordered = /^\s*\d+\.\s+/.test(line);
			const items = [];
			while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
				let item = lines[i].replace(/^\s*([-*]|\d+\.)\s+/, "");
				item = item
					.replace(/^\[ \]\s*/, "\u2610 ")
					.replace(/^\[[xX]\]\s*/, "\u2611 ");
				items.push(item);
				i++;
			}
			const tag = ordered ? "ol" : "ul";
			out.push(
				`<${tag}>${items.map((t) => `<li>${inline(t)}</li>`).join("")}</${tag}>`,
			);
			continue;
		}

		if (line.trim() === "") {
			flush();
			i++;
			continue;
		}

		para.push(line.trim());
		i++;
	}
	flush();

	return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<title>${escapeHtml(title)}</title>
<style>${CSS}</style>
</head>
<body>
${out.join("\n")}
</body>
</html>
`;
}

/** 调用本机 Word 把 HTML 另存为 .docx */
function convertWithWord(htmlPath, docxPath) {
	const ps = [
		"$ErrorActionPreference='Stop'",
		"$word = New-Object -ComObject Word.Application",
		"$word.Visible = $false",
		"$word.DisplayAlerts = 0",
		"try { $word.Options.ConfirmConversions = $false } catch {}",
		"$doc = $word.Documents.Open($env:MD2DOCX_IN)",
		"$doc.SaveAs2($env:MD2DOCX_OUT, 16)",
		"$doc.Close()",
		"$word.Quit()",
		"Write-Output 'WORD-OK'",
	].join("; ");

	const res = spawnSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", ps], {
		env: { ...process.env, MD2DOCX_IN: htmlPath, MD2DOCX_OUT: docxPath },
		encoding: "utf8",
		stdio: ["ignore", "pipe", "pipe"],
	});

	if (res.status !== 0 || !/WORD-OK/.test(res.stdout || "")) {
		console.error("Word 转换失败。");
		if (res.stdout) console.error(res.stdout.trim());
		if (res.stderr) console.error(res.stderr.trim());
		return false;
	}
	return true;
}

const src = process.argv[2];
if (!src) {
	console.error("用法: node scripts/md-to-docx.mjs <输入.md> [输出.docx]");
	process.exit(1);
}

const srcAbs = path.resolve(src);
const outAbs = path.resolve(process.argv[3] || srcAbs.replace(/\.md$/i, ".docx"));
const htmlAbs = path.join(os.tmpdir(), `md2docx-${Date.now()}.html`);

const md = await readFile(srcAbs, "utf8");
await writeFile(htmlAbs, mdToHtml(md, path.basename(srcAbs, ".md")), "utf8");
console.log(`已生成中间 HTML：${htmlAbs}`);

const ok = convertWithWord(htmlAbs, outAbs);
await rm(htmlAbs, { force: true });

if (!ok) process.exit(1);

const { size } = await stat(outAbs);
console.log(`已生成 Word 文档：${outAbs}（${(size / 1024).toFixed(1)} KB）`);
