<script>
	import Ask from './Ask.svelte';
</script>

<!-- The hero is the assistant. There is no headline block or side rail any more:
     the panel that used to dock here now *is* the landing screen, and the résumé
     content it answers from lives in the sections below. -->
<section class="hero">
	<Ask />
</section>

<style>
	/* Padding, not a frame: this is what lines the hero up with the header's own
	   gutter (px-5 / md:px-12) so the assistant reads as the page, not a card on it. */
	.hero {
		width: 100%;
		box-sizing: border-box;
		display: flex;
		margin-top: 64px;
		/* A *definite* height, not min-height. min-height leaves the box free to
		   grow, so a long thread stretched the hero and scrolled the whole document
		   with the composer pushed off the bottom — and nothing below could resolve
		   a percentage height to scroll against. Fixing it here is what lets the
		   transcript scroll inside its own pane. */
		height: calc(100vh - 64px);
		height: calc(100dvh - 64px);
		padding: 8px 20px 28px;
	}

	@media (min-width: 768px) {
		.hero {
			margin-top: 80px;
			height: calc(100vh - 80px);
			height: calc(100dvh - 80px);
			padding: 12px 48px 36px;
		}
	}
</style>
