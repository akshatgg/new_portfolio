<script>
	import Icon from '@iconify/svelte';
</script>

<section
	class="w-full h-20 md:h-16 border-t-[1px] border-border-bottom flex justify-center items-center z-40"
>
	<div
		class="w-10/12 flex flex-col md:flex-row justify-center md:justify-between items-center gap-2"
	>
		<div class="capitalize text-sm text-secondary-text">
			@ made with love by <span class="text-border">&nbsp;&lt;&nbsp;Akshat Gupta&nbsp;/&gt;</span>
		</div>
		<div class="flex gap-5 items-center">
			<a href="https://www.linkedin.com/in/akshatgg/" target="_blank">
				<Icon icon="mdi:linkedin" class="cursor-pointer text-2xl text-secondary" />
			</a>
			<a href="https://x.com/akshat___30" target="_blank">
				<Icon icon="mdi:twitter" class="cursor-pointer text-2xl text-secondary" />
			</a>
			<a
				href="https://www.instagram.com"
				target="_blank"
			>
				<Icon icon="lets-icons:insta" class="cursor-pointer text-2xl text-secondary" />
			</a>
			<a href="https://github.com/akshatgg" target="_blank">
				<Icon icon="mdi:github" class="cursor-pointer text-2xl text-secondary" />
			</a>
		</div>
	</div>
</section>
