<script>
	import Saos from 'saos';
	import { flip } from 'svelte/animate';
	import { quintOut } from 'svelte/easing';
	let techs = [
		{
			name: 'Frontend',
			image:"/assests/frontend.webp",
			about:
				'I enjoy creating visually appealing and user-friendly interfaces.',
			tech: ['Particle JS', 'REACT JS', 'NEXT JS', 'Angular', 'TAILWIND CSS']
		},
		{
			name: 'Backend',
			image:"/assests/backend.webp",
			about:
				'I enjoy solving complex problems through robust and scalable server-side solutions.',
			tech: ['NODE JS', 'EXPRESS JS', 'FastAPI', 'MONGO DB', 'MYSQL', 'PostgreSQL', 'Prisma' ,'IndexedDB']
		},
		{
			name: 'DevOps',
			image:"/assests/devops.webp",
			about:
				'I prioritize quick product development and streamlined maintenance for existing deployments.',
			tech: ['GIT', 'DOCKER', 'hpanel', 'AWS', 'GCP' ]
		},
		{
			name: 'Observability',
			image:"/assests/observability.webp",
			about:
				'I build unified monitoring and alerting pipelines to keep distributed systems reliable at scale.',
			tech: ['New Relic', 'Datadog', 'Grafana', 'Prometheus', 'CloudWatch', 'OpenTelemetry']
		}
	];
</script>

<section class="grid grid-cols-1 md:grid-cols-2 w-full gap-6 md:gap-8 justify-items-center">
	{#each techs as tech}
		<div
			class="w-full sm:w-10/12 md:w-full bg-slate-800 rounded-xl px-4 md:px-8 py-6 md:py-10 shadow-md shadow-gray-900"
		>
			<div class="w-full flex flex-col justify-center items-center pb-3">
				<img src={tech.image} alt="tech_image" class="w-16 h-16 md:w-24 md:h-24 object-contain" />
				<p class="text-2xl md:text-3xl font-semibold text-secondary underline mt-4 md:mt-5">{tech.name}</p>
			</div>

			<p class="text-center text-secondary-text text-sm md:text-base min-h-0 md:min-h-[60px] lg:min-h-[50px] px-2 md:px-0 py-2 md:py-0">
				{tech.about}
			</p>
			<div class="w-full text-center py-3 md:py-4">
				<p class="text-xl md:text-2xl font-semibold text-secondary">Technologies</p>
			</div>

			<div class="w-full flex flex-wrap justify-center items-center gap-2 md:gap-4">
				{#each tech.tech as t}
					<button
						class="border-[1px] border-border px-3 md:px-4 py-1.5 md:py-2 rounded-xl min-w-[90px] md:min-w-[130px] shadow-lg shadow-shadow text-primary-button text-xs md:text-base capitalize"
						>{t}</button
					>
				{/each}
			</div>
		</div>
	{/each}
</section>

<style>
	
</style>
