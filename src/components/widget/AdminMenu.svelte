<script lang="ts">
import Icon from "@iconify/svelte";
import { url } from "@utils/url-utils.ts";
import { onMount } from "svelte";

// 右上角的「后台设置」小菜单。
// 面板样式刻意与 widget/DisplaySettings.svelte（主题色面板）保持一致：
// 同样使用 float-panel / float-panel-closed 两个类，位置与动画都由主题 CSS 提供。
//
// 说明：这里的文案暂未走 i18n（本站只使用 zh_CN）。若以后要多语言，
// 需要在 src/i18n/i18nKey.ts 及 languages/*.ts 里补对应的键。
const PANEL_ID = "admin-menu-panel";
const SWITCH_ID = "admin-menu-switch";
// 版本标记：方便在浏览器控制台确认当前页面跑的是哪一版代码
const PANEL_VERSION = "v6";

let open = false;

const items = [
	{
		label: "内容后台",
		hint: "写文章、传封面",
		href: url("/admin/"),
		icon: "material-symbols:edit-note-rounded",
		external: false,
		// 后台页没有 main 容器，若走 Swup 的无刷新跳转，浏览器会报
		// 「Container missing in incoming document: main」并中止整个跳转，
		// 页面被留在半截状态。所以这个链接必须整页加载：data-no-swup 是 Swup 的忽略标记。
		noSwup: true,
	},
	{
		label: "GitHub 仓库",
		hint: "提交历史、回滚",
		href: "https://github.com/xiaochen56076/NK_Blog",
		icon: "fa6-brands:github",
		external: true,
		noSwup: false,
	},
];

// 主题里其它浮层的 id：本面板打开前先把它们收起来，避免多个浮层叠在一起
const OTHER_PANEL_IDS = [
	"display-setting", // 主题色（DisplaySettings.svelte）
	"nav-menu-panel", // 移动端导航（NavMenuPanel.astro）
	"search-panel", // 搜索（Search.svelte）
	"light-dark-panel", // 亮色/暗色/跟随系统（LightDarkSwitch.svelte）
];

function closeOtherPanels() {
	for (const id of OTHER_PANEL_IDS) {
		document.getElementById(id)?.classList.add("float-panel-closed");
	}
}

// 统一的「全部收起」入口。reason 会打到控制台，方便排查"面板为什么还开着"。
//
// 为什么这里要**同时**改状态和 DOM 类名（而不只改状态交给 Svelte 渲染）：
// 浏览器进入 bfcache 时会在 pagehide 之后立刻冻结页面，Svelte 的异步 DOM 更新
// 很可能来不及执行；恢复后状态已经是 false、DOM 却还是"打开"，且状态没有变化，
// Svelte 不会再渲染一次 —— 面板就会永久卡在打开的样子，只能靠刷新。
function closeAllPanels(reason = "") {
	const wasOpen = open;
	open = false;
	const panel = document.getElementById(PANEL_ID);
	if (panel) panel.classList.add("float-panel-closed");
	closeOtherPanels();
	if (wasOpen) {
		// 用 debug 级别：控制台默认不显示，排查时在 DevTools 里打开 Verbose 即可看到
		console.debug(`[后台设置] 面板已收起（${reason || "未注明原因"}）`);
	}
}

function openPanel() {
	closeOtherPanels();
	open = true;
	console.debug("[后台设置] 面板已打开");
}

// 点击面板外部、或按 Esc 关闭（与主题其它浮层行为一致）
function handleDocumentClick(event: MouseEvent) {
	const target = event.target;
	if (!(target instanceof Element)) return;

	// 点到任何链接都先收起：既包括面板内的「内容后台」「GitHub 仓库」，
	// 也包括站内跳转（Swup 无刷新切页不会重载导航栏，面板会一直挂着）
	if (target.closest("a")) {
		closeAllPanels("点击链接");
		return;
	}

	if (!open) return;
	const switcher = document.getElementById(SWITCH_ID);
	if (switcher?.contains(target)) return;
	if (document.getElementById(PANEL_ID)?.contains(target)) return;
	closeAllPanels("点击面板外部");
}

function handleKeydown(event: KeyboardEvent) {
	if (event.key === "Escape") closeAllPanels("按 Esc");
}

// 鼠标移到「亮色/暗色」按钮上会浮出它自己的面板（主题原有行为，且层级最高 z-50），此时收起本面板
function handleMouseOver(event: MouseEvent) {
	if (!open) return;
	const target = event.target;
	if (target instanceof Element && target.closest("#scheme-switch")) {
		closeAllPanels("鼠标移到亮暗按钮");
	}
}

// Swup 切页完成 / 开始跳转时收起。
// 注意 visit:start 也要挂：跳转被中止（例如目标页缺容器）时不会走到 page:view，
// 只挂 page:view 会漏掉这种情况。
function handleSwupPageView() {
	closeAllPanels("Swup 切页完成");
}

function handleSwupVisitStart() {
	closeAllPanels("Swup 开始跳转");
}

