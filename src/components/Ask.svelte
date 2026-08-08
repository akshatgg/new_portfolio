<script>
	import { onMount, onDestroy, tick } from 'svelte';
	import { browser } from '$app/environment';
	import Icon from '@iconify/svelte';
	import { PUBLIC_API_BASE } from '$env/static/public';
	import { loadTurns, persistTurn, clearTurns } from '../lib/ask/db.js';
	import { renderMarkdown } from '../lib/ask/markdown.js';
	import { mountOrb } from '../lib/ask/orb.js';

	const API_BASE = (PUBLIC_API_BASE ?? '').trim().replace(/\/$/, '');

	// 'idle' → 'listening' (typing) → 'thinking' (awaiting first token) → 'speaking'
	let phase = 'idle';
	let messages = [];
	let draft = '';
	let focused = false;
	let latency = 0;
	let tokens = 0;
	let elapsed = 0;

	let scrollEl;
	let inputEl;
	let orbHost;
	let orb = null;
	let clockTimer;

	$: busy = phase === 'thinking' || phase === 'speaking';
	$: isEmpty = messages.length === 0;
	$: stateLabel = {
		idle: 'idle',
		listening: 'listening',
		thinking: 'retrieving',
		speaking: 'answering'
	}[phase];
	// The model replies as Akshat in the first person — backend/data/system-prompt.md
	// is explicit that it never says "Akshat has…". So the prompts a visitor clicks
	// are addressed *to* him, not about him.
	const starters = [
		{ text: 'What did you build at Mark AI?', icon: 'mdi:billboard' },
		{ text: 'Explain your ClickHouse work', icon: 'mdi:database-outline' },
		{ text: 'Are you open to work right now?', icon: 'mdi:briefcase-search-outline' },
		{ text: 'What are you like to work with?', icon: 'mdi:account-heart-outline' }
	];

	const followUps = [
		'Show me your best project',
		"What's your tech stack?",
		'Walk me through your experience'
	];

	// Deliberately says nothing about which model is behind this.
	$: telemetry = [
		{ label: 'state', value: stateLabel },
		{ label: 'turns', value: messages.filter((m) => m.role === 'user').length || '—' },
		{ label: 'first token', value: latency ? `${latency}ms` : '—' },
		{ label: 'tokens out', value: tokens ? `~${tokens}` : '—' }
	];

	// ── conversation ────────────────────────────────────────────────────────────

	// The transcript only ever grows — and IndexedDB restores a returning visitor's
	// whole history on load — while the API caps how much it will accept. Sending
	// all of it means that once the cap is passed every request 400s: the chat dies
	// and never recovers. Send the last 10 exchanges instead, starting on a user
	// turn so the model never opens mid-answer.
	const HISTORY_TURNS = 10;
	const HISTORY_LIMIT = HISTORY_TURNS * 2 + 1; // 10 q/a pairs + the new question

	function historyWindow() {
		const recent = messages.slice(-HISTORY_LIMIT);
		const firstUser = recent.findIndex((m) => m.role === 'user');
		const window = firstUser > 0 ? recent.slice(firstUser) : recent;
		return window.map((m) => ({ role: m.role, content: m.content }));
	}

	async function ask(text) {
		const content = (text ?? draft).trim();
		if (!content || busy) return;

		const userMsg = { role: 'user', content };
		messages = [...messages, userMsg];
		draft = '';
		phase = 'thinking';
		tokens = 0;
		elapsed = 0;
		persistTurn(userMsg);
		scrollToLatest();
		if (inputEl) inputEl.style.height = 'auto';

		const t0 = performance.now();
		clockTimer = setInterval(() => (elapsed = Math.round(performance.now() - t0)), 90);

		if (!API_BASE) {
			finishAssistant(
				"The chat isn't wired up in this build. You can reach me directly at akshatg9636@gmail.com.",
				t0
			);
			return;
		}

		try {
			const res = await fetch(`${API_BASE}/api/chat`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				// The API is stateless, so history is replayed — but as a trailing
				// window, not the whole thing. See historyWindow().
				body: JSON.stringify({ messages: historyWindow() })
			});

			if (!res.ok) throw new Error((await res.json()).error ?? res.statusText);

			const reader = res.body.getReader();
			const decoder = new TextDecoder();
			let answer = '';
			beginAssistant(t0);

			for (;;) {
				const { done, value } = await reader.read();
				if (done) break;
				answer += decoder.decode(value, { stream: true });
				updateAssistant(answer);
			}
			finishAssistant(answer);
		} catch {
			finishAssistant(
				"I can't get to the chat right now. You can reach me directly at akshatg9636@gmail.com."
			);
		}
	}

	function beginAssistant(t0) {
		clearInterval(clockTimer);
		if (t0 !== undefined) latency = Math.round(performance.now() - t0);
		phase = 'speaking';
		messages = [...messages, { role: 'assistant', content: '', streaming: true }];
		scrollToLatest();
	}

	function updateAssistant(text) {
		orb?.pulse();
		const next = messages.slice();
		next[next.length - 1] = { ...next[next.length - 1], content: text };
		messages = next;
		tokens = Math.round(text.length / 3.7);
		scrollToLatest();
	}

	function finishAssistant(text, t0) {
		clearInterval(clockTimer);
		// This overwrites the last row, so that row must actually be the
		// assistant's. Two paths reach here without one ever being opened: the
		// no-API early return, and a fetch that throws before the first chunk.
		// Overwriting blindly there replaced the *user's* message with this text
		// — the question vanished and the error appeared in their own bubble.
		const last = messages[messages.length - 1];
		if (!last || last.role !== 'assistant') beginAssistant(t0);
		const next = messages.slice();
		next[next.length - 1] = { ...next[next.length - 1], content: text, streaming: false };
		messages = next;
		phase = 'idle';
		tokens = Math.round(text.length / 3.7);
		persistTurn({ role: 'assistant', content: text });
	}

	async function resetChat() {
		await clearTurns();
		messages = [];
		phase = 'idle';
		draft = '';
		// Otherwise the fade from the cleared thread survives into the empty state.
		tick().then(measureOverflow);
	}

	// bind:value owns `draft`; this grows the box and reflects typing in the
	// status light. It checks `phase` directly rather than the derived `busy`,
	// which would make busy → phase → busy a cyclical reactive dependency.
	function autosize(e) {
		const el = e.target;
		el.style.height = 'auto';
		el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
		if (phase === 'idle' || phase === 'listening') {
			phase = el.value ? 'listening' : 'idle';
		}
	}

	function onKeyDown(e) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			ask();
		}
	}

	// Follow the transcript, but never yank the empty-state greeting out of view.
	function scrollToLatest() {
		if (!scrollEl || !messages.length) return;
		tick().then(() => {
			if (!scrollEl) return;
			scrollEl.scrollTop = scrollEl.scrollHeight;
			measureOverflow();
		});
	}

	// ── overflow cue ────────────────────────────────────────────────────────────
	// Which edges have content past them, so the fade only appears where something
	// is actually cut off. A permanent fade reads as a design flourish; one that
	// comes and goes reads as "there is more up there".
	let cutTop = false;
	let cutBottom = false;

	function measureOverflow() {
		if (!scrollEl) return;
		const slack = scrollEl.scrollHeight - scrollEl.clientHeight;
		cutTop = scrollEl.scrollTop > 8;
		cutBottom = slack > 8 && scrollEl.scrollTop < slack - 8;
	}

	const FADE = '34px';
	$: maskStops =
		(cutTop ? `transparent 0, #000 ${FADE}` : '#000 0') +
		', ' +
		(cutBottom ? `#000 calc(100% - ${FADE}), transparent 100%` : '#000 100%');
	$: maskStyle = `-webkit-mask-image: linear-gradient(to bottom, ${maskStops}); mask-image: linear-gradient(to bottom, ${maskStops});`;

	onMount(() => {
		loadTurns().then((turns) => {
			if (!turns.length) return;
			messages = turns.map((t) => ({ ...t, streaming: false }));
			scrollToLatest();
		});

		// A narrower window rewraps the transcript, which changes whether anything
		// is actually cut off at the edges.
		window.addEventListener('resize', measureOverflow);

		// Density is tied to the rendered size — the same particle count spread
		// over a larger sphere reads as sparser. 3400 is tuned for the ~320px the
		// rail gives it.
		if (orbHost) orb = mountOrb(orbHost, () => phase, { density: 3400 });

		return () => window.removeEventListener('resize', measureOverflow);
	});

	onDestroy(() => {
		// onDestroy also runs during SSR, where none of this was ever started.
		if (!browser) return;
		clearInterval(clockTimer);
		orb?.destroy();
	});
