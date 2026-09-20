<script lang="ts">
import Icon from "@iconify/svelte";
import { onMount, tick } from "svelte";
import type { MusicTrack } from "@/types/config";

export let tracks: MusicTrack[] = [];
export let cardTitle = "音乐";
export let autoplay = false;
/** 可选：返回 MusicTrack[] 的接口地址（自建音乐 API / 歌单代理），填了就用接口数据 */
export let playlistUrl = "";

let index = 0;
let playing = false;
let expanded = false;
let currentTime = 0;
let duration = 0;
let errorMsg = "";

let audio: HTMLAudioElement;
let miniEl: HTMLDivElement;
let cardCover: HTMLDivElement;
let miniCover: HTMLDivElement;

$: track = tracks[index];
$: hasTracks = tracks.length > 0;
$: progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

function fmt(t: number) {
	if (!Number.isFinite(t) || t < 0) return "0:00";
	const m = Math.floor(t / 60);
	const s = Math.floor(t % 60)
		.toString()
		.padStart(2, "0");
	return `${m}:${s}`;
}

async function playAt(i: number) {
	if (!hasTracks || !audio) return;
	const changed = i !== index;
	index = ((i % tracks.length) + tracks.length) % tracks.length;
	if (changed) await tick();
	try {
		await audio.play();
		playing = true;
		errorMsg = "";
	} catch {
		// 通常是浏览器的自动播放限制：需要用户再点一次
		playing = false;
		errorMsg = "浏览器阻止了播放，请再点一次播放按钮";
	}
}

function pause() {
	audio?.pause();
	playing = false;
}
function toggle() {
	if (playing) pause();
	else playAt(index);
}
function next() {
	playAt(index + 1);
}
function prev() {
	playAt(index - 1);
}

function onTime() {
	if (audio) currentTime = audio.currentTime;
}
function onMeta() {
	if (!audio) return;
	duration = Number.isFinite(audio.duration) ? audio.duration : 0;
}
function onError() {
	playing = false;
	errorMsg = "这首曲子加载失败，请检查 url 是否能访问";
}
function onEnded() {
	next();
}
function seek(event: Event) {
	const value = Number((event.currentTarget as HTMLInputElement).value);
	if (audio) {
		audio.currentTime = value;
		currentTime = value;
	}
}

