<script>
	import Tech from '../cards/Tech.svelte';
	import { reveal } from '../lib/reveal.js';
</script>

<section class="section-bg h-max mt-[64px] md:mt-[80px] flex flex-col w-full justify-center items-center gap-8 px-5 md:px-12 lg:container py-16 md:py-24">
	<div class="flex flex-col items-center gap-3 mb-6 md:mb-10" use:reveal>
		<span class="text-[11px] uppercase tracking-[0.3em] text-muted font-mono">// the toolbox</span>
		<h2 class="text-3xl md:text-5xl font-bold heading">Skills</h2>
		<div class="h-px w-16 bg-green-400/60 mt-2"></div>
	</div>

	<div class="text-center w-11/12 md:w-7/12 -mt-2" use:reveal={{ delay: 80 }}>
		<p class="text-sm md:text-base text-muted">
			A working stack — the things I've actually shipped to production.
		</p>
	</div>

	<div class="w-full max-w-5xl mt-4" use:reveal={{ delay: 160 }}>
		<Tech />
	</div>
</section>