// 离开页面 / 从浏览器缓存（bfcache）恢复时收起，避免「从后台返回后还一直挂着」
function handlePageHide() {
	closeAllPanels("离开页面");
}

function handlePageShow() {
	// 不论是否来自 bfcache，恢复时都对齐一次（幂等，代价极低）
	closeAllPanels("页面恢复");
}

onMount(() => {
	// 版本标记（在控制台执行 window.__adminMenuV 即可确认是否加载了最新代码）
	(window as unknown as { __adminMenuV?: string }).__adminMenuV = PANEL_VERSION;
	console.debug(`[后台设置] 面板模块已加载 ${PANEL_VERSION}`);

	// 挂载时先对齐一次：万一 DOM 上残留着"打开"状态（HMR、异常中断、bfcache），这里会修好
	closeAllPanels("组件挂载");

	document.addEventListener("click", handleDocumentClick);
	document.addEventListener("keydown", handleKeydown);
	document.addEventListener("mouseover", handleMouseOver);
	window.addEventListener("pagehide", handlePageHide);
	window.addEventListener("pageshow", handlePageShow);

	// 兜底：主题的任一浮层一旦被打开（不论点击、悬停还是别的方式），立刻收起本面板。
	// 这样"两个浮层同时开着"在结构上就不可能发生。
	const observer = new MutationObserver(() => {
		if (!open) return;
		for (const id of OTHER_PANEL_IDS) {
			const el = document.getElementById(id);
			if (el && !el.classList.contains("float-panel-closed")) {
				closeAllPanels(`主题浮层 ${id} 被打开`);
				return;
			}
		}
	});
	observer.observe(document.body, {
		attributes: true,
		attributeFilter: ["class"],
		subtree: true,
	});

	// 挂上 Swup 的钩子（swup 可能比本组件晚就绪，所以两种时机都兜住）
	const attachSwupHook = () => {
		const swup = (window as unknown as {
			swup?: { hooks?: { on?: (e: string, cb: () => void) => void } };
		}).swup;
		swup?.hooks?.on?.("page:view", handleSwupPageView);
		swup?.hooks?.on?.("visit:start", handleSwupVisitStart);
	};
	attachSwupHook();
	document.addEventListener("swup:enable", attachSwupHook, { once: true });

	return () => {
		observer.disconnect();
		document.removeEventListener("click", handleDocumentClick);
		document.removeEventListener("keydown", handleKeydown);
		document.removeEventListener("mouseover", handleMouseOver);
		document.removeEventListener("swup:enable", attachSwupHook);
		window.removeEventListener("pagehide", handlePageHide);
		window.removeEventListener("pageshow", handlePageShow);
	};
});
</script>

<button
    id={SWITCH_ID}
    aria-label="后台设置"
    aria-expanded={open}
    on:click={() => (open ? closeAllPanels("再次点击齿轮") : openPanel())}
    class="btn-plain scale-animation rounded-lg w-11 h-11 active:scale-90"
    class:text-[var(--primary)]={open}
>
    <Icon icon="material-symbols:settings-outline" class="text-[1.25rem]"></Icon>
</button>

<div
    id={PANEL_ID}
    class="float-panel absolute transition-all w-72 right-4 px-2 py-3"
    class:float-panel-closed={!open}
>
    <div class="flex gap-2 font-bold text-lg text-neutral-900 dark:text-neutral-100 transition relative ml-3 mb-2
        before:w-1 before:h-4 before:rounded-md before:bg-[var(--primary)]
        before:absolute before:-left-3 before:top-[0.33rem]"
    >
        后台设置
    </div>
    {#each items as item}
        <a
            href={item.href}
            target={item.external ? "_blank" : null}
            rel={item.external ? "noopener noreferrer" : null}
            data-no-swup={item.noSwup ? "true" : undefined}
            class="group flex justify-between items-center py-2 pl-3 pr-1 rounded-lg gap-4
                hover:bg-[var(--btn-plain-bg-hover)] active:bg-[var(--btn-plain-bg-active)] transition"
        >
            <span class="flex items-center gap-2 min-w-0">
                <Icon icon={item.icon} class="text-[1.25rem] text-[var(--primary)] shrink-0"></Icon>
                <span class="flex flex-col min-w-0">
                    <span class="transition text-black/75 dark:text-white/75 font-bold group-hover:text-[var(--primary)]">
                        {item.label}
                    </span>
                    <span class="transition text-xs text-black/40 dark:text-white/40">{item.hint}</span>
                </span>
            </span>
            {#if item.external}
                <Icon icon="fa6-solid:arrow-up-right-from-square"
                      class="transition text-[0.75rem] text-black/25 dark:text-white/25 shrink-0"
                ></Icon>
            {:else}
                <Icon icon="material-symbols:chevron-right-rounded"
                      class="transition text-[1.25rem] text-[var(--primary)] shrink-0"
                ></Icon>
            {/if}
        </a>
    {/each}
</div>
