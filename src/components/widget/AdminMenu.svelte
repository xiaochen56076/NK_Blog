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

// 点击面板外部、或按 Esc 关闭（与主题其它浮层行为一致）
function handleDocumentClick(event: MouseEvent) {
	if (!open) return;
	const target = event.target;
	if (!(target instanceof Node)) return;
	if (document.getElementById(PANEL_ID)?.contains(target)) return;
	if (document.getElementById(SWITCH_ID)?.contains(target)) return;
	open = false;
}

function handleKeydown(event: KeyboardEvent) {
	if (event.key === "Escape") open = false;
}

onMount(() => {
	document.addEventListener("click", handleDocumentClick);
	document.addEventListener("keydown", handleKeydown);
	return () => {
		document.removeEventListener("click", handleDocumentClick);
		document.removeEventListener("keydown", handleKeydown);
	};
});
</script>

<button
    id={SWITCH_ID}
    aria-label="后台设置"
    aria-expanded={open}
    on:click={() => (open = !open)}
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
