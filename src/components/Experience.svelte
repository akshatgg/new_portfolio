<script>
	import Icon from '@iconify/svelte';
	import { reveal } from '../lib/reveal.js';
	import { onMount, onDestroy } from 'svelte';

	const experiences = [
		{
			company: 'VibeMonitor',
			role: 'Software Engineer · Full Time',
			period: 'Sep 2025 — Present',
			location: 'Remote · India',
			website: 'https://vibemonitor.ai',
			logo: 'mdi:radar',
			highlights: [
				'Built a high-throughput log ingestion platform with custom SDKs in Java, Python and JavaScript, streaming high-volume logs into ClickHouse via async batched pipelines.',
				'Worked deep with ClickHouse internals — columnar storage, compression, MergeTree engines and partitioning — to design schemas and tune query performance for high-cardinality observability data.',
				'Designed scalable FastAPI microservices and shipped a unified GitHub App + OAuth integration layer for secure access to repos, commits and PR data.',
				'Stood up centralized observability across 15+ services — New Relic, Datadog, Grafana, Prometheus, AWS CloudWatch — with RBAC and custom alerting.',
				'Applied RED & USE methodologies and cut CI/CD build time by 20% across 10+ pipelines with smart caching & artifact reuse.',
				'Contributed to an automated Root Cause Analysis engine correlating errors with commit history — reducing incident investigation time by 65%.'
			],
			tech: ['ClickHouse', 'FastAPI', 'Python', 'Java', 'JavaScript', 'Redis', 'Prometheus', 'Grafana', 'AWS']
		},
		{
			company: 'iTax Easy',
			role: 'Full Stack & Server Developer · Internship',
			period: 'Feb 2025 — Sep 2025',
			location: 'Hybrid',
			website: 'https://itaxeasy.com',
			logo: 'mdi:file-document-edit-outline',
			highlights: [
				'Built high-performance web & Android apps on PostgreSQL + Next.js + Prisma — cut load times 45% and lifted user retention 30%.',
				'Re-architected the database layer, accelerating query response by 60% and dropping server cost by 30%.',
				'Tuned hPanel deployments and refactored hot code paths across the tax-filing workflow.'
			],
			tech: ['Next.js', 'PostgreSQL', 'Prisma', 'Android Studio', 'hPanel', 'Node.js']
		},
		{
			company: 'Sakhi Women',
			role: 'Full Stack Developer · Freelance',
			period: 'Jan 2025 — Feb 2025',
			location: 'Remote',
			website: 'https://www.sakhiwomen.in/',
			logo: 'mdi:car-multiple',
			highlights: [
				'Built a ride-booking platform with RBAC, OTP-based passwordless auth and time-based dynamic pricing (1.5× night multiplier).',
				'Optimized for 1500–2000 concurrent users — B-tree indexing dropped query latency by 70%.',
				'Wired Twilio WhatsApp API for OTP, driver alerts and assignments + cron-based recurring scheduling.'
			],
			tech: ['Node.js', 'Express', 'MongoDB', 'Twilio', 'Redis', 'JWT']
		},
		{
			company: 'Mark AI',
			role: 'Full Stack Developer · Freelance',
			period: 'Dec 2024 — Jan 2025',
			location: 'Remote',
			website: 'https://mark-ai.tech/',
			logo: 'mdi:billboard',
			highlights: [
				'Created an ad-booking platform with FastAPI integrating Screenox REST API for real-time inventory across 100+ digital displays.',
				'Configured a round-robin load balancer fronting multiple FastAPI instances with connection pooling & async handling.',
				'Integrated payment gateway and campaign-scheduling flows.'
			],
			tech: ['FastAPI', 'Python', 'PostgreSQL', 'NGINX', 'REST']
		},
		{
			company: 'PrepSaarthi',
			role: 'Co-Founder & Technical Lead',
			period: 'Nov 2024 — Jul 2025',
			location: 'India',
			website: 'https://prepsaarthi.com',
			logo: 'mdi:rocket-launch-outline',
			highlights: [
				'Founded a mentor-driven edtech startup focused on career guidance and student upskilling for IIT-JEE aspirants.',
				'Shipped 5+ features with React.js + MongoDB and integrated secure RESTful APIs with OAuth 2.0 — engagement up 40%.',
				'Owned product, hiring and the end-to-end technical roadmap.'
			],
			tech: ['React', 'MongoDB', 'Express', 'Node.js', 'Material UI']
		}
	];

	let rowEls = [];
	let timelineEl;
	let visible = experiences.map(() => false);
	let activeIdx = -1;
	let markerPct = 0;
	let markerVisible = false;

	const updateState = () => {
		if (typeof window === 'undefined') return;
		const vh = window.innerHeight;
		let next = -1;
		rowEls.forEach((el, i) => {
			if (!el) return;
			const r = el.getBoundingClientRect();
			if (r.top < vh * 0.85 && !visible[i]) {
				visible[i] = true;
				visible = visible;
			}
			const center = r.top + r.height / 2;
			if (center < vh * 0.6 && r.bottom > vh * 0.2) next = i;
		});
		activeIdx = next;

		if (timelineEl) {
			const r = timelineEl.getBoundingClientRect();
			const focus = vh * 0.45;
			const p = (focus - r.top) / r.height;
			markerPct = Math.min(100, Math.max(0, p * 100));
			markerVisible = r.top < vh * 0.95 && r.bottom > vh * 0.05;
		}
	};

	onMount(() => {
		updateState();
		window.addEventListener('scroll', updateState, { passive: true });
		window.addEventListener('resize', updateState);
	});
	onDestroy(() => {
		if (typeof window !== 'undefined') {
			window.removeEventListener('scroll', updateState);
			window.removeEventListener('resize', updateState);
		}
	});

	const stateOf = (i) => {
		if (i === activeIdx) return 'active';
		if (activeIdx > -1 && i < activeIdx) return 'past';
		return 'future';
	};
