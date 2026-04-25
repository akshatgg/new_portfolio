<script>
	import { Canvas } from '@threlte/core';
	import Scene from './Scene.svelte';
	import Icon from '@iconify/svelte';
	import { onMount, onDestroy } from 'svelte';

	const roles = [
		'Software Engineer',
		'Backend & Systems',
		'Observability Engineer'
	];

	let typed = '';
	let roleIdx = 0;
	let charIdx = 0;
	let deleting = false;
	let timer;

	const tick = () => {
		const current = roles[roleIdx];
		if (!deleting) {
			typed = current.slice(0, ++charIdx);
			if (charIdx === current.length) {
				deleting = true;
				timer = setTimeout(tick, 1500);
				return;
			}
		} else {
			typed = current.slice(0, --charIdx);
			if (charIdx === 0) {
				deleting = false;
				roleIdx = (roleIdx + 1) % roles.length;
			}
		}
		timer = setTimeout(tick, deleting ? 35 : 70);
	};

	onMount(() => tick());
	onDestroy(() => clearTimeout(timer));

	const stats = [
		{ value: '15+', label: 'Microservices monitored' },
		{ value: '65%', label: 'Faster RCA' },
		{ value: '1.5k+', label: 'Concurrent users' },
		{ value: '3+', label: 'Years building' }
	];
</script>

<section class="section-bg relative grid grid-cols-1 lg:grid-cols-2 px-6 gap-10 lg:gap-14 min-h-[calc(100vh-80px)] mt-[64px] lg:mt-[80px] items-center">
	<div class="flex flex-col justify-center items-start text-left gap-6 px-1 md:px-2 lg:px-6 z-10 max-w-2xl">
		<div class="flex items-center gap-2 surface rounded-full pl-2 pr-3.5 py-1 text-xs font-mono">
			<span class="relative flex h-2 w-2">
				<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60"></span>
				<span class="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
			</span>
			<span class="text-soft">Available for new opportunities</span>
		</div>

		<div class="flex flex-col gap-1">
			<span class="font-mono text-xs md:text-sm text-muted">$ whoami</span>
			<h1 class="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] heading">
				Akshat <span class="accent">Gupta.</span>
			</h1>
			<div class="text-base sm:text-lg md:text-xl font-mono mt-3 flex items-center flex-wrap gap-2 text-soft">
				<span class="accent">&gt;</span>
				<span class="cursor-blink min-h-[1.5em] inline-block">{typed}</span>
			</div>
		</div>

		<p class="text-sm sm:text-base md:text-lg text-soft max-w-xl leading-relaxed">
			I build scalable systems and the observability layer that watches them — high-volume log ingestion pipelines streaming into <span class="text-white">ClickHouse</span>, with a deep grasp of its columnar storage, compression and MergeTree internals. Currently engineering at <a href="https://vibemonitor.ai" target="_blank" rel="noopener" class="accent underline-offset-4 hover:underline">VibeMonitor</a>.
		</p>

		<div class="flex flex-wrap gap-3 mt-1">
			<a href="#contact" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-green-400 text-black font-medium hover:bg-green-300 transition">
				<Icon icon="mage:message-dots-round" class="text-lg" />
				Get in touch
			</a>
			<a href="/Akshat.pdf" target="_blank" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-md surface surface-hover text-soft">
				<Icon icon="mdi:file-document-outline" class="text-lg" />
				Resume
			</a>
		</div>

		<div class="flex items-center gap-4 pt-3 text-muted">
			<a href="https://github.com/akshatgg" target="_blank" rel="noopener" aria-label="GitHub" class="hover:text-white transition">
				<Icon icon="mdi:github" class="text-xl" />
			</a>
			<a href="https://www.linkedin.com/in/akshatgg/" target="_blank" rel="noopener" aria-label="LinkedIn" class="hover:text-white transition">
				<Icon icon="mdi:linkedin" class="text-xl" />
			</a>
			<a href="https://x.com/akshat___30" target="_blank" rel="noopener" aria-label="Twitter" class="hover:text-white transition">
				<Icon icon="mdi:twitter" class="text-xl" />
			</a>
			<a href="mailto:akshatg9636@gmail.com" aria-label="Email" class="hover:text-white transition">
				<Icon icon="mdi:email-outline" class="text-xl" />
			</a>
		</div>
	</div>

	<div class="relative w-full h-full hidden lg:flex flex-col items-center justify-center gap-5 z-0">
		<div class="w-full max-w-md aspect-square relative">
			<div class="absolute inset-0 rounded-2xl surface overflow-hidden">
				<Canvas>
					<Scene />
				</Canvas>
			</div>
			<div class="absolute top-3 left-3 flex gap-1.5 z-10">
				<span class="w-2.5 h-2.5 rounded-full bg-white/15"></span>
				<span class="w-2.5 h-2.5 rounded-full bg-white/15"></span>
				<span class="w-2.5 h-2.5 rounded-full bg-white/15"></span>
			</div>
			<div class="absolute top-3 right-4 font-mono text-[11px] text-muted z-10">akshat_engine.ts</div>
		</div>

		<div class="grid grid-cols-2 gap-3 w-full max-w-md">
			{#each stats as s}
				<div class="surface surface-hover rounded-lg p-3.5">
					<div class="text-2xl font-bold font-mono heading">{s.value}</div>
					<div class="text-[11px] text-muted mt-1 uppercase tracking-wider">{s.label}</div>
				</div>
			{/each}
		</div>
	</div>

	<div class="lg:hidden grid grid-cols-2 gap-3 w-full">
		{#each stats as s}
			<div class="surface rounded-lg p-3">
				<div class="text-xl font-bold font-mono heading">{s.value}</div>
				<div class="text-[11px] text-muted mt-1 uppercase tracking-wider">{s.label}</div>
			</div>
		{/each}
	</div>

	<!-- scroll-down hint -->
	<a href="#experience" class="hidden md:flex absolute left-1/2 -translate-x-1/2 bottom-6 lg:bottom-8 flex-col items-center gap-3 text-muted hover:text-green-400 transition group" aria-label="Scroll to experience">
		<span class="text-[10px] uppercase tracking-[0.3em] font-mono group-hover:text-green-400 transition">scroll</span>
		<div class="relative h-14 w-px bg-white/10 overflow-hidden">
			<span class="absolute inset-x-0 h-1/2 bg-gradient-to-b from-transparent via-green-400 to-transparent scroll-pulse"></span>
		</div>
	</a>
</section>

<style>
	.scroll-pulse {
		animation: scroll-pulse 2.2s cubic-bezier(0.55, 0.05, 0.45, 0.95) infinite;
	}
	@keyframes scroll-pulse {
		0% { transform: translateY(-100%); }
		100% { transform: translateY(200%); }
	}
</style>
