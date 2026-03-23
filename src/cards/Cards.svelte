<script>
	import { onMount } from 'svelte';
	import Saos from 'saos';
	import Icon from '@iconify/svelte';

	let projects = [
		{
			name: 'UpInTheSky',
			image: '/assests/upinthesky.png',
			about: 'UpInTheSky is a travel platform that helps you create life long memories with curated travel experiences, stories, and adventure planning.',
			tech: ['NextJS', 'TailwindCSS', 'Firebase', 'Shadecn'],
			link: 'https://dev-upinthesky.netlify.app/',
			github: 'https://github.com/akshatgg/UpintheSky',
			isPrivate: true
		},
		{
			name: 'iTaxEasy',
			image: '/assests/itax.png',
			about: 'iTaxEasy is a comprehensive tax filing and management platform that simplifies income tax returns, GST filing, and financial compliance for individuals and businesses.',
			tech: ['Next JS', 'TailwindCSS', 'Prisma ORM', 'PSQL', 'NodeJS', 'ExpressJS'],
			github: 'https://github.com/akshatgg/itax_next_main',
			link: 'https://itaxeasy.com/',
			isPrivate: false
		},
		{
			name: 'Legal E-Library',
			image: '/assests/Elibrary.png',
			about:
				'Legal E-Library is a comprehensive digital library offering access to a vast collection of legal resources, including case law, statutes, and legal commentary, all within a user-friendly interface.',
			tech: ['Angular','Prisma ORM','PostgreSQL','NodeJS','ExpressJS'],
			github: 'https://github.com/akshatgg/E_Library',
			isPrivate: false
		},
		{
			name: 'Cosmic-Trek',
			image: '/assests/Cosmic.png',
			about:
				'Cosmic-Trek is an interactive orrery app that simulates planetary motions, satellite trajectories, and space exploration scenarios with real-time visualizations.',
			tech: ['ThreeJs', 'pynb','WebGl','D3Js'],
			github: 'https://github.com/akshatgg/OrreyApp',
			isPrivate: false
		},
		{
			name: 'AntiSocial',
			image: '/assests/anti.png',
			about: 'AntiSocial is an Instagram clone with real-time chat, photo sharing, and stories, enhancing user engagement and retention.',
			tech: ['NextJS', 'TailwindCSS','MERN','Razorpay'],
			github: 'https://github.com/akshatgg/AntiSocial',
			isPrivate: false
		},
		{
			name: 'PrepSaarthi',
			image: '/assests/prep.png',
			about: 'PrepSaarthi is a mentorship platform connecting IIT-JEE aspirants with mentors who have successfully cleared the exam, providing personalized guidance and support throughout their preparation journey.',
			tech: ['React JS', 'Material UI', 'TailwindCSS','MERN'],
			github: 'https://github.com/akshatgg/PrepSaarthi-Frontend',
			isPrivate: false
		}
	];

	onMount(() => {
		console.log(projects);
	});
</script>

{#each projects as project, index}
	<Saos
		once={true}
		animation={'from-left 1s cubic-bezier(0.35, 0.5, 0.65, 0.95) both'}
		class="w-full flex justify-center items-center py-12 h-full "
	>
		<div
			class="border-0 border-border w-full min-h-96 group relative px-2 md:px-12 py-6 md:py-8 text-center rounded-lg shadow-xl shadow-shadow flex justify-center items-center my-6 md:my-12 bg-primary"
		>
			<span
				class="ease absolute left-0 top-0 h-0 w-0 borde	r-t-2 border-border transition-all duration-200 group-hover:w-full"
			></span>
			<span
				class="ease absolute right-0 top-0 h-0 w-0 border-r-2 border-border transition-all duration-200 group-hover:h-full"
			></span>
			<span
				class="ease absolute bottom-0 right-0 h-0 w-0 border-b-2 border-border transition-all duration-200 group-hover:w-full"
			></span>
			<span
				class="ease absolute bottom-0 left-0 h-0 w-0 border-l-2 border-border transition-all duration-200 group-hover:h-full"
			></span>
			<div class="w-full flex flex-col md:flex-row justify-evenly items-center h-full gap-6 md:gap-10 px-2 md:px-4">
				<div class="w-full md:w-1/2">
					<img src={`${project.image}`} alt="" class="object-contain w-full h-auto rounded-md" />
				</div>
				<div class="w-full md:w-1/2 flex flex-col">
					<p class="text-xl md:text-3xl font-semibold pb-2 md:pb-3 text-secondary">{project.name}</p>
					<span class="text-secondary-text text-sm md:text-base">
						{project.about}
					</span>
					<div class="flex gap-3 md:gap-4 w-full justify-center mt-4 md:mt-6 items-center">
						{#if project.github}
							<a href={project.github} target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 border-[1px] border-border rounded-full px-4 py-2 text-secondary hover:scale-105 hover:shadow-lg hover:shadow-shadow transition-all duration-200">
								<Icon icon="mdi:github" class="text-xl md:text-2xl" />
								<span class="text-xs md:text-sm">{project.isPrivate ? 'Private' : 'Code'}</span>
								{#if project.isPrivate}
									<Icon icon="mdi:lock" class="text-xs" />
								{/if}
							</a>
						{/if}
						{#if project.link}
							<a href={project.link} target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 border-[1px] border-border rounded-full px-4 py-2 text-secondary hover:scale-105 hover:shadow-lg hover:shadow-shadow transition-all duration-200">
								<Icon icon="mdi:open-in-new" class="text-xl md:text-2xl" />
								<span class="text-xs md:text-sm">Live</span>
							</a>
						{/if}
					</div>
					<div class="flex gap-2 md:gap-4 w-full justify-center mt-4 md:mt-6 text-sm md:text-lg flex-wrap">
						{#each project.tech as tech}
							<button
								class="rounded-lg border-[1px] shadow-lg px-3 md:px-4 py-1.5 md:py-2 border-border shadow-shadow min-w-[100px] md:min-w-[130px] text-primary-button"
								>{tech}</button
							>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</Saos>
{/each}

<style>
	@keyframes -global-from-left {
		0% {
			transform: translateY(-600px) rotateX(-30deg) scale(0);
			transform-origin: 50% 100%;
			opacity: 0;
		}
		100% {
			transform: translateY(0) rotateX(0) scale(1);
			transform-origin: 50% 1400px;
			opacity: 1;
		}
	}
</style>
