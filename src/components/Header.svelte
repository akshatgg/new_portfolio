<script>
	import Icon from '@iconify/svelte';

	export let sections = [];
	export let activeSectionId;
	export let y;

	let drawerVisible = false;
	let docsOpen = false;

	const docs = [
		{ label: 'Resume', href: '/Akshat.pdf', icon: 'mdi:file-document-outline' },
		{ label: 'CV', href: '/Akshat_CV.pdf', icon: 'mdi:file-account-outline' }
	];
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

	<div
		class="relative hidden md:block"
		on:mouseenter={() => (docsOpen = true)}
		on:mouseleave={() => (docsOpen = false)}
		role="presentation"
	>
		<button
			on:click={() => (docsOpen = !docsOpen)}
			class="inline-flex items-center gap-2 px-4 py-1.5 rounded-md surface surface-hover text-soft text-sm font-mono"
			aria-haspopup="true"
			aria-expanded={docsOpen}
		>
			<Icon icon="mdi:file-document-outline" class="text-base" />
			Resume
			<Icon
				icon="mdi:chevron-down"
				class={'text-base transition-transform duration-200 ' + (docsOpen ? 'rotate-180' : '')}
			/>
		</button>

		{#if docsOpen}
			<div
				class="absolute right-0 mt-2 w-44 rounded-md bg-black/90 backdrop-blur-xl border border-white/10 p-1.5 flex flex-col gap-0.5 shadow-xl"
			>
				{#each docs as doc}
					<a
						href={doc.href}
						target="_blank"
						rel="noopener noreferrer"
						class="flex items-center gap-2.5 px-3 py-2 rounded text-sm font-mono text-muted hover:text-white hover:bg-white/5 transition"
					>
						<Icon icon={doc.icon} class="text-base accent" />
						{doc.label}
					</a>
				{/each}
			</div>
		{/if}
	</div>

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
				<div class="mt-3 flex flex-col gap-2">
					{#each docs as doc}
						<a
							href={doc.href}
							target="_blank"
							rel="noopener noreferrer"
							class="px-4 py-3 rounded-md surface text-soft inline-flex items-center gap-2"
						>
							<Icon icon={doc.icon} /> {doc.label}
						</a>
					{/each}
				</div>
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
