//@ts-nocheck
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { sveltekit } from '@sveltejs/kit/vite';
//@ts-ignore
import fs from 'fs';
//@ts-ignore
import path from 'path';
function generateDiscoveryManifest() {
    return {
        name: 'generate-discovery-manifest',
        closeBundle() {
            const contentDir = path.resolve('src/content');
            const outputDir = path.resolve('../informer/src', 'data');
            const outputFile = path.join(outputDir, 'manifest.json');

            if (!fs.existsSync(contentDir)) return;

            const manifest = fs.readdirSync(contentDir)
                .filter(file => file.endsWith('.md'))
                .map(file => {
                    const filePath = path.join(contentDir, file);
                    const content = fs.readFileSync(filePath, 'utf-8');
                    
                    // Simple regex to pull frontmatter fields
                    const getValue = (key: string) => {
                        const regex = new RegExp(`${key}:\\s*["']?(.*?)["']?(\\n|\\r)`, 'i');
                        const match = content.match(regex);
                        return match ? match[1].trim() : '';
                    };

                    const slug = file.replace('.md', '');

                    return {
                        url: `/${slug}`,
                        title: getValue('title'),
                        description: getValue('description'),
                        img: getValue('image'), // Maps 'image' from MD to 'img' for your UI
                        date: getValue('date')
                    };
                });

            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            fs.writeFileSync(outputFile, JSON.stringify(manifest, null, 2));
            console.log(`\n[Discovery Lab] Manifest sync complete: ${manifest.length} records saved.`);
        }
    };
}
export default defineConfig({
	plugins: [tailwindcss(), sveltekit(),generateDiscoveryManifest()],
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