/* 点击封面 / 列表按钮：展开或收回迷你窗（必须是切换，否则再点只会重放动画） */
async function toggleMini() {
	if (!hasTracks) return;
	if (expanded) {
		closeMini();
		return;
	}
	const source = cardCover?.getBoundingClientRect();
	expanded = true;
	await tick();
	const dest = miniCover?.getBoundingClientRect();
	if (source && dest && dest.width > 0 && miniCover) {
		const dx = source.left + source.width / 2 - (dest.left + dest.width / 2);
		const dy = source.top + source.height / 2 - (dest.top + dest.height / 2);
		const scale = source.width / dest.width;
		miniCover.animate(
			[
				{ transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: 0.75 },
				{ transform: "none", opacity: 1 },
			],
			{ duration: 420, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
		);
	}
}
function closeMini() {
	expanded = false;
}
function onKeydown(event: KeyboardEvent) {
	if (event.key === "Escape") closeMini();
}

/* 播放列表条目样式：当前曲目用主色 + 高亮底色
 * 注意：必须把「当前播放的下标」作为参数传进来。
 * 之前写成 itemClass(i) 并在函数体里读 index，Svelte 编译器看不到这个依赖，
 * 表达式会被当成静态的 —— 切歌后高亮不会更新（一直停在第 1 首）。 */
function itemClass(i: number, current: number) {
	const base =
		"flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition hover:bg-[var(--btn-plain-bg-hover)] active:bg-[var(--btn-plain-bg-active)] ";
	return (
		base +
		(i === current
			? "bg-[var(--btn-plain-bg-hover)] text-[var(--primary)] font-semibold"
			: "text-black/75 dark:text-white/75")
	);
}

onMount(() => {
	// 把迷你窗挂到 body 上：避免被祖先元素的 transform / 入场动画影响 fixed 定位
	if (miniEl && miniEl.parentElement !== document.body) {
		document.body.appendChild(miniEl);
	}
	document.addEventListener("keydown", onKeydown);
	if (autoplay) playAt(0);

	// 配置了歌单接口就读取它（失败则回退到 config 里的本地曲目）
	if (playlistUrl) {
		fetch(playlistUrl)
			.then((res) => res.json())
			.then((data) => {
				if (Array.isArray(data)) {
					const valid = data.filter((t) => t && typeof t.url === "string");
					if (valid.length > 0) {
						tracks = valid;
						if (index >= tracks.length) index = 0;
					}
				}
			})
			.catch(() => {
				errorMsg = "歌单接口读取失败，已回退到本地曲目列表";
			});
	}

	return () => document.removeEventListener("keydown", onKeydown);
});
</script>

{#if hasTracks}
    <!-- 侧栏小卡内容 -->
    <button
        class="group flex w-full items-center gap-3 text-left"
        on:click={toggleMini}
        aria-expanded={expanded}
        aria-label={expanded ? "收起音乐播放器" : "展开音乐播放器"}
    >
        <div
            bind:this={cardCover}
            class="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl
                bg-[var(--btn-regular-bg)] transition"
        >
            {#if track?.cover}
                <img src={track.cover} alt={track.title} class="h-full w-full object-cover" />
            {:else}
                <Icon icon="material-symbols:music-note-rounded" class="text-[1.75rem] text-[var(--btn-content)]"></Icon>
            {/if}
            <div class="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition group-hover:opacity-100">
                <Icon icon="material-symbols:open-in-full-rounded" class="text-[1.25rem] text-white"></Icon>
            </div>
        </div>
        <div class="min-w-0 flex-1">
            <div class="truncate font-bold transition text-black/75 dark:text-white/75">{track?.title}</div>
            <div class="truncate text-xs transition text-black/40 dark:text-white/40">{track?.artist ?? ""}</div>
            <div class="mt-0.5 truncate text-[0.7rem] transition text-[var(--primary)]">
                {playing ? "正在播放" : "点封面展开播放器"}
            </div>
        </div>
    </button>

    <div class="mt-3 flex items-center gap-2">
        <button class="btn-regular h-9 w-9 rounded-lg active:scale-90" on:click={prev} aria-label="上一首">
            <Icon icon="material-symbols:skip-previous-rounded" class="text-[1.25rem]"></Icon>
        </button>
        <button class="btn-regular h-9 w-9 rounded-lg active:scale-90" on:click={toggle} aria-label={playing ? "暂停" : "播放"}>
            <Icon icon={playing ? "material-symbols:pause-rounded" : "material-symbols:play-arrow-rounded"} class="text-[1.25rem]"></Icon>
        </button>
        <button class="btn-regular h-9 w-9 rounded-lg active:scale-90" on:click={next} aria-label="下一首">
            <Icon icon="material-symbols:skip-next-rounded" class="text-[1.25rem]"></Icon>
        </button>
        <button
            class="btn-plain ml-auto h-9 gap-1.5 rounded-lg px-3 text-sm font-bold active:scale-95"
            on:click={toggleMini}
            aria-expanded={expanded}
        >
            <Icon
                icon={expanded ? "material-symbols:close-rounded" : "material-symbols:playlist-play-rounded"}
                class="text-[1.25rem]"
            ></Icon>
            {expanded ? "收起" : "列表"}
        </button>
    </div>

    {#if errorMsg}
        <div class="mt-2 flex items-start gap-1.5 text-xs text-[var(--primary)]">
            <Icon icon="material-symbols:error-outline-rounded" class="mt-0.5 text-[0.9rem]"></Icon>
            <span>{errorMsg}</span>
        </div>
    {/if}

    <!-- 迷你播放器：常驻 DOM，靠 class 控制显隐；挂载后会被移动到 body 下 -->
    <!-- shadow：亮色用主题面板同款的 shadow-xl；暗色下黑投影几乎不可见，改用更深更大的一档来保持悬浮感 -->
    <div
        class="music-mini card-base shadow-xl dark:shadow-2xl dark:shadow-black/50"
        class:music-mini-open={expanded}
        bind:this={miniEl}
    >
        <div class="p-4">
            <div class="flex items-start gap-3">
                <div
                    bind:this={miniCover}
                    class="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl
                        bg-[var(--btn-regular-bg)] transition"
                >
                    {#if track?.cover}
                        <img src={track.cover} alt={track.title} class="h-full w-full object-cover" />
                    {:else}
                        <Icon icon="material-symbols:music-note-rounded" class="text-[2.5rem] text-[var(--btn-content)]"></Icon>
                    {/if}
                </div>

                <div class="min-w-0 flex-1">
                    <div class="truncate font-bold transition text-black/75 dark:text-white/75">{track?.title}</div>
                    <div class="truncate text-sm transition text-black/40 dark:text-white/40">{track?.artist ?? ""}</div>
                    <div class="mt-3 flex items-center gap-2">
                        <button class="btn-regular h-9 w-9 rounded-lg active:scale-90" on:click={prev} aria-label="上一首">
                            <Icon icon="material-symbols:skip-previous-rounded" class="text-[1.25rem]"></Icon>
                        </button>
                        <button class="btn-regular h-9 w-9 rounded-lg active:scale-90" on:click={toggle} aria-label={playing ? "暂停" : "播放"}>
                            <Icon icon={playing ? "material-symbols:pause-rounded" : "material-symbols:play-arrow-rounded"} class="text-[1.25rem]"></Icon>
                        </button>
                        <button class="btn-regular h-9 w-9 rounded-lg active:scale-90" on:click={next} aria-label="下一首">
                            <Icon icon="material-symbols:skip-next-rounded" class="text-[1.25rem]"></Icon>
                        </button>
                    </div>
                </div>

                <button class="btn-plain h-8 w-8 rounded-lg active:scale-90" on:click={closeMini} aria-label="收起播放器">
                    <Icon icon="material-symbols:close-rounded" class="text-[1.15rem]"></Icon>
                </button>
            </div>

            <div class="mt-3">
                <input
                    type="range"
                    class="music-progress"
                    min="0"
                    max={duration || 0}
                    step="1"
                    value={currentTime}
                    style={`--p:${progress}%`}
                    on:input={seek}
                    aria-label="播放进度"
                />
                <div class="mt-1 flex justify-between text-xs transition text-black/40 dark:text-white/40">
                    <span>{fmt(currentTime)}</span>
                    <span>{fmt(duration)}</span>
                </div>
            </div>

            <div class="mt-3 border-t border-dashed border-[var(--line-divider)] pt-3">
                <div class="flex items-center gap-1.5 text-sm font-bold transition text-black/75 dark:text-white/75">
                    <Icon icon="material-symbols:playlist-play-rounded" class="text-[1.25rem] text-[var(--primary)]"></Icon>
                    播放列表
                    <span class="text-xs font-normal text-black/30 dark:text-white/30">{tracks.length} 首</span>
                </div>
                <div class="music-list mt-2 max-h-52 overflow-y-auto pr-1">
                    {#each tracks as item, i}
                        <button
                            class={itemClass(i, index)}
                            on:click={() => playAt(i)}
                        >
                            <span class="w-4 shrink-0 text-center text-xs text-black/30 dark:text-white/30">
                                {i === index && playing ? "▶" : i + 1}
                            </span>
                            <span class="min-w-0 flex-1 truncate font-medium">{item.title}</span>
                            {#if item.artist}
                                <span class="max-w-[6rem] shrink-0 truncate text-xs text-black/30 dark:text-white/30">{item.artist}</span>
                            {/if}
                        </button>
                    {/each}
                </div>
            </div>
        </div>

        <audio
            bind:this={audio}
            src={track?.url}
            preload="metadata"
            on:timeupdate={onTime}
            on:loadedmetadata={onMeta}
            on:durationchange={onMeta}
            on:ended={onEnded}
            on:error={onError}
            on:play={() => (playing = true)}
            on:pause={() => (playing = false)}
        ></audio>
    </div>
{:else}
    <div class="text-sm leading-relaxed transition text-black/40 dark:text-white/40">
        还没有添加音乐。在 <code class="rounded bg-[var(--inline-code-bg)] px-1">src/config.ts</code> 的
        <code class="rounded bg-[var(--inline-code-bg)] px-1">musicConfig.tracks</code> 里填入曲目即可，
        详见 <code class="rounded bg-[var(--inline-code-bg)] px-1">docs/音乐播放器说明.md</code>。
    </div>
{/if}

<style lang="stylus">
/* 迷你播放器：固定在左下角，不贴边；与主题卡片同款（card-base + 主色点缀） */
.music-mini
    position: fixed
    left: 1.5rem
    bottom: 1.5rem
    /* 注意：不要在 Stylus 里写 CSS 的 min()/max()，它会被当成 Stylus 的数学函数而报错 */
    width: 21rem
    max-width: calc(100vw - 3rem)
    z-index: 45
    opacity: 0
    transform: translateY(0.75rem) scale(0.96)
    transform-origin: bottom left
    pointer-events: none
    transition: opacity 0.28s ease, transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)
    &.music-mini-open
        opacity: 1
        transform: none
        pointer-events: auto

@media (min-width: 1024px)
    .music-mini
        left: 2rem
        bottom: 2rem

.music-progress
    -webkit-appearance: none
    appearance: none
    width: 100%
    height: 0.375rem
    border-radius: 9999px
    outline: none
    cursor: pointer
    background: linear-gradient(to right, var(--primary) var(--p, 0%), var(--btn-regular-bg) var(--p, 0%))
    &::-webkit-slider-thumb
        -webkit-appearance: none
        height: 0.875rem
        width: 0.875rem
        border-radius: 9999px
        background: var(--primary)
        transition: transform 0.15s ease
        &:hover
            transform: scale(1.15)
    &::-moz-range-thumb
        height: 0.875rem
        width: 0.875rem
        border: none
        border-radius: 9999px
        background: var(--primary)
        cursor: pointer
</style>
