<script>
	import Icon from '@iconify/svelte';

	export let sections = [];
	export let activeSectionId;
	export let y;

	let drawerVisible = false;
</script>

<div
	class={'fixed z-50 w-full h-16 md:h-20 text-white flex justify-between items-center px-5 md:px-12 transition-all duration-300 ' +
		(y > 0 ? 'bg-black/70 backdrop-blur-xl border-b border-white/5' : 'bg-transparent')}
>
	<a href="#home" class="font-mono text-base md:text-lg flex items-center gap-1.5 group">
		<span class="accent">~/</span>
		<span class="text-soft group-hover:text-white transition">akshat</span>
	</a>

	<nav class="hidden md:flex items-center gap-1">
		{#each sections as { name, id }}
			<a
				href={`#${id}`}
				class={'relative px-3.5 py-2 text-sm font-mono transition ' +
					(activeSectionId === id ? 'text-white' : 'text-muted hover:text-white')}
			>
				{name}
				{#if activeSectionId === id}
					<span class="absolute left-3.5 right-3.5 -bottom-0.5 h-px bg-green-400"></span>
				{/if}
			</a>
		{/each}
	</nav>

	<a
		href="/Akshat.pdf"
		target="_blank"
		class="hidden md:inline-flex items-center gap-2 px-4 py-1.5 rounded-md surface surface-hover text-soft text-sm font-mono"
	>
		<Icon icon="mdi:file-document-outline" class="text-base" />
		Resume
	</a>

	<button
		on:click={() => (drawerVisible = !drawerVisible)}
		class="md:hidden flex p-2 rounded-md surface text-soft"
		aria-label="Open menu"
	>
		<Icon icon={drawerVisible ? 'mdi:close' : 'mdi:menu'} class="text-xl" />
	</button>

	{#if drawerVisible}
		<div class="drawer flex flex-col">
			<div class="h-16 w-full border-b border-white/5 px-5 flex justify-between items-center">
				<span class="font-mono text-soft text-sm">menu</span>
				<button on:click={() => (drawerVisible = !drawerVisible)} aria-label="Close">
					<Icon icon="mdi:close" class="text-soft text-xl" />
				</button>
			</div>
			<div class="flex flex-col p-3">
				{#each sections as { name, id }}
					<a
						href={`#${id}`}
						on:click={() => (drawerVisible = false)}
						class={'px-4 py-3 rounded-md font-mono text-base transition ' +
							(activeSectionId === id ? 'text-white bg-white/5' : 'text-muted hover:bg-white/5 hover:text-white')}
					>
						{name}
					</a>
				{/each}
				<a
					href="/Akshat.pdf"
					target="_blank"
					class="mt-3 px-4 py-3 rounded-md surface text-soft inline-flex items-center gap-2"
				>
					<Icon icon="mdi:file-document-outline" /> Resume
				</a>
			</div>
		</div>
	{/if}
</div>

<style>
	.drawer {
		background: rgba(5, 5, 5, 0.96);
		backdrop-filter: blur(18px);
		-webkit-backdrop-filter: blur(18px);
		position: absolute;
		top: 0;
		right: 0;
		display: flex;
		height: 100vh;
		width: 80%;
		max-width: 320px;
		opacity: 1;
		overflow: hidden;
		border-left: 1px solid rgba(255, 255, 255, 0.06);
	}
</style>
