import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { BLOG_TAG, CMS_ORIGIN } from '$env/static/private';

export const prerender = true;

type BlogCategory = {
	id: string;
	name: string;
	slug: string;
	description: string | null;
};

type BlogTag = {
	id: string;
	name: string;
	slug: string;
};

type BlogListItem = {
	id: string;
	slug: string;
	title: string;
	excerpt: string | null;
	description: string | null;
	coverImageUrl: string | null;
	publishedAt: string | null;
	category: BlogCategory | null;
	tags: BlogTag[];
};

type BlogsApiResponse = {
	tag: string;
	posts: BlogListItem[];
	total: number;
};

function getCmsOrigin() {
	const origin = CMS_ORIGIN?.trim().replace(/\/+$/, '');

	if (!origin) {
		throw error(500, 'Missing CMS_ORIGIN environment variable');
	}

	return origin;
}

function getBlogTag() {
	const tag = BLOG_TAG?.trim();

	if (!tag) {
		throw error(500, 'Missing BLOG_TAG environment variable');
	}

	return tag;
}

export const load: PageServerLoad = async ({ fetch }) => {
	const origin = getCmsOrigin();
	const tag = getBlogTag();

	const url = `${origin}/api/blogs/tag/${encodeURIComponent(tag)}`;
	const response = await fetch(url);

	if (!response.ok) {
		throw error(response.status, `Failed to load blogs from ${url}`);
	}

	const data = (await response.json()) as BlogsApiResponse;

	return {
		tag: data.tag,
		posts: data.posts,
		total: data.total
	};
};