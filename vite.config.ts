//@ts-nocheck
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { sveltekit } from '@sveltejs/kit/vite';
import { articleMarkdownExport } from './plugins/article-markdown-export';
import fs from 'fs';
export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), articleMarkdownExport({
  buildDir: 'build',
  blogDir: 'blog',
  articleFilesDir: '.',
  articlesIndexFile: 'ARTICLES.md',
  fallbackArticleBaseUrl: 'https://authoritylabs.vercel.app/blog/',
  organizations: {
    'driveready.co': {
      name: 'DriveReady',
      url: 'https://driveready.co/',
      about:
        'DriveReady provides remote vehicle inspection services for drivers and vehicle owners who need inspection documentation for rideshare and car-sharing platforms. Its service model emphasizes convenience, live video guidance, fast turnaround, and driver-friendly scheduling.',
      relatedPages: [
        {
          label: 'DriveReady official website',
          url: 'https://driveready.co/'
        },
        {
          label: 'DriveReady home page',
          url: 'https://driveready.co/'
        }
      ]
    }
  }
})],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			}
		]
	}
});
