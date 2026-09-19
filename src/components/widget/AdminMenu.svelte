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

let open = false;

const items = [
	{
		label: "内容后台",
		hint: "写文章、传封面",
		href: url("/admin/"),
		icon: "material-symbols:edit-note-rounded",
		external: false,
	},
	{
		label: "GitHub 仓库",
		hint: "提交历史、回滚",
		href: "https://github.com/xiaochen56076/NK_Blog",
		icon: "fa6-brands:github",
		external: true,
	},
];

// 主题里其它浮层的 id：打开本面板前先把它们收起来，避免多个浮层叠在一起
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

// 点击面板外部、或按 Esc 关闭（与主题其它浮层行为一致）
function handleDocumentClick(event: MouseEvent) {
	const target = event.target;
	if (!(target instanceof Element)) return;

	// 点到任何链接都先收起：既包括面板内的「内容后台」「GitHub 仓库」，
	// 也包括站内跳转（Swup 无刷新切页不会重载导航栏，面板会一直挂着）
	if (target.closest("a")) {
		open = false;
		return;
	}

	if (!open) return;
	const switcher = document.getElementById(SWITCH_ID);
	if (switcher?.contains(target)) return;
	if (document.getElementById(PANEL_ID)?.contains(target)) return;
	open = false;
}

// Swup 站内切页后收起（导航栏在 swup 容器之外，不会被替换，也就不会触发 pagehide）
function handleSwupPageView() {
	open = false;
}

function handleKeydown(event: KeyboardEvent) {
	if (event.key === "Escape") open = false;
}

// 鼠标移到「亮色/暗色」按钮上会浮出它自己的面板（主题原有行为，且层级最高 z-50），此时收起本面板
function handleMouseOver(event: MouseEvent) {
	if (!open) return;
	const target = event.target;
	if (target instanceof Element && target.closest("#scheme-switch")) {
		open = false;
	}
}

// 离开页面 / 从浏览器缓存（bfcache）恢复时收起，避免「从后台返回后还一直挂着」
function handlePageHide() {
	open = false;
}

function handlePageShow(event: PageTransitionEvent) {
	if (event.persisted) open = false;
}

// 打开本面板前，先收起主题的其它浮层
function openPanel() {
	closeOtherPanels();
	open = true;
}

onMount(() => {
	document.addEventListener("click", handleDocumentClick);
	document.addEventListener("keydown", handleKeydown);
	document.addEventListener("mouseover", handleMouseOver);
	window.addEventListener("pagehide", handlePageHide);
	window.addEventListener("pageshow", handlePageShow);

	// 挂上 Swup 的切页钩子（swup 可能比本组件晚就绪，所以两种时机都兜住）
	const attachSwupHook = () => {
		const swup = (window as unknown as { swup?: { hooks?: { on?: (e: string, cb: () => void) => void } } }).swup;
		swup?.hooks?.on?.("page:view", handleSwupPageView);
	};
	attachSwupHook();
	document.addEventListener("swup:enable", attachSwupHook, { once: true });

	return () => {
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
    on:click={() => (open ? (open = false) : openPanel())}
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
