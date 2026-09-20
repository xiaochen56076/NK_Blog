<script lang="ts">
import Icon from "@iconify/svelte";
import { onMount, tick } from "svelte";

// 文章分享按钮。
// 交互：
//   - 触屏设备（手机/平板）且浏览器支持 Web Share API → 直接唤起系统分享面板（微信、QQ 都在里面）
//   - 桌面端 → 弹出小面板：复制链接 + 微博 / X / Telegram / QQ 空间
// 说明：微信没有开放网页分享接口，所以只能"复制链接后去微信粘贴"，面板里给了提示。
export let url = "";
export let title = "";

let open = false;
let copied = false;
let copyFailed = false;
let canNativeShare = false;
let preferNative = false;
let portalEl: HTMLDivElement | undefined;

/**
 * 打开分享面板。
 *
 * 关键：面板遮罩会被移动到 <body> 下 —— 因为主题的入场动画（.onload-animation
 * 用的是 transform 动画）会让祖先元素成为 fixed 定位的包含块，
 * 那样 position:fixed 就变成"相对那个祖先定位"，面板会跟着文章滚动，
 * 而不是固定在视口正中。（音乐播放器的迷你窗也是同样的处理）
 */
async function openPanel() {
	open = true;
	await tick();
	if (portalEl && portalEl.parentElement !== document.body) {
		document.body.appendChild(portalEl);
	}
}

onMount(() => {
	canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
	// 判定为"手机/平板"：更宽松一点，触屏设备或粗指针都算
	const coarse =
		window.matchMedia("(pointer: coarse)").matches ||
		window.matchMedia("(any-pointer: coarse)").matches;
	const touch = (navigator.maxTouchPoints ?? 0) > 0;
	preferNative = canNativeShare && (coarse || touch);
});

const enc = (s: string) => encodeURIComponent(s);

const shareTargets = () => [
	{
		name: "QQ 好友",
		icon: "fa6-brands:qq",
		// 官方页面标题为「发送给QQ好友和群组」：手机扫码/登录后可发给好友或群
		href: `https://connect.qq.com/widget/shareqq/index.html?url=${enc(url)}&title=${enc(title)}`,
	},
	{
		name: "QQ 空间",
		icon: "fa6-brands:qq",
		// 官方页面标题为「分享到QQ空间」
		href: `https://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshare_onekey?url=${enc(url)}&title=${enc(title)}`,
	},
	{
		name: "微博",
		icon: "fa6-brands:weibo",
		href: `https://service.weibo.com/share/share.php?url=${enc(url)}&title=${enc(title)}`,
	},
	{
		name: "X",
		icon: "fa6-brands:x-twitter",
		href: `https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(title)}`,
	},
	{
		name: "Telegram",
		icon: "fa6-brands:telegram",
		href: `https://t.me/share/url?url=${enc(url)}&text=${enc(title)}`,
	},
];

async function onShareClick() {
	if (preferNative) {
		try {
			await navigator.share({ title, url });
			return;
		} catch {
			// 用户取消或系统面板不可用 → 退回自建面板
		}
	}
	await openPanel();
}

async function nativeShare() {
	try {
		await navigator.share({ title, url });
		open = false;
	} catch {
		// 取消就不做事
	}
}

// 复制到剪贴板：优先用现代 API；失败（非安全上下文、权限被拒、老浏览器）时退回
// 临时 textarea + execCommand 的兼容写法；再不行就交给界面显示明文让用户手动复制。
async function copyToClipboard(text: string): Promise<boolean> {
	try {
		if (navigator.clipboard?.writeText) {
			await navigator.clipboard.writeText(text);
			return true;
		}
	} catch {
		// 继续走兜底方案
	}
	try {
		const ta = document.createElement("textarea");
		ta.value = text;
		ta.setAttribute("readonly", "");
		ta.style.position = "fixed";
		ta.style.top = "-1000px";
		ta.style.opacity = "0";
		document.body.appendChild(ta);
		ta.select();
		ta.setSelectionRange(0, text.length);
		const ok = document.execCommand("copy");
		document.body.removeChild(ta);
		return ok;
	} catch {
		return false;
	}
}

async function copyLink() {
	const ok = await copyToClipboard(url);
	copied = ok;
	copyFailed = !ok;
	if (ok) {
		window.setTimeout(() => (copied = false), 1800);
	}
}

function close() {
	open = false;
}

function onKeydown(event: KeyboardEvent) {
	if (event.key === "Escape") close();
}
</script>

