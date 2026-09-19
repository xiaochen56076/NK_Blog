/**
 * Cloudflare Pages Function：Sveltia CMS 的 GitHub OAuth 登录代理
 *
 * 路由（本文件是 /api/* 的捕获路由，内部自行分发）：
 *   GET /api/auth       发起授权（302 跳到 GitHub）
 *   GET /api/callback   GitHub 回调：用 code 换 token → 校验用户名白名单 → 把 token 交给后台窗口
 *   其它路径             404
 *
 * 需要的环境变量（Cloudflare Pages → Settings → Variables and Secrets）：
 *   GITHUB_CLIENT_ID        GitHub OAuth App 的 Client ID
 *   GITHUB_CLIENT_SECRET    GitHub OAuth App 的 Client Secret（机密，只存在服务端）
 *   ALLOWED_GITHUB_LOGIN    只允许这个 GitHub 用户名登录，例如 xiaochen56076
 *   ALLOWED_DOMAINS         允许使用本代理的站点域名，例如 56076077.xyz（可含 * 通配）
 *   可选：GITHUB_HOSTNAME（GitHub Enterprise）、GITHUB_API_BASE（自测用）
 *
 * 协议与官方 sveltia-cms-auth 保持一致（CSRF cookie + postMessage 握手），
 * 额外增加了「用户名白名单」：非白名单账号连 token 都拿不到。
 *
 * @see https://github.com/sveltia/sveltia-cms-auth
 */

const PROVIDER = "github";
const DEFAULT_SCOPE = "public_repo";
/** 允许客户端申请的 scope（Sveltia 用 backend.auth_scope 指定），其余一律回落到默认值 */
const ALLOWED_SCOPES = ["repo", "public_repo", "user", "read:user", "user:email"];

/** 把值安全地嵌进内联 <script>（避免 </script> 注入） */
const serialize = (value) => JSON.stringify(value ?? null).replaceAll("<", "\\u003c");

/** GitHub 站点地址（GitHub Enterprise 用 GITHUB_HOSTNAME 覆盖；本机自测可用 GITHUB_WEB_BASE 指向 mock） */
const getWebBase = (env) => env.GITHUB_WEB_BASE ?? `https://${env.GITHUB_HOSTNAME ?? "github.com"}`;

/** GitHub API 地址（同上，自测可用 GITHUB_API_BASE 覆盖） */
const getApiBase = (env) => env.GITHUB_API_BASE ?? "https://api.github.com";

/** 把 ALLOWED_DOMAINS（逗号分隔，可用 * 通配）转成锚定的正则源 */
const getDomainPatterns = (allowedDomains) =>
	(allowedDomains ?? "")
		.split(",")
		.map((str) => str.trim())
		.filter(Boolean)
		.map((str) => `^${str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replaceAll("\\*", ".+")}$`);

/**
 * 返回与 opener 握手的 HTML：先告诉后台「我准备好了」，收到 authorizing:github 后回传结果。
 * @param {{ token?: string, error?: string, errorCode?: string, env?: Record<string,string> }} args
 */
const outputHTML = ({ token, error, errorCode, env = {} }) => {
	const state = error ? "error" : "success";
	const content = error
		? { provider: PROVIDER, error, errorCode }
		: { provider: PROVIDER, token };
	const patterns = serialize(getDomainPatterns(env.ALLOWED_DOMAINS));
	const hasToken = serialize(!!token);
	const detail = error ? String(error) : "登录成功，正在返回后台…";

	return new Response(
		`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="robots" content="noindex">
<title>NK_Blog 后台登录</title></head><body>
<div id="msg" style="font-family:system-ui,'Microsoft YaHei',sans-serif;color:#555;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;padding:1rem;line-height:1.6">
${detail.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c])}
</div>
<script>
(() => {
  const trustedPatterns = ${patterns};
  const hasToken = ${hasToken};
  const isTrusted = (origin) => {
    try {
      const { hostname } = new URL(origin);
      return trustedPatterns.some((pattern) => new RegExp(pattern).test(hostname));
    } catch {
      return false;
    }
  };
  window.addEventListener('message', ({ data, origin }) => {
    if (data !== 'authorizing:${PROVIDER}') return;
    // origin 由浏览器设置、无法伪造；带 token 时只回传给受信任域名
    if (hasToken && trustedPatterns.length && !isTrusted(origin)) return;
    window.opener?.postMessage(
      'authorization:${PROVIDER}:${state}:${JSON.stringify(content)}',
      origin,
    );
  });
  window.opener?.postMessage('authorizing:${PROVIDER}', '*');
})();
</script></body></html>`,
		{
			headers: {
				"Content-Type": "text/html;charset=UTF-8",
				"Cache-Control": "no-store",
				// 用完即删 CSRF cookie
				"Set-Cookie": "csrf-token=deleted; HttpOnly; Max-Age=0; Path=/; SameSite=Lax; Secure",
			},
		},
	);
};

