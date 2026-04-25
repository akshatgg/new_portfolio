<script>
	import '../app.css';
	import Footer from '../components/Footer.svelte';
	import Header from '../components/Header.svelte';
	import { particlesInit } from '@tsparticles/svelte';
	import { onMount } from 'svelte';
	import { loadSlim } from '@tsparticles/slim';
	import Main from '../components/Main.svelte';
	import Icon from '@iconify/svelte';

	let sections = [
		{ name: 'Home', id: 'home' },
		{ name: 'Experience', id: 'experience' },
		{ name: 'Skills', id: 'skills' },
		{ name: 'Projects', id: 'projects' },
		{ name: 'About', id: 'about' },
		{ name: 'Contact', id: 'contact' }
	];

	let activeSectionId = sections[0].id;

	let ParticlesComponent;

	onMount(async () => {
		const module = await import('@tsparticles/svelte');
		ParticlesComponent = module.default;
	});

	let particlesConfig = {
		fpsLimit: 60,
		particles: {
			color: { value: '#4ade80' },
			links: {
				enable: true,
				color: '#1a3a23',
				opacity: 0.22,
				distance: 150
			},
			move: {
				enable: true,
				speed: 0.45,
				outModes: { default: 'bounce' }
			},
			number: {
				value: 45,
				density: { enable: true, area: 1000 }
			},
			opacity: { value: 0.3 },
			size: { value: { min: 0.6, max: 1.8 } }
		},
		detectRetina: true
	};

	void particlesInit(async (engine) => {
		await loadSlim(engine);
	});

	let y = 0;
	let innerHeight = 0;

	$: showBackToTop = y > 600;

	const scrollToTop = () => {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	};
</script>

<svelte:component this={ParticlesComponent} id="tsparticles" options={particlesConfig} />

<div class="w-full flex flex-col bg-primary">
	<div class="z-50">
		<Header {y} {sections} bind:activeSection={activeSectionId} />
	</div>
	<div class="h-full z-20">
		<slot />
		<Main {y} {sections} {activeSectionId} />
	</div>
	<Footer />
</div>

<!-- back to top -->
<button
	on:click={scrollToTop}
	aria-label="Back to top"
	class={'fixed bottom-6 right-6 z-50 p-3 rounded-full surface text-soft hover:text-green-400 transition-all duration-300 ' +
		(showBackToTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none')}
>
	<Icon icon="mdi:arrow-up" class="text-xl" />
</button>

<svelte:window bind:scrollY={y} bind:innerHeight />
