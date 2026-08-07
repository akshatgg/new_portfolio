<script>
	import Icon from '@iconify/svelte';
	import { onMount, onDestroy } from 'svelte';
	import { dockEl, askClosed } from '../lib/ask/store.js';

	// The ASK panel is position:fixed so it can animate out to full screen; this
	// slot is only a placeholder whose box the panel tracks while docked.
	let slotEl;
	$: dockEl.set(slotEl);

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
			I build scalable systems and the observability layer that watches them — high-volume log ingestion pipelines streaming into <span class="text-white">ClickHouse</span>, with a deep grasp of its columnar storage, compression and MergeTree internals. Currently engineering an AI-native DOOH advertising platform at <a href="https://mark-ai.tech/" target="_blank" rel="noopener" class="accent underline-offset-4 hover:underline">Mark AI</a>.
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
		<div bind:this={slotEl} class="ask-slot">
			{#if $askClosed}
				<button class="ask-reopen" on:click={() => askClosed.set(false)}>
					<span class="ask-reopen-icon">
						<Icon icon="mage:message-dots-round" width="20" style="color: #4ade80;" />
					</span>
					<span class="font-mono text-[13px]">reopen ask.akshat</span>
				</button>
			{/if}
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
	.ask-slot {
		width: 100%;
		max-width: 448px;
		height: 560px;
		max-height: 62vh;
		position: relative;
	}
	.ask-reopen {
		position: absolute;
		inset: 0;
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 14px;
		border-radius: 16px;
		background: rgba(10, 10, 10, 0.35);
		border: 1px dashed rgba(255, 255, 255, 0.1);
		color: rgba(231, 231, 231, 0.55);
		cursor: pointer;
		transition: border-color 0.25s ease, background-color 0.25s ease, color 0.25s ease;
	}
	.ask-reopen:hover {
		border-color: rgba(74, 222, 128, 0.4);
		background: rgba(15, 20, 16, 0.5);
		color: rgba(231, 231, 231, 0.78);
	}
	.ask-reopen-icon {
		width: 44px;
		height: 44px;
		border-radius: 9999px;
		border: 1px solid rgba(74, 222, 128, 0.3);
		background: rgba(74, 222, 128, 0.08);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.scroll-pulse {
		animation: scroll-pulse 2.2s cubic-bezier(0.55, 0.05, 0.45, 0.95) infinite;
	}
	@keyframes scroll-pulse {
		0% { transform: translateY(-100%); }
		100% { transform: translateY(200%); }
	}
</style>