/** 第一步：跳转到 GitHub 授权页，并种下 CSRF cookie */
const handleAuth = async (request, env) => {
	const { searchParams } = new URL(request.url);
	const provider = searchParams.get("provider") ?? PROVIDER;
	const siteId = searchParams.get("site_id") ?? "";
	const requestedScope = searchParams.get("scope") ?? "";

	if (provider !== PROVIDER) {
		return outputHTML({
			env,
			error: "这个后台只支持 GitHub 登录",
			errorCode: "UNSUPPORTED_BACKEND",
		});
	}

	if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
		return outputHTML({
			env,
			error: "服务端未配置 GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET",
			errorCode: "MISCONFIGURED_CLIENT",
		});
	}

	// 只允许自己的站点使用这个代理，避免被别人白嫖
	const patterns = getDomainPatterns(env.ALLOWED_DOMAINS);
	if (patterns.length && !patterns.some((pattern) => new RegExp(pattern).test(siteId))) {
		return outputHTML({
			env,
			error: `域名 ${siteId || "(空)"} 不允许使用本登录代理`,
			errorCode: "UNSUPPORTED_DOMAIN",
		});
	}

	// scope 白名单：客户端只能申请更窄的权限，不能申请更宽的
	const scopes = requestedScope.split(/[\s,]+/).filter(Boolean);
	const scope =
		scopes.length > 0 && scopes.every((s) => ALLOWED_SCOPES.includes(s))
			? scopes.join(",")
			: DEFAULT_SCOPE;

	const csrfToken = crypto.randomUUID().replaceAll("-", "");
	const params = new URLSearchParams({
		client_id: env.GITHUB_CLIENT_ID,
		scope,
		state: csrfToken,
	});

	return new Response("", {
		status: 302,
		headers: {
			Location: `${getWebBase(env)}/login/oauth/authorize?${params.toString()}`,
			"Cache-Control": "no-store",
			"Set-Cookie": `csrf-token=${PROVIDER}_${csrfToken}; HttpOnly; Path=/; Max-Age=600; SameSite=Lax; Secure`,
		},
	});
};

/** 第二步：校验 CSRF → 换 token → 校验用户名白名单 → 回传给后台 */
const handleCallback = async (request, env) => {
	const { searchParams } = new URL(request.url);
	const code = searchParams.get("code");
	const state = searchParams.get("state");
	const cookie = request.headers.get("Cookie") ?? "";
	const [, cookieProvider, csrfToken] =
		cookie.match(/\bcsrf-token=([a-z-]+?)_([0-9a-f]{32})\b/) ?? [];

	if (cookieProvider !== PROVIDER) {
		return outputHTML({
			env,
			error: "登录会话已失效，请回到后台重新登录",
			errorCode: "UNSUPPORTED_BACKEND",
		});
	}

	if (!code || !state) {
		return outputHTML({
			env,
			error: "没有收到授权码，请重新登录",
			errorCode: "AUTH_CODE_REQUEST_FAILED",
		});
	}

	if (!csrfToken || state !== csrfToken) {
		return outputHTML({
			env,
			error: "检测到 CSRF 风险，已中止登录",
			errorCode: "CSRF_DETECTED",
		});
	}

	const webBase = getWebBase(env);
	const apiBase = getApiBase(env);

	// 1) 用 code 换 access_token（client_secret 只在服务端出现，绝不进浏览器）
	let token = "";
	let ghError = "";
	try {
		const res = await fetch(`${webBase}/login/oauth/access_token`, {
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				"User-Agent": "NK_Blog-CMS-OAuth",
			},
			body: JSON.stringify({
				code,
				client_id: env.GITHUB_CLIENT_ID,
				client_secret: env.GITHUB_CLIENT_SECRET,
			}),
		});
		// 先取原始文本再解析：出错时能把 GitHub 的原文写进 Cloudflare Functions 日志
		const raw = await res.text();
		let data = {};
		try {
			data = JSON.parse(raw);
		} catch {
			data = {};
		}
		token = data.access_token ?? "";
		ghError = data.error_description ?? data.error ?? "";
		if (!token) {
			console.error(
				`[oauth] 换取令牌失败 status=${res.status} body=${raw.slice(0, 400)}`,
			);
		}
	} catch {
		return outputHTML({
			env,
			error: "请求 GitHub 换取令牌失败，请稍后重试",
			errorCode: "TOKEN_REQUEST_FAILED",
		});
	}

	if (!token) {
		return outputHTML({
			env,
			error: ghError ? `GitHub 拒绝了这次登录：${ghError}` : "GitHub 未返回访问令牌",
			errorCode: "TOKEN_REQUEST_FAILED",
		});
	}

	// 2) 用户名白名单：只有指定账号能拿到 token（可写多个，逗号分隔）
	if (env.ALLOWED_GITHUB_LOGIN) {
		const allowed = env.ALLOWED_GITHUB_LOGIN.split(",")
			.map((name) => name.trim().toLowerCase())
			.filter(Boolean);

		let login = "";
		try {
			const res = await fetch(`${apiBase}/user`, {
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/vnd.github+json",
					"User-Agent": "NK_Blog-CMS-OAuth",
				},
			});
			const user = await res.json();
			login = typeof user?.login === "string" ? user.login : "";
		} catch {
			// 校验过程出错一律按「不通过」处理
		}

		if (allowed.length > 0 && !allowed.includes(login.toLowerCase())) {
			console.warn(`[oauth] 拒绝登录 user=${login || "(未知)"} 不在白名单`);
			return outputHTML({
				env,
				error: `GitHub 账号 ${login || "(未知)"} 没有这个后台的权限`,
				errorCode: "UNAUTHORIZED_USER",
			});
		}

		console.log(`[oauth] 登录成功 user=${login}`);
	}

	return outputHTML({ env, token });
};

export async function onRequestGet({ request, env }) {
	const { pathname } = new URL(request.url);
	const path = pathname.replace(/\/+$/, "");

	if (path === "/api/auth" || path === "/api/oauth/authorize") {
		return handleAuth(request, env);
	}

	if (path === "/api/callback" || path === "/api/oauth/redirect") {
		return handleCallback(request, env);
	}

	return new Response("Not Found", {
		status: 404,
		headers: { "Content-Type": "text/plain;charset=UTF-8" },
	});
}
