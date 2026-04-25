<script>
	import Icon from '@iconify/svelte';
	const year = new Date().getFullYear();

	const links = [
		{ icon: 'mdi:linkedin', href: 'https://www.linkedin.com/in/akshatgg/', label: 'LinkedIn' },
		{ icon: 'mdi:github', href: 'https://github.com/akshatgg', label: 'GitHub' },
		{ icon: 'mdi:twitter', href: 'https://x.com/akshat___30', label: 'Twitter' },
		{ icon: 'mdi:email-outline', href: 'mailto:akshatg9636@gmail.com', label: 'Email' }
	];
</script>

<footer class="w-full border-t divider mt-16">
	<div class="w-full max-w-5xl mx-auto px-6 py-7 flex flex-col md:flex-row items-center justify-between gap-3">
		<div class="font-mono text-xs md:text-sm text-muted text-center md:text-left">
			<span class="accent">$</span> built with caffeine &amp; ClickHouse logs
			<div class="text-[11px] text-muted/70 mt-0.5">© {year} Akshat Gupta</div>
		</div>

		<div class="flex items-center gap-1">
			{#each links as l}
				<a
					href={l.href}
					target={l.href.startsWith('http') ? '_blank' : undefined}
					rel="noopener noreferrer"
					aria-label={l.label}
					class="p-2 rounded-md text-muted hover:text-white hover:bg-white/5 transition"
				>
					<Icon icon={l.icon} class="text-lg" />
				</a>
			{/each}
		</div>
	</div>
</footer>
