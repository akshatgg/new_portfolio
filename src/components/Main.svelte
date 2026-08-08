<script>
	import Projects from './Projects.svelte';
	import Skills from './Skills.svelte';
	import { inview } from 'svelte-inview';
	import About from './About.svelte';
	import Contact from './Contact.svelte';
	import Intro from './Intro.svelte';
	import Experience from './Experience.svelte';

	export let sections = [];
	export let activeSection;

	// A section counts as current only once it reaches the middle 10% band of the
	// viewport. Without the margin every section that so much as touched the edge
	// claimed the nav underline, and it flickered between two on every scroll.
	const viewport = { rootMargin: '-45% 0px -45% 0px' };

	const handleEnter = (id) => {
		activeSection = id;
	};
</script>

<main class="flex flex-1 flex-col justify-center items-center tracking-wider w-full">
	{#each sections as { id }}
		<!-- `main` centres its children at their content width, which is what keeps the
	     narrower sections centred. The hero has to span the full viewport instead,
	     so it — and only it — opts out. -->
	<section
		{id}
		class={id === 'home' ? 'w-full' : ''}
		use:inview={viewport}
		on:inview_enter={() => handleEnter(id)}
	>
			{#if id == 'home'}
				<Intro />
			{/if}
			{#if id == 'experience'}
				<Experience />
			{/if}
			{#if id == 'skills'}
				<Skills />
			{/if}
			{#if id == 'projects'}
				<Projects />
			{/if}
			{#if id == 'about'}
				<About />
			{/if}
			{#if id == 'contact'}
				<Contact />
			{/if}
		</section>
	{/each}
</main>
