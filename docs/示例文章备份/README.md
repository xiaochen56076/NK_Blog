# 示例文章备份

这里是 **Fuwari 主题自带的示例文章**。它们原本放在 `src/content/posts/` 下、会被构建并发布到站点上，
已于 **2026-09-17** 从站点撤下，整体搬到这里存档（用 `git mv` 搬移，git 历史可追溯为"改名"而非删除重加）。

> **这个目录不会被构建、也不会被发布。** Astro 只读取 `src/` 与 `public/`，`docs/` 目录不参与构建，
> 所以放在这里既能留档，又不会出现在网站上。

| 文件 | 原标题 |
|---|---|
| `markdown.md` | Markdown 示例 |
| `markdown-extended.md` | Markdown 扩展功能 |
| `expressive-code.md` | Expressive Code 示例 |
| `video.md` | 在文章中嵌入视频 |
| `draft.md` | 草稿示例（`draft: true`，本来就不发布） |
| `guide/index.md` + `guide/cover.jpeg` | Fuwari 简易指南（含封面图） |

## 想恢复其中某篇

复制回文章目录即可（`guide` 那篇的封面是相对路径 `./cover.jpeg`，要连图片一起复制）：

```bash
cp "docs/示例文章备份/markdown.md" src/content/posts/
cp -r "docs/示例文章备份/guide" src/content/posts/
```

恢复后重新构建（或本地 `pnpm dev`）就会重新出现在站点上。

## 留着它们的用处

这几篇覆盖了本站支持的全部 Markdown 扩展用法，写自己的文章时可以当语法参考：

- 提示框 `:::note` / `:::tip` / `:::important` / `:::caution` / `:::warning`
- GitHub 仓库卡片 `::github{repo="owner/repo"}`
- KaTeX 数学公式、代码块（行号 / 可折叠 / 语言徽章 / 复制按钮）
- 视频嵌入、图片点击放大

## 当前文章目录

`src/content/posts/` 现在只放你自己的文章；后台（Sveltia CMS）新建的文章会存成
`src/content/posts/<英文文件名>/index.md`。
