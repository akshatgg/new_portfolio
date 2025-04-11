<script>
	import { onMount } from 'svelte';
	import Saos from 'saos';

	let projects = [
		{
			name: 'Cosmic-Trek',
			image: '/assests/Cosmic.png',
			about:
				'Cosmic-Trek is an interactive orrery app that simulates planetary motions, satellite trajectories, and space exploration scenarios with real-time visualizations. ',
			tech: ['ThreeJs', 'pynb','WebGl','D3Js']
		},
		{
			name: 'AntiSocial',
			image: '/assests/anti.png',
			about: `AntiSocial is an Instagram clone with real-time chat, photo sharing, and stories, enhancing user engagement and retention. `,
			tech: ['NextJS ', 'TailwindCSS','MERN','Razorpay']
		},
		{
			name: 'Taleox',
			image: '/assests/Taleox.png',
			about:
				'Taleox (LMS) is a full-featured Learning Management System enabling 1,000+ users to access courses, assignments, and assessments with a seamless UI and secure role-based access.',
			tech: ['React JS', 'MERN', 'TailwindCSS','Particlejs']
		},
		{
			name: 'PrepSaarthi',
			image: '/assests/prep.png',
			about: 'PrepSaarthi is a mentorship platform connecting IIT-JEE aspirants with mentors who have successfully cleared the exam, providing personalized guidance and support throughout their preparation journey.',
			tech: ['React JS', 'Material UI', 'TailwindCSS','MERN']
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
			class="border-0 border-border w-full min-h-96 group relative md:px-12 py-8 text-center rounded-lg shadow-xl shadow-shadow flex justify-center items-center my-12 bg-primary"
		>
			<span
				class="ease absolute left-0 top-0 h-0 w-0 border-t-2 border-border transition-all duration-200 group-hover:w-full"
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
			<div class="w-full flex flex-col md:flex-row justify-evenly items-center h-full gap-10 px-4">
				<div class="md:w-1/2">
					<img src={`${project.image}`} alt="" class="object-cntain w-full h-full" />
				</div>
				<div class="md:w-1/2 flex flex-col">
					<p class="text-3xl font-semibold pb-3 text-secondary">{project.name}</p>
					<span class="text-secondary-text">
						{project.about}
					</span>
					<div class="flex gap-4 w-full justify-center mt-8 text-lg flex-wrap">
						{#each project.tech as tech}
							<button
								class="rounded-lg border-[1px] shadow-lg px-4 py-2 border-border shadow-shadow min-w-[130px] text-primary-button"
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
