<script>
	import Icon from '@iconify/svelte';
	import { reveal } from '../lib/reveal.js';

	const facts = [
		{ icon: 'mdi:school-outline', label: 'Education', value: 'B.Tech CSE (AI) — KIET, AKTU' },
		{ icon: 'mdi:map-marker-outline', label: 'Based in', value: 'India · Open to Remote' },
		{ icon: 'mdi:translate', label: 'Languages', value: 'English · Hindi' },
		{ icon: 'mdi:lightning-bolt-outline', label: 'Currently', value: 'Software Eng @ VibeMonitor' }
	];

	const wins = [
		{ stat: '20%', label: 'Faster CI/CD builds via smart caching & artifact reuse' },
		{ stat: '60%', label: 'Faster query response after redesigning DB layer' },
		{ stat: '70%', label: 'Lower latency from B-tree indexing on a 2k-user platform' },
		{ stat: '15+', label: 'Microservices unified under one observability layer' }
	];
</script>

<section class="section-bg h-max mt-[64px] md:mt-[80px] flex flex-col w-full items-center px-5 md:px-12 lg:container py-16 md:py-24">
	<div class="flex flex-col items-center gap-3 mb-14 md:mb-20" use:reveal>
		<span class="text-[11px] uppercase tracking-[0.3em] text-muted font-mono">// the human behind the code</span>
		<h2 class="text-3xl md:text-5xl font-bold heading">About</h2>
		<div class="h-px w-16 bg-green-400/60 mt-2"></div>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-5 gap-6 w-full max-w-5xl">
		<div class="lg:col-span-3 flex flex-col gap-5" use:reveal={{ delay: 100 }}>
			<div class="surface rounded-xl p-6 md:p-8 leading-relaxed text-soft">
				<p class="text-base md:text-lg">
					I'm a <span class="text-white font-medium">Software Engineer</span> who likes systems that don't fall over. Most of my day is spent on high-volume <span class="text-white">log ingestion pipelines streaming into ClickHouse</span> — designing schemas, tuning MergeTree partitioning, and squeezing every bit of throughput out of columnar storage.
				</p>
				<p class="text-base md:text-lg mt-4">
					Outside the day job at <a href="https://vibemonitor.ai" target="_blank" rel="noopener" class="accent underline-offset-4 hover:underline">VibeMonitor</a>, I've co-founded an edtech startup, freelanced full-stack apps for ride-booking and ad-tech, and built a 3D solar-system simulator just because it sounded fun.
				</p>
				<p class="text-base md:text-lg mt-4 text-muted">
					Bias toward action. Paranoid about latency. Allergic to flaky tests.
				</p>
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
				{#each facts as f}
					<div class="surface surface-hover rounded-lg p-4 flex items-start gap-3">
						<Icon icon={f.icon} class="text-lg text-muted shrink-0 mt-0.5" />
						<div>
							<div class="text-[10px] uppercase tracking-widest text-muted font-mono">{f.label}</div>
							<div class="text-sm text-soft mt-0.5">{f.value}</div>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<div class="lg:col-span-2 flex flex-col gap-4" use:reveal={{ delay: 200 }}>
			<div class="surface rounded-xl p-6">
				<h3 class="font-mono text-xs uppercase tracking-widest text-muted mb-5">// the receipts</h3>
				<div class="flex flex-col gap-4">
					{#each wins as w}
						<div class="flex items-baseline gap-4">
							<span class="text-2xl md:text-3xl font-bold font-mono accent w-14 shrink-0 text-right tabular-nums">{w.stat}</span>
							<span class="text-sm text-soft leading-snug">{w.label}</span>
						</div>
					{/each}
				</div>
			</div>

			<div class="surface rounded-xl p-6">
				<p class="font-mono text-xs uppercase tracking-widest text-muted">// currently building</p>
				<p class="mt-2 text-soft text-sm md:text-base">
					High-volume log ingestion into <span class="text-white">ClickHouse</span> and the observability layer on top — making columnar storage, compression and MergeTree engines work for engineers, not against them.
				</p>
				<a href="/Akshat.pdf" target="_blank" class="mt-5 inline-flex w-full items-center justify-center gap-2 px-5 py-2.5 rounded-md bg-green-400 text-black font-medium hover:bg-green-300 transition">
					<Icon icon="mdi:download-outline" class="text-lg" />
					Download Resume
				</a>
			</div>
		</div>
	</div>
</section>