</script>

<div class="ask">
	<div class="ask-body">
		<!-- orb rail -->
		<div class="orb-pane">
			<div class="orb-stack">
				<div class="orb-box" class:compact={messages.length}>
					<div bind:this={orbHost} class="orb-host"></div>
				</div>

				<div class="orb-copy">
					<div class="ask-wordmark">ASK</div>
					<p>An AI answering as me, from my own résumé, repos and shipped systems — nothing else.</p>
				</div>
			</div>

			<div class="telemetry">
				<div class="rubric">// telemetry</div>
				<div class="telemetry-grid">
					{#each telemetry as t}
						<div class="tile">
							<div class="tile-label">{t.label}</div>
							<div class="tile-value">{t.value}</div>
						</div>
					{/each}
				</div>
				<div class="privacy">
					<Icon icon="mdi:shield-lock-outline" width="13" />
					Stateless API · history stays in your browser
				</div>
			</div>
		</div>

		<!-- transcript + composer -->
		<div class="convo">
			<!-- Reserved whether or not the button is in it, so starting a thread does
			     not shove the transcript down a row. -->
			<div class="convo-meta">
				<div class="meta-inner">
					{#if messages.length}
						<button class="reset-btn" on:click={resetChat} title="Clear this conversation">
							<Icon icon="mdi:broom" width="14" />
							New thread
						</button>
					{/if}
				</div>
			</div>

			<div
				bind:this={scrollEl}
				class="scroll-area"
				class:centered={isEmpty}
				style={maskStyle}
				on:scroll={measureOverflow}
			>
				<div class="convo-inner">
					{#if isEmpty}
						<div class="empty">
							<div class="empty-head">
								<span class="rubric">// ask away</span>
								<h2 class="greeting">
									Hi, I'm Akshat.<br /><span class="accent">Ask me anything.</span>
								</h2>
								<p class="empty-blurb">
									Everything I've built is loaded in — ask in plain language and you'll get the
									actual numbers.
								</p>
							</div>

							<div class="starters">
								{#each starters as s}
									<button class="starter" on:click={() => ask(s.text)}>
										<Icon icon={s.icon} width="15" style="color: #4ade80; flex-shrink: 0;" />
										<span>{s.text}</span>
									</button>
								{/each}
							</div>
						</div>
					{/if}

					{#each messages as m, i (i)}
						<div class="row" class:mine={m.role === 'user'}>
							{#if m.role === 'user'}
								<div class="bubble">{m.content}</div>
							{:else}
								<div class="assistant">
									<div class="avatar" class:bobbing={m.streaming}>
										<span class="avatar-dot"></span>
									</div>
									<div class="assistant-col">
										<div class="assistant-head">
											<span class="assistant-tag">ASK</span>
											<span class="assistant-rule"></span>
										</div>
										<!-- Safe: renderMarkdown escapes before it adds any markup. -->
										<div class="assistant-text">{@html renderMarkdown(m.content)}</div>
										{#if m.streaming}
											<div class="streaming">
												<span class="streaming-dot">
													<span class="streaming-ping"></span>
													<span class="streaming-core"></span>
												</span>
												streaming
											</div>
										{/if}
									</div>
								</div>
							{/if}
						</div>
					{/each}

					{#if phase === 'thinking'}
						<div class="row thinking">
							<div class="avatar bobbing"><span class="avatar-dot"></span></div>
							<div class="sweeps">
								<span class="sweep-track wide"><span class="sweep"></span></span>
								<span class="sweep-track narrow"><span class="sweep delayed"></span></span>
								<span class="thinking-label">searching the knowledge base · {elapsed}ms</span>
							</div>
						</div>
					{/if}
				</div>
			</div>

			<!-- composer -->
			<div class="composer-wrap">
				<div class="composer-inner">
					{#if messages.length && !busy}
						<div class="followups">
							{#each followUps as f}
								<button class="followup" on:click={() => ask(f)}>{f}</button>
							{/each}
						</div>
					{/if}

					<div class="composer" class:focused>
						<textarea
							bind:this={inputEl}
							bind:value={draft}
							on:input={autosize}
							on:keydown={onKeyDown}
							on:focus={() => (focused = true)}
							on:blur={() => (focused = false)}
							rows="1"
							placeholder="Ask me anything…"
						></textarea>
						<button
							class="send"
							class:armed={draft.trim() && !busy}
							on:click={() => ask()}
							aria-label="Send"
							disabled={!draft.trim() || busy}
						>
							<Icon icon="mdi:arrow-up" width="17" />
						</button>
					</div>
					<div class="composer-hint">
						<span>Enter to send · Shift+Enter for a new line</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	/* The hero itself, not a panel in it: no frame, no surface, no shadow. The
	   page background (and the particle field on it) reads straight through.
	   Everything that used to switch on a `docked` / `expanded` flag is now a
	   plain media query at 1024px. */
	.ask {
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		min-height: 0;
		letter-spacing: 0.02em;
	}

	.convo-meta {
		flex-shrink: 0;
		padding: 0 20px 10px;
	}
	.meta-inner {
		width: 100%;
		margin: 0 auto;
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 12px;
		min-height: 30px;
	}
	/* Was a bare 13px glyph on an 8%-white border, which read as a smudge. It is the
	   only control in the conversation column, so it gets a label and enough
	   contrast to be found without hunting. */
	.reset-btn {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		padding: 6px 13px;
		border-radius: 9999px;
		background: rgba(74, 222, 128, 0.08);
		border: 1px solid rgba(74, 222, 128, 0.3);
		color: rgba(231, 231, 231, 0.82);
		font-family: 'JetBrains Mono', ui-monospace, monospace;
		font-size: 11px;
		letter-spacing: 0.01em;
		white-space: nowrap;
		cursor: pointer;
		transition: all 0.2s;
	}
	.reset-btn:hover {
		background: rgba(74, 222, 128, 0.18);
		border-color: rgba(74, 222, 128, 0.6);
		color: #86efac;
	}

	.ask-body {
		flex: 1 1 0%;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}

	/* ── orb rail ── */
	.orb-pane {
		flex: 0 0 auto;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 6px 0 10px;
	}
	.orb-stack {
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.orb-box {
		position: relative;
		width: 158px;
		height: 158px;
		flex: 0 0 auto;
	}
	/* Once a transcript exists the orb steps back to a status light so the answers
	   get the room. */
	.orb-box.compact {
		width: 52px;
		height: 52px;
	}
	.orb-host {
		position: absolute;
		inset: 0;
	}
	/* Wordmark, blurb and telemetry are the wide layout's furniture — below 1024
	   the pane collapses to the orb alone. */
	.orb-copy,
	.telemetry {
		display: none;
	}
	.ask-wordmark {
		font-family: 'JetBrains Mono', ui-monospace, monospace;
		font-size: 20px;
		font-weight: 600;
		color: #f5f5f5;
		letter-spacing: 0.22em;
		padding-left: 0.22em;
	}
	.orb-copy p {
		font-size: 13px;
		color: rgba(231, 231, 231, 0.55);
		text-align: center;
		line-height: 1.6;
		max-width: 260px;
		text-wrap: pretty;
	}
	.rubric {
		font-family: 'JetBrains Mono', ui-monospace, monospace;
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.3em;
		color: rgba(231, 231, 231, 0.38);
	}
	.telemetry-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}
	.tile {
		background: rgba(10, 10, 10, 0.6);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 8px;
		padding: 10px 12px;
	}
	.tile-label {
		font-size: 9px;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: rgba(231, 231, 231, 0.38);
		font-family: 'JetBrains Mono', ui-monospace, monospace;
	}
	.tile-value {
		font-size: 14px;
		color: rgba(231, 231, 231, 0.85);
		font-family: 'JetBrains Mono', ui-monospace, monospace;
		margin-top: 3px;
		font-variant-numeric: tabular-nums;
	}
	.privacy {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 11px;
		color: rgba(231, 231, 231, 0.38);
		font-family: 'JetBrains Mono', ui-monospace, monospace;
	}

	/* ── transcript ── */
	.convo {
		display: flex;
		flex-direction: column;
		min-height: 0;
		flex: 1 1 0%;
	}
	.scroll-area {
		flex: 1 1 0%;
		min-height: 0;
		overflow-y: auto;
		padding: 4px 0 14px;
		display: flex;
		flex-direction: column;
	}
	/* Overrides app.css's 8px page scrollbar for these two panes only — inside the
	   conversation it sat too close in weight to the message rules themselves. */
	.scroll-area,
	.orb-pane {
		scrollbar-width: thin;
		scrollbar-color: rgba(74, 222, 128, 0.28) transparent;
	}
	.scroll-area::-webkit-scrollbar,
	.orb-pane::-webkit-scrollbar {
		width: 4px;
	}
	.scroll-area::-webkit-scrollbar-track,
	.orb-pane::-webkit-scrollbar-track {
		background: transparent;
	}
	.scroll-area::-webkit-scrollbar-thumb,
	.orb-pane::-webkit-scrollbar-thumb {
		background: rgba(74, 222, 128, 0.28);
		border-radius: 9999px;
	}
	.scroll-area::-webkit-scrollbar-thumb:hover,
	.orb-pane::-webkit-scrollbar-thumb:hover {
		background: rgba(74, 222, 128, 0.5);
	}
	.convo-inner {
		width: 100%;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		gap: 18px;
		padding: 0 20px;
		/* A thread reads top-down: the first question stays put at the top and the
		   answers grow downward under it. */
		margin-left: auto;
		margin-right: auto;
	}
	/* Nothing asked yet: the greeting is the only content, so centre it instead of
	   stranding it against the top edge. */
	.scroll-area.centered .convo-inner {
		margin-top: auto;
		margin-bottom: auto;
	}

	.empty {
		display: flex;
		flex-direction: column;
		gap: 18px;
	}
	.empty-head {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.greeting {
		font-size: clamp(28px, 4.2vw, 42px);
		font-weight: 700;
		color: #f5f5f5;
		letter-spacing: -0.02em;
		line-height: 1.12;
		margin: 0;
	}
	.accent {
		color: #4ade80;
	}
	.empty-blurb {
		display: none;
		font-size: 16px;
		color: rgba(231, 231, 231, 0.78);
		line-height: 1.65;
		max-width: 520px;
		text-wrap: pretty;
	}

	.starters {
		display: grid;
		grid-template-columns: 1fr;
		gap: 9px;
	}
	.starter {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		text-align: left;
		padding: 12px 14px;
		border-radius: 10px;
		background: rgba(10, 10, 10, 0.6);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.06);
		color: rgba(231, 231, 231, 0.78);
		font-size: 13px;
		line-height: 1.45;
		letter-spacing: 0.01em;
		font-family: inherit;
		cursor: pointer;
		transition:
			border-color 0.25s ease,
			background-color 0.25s ease,
			transform 0.25s ease;
	}
	.starter:hover {
		border-color: rgba(34, 197, 94, 0.35);
		background: rgba(15, 15, 15, 0.75);
		transform: translateY(-2px);
	}

	.row {
		display: flex;
		animation: ask-rise 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
	}
	.row.mine {
		justify-content: flex-end;
	}
	.bubble {
		max-width: 82%;
		background: rgba(74, 222, 128, 0.1);
		border: 1px solid rgba(74, 222, 128, 0.22);
		border-radius: 14px 14px 4px 14px;
		padding: 11px 15px;
		font-size: 13.5px;
		line-height: 1.55;
		color: #f0fdf4;
		text-wrap: pretty;
	}
	.assistant {
		display: flex;
		gap: 12px;
		width: 100%;
	}
	.avatar {
		width: 26px;
		height: 26px;
		flex-shrink: 0;
		border-radius: 9999px;
		border: 1px solid rgba(74, 222, 128, 0.35);
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(74, 222, 128, 0.08);
	}
	.avatar.bobbing {
		animation: ask-bob 2s ease-in-out infinite;
	}
	.avatar-dot {
		width: 7px;
		height: 7px;
		border-radius: 9999px;
		background: #4ade80;
		display: block;
	}
	.assistant-col {
		flex: 1 1 0%;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.assistant-head {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.assistant-tag {
		font-family: 'JetBrains Mono', ui-monospace, monospace;
		font-size: 10px;
		letter-spacing: 0.22em;
		color: rgba(231, 231, 231, 0.55);
	}
	.assistant-rule {
		height: 1px;
		flex: 1 1 0%;
		background: linear-gradient(to right, rgba(74, 222, 128, 0.25), transparent);
	}
	.assistant-text {
		font-size: 13.5px;
		line-height: 1.7;
		color: rgba(231, 231, 231, 0.86);
		text-wrap: pretty;
	}
	/* This subtree is injected with {@html}, so its elements never receive
	   Svelte's scoping class. Plain descendant selectors compile to
	   `.assistant-text.svelte-x p.svelte-x`, match nothing, and get pruned as
	   unused — the rules ship dead and the markdown renders bare. Every selector
	   below the container must therefore be :global(). */
	.assistant-text :global(p) {
		margin: 0 0 0.8em;
	}
	.assistant-text :global(p:last-child) {
		margin-bottom: 0;
	}
	.assistant-text :global(strong) {
		color: #e7e7e7;
		font-weight: 600;
	}
	.assistant-text :global(em) {
		font-style: italic;
	}
	.assistant-text :global(code) {
		font-family: 'JetBrains Mono', ui-monospace, monospace;
		font-size: 0.88em;
		padding: 1px 5px;
		border-radius: 4px;
		background: rgba(74, 222, 128, 0.09);
		border: 1px solid rgba(74, 222, 128, 0.16);
		color: #4ade80;
		word-break: break-word;
	}
	.assistant-text :global(a) {
		color: #4ade80;
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.assistant-text :global(.md-h) {
		color: #e7e7e7;
		font-weight: 600;
		margin: 0 0 0.5em;
	}
	.assistant-text :global(ul),
	.assistant-text :global(ol) {
		margin: 0 0 0.8em;
		display: flex;
		flex-direction: column;
		gap: 0.4em;
	}
	.assistant-text :global(ul) {
		list-style: none;
		padding-left: 0.15em;
	}
	.assistant-text :global(ol) {
		list-style: decimal;
		padding-left: 1.25em;
	}
	.assistant-text :global(li) {
		padding-left: 1em;
		position: relative;
	}
	/* A dot drawn rather than a list marker, so it can take the accent colour. */
	.assistant-text :global(ul > li::before) {
		content: '';
		position: absolute;
		left: 0.1em;
		top: 0.62em;
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background: #4ade80;
		opacity: 0.65;
	}
	.assistant-text :global(ol > li) {
		padding-left: 0.2em;
	}
	.assistant-text :global(ul:last-child),
	.assistant-text :global(ol:last-child) {
		margin-bottom: 0;
	}

	.streaming {
		display: flex;
		align-items: center;
		gap: 9px;
		font-family: 'JetBrains Mono', ui-monospace, monospace;
		font-size: 10px;
		color: rgba(231, 231, 231, 0.38);
	}
	.streaming-dot {
		position: relative;
		display: block;
		width: 6px;
		height: 6px;
	}
	.streaming-ping {
		position: absolute;
		inset: 0;
		border-radius: 9999px;
		background: #4ade80;
		opacity: 0.6;
		animation: ask-ping 1.1s cubic-bezier(0, 0, 0.2, 1) infinite;
	}
	.streaming-core {
		position: relative;
		display: block;
		width: 6px;
		height: 6px;
		border-radius: 9999px;
		background: #4ade80;
	}

	.thinking {
		gap: 12px;
	}
	.sweeps {
		display: flex;
		flex-direction: column;
		gap: 9px;
		flex: 1;
		padding-top: 3px;
	}
	.sweep-track {
		position: relative;
		display: block;
		height: 8px;
		overflow: hidden;
		border-radius: 4px;
		background: rgba(255, 255, 255, 0.05);
	}
	.sweep-track.wide {
		width: 70%;
	}
	.sweep-track.narrow {
		width: 45%;
	}
	.sweep {
		position: absolute;
		inset-block: 0;
		width: 33%;
		background: linear-gradient(90deg, transparent, rgba(74, 222, 128, 0.35), transparent);
		animation: ask-sweep 1.4s linear infinite;
	}
	.sweep.delayed {
		animation-delay: 0.3s;
		background: linear-gradient(90deg, transparent, rgba(74, 222, 128, 0.25), transparent);
	}
	.thinking-label {
		font-family: 'JetBrains Mono', ui-monospace, monospace;
		font-size: 10px;
		color: rgba(231, 231, 231, 0.38);
	}

	/* ── composer ── */
	.composer-wrap {
		flex-shrink: 0;
		position: relative;
		padding: 4px 20px 0;
	}
	.composer-inner {
		position: relative;
		width: 100%;
		margin: 0 auto;
	}
	.followups {
		display: flex;
		flex-wrap: wrap;
		gap: 7px;
		padding-bottom: 10px;
	}
	.followup {
		padding: 6px 12px;
		border-radius: 9999px;
		background: rgba(74, 222, 128, 0.05);
		border: 1px solid rgba(74, 222, 128, 0.18);
		color: rgba(231, 231, 231, 0.7);
		font-family: 'JetBrains Mono', ui-monospace, monospace;
		font-size: 11px;
		letter-spacing: 0.01em;
		cursor: pointer;
		transition: all 0.2s;
	}
	.followup:hover {
		background: rgba(74, 222, 128, 0.14);
		border-color: rgba(74, 222, 128, 0.5);
		color: #86efac;
	}
	/* Pill at rest — 27px is half the single-line height. It stays generously
	   rounded rather than going square once the textarea grows. */
	.composer {
		display: flex;
		align-items: flex-end;
		gap: 10px;
		padding: 10px 10px 10px 20px;
		border-radius: 27px;
		background: rgba(14, 14, 14, 0.9);
		border: 1px solid rgba(255, 255, 255, 0.08);
		transition:
			border-color 0.25s ease,
			box-shadow 0.25s ease;
	}
	.composer.focused {
		border-color: rgba(74, 222, 128, 0.45);
		box-shadow: 0 0 0 4px rgba(74, 222, 128, 0.07);
	}
	.composer textarea {
		flex: 1 1 0%;
		resize: none;
		background: transparent;
		border: none;
		outline: none;
		color: #e7e7e7;
		font-size: 14.5px;
		line-height: 1.6;
		max-height: 120px;
		padding: 3px 0;
		font-family: inherit;
	}
	.send {
		flex-shrink: 0;
		width: 34px;
		height: 34px;
		border-radius: 9999px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: none;
		background: rgba(255, 255, 255, 0.05);
		color: rgba(231, 231, 231, 0.3);
		cursor: default;
		transition: all 0.2s;
	}
	.send.armed {
		background: #4ade80;
		color: #000;
		cursor: pointer;
	}
	.composer-hint {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		margin-top: 8px;
		font-family: 'JetBrains Mono', ui-monospace, monospace;
		font-size: 10px;
		color: rgba(231, 231, 231, 0.3);
	}

	/* ── wide layout: orb rail beside the conversation ── */
	@media (min-width: 1024px) {
		.ask-body {
			flex-direction: row;
			gap: 44px;
		}
		/* A hairline column rule, not a frame — it separates the two halves without
		   boxing either of them in. */
		.orb-pane {
			width: 412px;
			flex: 0 0 auto;
			display: flex;
			flex-direction: column;
			align-items: stretch;
			justify-content: flex-start;
			border-right: 1px solid rgba(255, 255, 255, 0.06);
			/* Inset from the page gutter rather than flush to it. Aligning the orb's
			   bounding box with the header's text gutter reads as too far left,
			   because the sphere's lit mass sits well inside its own box. */
			padding: 0 44px 0 52px;
			box-sizing: border-box;
			overflow-y: auto;
			overflow-x: hidden;
		}
		/* The orb and its copy float as one group in the space the telemetry leaves. */
		.orb-stack {
			flex: 1 1 auto;
			min-height: 0;
			flex-direction: column;
			gap: 20px;
		}
		/* The rail keeps the full orb whether or not a transcript exists — only the
		   stacked layout has to trade it away for room. */
		.orb-box,
		.orb-box.compact {
			width: 100%;
			height: auto;
			aspect-ratio: 1 / 1;
			max-height: 300px;
			min-height: 140px;
			flex: 0 1 300px;
		}
		.orb-copy {
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 10px;
		}
		.telemetry {
			display: flex;
			flex-direction: column;
			gap: 10px;
			flex: 0 0 auto;
			padding-top: 28px;
		}
		.convo-meta {
			padding: 0 0 14px;
		}
		.meta-inner,
		.convo-inner,
		.composer-inner {
			max-width: 760px;
		}
		.scroll-area {
			padding: 0 0 20px;
		}
		.convo-inner {
			padding: 0;
			gap: 26px;
		}
		.empty-blurb {
			display: block;
		}
		.starters {
			grid-template-columns: 1fr 1fr;
		}
		.starter {
			font-size: 14px;
		}
		.bubble {
			font-size: 15px;
		}
		.assistant-text {
			font-size: 15.5px;
		}
		.composer-wrap {
			padding: 4px 0 0;
		}
	}

	@keyframes ask-rise {
		from {
			opacity: 0;
			transform: translateY(14px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	@keyframes ask-bob {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-3px);
		}
	}
	@keyframes ask-sweep {
		0% {
			transform: translateX(-100%);
		}
		100% {
			transform: translateX(300%);
		}
	}
	@keyframes ask-ping {
		75%,
		100% {
			transform: scale(2);
			opacity: 0;
		}
	}
</style>
