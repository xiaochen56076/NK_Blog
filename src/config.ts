import type {
	ExpressiveCodeConfig,
	LicenseConfig,
	MusicConfig,
	NavBarConfig,
	ProfileConfig,
	SiteConfig,
} from "./types/config";
import { LinkPreset } from "./types/config";
import { generatedPlaylist } from "./music-playlist";

export const siteConfig: SiteConfig = {
	title: "Nskdfh 的博客",
	subtitle: "个人博客",
	lang: "zh_CN", // Language code, e.g. 'en', 'zh_CN', 'ja', etc.
	themeColor: {
		hue: 250, // Default hue for the theme color, from 0 to 360. e.g. red: 0, teal: 200, cyan: 250, pink: 345
		fixed: false, // Hide the theme color picker for visitors
	},
	banner: {
		enable: false,
		src: "https://avatars.githubusercontent.com/u/109741625?v=4", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
		position: "center", // Equivalent to object-position, only supports 'top', 'center', 'bottom'. 'center' by default
		credit: {
			enable: false, // Display the credit text of the banner image
			text: "", // Credit text to be displayed
			url: "", // (Optional) URL link to the original artwork or artist's page
		},
	},
	toc: {
		enable: true, // Display the table of contents on the right side of the post
		depth: 2, // Maximum heading depth to show in the table, from 1 to 3
	},
	favicon: [
		// Leave this array empty to use the default favicon
		// {
		//   src: '/favicon/icon.png',    // Path of the favicon, relative to the /public directory
		//   theme: 'light',              // (Optional) Either 'light' or 'dark', set only if you have different favicons for light and dark mode
		//   sizes: '32x32',              // (Optional) Size of the favicon, set only if you have favicons of different sizes
		// }
	],
};

export const navBarConfig: NavBarConfig = {
	links: [
		LinkPreset.Home,
		LinkPreset.Archive,
		LinkPreset.About,
		{
			name: "GitHub",
			url: "https://github.com/xiaochen56076", // Internal links should not include the base path, as it is automatically added
			external: true, // Show an external link icon and will open in a new tab
		},
	],
};

export const profileConfig: ProfileConfig = {
	avatar: "assets/images/github-avatar.png", // GitHub 头像，用 pnpm run sync-avatar 重新同步
	name: "Nskdfh",
	bio: "这里是一段个人简介。",
	links: [
		{
			name: "QQ",
			icon: "fa6-brands:qq", // 图标来自已装的 fa6-brands 图标集
			// 点一下会唤起 QQ 加好友；没装 QQ 的访客会看到腾讯的网页提示
			url: "https://wpa.qq.com/msgrd?v=3&uin=1283048178&site=qq&menu=yes",
		},
		{
			name: "邮箱",
			icon: "fa6-solid:envelope",
			url: "mailto:nskdfh@163.com",
		},
		{
			name: "GitHub",
			icon: "fa6-brands:github",
			url: "https://github.com/xiaochen56076",
		},
	],
};

export const licenseConfig: LicenseConfig = {
	enable: true,
	name: "CC BY-NC-SA 4.0",
	url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
};

export const expressiveCodeConfig: ExpressiveCodeConfig = {
	// Note: Some styles (such as background color) are being overridden, see the astro.config.mjs file.
	// Please select a dark theme, as this blog theme currently only supports dark background color
	theme: "github-dark",
};

/* ---------------- 侧栏音乐播放器 ---------------- */
/* 详细说明见 docs/音乐播放器说明.md */
export const musicConfig: MusicConfig = {
	enable: true,
	title: "音乐",
	// 多数浏览器会拦截自动播放，所以默认关闭（用户点一次播放后才会有声音）
	autoplay: false,
	/*
	 * 预留：以后自建音乐 API（自己服务器上的歌单接口，或第三方歌单代理）时，
	 * 把返回 MusicTrack[] 的接口地址填这里，播放器会优先使用接口数据：
	 *   playlistUrl: "https://你的服务器/api/playlist",
	 */
	playlistUrl: "",
	// 曲目来自 src/music-playlist.ts —— 由 scripts/make-playlist.mjs 扫描 public/music/ 自动生成。
	// 新增音乐：把音频放进 public/music/（文件名建议「曲名 - 歌手.mp3」）后执行 pnpm run music，
	// 或者直接提交推送（构建时会自动执行）。下面这几首示例只在目录里还没有音频时才显示。
	tracks:
		generatedPlaylist.length > 0
			? generatedPlaylist
			: [
		// ↓↓↓ 以下 3 首是「示例曲目」，只为了让你先看到效果；正式发布请替换成你自己的音乐
		{
			title: "示例曲目 One",
			artist: "SoundHelix",
			url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
		},
		{
			title: "示例曲目 Two",
			artist: "SoundHelix",
			url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
		},
		{
			title: "示例曲目 Three",
			artist: "SoundHelix",
			url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
		},
		// 换成自己的音乐时这样写（cover 可省略）：
		// { title: "曲名", artist: "歌手", url: "https://你的服务器/music/song.mp3", cover: "https://你的服务器/music/song.jpg" },
	],
};
