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

type BlogPost = {
	id: string;
	slug: string;
	title: string;
	excerpt: string | null;
	description: string | null;
	bodyHtml: string;
	coverImageUrl: string | null;
	status: string;
	seoTitle: string | null;
	seoDescription: string | null;
	publishedAt: string | null;
	createdAt: string;
	updatedAt: string;
	category: BlogCategory | null;
	tags: BlogTag[];
};

type BlogPostApiResponse = {
	tag: string;
	post: BlogPost;
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

export const load: PageServerLoad = async ({ fetch, params }) => {
	const origin = getCmsOrigin();
	const tag = getBlogTag();

	const url = `${origin}/api/blogs/${encodeURIComponent(params.slug)}`;
	const response = await fetch(url);

	if (!response.ok) {
		if (response.status === 404) {
			throw error(404, 'Post not found');
		}

		throw error(response.status, `Failed to load post from ${url}`);
	}

	const data = (await response.json()) as BlogPostApiResponse;

	return {
		tag: data.tag,
		post: data.post
	};
};