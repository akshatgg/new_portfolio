<script>
	import { onMount } from 'svelte';
	import Saos from 'saos';
	import Icon from '@iconify/svelte';

	let projects = [
		{
			name: 'VibeMonitor',
			image: '/assests/upinthesky.png',
			about:
				'Production observability platform — high-throughput log ingestion into ClickHouse with custom Java/Python/JS SDKs, columnar schema tuning, and unified monitoring across 15+ microservices.',
			tech: ['ClickHouse', 'FastAPI', 'Python', 'Prometheus', 'Grafana'],
			link: 'https://vibemonitor.ai',
			github: 'https://github.com/akshatgg',
			isPrivate: true,
			featured: true,
			category: 'Product · Work'
		},
		{
			name: 'iTaxEasy',
			image: '/assests/itax.png',
			about:
				'Comprehensive tax filing & compliance platform — re-architected the DB layer to cut query response by 60% and trimmed server cost 30%.',
			tech: ['Next.js', 'Prisma', 'PostgreSQL', 'Express'],
			github: 'https://github.com/akshatgg/itax_next_main',
			link: 'https://itaxeasy.com/',
			isPrivate: false,
			category: 'Internship'
		},
		{
			name: 'Legal E-Library',
			image: '/assests/Elibrary.png',
			about:
				'Digital library for legal case laws with advanced search across 10,000+ documents. Boosted research efficiency by 40%.',
			tech: ['Angular', 'Prisma', 'PostgreSQL', 'Express'],
			github: 'https://github.com/akshatgg/E_Library',
			isPrivate: false,
			category: 'Product Build'
		},
		{
			name: 'Cosmic-Trek',
			image: '/assests/Cosmic.png',
			about:
				'Interactive 3D solar-system simulator with 8+ celestial bodies, 50+ exoplanets and a physics-based satellite-launch sandbox.',
			tech: ['Three.js', 'WebGL', 'D3.js', 'Redux'],
			github: 'https://github.com/akshatgg/OrreyApp',
			link: 'https://akshatgg.github.io/OrreyApp/',
			isPrivate: false,
			category: 'Side Quest'
		},
		{
			name: 'PrepSaarthi',
			image: '/assests/prep.png',
			about:
				'Mentor-driven edtech platform for IIT-JEE aspirants. Co-founded, led tech, shipped 5+ features and lifted engagement by 40%.',
			tech: ['React', 'MongoDB', 'Express', 'OAuth 2.0'],
			github: 'https://github.com/akshatgg/PrepSaarthi-Frontend',
			isPrivate: false,
			category: 'Co-Founder'
		},
		{
			name: 'AntiSocial',
			image: '/assests/anti.png',
			about:
				'Instagram-style social app with real-time chat, photo sharing and stories.',
			tech: ['Next.js', 'MERN', 'TailwindCSS', 'Razorpay'],
			github: 'https://github.com/akshatgg/AntiSocial',
			isPrivate: false,
			category: 'Side Project'
		}
	];

	onMount(() => {
		console.log(projects);
	});
</script>

<div class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 w-full">
	{#each projects as project}
		<Saos once={true} animation={'fade-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) both'}>
			<article class="surface surface-hover rounded-xl overflow-hidden h-full flex flex-col group">
				<div class="relative w-full aspect-[16/9] overflow-hidden border-b divider">
					<img
						src={project.image}
						alt={project.name}
						loading="lazy"
						class="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
					/>
					<div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent"></div>
					{#if project.featured}
						<span class="absolute top-3 left-3 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest bg-green-400/15 border border-green-400/30 text-green-400">
							Featured
						</span>
					{/if}
					<span class="absolute top-3 right-3 px-2 py-0.5 rounded text-[10px] font-mono bg-black/70 border border-white/10 text-muted">
						{project.category}
					</span>
				</div>

				<div class="flex flex-col gap-3 p-5 flex-1">
					<h3 class="text-lg md:text-xl font-semibold heading">{project.name}</h3>
					<p class="text-sm text-soft leading-relaxed">{project.about}</p>

					<div class="flex flex-wrap gap-1.5 mt-1">
						{#each project.tech as t}
							<span class="font-mono text-[11px] px-2 py-0.5 rounded bg-white/5 border border-white/5 text-muted">
								{t}
							</span>
						{/each}
					</div>

					<div class="flex gap-2 mt-auto pt-3">
						{#if project.github}
							<a
								href={project.github}
								target="_blank"
								rel="noopener noreferrer"
								class="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-white/10 hover:border-green-400/40 text-soft hover:text-green-400 transition text-sm"
							>
								<Icon icon="mdi:github" class="text-base" />
								<span>{project.isPrivate ? 'Private' : 'Code'}</span>
								{#if project.isPrivate}<Icon icon="mdi:lock-outline" class="text-xs opacity-60" />{/if}
							</a>
						{/if}
						{#if project.link}
							<a
								href={project.link}
								target="_blank"
								rel="noopener noreferrer"
								class="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-green-400 text-black font-medium hover:bg-green-300 transition text-sm"
							>
								<Icon icon="mdi:arrow-top-right" class="text-base" />
								<span>Live</span>
							</a>
						{/if}
					</div>
				</div>
			</article>
		</Saos>
	{/each}
</div>

<style>
	@keyframes -global-fade-up {
		0% { opacity: 0; transform: translateY(20px); }
		100% { opacity: 1; transform: translateY(0); }
	}
</style>
