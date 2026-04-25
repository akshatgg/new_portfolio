<script>
	import Icon from '@iconify/svelte';

	const techs = [
		{
			name: 'Frontend',
			icon: 'mdi:monitor-dashboard',
			about: 'Pixel-precise interfaces that load fast.',
			tech: ['React', 'Next.js', 'TypeScript', 'TailwindCSS', 'Material UI', 'RxJS']
		},
		{
			name: 'Backend & Systems',
			icon: 'mdi:server-network',
			about: 'APIs and async pipelines built to fail gracefully.',
			tech: ['FastAPI', 'Node.js', 'Express', 'Python', 'Java', 'PostgreSQL', 'MongoDB', 'Prisma', 'Redis', 'ClickHouse']
		},
		{
			name: 'Observability',
			icon: 'mdi:radar',
			about: 'Knowing where the bytes hurt before users do.',
			tech: ['Prometheus', 'Grafana', 'Datadog', 'New Relic', 'OpenTelemetry', 'AWS CloudWatch', 'Loki', 'Tempo', 'Signoz']
		},
		{
			name: 'DevOps & Cloud',
			icon: 'mdi:cloud-outline',
			about: 'Reliable deploys, lean pipelines, sane infra.',
			tech: ['Docker', 'Kubernetes', 'AWS', 'GCP', 'Git', 'GitHub Apps', 'CI/CD', 'OAuth 2.0', 'JWT', 'WebSocket']
		}
	];

	const marquee = [
		'FastAPI', 'ClickHouse', 'Redis', 'PostgreSQL', 'Prometheus', 'Grafana',
		'OpenTelemetry', 'Datadog', 'New Relic', 'AWS', 'Docker', 'Kubernetes', 'Next.js',
		'Python', 'Java', 'TypeScript', 'Node.js', 'MongoDB', 'React'
	];
</script>

<div class="w-full flex flex-col gap-10">
	<section class="grid grid-cols-1 md:grid-cols-2 w-full gap-4">
		{#each techs as tech}
			<div class="tech-card relative surface rounded-xl p-6 h-full overflow-hidden group">
				<!-- subtle green corner glow -->
				<div class="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-green-400/[0.07] blur-2xl pointer-events-none"></div>
				<!-- top accent line -->
				<div class="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-green-400/40 to-transparent"></div>

				<div class="relative flex items-center gap-3 mb-5">
					<div class="p-2.5 rounded-md bg-green-400/10 border border-green-400/25">
						<Icon icon={tech.icon} class="text-xl text-green-400" />
					</div>
					<div>
						<p class="text-base md:text-lg font-semibold heading">{tech.name}</p>
						<p class="text-xs text-muted">{tech.about}</p>
					</div>
				</div>

				<div class="relative flex flex-wrap gap-2">
					{#each tech.tech as t}
						<span class="font-mono text-xs md:text-sm px-3 py-1.5 rounded-md bg-green-400/[0.06] border border-green-400/15 text-soft hover:bg-green-400/15 hover:border-green-400/50 hover:text-green-300 transition">
							{t}
						</span>
					{/each}
				</div>
			</div>
		{/each}
	</section>

	<div class="relative w-full overflow-hidden py-4 mask-fade">
		<div class="scrolling-row gap-4 whitespace-nowrap text-soft font-mono text-sm md:text-base">
			{#each [...marquee, ...marquee] as t}
				<span class="px-5 py-2.5 border border-green-400/15 bg-green-400/[0.04] rounded-lg hover:bg-green-400/15 hover:border-green-400/50 hover:text-green-300 transition">
					{t}
				</span>
			{/each}
		</div>
	</div>
</div>

<style>
	.tech-card {
		transition: border-color 0.3s ease, background-color 0.3s ease, transform 0.3s ease;
	}
	.tech-card:hover {
		border-color: rgba(74, 222, 128, 0.3);
		background: rgba(15, 25, 18, 0.6);
		transform: translateY(-2px);
	}
</style>
