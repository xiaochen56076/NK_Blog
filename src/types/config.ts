import type { AUTO_MODE, DARK_MODE, LIGHT_MODE } from "@constants/constants";

export type SiteConfig = {
	title: string;
	subtitle: string;

	lang:
		| "en"
		| "zh_CN"
		| "zh_TW"
		| "ja"
		| "ko"
		| "es"
		| "th"
		| "vi"
		| "tr"
		| "id";

	themeColor: {
		hue: number;
		fixed: boolean;
	};
	banner: {
		enable: boolean;
		src: string;
		position?: "top" | "center" | "bottom";
		credit: {
			enable: boolean;
			text: string;
			url?: string;
		};
	};
	toc: {
		enable: boolean;
		depth: 1 | 2 | 3;
	};

	favicon: Favicon[];
};

export type Favicon = {
	src: string;
	theme?: "light" | "dark";
	sizes?: string;
};

export enum LinkPreset {
	Home = 0,
	Archive = 1,
	About = 2,
}

export type NavBarLink = {
	name: string;
	url: string;
	external?: boolean;
};

export type NavBarConfig = {
	links: (NavBarLink | LinkPreset)[];
};

export type ProfileConfig = {
	avatar?: string;
	name: string;
	bio?: string;
	links: {
		name: string;
		url: string;
		icon: string;
	}[];
};

export type LicenseConfig = {
	enable: boolean;
	name: string;
	url: string;
};

export type LIGHT_DARK_MODE =
	| typeof LIGHT_MODE
	| typeof DARK_MODE
	| typeof AUTO_MODE;

export type BlogPostData = {
	body: string;
	title: string;
	published: Date;
	description: string;
	tags: string[];
	draft?: boolean;
	image?: string;
	category?: string;
	prevTitle?: string;
	prevSlug?: string;
	nextTitle?: string;
	nextSlug?: string;
};

export type ExpressiveCodeConfig = {
	theme: string;
};

/* ---------------- 侧栏音乐播放器 ---------------- */

export type MusicTrack = {
	/** 曲名 */
	title: string;
	/** 歌手 / 作者，可省略 */
	artist?: string;
	/** 音频直链：可以是自建服务器 / 对象存储 / CDN 上的 mp3、m4a、ogg 等 */
	url: string;
	/** 封面图地址，可省略（省略时显示音符占位图标） */
	cover?: string;
};

export type MusicConfig = {
	/** 是否在侧栏显示音乐播放器 */
	enable: boolean;
	/** 侧栏小卡的标题 */
	title: string;
	/** 是否尝试自动播放（多数浏览器会拦截，通常需要用户先点一次播放） */
	autoplay?: boolean;
	/**
	 * 可选：返回 MusicTrack[] 的接口地址。
	 * 以后若自建音乐 API（含 QQ 音乐等第三方歌单代理），把地址填这里即可，
	 * 播放器会优先使用接口返回的曲目；留空则只用下面的 tracks。
	 */
	playlistUrl?: string;
	/** 曲目列表 */
	tracks: MusicTrack[];
};