</script>

<section class="section-bg h-max mt-[64px] md:mt-[80px] flex flex-col w-full items-center px-5 md:px-12 lg:container py-16 md:py-24">
	<div class="flex flex-col items-center gap-3 mb-14 md:mb-20" use:reveal>
		<span class="text-[11px] uppercase tracking-[0.3em] text-muted font-mono">// where I've shipped</span>
		<h2 class="text-3xl md:text-5xl font-bold heading">Experience</h2>
		<div class="h-px w-16 bg-green-400/60 mt-2"></div>
	</div>

	<div class="relative w-full max-w-5xl" bind:this={timelineEl}>
		<!-- faint full-length spine as the track -->
		<div class="absolute left-2.5 md:left-1/2 md:-translate-x-1/2 top-2 bottom-2 w-px bg-white/10"></div>
		<!-- green line that draws itself downward with scroll -->
		<div
			class="pointer-events-none absolute left-2.5 md:left-1/2 md:-translate-x-1/2 top-2 w-px bg-green-400 transition-[height] duration-200 ease-out"
			style="height: {markerPct}%; max-height: calc(100% - 1rem);"
		></div>

		{#each experiences as exp, i}
			{@const state = stateOf(i)}
			{@const isLeft = i % 2 === 0}
			<div
				bind:this={rowEls[i]}
				class={'relative flex flex-col md:flex-row md:items-stretch mb-10 md:mb-14 ' +
					(isLeft ? 'md:justify-start' : 'md:justify-end')}
			>
				<!-- spine dot -->
				<div
					class="absolute left-2.5 md:left-1/2 -translate-x-1/2 top-3 z-10 transition-all duration-500 ease-out"
				>
					<div
						class={'rounded-full transition-all duration-500 ease-out ' +
							(state === 'active'
								? 'w-4 h-4 bg-green-400 shadow-[0_0_0_4px_rgba(74,222,128,0.18)]'
								: state === 'past'
									? 'w-2.5 h-2.5 bg-green-400/80'
									: 'w-2.5 h-2.5 bg-black border border-white/20')}
					>
						{#if state === 'active'}
							<span class="absolute inset-0 rounded-full bg-green-400/40 animate-ping"></span>
						{/if}
					</div>
				</div>

				<!-- card -->
				<div
					class={'pl-10 md:pl-0 w-full md:w-1/2 transition-all duration-700 ' +
						(isLeft ? 'md:pr-10' : 'md:pl-10') +
						' ' +
						(visible[i]
							? 'opacity-100 translate-x-0'
							: 'opacity-0 ' + (isLeft ? 'md:-translate-x-6 -translate-x-3' : 'md:translate-x-6 -translate-x-3'))}
				>
					<div
						class={'card surface rounded-xl p-5 md:p-6 transition-all duration-500 ease-out ' +
							(state === 'active'
								? 'is-active'
								: state === 'past'
									? 'is-past'
									: 'is-future')}
					>
						<div class="flex items-start justify-between gap-3 mb-2 flex-wrap">
							<div class="flex items-center gap-3">
								<div
									class={'p-2 rounded-md border transition-colors duration-500 ' +
										(state === 'active'
											? 'bg-green-400/10 border-green-400/30'
											: 'bg-white/5 border-white/5')}
								>
									<Icon
										icon={exp.logo}
										class={'text-xl transition-colors duration-500 ' +
											(state === 'active' ? 'text-green-400' : 'text-soft')}
									/>
								</div>
								<div>
									<a
										href={exp.website}
										target="_blank"
										rel="noopener noreferrer"
										class="text-lg md:text-xl font-semibold heading hover:text-green-400 transition flex items-center gap-1.5"
									>
										{exp.company}
										{#if exp.website && exp.website !== '#'}
											<Icon icon="mdi:arrow-top-right" class="text-sm opacity-50" />
										{/if}
									</a>
									<p class="text-xs md:text-sm text-muted font-mono">{exp.role}</p>
								</div>
							</div>
						</div>

						<div class="flex items-center gap-3 text-[11px] md:text-xs font-mono text-muted mb-3">
							<span class="text-soft">{exp.period}</span>
							<span class="text-white/20">•</span>
							<span class="flex items-center gap-1">
								<Icon icon="mdi:map-marker-outline" class="text-xs" />
								{exp.location}
							</span>
						</div>

						<ul class="space-y-1.5 text-sm md:text-[15px] text-soft leading-relaxed">
							{#each exp.highlights as h}
								<li class="flex gap-2 items-start">
									<span class="accent mt-1 shrink-0">▸</span>
									<span>{h}</span>
								</li>
							{/each}
						</ul>

						<div class="flex flex-wrap gap-1.5 mt-4 pt-4 border-t divider">
							{#each exp.tech as t}
								<span class="px-2 py-0.5 text-[11px] font-mono rounded bg-white/5 text-muted border border-white/5">
									{t}
								</span>
							{/each}
						</div>
					</div>
				</div>
			</div>
		{/each}
	</div>
</section>

<style>
	.card {
		border: 1px solid rgba(255, 255, 255, 0.06);
	}
	.card.is-active {
		border-color: rgba(74, 222, 128, 0.35);
		box-shadow:
			0 0 0 1px rgba(74, 222, 128, 0.08),
			0 18px 40px -22px rgba(74, 222, 128, 0.25);
		transform: translateY(-2px);
	}
	.card.is-past {
		opacity: 0.55;
		filter: saturate(0.85);
	}
	.card.is-past:hover {
		opacity: 1;
		filter: saturate(1);
	}
	.card.is-future {
		opacity: 0.92;
	}
</style>
