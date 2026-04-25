<script>
	import Cards from '../cards/Cards.svelte';
	import { reveal } from '../lib/reveal.js';
</script>

<section class="section-bg w-full flex flex-col justify-center items-center h-max mt-[64px] md:mt-[80px] px-5 md:px-12 lg:container py-16 md:py-24">
	<div class="flex flex-col items-center gap-3 mb-12 md:mb-16" use:reveal>
		<span class="text-[11px] uppercase tracking-[0.3em] text-muted font-mono">// things I've shipped</span>
		<h2 class="text-3xl md:text-5xl font-bold heading">Projects</h2>
		<div class="h-px w-16 bg-green-400/60 mt-2"></div>
	</div>

	<div class="w-full max-w-5xl">
		<Cards />
	</div>
</section>