<svelte:window on:keydown={onKeydown} />

<button
    type="button"
    aria-label="分享这篇文章"
    on:click={onShareClick}
    class="btn-plain scale-animation rounded-lg h-7 px-2.5 flex items-center gap-1.5 active:scale-95"
    title="分享这篇文章"
>
    <Icon icon="material-symbols:share-outline" class="text-[1.05rem]"></Icon>
    <span class="text-sm">分享</span>
</button>

{#if open}
    <div
        bind:this={portalEl}
        class="fixed inset-0 z-[100] flex items-center justify-center px-4"
        role="presentation"
        on:click={close}
    >
        <!-- 遮罩 -->
        <div class="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition"></div>

        <!-- 面板 -->
        <div
            class="card-base relative w-full max-w-[24rem] p-5 rounded-[var(--radius-large)] shadow-xl dark:shadow-2xl dark:shadow-black/50"
            role="dialog"
            aria-modal="true"
            aria-label="分享这篇文章"
            on:click={(e) => e.stopPropagation()}
        >
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-2 font-bold text-lg text-neutral-900 dark:text-neutral-100">
                    <Icon icon="material-symbols:share-outline" class="text-[1.25rem] text-[var(--primary)]"></Icon>
                    分享这篇文章
                </div>
                <button
                    type="button"
                    aria-label="关闭"
                    on:click={close}
                    class="btn-plain scale-animation rounded-lg h-8 w-8 flex items-center justify-center active:scale-90"
                >
                    <Icon icon="material-symbols:close-rounded" class="text-[1.25rem]"></Icon>
                </button>
            </div>

            <button
                type="button"
                on:click={copyLink}
                class="w-full flex items-center justify-between gap-3 px-3 py-2.5 mb-3 rounded-lg transition
                       bg-[var(--btn-plain-bg-hover)] hover:bg-[var(--btn-plain-bg-active)] active:scale-[0.98]"
            >
                <span class="flex items-center gap-2 min-w-0">
                    <Icon
                        icon={copied ? "material-symbols:check-circle-rounded" : "material-symbols:link-rounded"}
                        class={`text-[1.15rem] shrink-0 ${copied ? "text-green-500" : "text-[var(--primary)]"}`}
                    ></Icon>
                    <span class="text-sm font-medium truncate">{copied ? "链接已复制！" : "复制链接"}</span>
                </span>
                <span class="text-xs text-black/40 dark:text-white/40 shrink-0">
                    {copied ? "去微信粘贴给好友" : "手机 / 电脑通用"}
                </span>
            </button>

            {#if copyFailed}
                <div class="mb-3">
                    <div class="text-xs text-amber-600 dark:text-amber-400 mb-1.5">
                        自动复制失败，请长按/选中下面的链接手动复制：
                    </div>
                    <input
                        readonly
                        value={url}
                        on:focus={(e) => e.currentTarget.select()}
                        class="w-full text-xs px-2.5 py-2 rounded-lg bg-black/5 dark:bg-white/10
                               text-black/70 dark:text-white/70 border border-[var(--line-divider)]"
                    />
                </div>
            {/if}

            <div class="grid grid-cols-2 gap-2">
                {#each shareTargets() as t}
                    <a
                        href={t.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="flex items-center gap-2 px-3 py-2.5 rounded-lg transition
                               text-black/75 dark:text-white/75 font-medium text-sm
                               hover:bg-[var(--btn-plain-bg-hover)] hover:text-[var(--primary)] active:scale-[0.98]"
                    >
                        <Icon icon={t.icon} class="text-[1.15rem] text-[var(--primary)]"></Icon>
                        {t.name}
                    </a>
                {/each}
            </div>

            {#if canNativeShare}
                <button
                    type="button"
                    on:click={nativeShare}
                    class="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg transition
                           text-black/75 dark:text-white/75 font-medium text-sm
                           hover:bg-[var(--btn-plain-bg-hover)] hover:text-[var(--primary)] active:scale-[0.98]"
                >
                    <Icon icon="material-symbols:ios-share-rounded" class="text-[1.15rem] text-[var(--primary)]"></Icon>
                    系统分享（含微信 / QQ）
                </button>
            {/if}

            <div class="mt-3 text-xs text-black/40 dark:text-white/40 leading-relaxed">
                微信没有开放网页分享接口，所以想发微信请用「复制链接」再粘贴给好友。
            </div>
        </div>
    </div>
{/if}
