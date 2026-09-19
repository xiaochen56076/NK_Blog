---
title: 给静态博客接一个能登录的后台
slug: blog-admin
published: 2026-09-18
description: 静态博客唯一的缺点是写作体验。这篇讲怎么用 Sveltia CMS 加一个自写的 GitHub OAuth 代理，把「改文件 + push」变成「打开网页就能写」，顺便聊聊登录安全是怎么设计的。
image: cover.webp
tags:
  - Sveltia CMS
  - OAuth
  - Cloudflare
category: 技术
draft: false
---

> 这是「搭建这个博客」系列的第 **2** 篇。另外两篇是 [1 从零搭一个博客](/posts/blog-setup/) 和 [3 卡了我半天的那些坑](/posts/blog-pitfalls/)。

## 静态博客唯一不爽的地方

上一篇说到，我选了静态博客，好处一大堆。但它有个很实在的问题：

**想写篇文章，得打开编辑器、新建 Markdown、写完、然后 push。**

在自己电脑上还好，但我经常在别的设备上（手机、公司电脑），那就很难受了——总不能在手机上装个 Git 客户端写文章吧。

所以我想给它补一个后台：**打开网页，登录，写，保存**。写完自动就是一次提交，Cloudflare 自动部署。对，就是 WordPress 那种体验，但不想要 WordPress 那一整套服务器。

## 思路：基于 Git 的前端 CMS

这类工具不少，统称"Git-based CMS"（以前的 Netlify CMS、Decap CMS、现在的 Sveltia CMS 都属于这一类）。

它的原理其实特别简单：

- 它本身**就是几个静态文件**，挂在 `/admin/` 路径下（不需要任何服务器）
- 配置写在 `public/admin/config.yml`：你的仓库、分支、有哪些内容类型、每个字段叫什么
- 登录之后，它**直接调 GitHub API 往你的仓库提交文件**

所以**"保存" = 一次 commit = 一次自动部署**。跟手动 push 的结果一模一样，只是把过程变成了点按钮。

我选的是 **Sveltia CMS**：界面比老牌的 Decap 现代很多，中文也正常，作者还在活跃维护。版本我是**锁死**的（不写 `latest`），免得上游更新把我这边弄挂。

## 文章在仓库里长什么样

后台里每篇文章，对应仓库里一个**文件夹**：

```
src/content/posts/
└── blog-admin/
    ├── index.md      ← 正文 + frontmatter
    └── cover.webp    ← 封面图（可选，放同一层）
```

好处是**每篇文章的图片跟着文章走**，不会越堆越乱。后台里拖一张封面图进去，它自动就存到这篇文章自己的文件夹里。

## 登录：两种方式，我都要

Sveltia 支持两种登录：

**第一种：访问令牌。** 去 GitHub 手动创建一个 40 位的 token，粘贴进后台。优点是**不需要任何后端**，缺点是麻烦（要手动建、到期要换）。

**第二种：GitHub 授权登录。** 点一下按钮就进来了。但它有个前提：**需要一个能安全保存 `client secret` 的地方**——因为拿授权码换 token 这一步必须带 secret，而 secret **绝对不能放在前端**（放前端等于公开）。

问题就来了：我这是纯静态站，**没有后端**。

## 于是用 Cloudflare 写了个小代理

好在站点已经部署在 Cloudflare Pages 上了，它支持 **Functions**：在仓库里建一个 `functions/` 目录，里面的文件会自动变成服务端接口。

于是整个登录流程被我拆成两个接口（一共几十行代码）：

```
/api/auth      → 生成一个随机 state，种下 CSRF cookie，302 跳转到 GitHub 授权页
/api/callback  → 校验 state 和 cookie → 用 code 换 token（secret 只在服务端）
               → 用 token 查一下用户名 → 和白名单比对 → 通过才把 token 交给后台页面
```

为什么中间要绕一圈，不直接把 token 给前端？因为我要**先确认"是谁"**：

在 callback 里，函数拿着 token 去问一次 GitHub"这是谁"，拿到用户名，和我配置的**白名单**比对。**不是我本人，token 根本不会发出去**——这样即使别人知道了后台地址、也完成了授权，他什么也拿不到。

安全上具体做了四件事：

- **state + CSRF cookie 双重校验**：防止有人伪造回调地址来骗 token
- **用户名白名单**：只允许指定的 GitHub 账号登录
- **权限最小化**：申请的 scope 只有 `public_repo`（我的仓库是公开的，这就够了），授权页上明确显示"仅公开仓库"
- **secret 只存在 Cloudflare 的环境变量里**：不进仓库、不进浏览器、不写进任何文件

顺便说，函数在失败时会返回明确的错误码和中文提示，后台界面直接把原因显示出来——排查的时候特别省事（这一点在第 3 篇里救了我不止一次）。

## Cloudflare 上要配的东西

就四个环境变量：

| 变量 | 作用 |
|---|---|
| `GITHUB_CLIENT_ID` | 你 OAuth 应用的 Client ID |
| `GITHUB_CLIENT_SECRET` | 对应的 Secret |
| `ALLOWED_GITHUB_LOGIN` | 白名单：允许登录的 GitHub 用户名 |
| `ALLOWED_DOMAINS` | 只允许你自己的域名使用这个代理 |

**有个特别容易踩的坑**：Cloudflare **不会**把新填的环境变量自动应用到已经跑着的函数上。填完必须去"部署"页面点一次**重新部署**，否则函数读到的还是旧值——现象就是"明明填了变量，接口却一直报未配置"。

（另外：Client ID 和 Secret **一定要用复制按钮**，别手打。我手打的后果，第 3 篇里详细写了。）

## 现在的写作流程

打开 `你的域名/admin/` → 点"使用 GitHub 登录" → 授权 → 写 → 保存。

然后就没了。后台会提交、Cloudflare 会自动部署，一分钟左右文章就上线了。

手机上也能这么写——这大概是我最满意的一点。

下一篇是这个系列里最"血泪"的一篇：几个把我卡了半天的坑，以及我怎么被自己的测试骗了一次。

---

**系列导航**：[1 从零搭一个博客](/posts/blog-setup/) · [2 给静态博客接一个能登录的后台](/posts/blog-admin/) · [3 卡了我半天的那些坑](/posts/blog-pitfalls/)
