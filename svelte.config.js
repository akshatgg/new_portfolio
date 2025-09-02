import vercel from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: vercel({
			// Target Node.js 20 runtime for serverless functions
			runtime: 'nodejs20.x'
		})
	},
	preprocess: vitePreprocess()
};

export default config;
