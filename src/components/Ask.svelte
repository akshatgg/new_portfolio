<script>
	import { onMount, onDestroy, tick } from 'svelte';
	import { browser } from '$app/environment';
	import Icon from '@iconify/svelte';
	import { PUBLIC_API_BASE } from '$env/static/public';
	import { dockEl, askExpanded, askClosed } from '../lib/ask/store.js';
	import { loadTurns, persistTurn, clearTurns } from '../lib/ask/db.js';
	import { renderMarkdown } from '../lib/ask/markdown.js';
	import { mountOrb } from '../lib/ask/orb.js';

	const API_BASE = (PUBLIC_API_BASE ?? '').trim().replace(/\/$/, '');

	// 'idle' → 'listening' (typing) → 'thinking' (awaiting first token) → 'speaking'
	let phase = 'idle';
	let messages = [];
	let draft = '';
	let focused = false;
	$: expanded = $askExpanded;
	$: closed = $askClosed;
	let dock = null;
	let latency = 0;
	let tokens = 0;
	let elapsed = 0;

	let scrollEl;
	let inputEl;
	let orbHost;
	let orb = null;
	let clockTimer;
	let measureRaf;

	$: busy = phase === 'thinking' || phase === 'speaking';
	$: isEmpty = messages.length === 0;
	$: stateLabel = { idle: 'idle', listening: 'listening', thinking: 'retrieving', speaking: 'answering' }[phase];
	$: dotColor = phase === 'thinking' ? '#fbbf24' : '#4ade80';
	$: chromeLabel = expanded ? `ask.akshat — ${stateLabel}` : 'ask.akshat';

	const starters = [
		{ text: 'What did he build at Mark AI?', icon: 'mdi:billboard' },
		{ text: 'Explain his ClickHouse work', icon: 'mdi:database-outline' },
		{ text: 'Is he open to work right now?', icon: 'mdi:briefcase-search-outline' },
		{ text: "What's he like to work with?", icon: 'mdi:account-heart-outline' }
	];

	const followUps = ['Show me his best project', "What's his tech stack?", 'Walk me through his experience'];

	$: telemetry = [
		{ label: 'model', value: API_BASE ? 'flash-lite' : 'offline' },
		{ label: 'state', value: stateLabel },
		{ label: 'first token', value: latency ? `${latency}ms` : '—' },
		{ label: 'tokens out', value: tokens ? `~${tokens}` : '—' }
	];

	// ── the docked/expanded geometry ────────────────────────────────────────────
	// The panel is fixed so it can animate out to full screen. While docked it
	// tracks the hero's slot, which moves on scroll, resize and reflow — a rAF
	// loop is cheaper than fighting three different observers.

	function measure() {
		const el = $dockEl;
		if (!el) return;
		const r = el.getBoundingClientRect();
		if (!r.width || !r.height) return;
		if (
			!dock ||
			Math.abs(dock.top - r.top) > 0.5 ||
			Math.abs(dock.left - r.left) > 0.5 ||
			Math.abs(dock.width - r.width) > 0.5 ||
			Math.abs(dock.height - r.height) > 0.5
		) {
			dock = { top: r.top, left: r.left, width: r.width, height: r.height };
		}
	}

	$: surfaceGeometry = expanded
		? 'top: 4vh; left: 6vw; width: 88vw; height: 92vh; border-radius: 18px; box-shadow: 0 60px 120px -40px rgba(0,0,0,0.9), 0 0 0 1px rgba(74,222,128,0.12);'
		: dock
			? `top: ${dock.top}px; left: ${dock.left}px; width: ${dock.width}px; height: ${dock.height}px; border-radius: 16px; box-shadow: 0 30px 70px -40px rgba(0,0,0,0.9);`
			: 'top: 140px; right: 40px; left: auto; width: 420px; height: 520px; border-radius: 16px; box-shadow: 0 30px 70px -40px rgba(0,0,0,0.9);';

	// The orb is the panel's status light, so it has to stay legible once a
	// transcript is pushing on it. min-height is what actually defends the size
	// mid-chat: the box is a flex child, so without it the growing transcript
	// squeezes the orb down to a speck.
	$: orbBoxStyle = expanded
		? 'position: relative; width: 100%; aspect-ratio: 1 / 1; max-height: 420px; min-height: 240px; flex: 0 1 420px;'
		: messages.length
			? 'position: relative; width: 84px; height: 84px; flex: 0 0 auto;'
			: 'position: relative; width: 196px; height: 196px; flex: 0 1 196px; min-height: 120px;';

	$: orbPaneStyle = expanded
		? 'width: 360px; flex-shrink: 0; border-right: 1px solid rgba(255,255,255,0.06); display: flex; flex-direction: column; padding: 24px; box-sizing: border-box; overflow-y: auto; overflow-x: hidden;'
		: messages.length
			? 'flex: 0 0 auto; display: flex; align-items: center; justify-content: center; padding: 8px 0 0;'
			: 'flex: 0 1 auto; min-height: 0; display: flex; align-items: center; justify-content: center; padding: 10px 0 2px;';

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
				'The assistant is not configured in this build. Akshat can be reached directly at akshatg9636@gmail.com.',
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
				'The assistant is unavailable right now. Akshat can be reached directly at akshatg9636@gmail.com.'
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
	}

	// ── panel controls ──────────────────────────────────────────────────────────

	function expand() {
		askClosed.set(false);
		askExpanded.set(true);
		trackDuringTransition();
		tick().then(() => inputEl?.focus());
	}
	function collapse() {
		askExpanded.set(false);
		trackDuringTransition();
	}

	/** Follow the slot for the length of the expand/collapse transition, then stop. */
	function trackDuringTransition() {
		if (!browser) return;
		cancelAnimationFrame(measureRaf);
		const until = performance.now() + 550;
		const step = () => {
			measure();
			if (performance.now() < until) measureRaf = requestAnimationFrame(step);
		};
		step();
	}
	function toggleExpand() {
		expanded ? collapse() : expand();
	}
	function close() {
		askExpanded.set(false);
		askClosed.set(true);
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
		tick().then(() => scrollEl && (scrollEl.scrollTop = scrollEl.scrollHeight));
	}

	onMount(() => {
		loadTurns().then((turns) => {
			if (turns.length) messages = turns.map((t) => ({ ...t, streaming: false }));
		});

		// Density is tied to the rendered size — the same particle count spread
		// over a larger sphere reads as sparser, so it rises with the box.
		if (orbHost) orb = mountOrb(orbHost, () => phase, { density: 4200 });

		// A single measure() here is too early: the hero slot has not reached its
		// final width until the webfont lands and the grid settles, so the panel
		// would keep a box narrower than the slot for the rest of the session —
		// and only correct itself after an expand/collapse, which re-measures.
		// Three cheap things cover the settling window instead.
		trackDuringTransition(); // 550ms burst, catches the initial reflow
		document.fonts?.ready.then(measure); // webfont swap changes the hero's width

		// The slot is the source of truth for the docked box, so follow it for the
		// whole session. Safe against the observer feedback loop that froze this
		// page before: the panel is position:fixed, so restyling it cannot resize
		// the slot, and measure() only assigns when the box moved >0.5px.
		let slotRO;
		const unsubDock = dockEl.subscribe((el) => {
			slotRO?.disconnect();
			if (!el) return;
			slotRO = new ResizeObserver(measure);
			slotRO.observe(el);
			measure();
		});

		window.addEventListener('scroll', measure, { passive: true });
		window.addEventListener('resize', measure);

		return () => {
			unsubDock();
			slotRO?.disconnect();
			window.removeEventListener('scroll', measure);
			window.removeEventListener('resize', measure);
		};
	});

	onDestroy(() => {
		// onDestroy also runs during SSR, where the animation-frame API does not
		// exist and nothing was ever started.
		if (!browser) return;
		clearInterval(clockTimer);
		cancelAnimationFrame(measureRaf);
		orb?.destroy();
	});
</script>

<!-- backdrop, only interactive while expanded -->
<div
	class="ask-backdrop"
	class:on={expanded}
	on:click={collapse}
	on:keydown={(e) => e.key === 'Escape' && collapse()}
	role="presentation"
></div>

<div class="ask-surface" class:closed={$askClosed} style={surfaceGeometry}>
	<!-- chrome -->
	<div class="ask-chrome">
		<div class="lights">
			<button class="light red" on:click={close} aria-label="Close" title="Close"></button>
			<button class="light amber" on:click={collapse} aria-label="Dock" title="Dock to hero"></button>
			<button class="light green" on:click={expand} aria-label="Expand" title="Expand"></button>
		</div>

		<div class="chrome-label">
			<span class="dot" style="background: {dotColor}; box-shadow: 0 0 8px {dotColor};"></span>
			<span>{chromeLabel}</span>
		</div>

		<div class="chrome-actions">
			{#if messages.length}
				<button class="ghost-btn" on:click={resetChat} aria-label="New thread" title="New thread">
					<Icon icon="mdi:broom" width="13" />
				</button>
			{/if}
			<button class="ghost-btn" on:click={toggleExpand} aria-label="Expand">
				<Icon icon={expanded ? 'mdi:arrow-collapse' : 'mdi:arrow-expand'} width="13" />
			</button>
		</div>
	</div>

	<div class="ask-body" style="flex-direction: {expanded ? 'row' : 'column'};">
		<!-- orb pane -->
		<div style={orbPaneStyle}>
			<div style={orbBoxStyle}>
				<div bind:this={orbHost} style="position: absolute; inset: 0;"></div>
			</div>

			{#if expanded}
				<div class="orb-copy">
					<div class="ask-wordmark">ASK</div>
					<p>
						The index of Akshat's work. It answers from his own résumé, repos and shipped
						systems — nothing else.
					</p>
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
			{/if}
		</div>

		<!-- transcript + composer -->
		<div class="convo">
			<div
				bind:this={scrollEl}
				class="scroll-area"
				style="padding: {expanded ? '32px 0 20px' : '4px 0 14px'};"
			>
				<div
					class="convo-inner"
					style="gap: {expanded ? '26px' : '18px'}; {expanded
						? 'max-width: 760px; margin: 0 auto; padding: 0 40px;'
						: 'padding: 0 20px;'}"
				>
					{#if isEmpty}
						<div class="empty">
							<div class="empty-head">
								<span class="rubric">// ask the index</span>
								<h2 style="font-size: {expanded ? '42px' : '24px'};">
									Skip the résumé.<br /><span class="accent">Interrogate it.</span>
								</h2>
								{#if expanded}
									<p class="empty-blurb">
										Everything Akshat has built — ClickHouse ingestion pipelines, an AI booking
										agent, a Kotlin signage player, seven roles' worth of receipts — is loaded in.
										Ask in plain language and it answers with the actual numbers.
									</p>
								{/if}
							</div>

							<div
								class="starters"
								style="grid-template-columns: {expanded ? '1fr 1fr' : '1fr'};"
							>
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
						<div class="row" style="justify-content: {m.role === 'user' ? 'flex-end' : 'flex-start'};">
							{#if m.role === 'user'}
								<div class="bubble" style="font-size: {expanded ? '15px' : '13.5px'};">
									{m.content}
								</div>
							{:else}
								<div class="assistant">
									<div class="avatar" class:bobbing={m.streaming}>
										<Icon icon="mage:message-dots-round" width="13" style="color: #4ade80;" />
									</div>
									<!-- Safe: renderMarkdown escapes before it adds any markup. -->
									<div class="assistant-text" style="font-size: {expanded ? '15.5px' : '13.5px'};">
										{@html renderMarkdown(m.content)}
									</div>
								</div>
							{/if}
						</div>
					{/each}

					{#if phase === 'thinking'}
						<div class="row thinking">
							<div class="avatar bobbing">
								<Icon icon="mage:message-dots-round" width="13" style="color: #4ade80;" />
							</div>
							<div class="sweeps">
								<span class="sweep-track"><span class="sweep"></span></span>
								<span class="sweep-track"><span class="sweep delayed"></span></span>
								<span class="thinking-label">searching the knowledge base · {elapsed}ms</span>
							</div>
						</div>
					{/if}

					{#if expanded && messages.length && !busy}
						<div class="followups">
							{#each followUps as f}
								<button class="followup" on:click={() => ask(f)}>{f}</button>
							{/each}
						</div>
					{/if}
				</div>
			</div>

			<!-- composer -->
			<div class="composer-wrap" style="padding: {expanded ? '4px 40px 24px' : '4px 20px 16px'};">
				<div style="position: relative; width: 100%; margin: 0 auto; {expanded ? 'max-width: 760px;' : ''}">
					<div class="composer" class:focused>
						<textarea
							bind:this={inputEl}
							bind:value={draft}
							on:input={autosize}
							on:keydown={onKeyDown}
							on:focus={() => (focused = true)}
							on:blur={() => (focused = false)}
							rows="1"
							placeholder="Ask anything about Akshat…"
						></textarea>
						<button
							class="send"
							class:armed={draft.trim() && !busy}
							on:click={() => ask()}
							aria-label="Send"
							disabled={!draft.trim() || busy}
						>
							<Icon icon="mdi:send" width="16" />
						</button>
					</div>
					<div class="composer-hint">
						<span>{expanded ? 'Enter to send · Shift+Enter for a new line' : 'Enter to send'}</span>
						<span>{API_BASE ? 'gemini-3.5-flash-lite' : 'offline'}</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.ask-backdrop {
		position: fixed;
		inset: 0;
		z-index: 90;
		background: rgba(2, 2, 2, 0.82);
		backdrop-filter: blur(6px);
		transition: opacity 0.35s ease;
		opacity: 0;
		pointer-events: none;
	}
	.ask-backdrop.on {
		opacity: 1;
		pointer-events: auto;
	}

	.ask-surface {
		position: fixed;
		z-index: 100;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		background: rgba(8, 8, 8, 0.94);
		backdrop-filter: blur(18px);
		-webkit-backdrop-filter: blur(18px);
		border: 1px solid rgba(255, 255, 255, 0.08);
		letter-spacing: 0.02em;
		opacity: 1;
		transform: scale(1);
		transition:
			top 0.45s cubic-bezier(0.4, 0, 0.2, 1),
			left 0.45s cubic-bezier(0.4, 0, 0.2, 1),
			width 0.45s cubic-bezier(0.4, 0, 0.2, 1),
			height 0.45s cubic-bezier(0.4, 0, 0.2, 1),
			border-radius 0.45s,
			box-shadow 0.45s,
			opacity 0.3s ease,
			transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}
	.ask-surface.closed {
		opacity: 0;
		transform: scale(0.94);
		pointer-events: none;
	}

	.ask-chrome {
		flex-shrink: 0;
		height: 42px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 14px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}
	.lights {
		display: flex;
		gap: 8px;
		align-items: center;
	}
	.light {
		width: 12px;
		height: 12px;
		padding: 0;
		border-radius: 9999px;
		border: none;
		cursor: pointer;
		transition: filter 0.2s;
	}
	.light:hover {
		filter: brightness(1.25);
	}
	.red {
		background: #ff5f57;
	}
	.amber {
		background: #febc2e;
	}
	.green {
		background: #28c840;
	}

	.chrome-label {
		display: flex;
		align-items: center;
		gap: 9px;
		font-family: 'JetBrains Mono', ui-monospace, monospace;
		font-size: 11px;
		color: rgba(231, 231, 231, 0.55);
	}
	.dot {
		width: 7px;
		height: 7px;
		border-radius: 9999px;
		display: block;
		transition: background 0.3s;
	}

	.chrome-actions {
		display: flex;
		align-items: center;
		gap: 5px;
	}
	.ghost-btn {
		width: 25px;
		height: 25px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 6px;
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.08);
		color: rgba(231, 231, 231, 0.55);
		cursor: pointer;
		transition: all 0.2s;
	}
	.ghost-btn:hover {
		color: #4ade80;
		border-color: rgba(74, 222, 128, 0.4);
	}

	.ask-body {
		flex: 1 1 0%;
		min-height: 0;
		display: flex;
	}

	.orb-copy {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
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

	.telemetry {
		margin-top: auto;
		padding-top: 22px;
		display: flex;
		flex-direction: column;
		gap: 10px;
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

	.convo {
		display: flex;
		flex-direction: column;
		min-height: 0;
		flex: 1 1 0%;
	}
	.scroll-area {
		flex: 1 1 0%;
		overflow-y: auto;
	}
	.convo-inner {
		width: 100%;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
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
	.empty-head h2 {
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
		font-size: 16px;
		color: rgba(231, 231, 231, 0.78);
		line-height: 1.65;
		max-width: 520px;
		text-wrap: pretty;
	}

	.starters {
		display: grid;
		gap: 9px;
	}
	.starter {
		display: flex;
		align-items: flex-start;
		gap: 9px;
		text-align: left;
		padding: 11px 13px;
		border-radius: 10px;
		background: rgba(10, 10, 10, 0.6);
		border: 1px solid rgba(255, 255, 255, 0.06);
		color: rgba(231, 231, 231, 0.78);
		font-size: 13px;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.2s;
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
	.bubble {
		max-width: 82%;
		background: rgba(74, 222, 128, 0.1);
		border: 1px solid rgba(74, 222, 128, 0.22);
		border-radius: 14px 14px 4px 14px;
		padding: 11px 15px;
		line-height: 1.55;
		color: #f0fdf4;
		text-wrap: pretty;
	}
	.assistant {
		display: flex;
		gap: 12px;
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
	.assistant-text {
		line-height: 1.7;
		color: rgba(231, 231, 231, 0.86);
		text-wrap: pretty;
	}
	.assistant-text p {
		margin: 0 0 0.8em;
	}
	.assistant-text p:last-child {
		margin-bottom: 0;
	}
	.assistant-text strong {
		color: #e7e7e7;
		font-weight: 600;
	}
	.assistant-text em {
		font-style: italic;
	}
	.assistant-text code {
		font-family: 'JetBrains Mono', ui-monospace, monospace;
		font-size: 0.88em;
		padding: 1px 5px;
		border-radius: 4px;
		background: rgba(74, 222, 128, 0.09);
		border: 1px solid rgba(74, 222, 128, 0.16);
		color: #4ade80;
		word-break: break-word;
	}
	.assistant-text a {
		color: #4ade80;
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.assistant-text .md-h {
		color: #e7e7e7;
		font-weight: 600;
		margin: 0 0 0.5em;
	}
	.assistant-text ul,
	.assistant-text ol {
		margin: 0 0 0.8em;
		padding-left: 1.25em;
		display: flex;
		flex-direction: column;
		gap: 0.4em;
	}
	.assistant-text ul {
		list-style: none;
		padding-left: 0.15em;
	}
	.assistant-text ol {
		list-style: decimal;
	}
	.assistant-text li {
		padding-left: 1em;
		position: relative;
	}
	/* A dot drawn rather than a list marker, so it can take the accent colour. */
	.assistant-text ul > li::before {
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
	.assistant-text ol > li {
		padding-left: 0.2em;
	}
	.assistant-text ul:last-child,
	.assistant-text ol:last-child {
		margin-bottom: 0;
	}

	.thinking {
		gap: 12px;
	}
	.sweeps {
		display: flex;
		flex-direction: column;
		gap: 7px;
		flex: 1;
		padding-top: 5px;
	}
	.sweep-track {
		position: relative;
		display: block;
		height: 7px;
		width: 100%;
		max-width: 320px;
		overflow: hidden;
		border-radius: 4px;
		background: rgba(255, 255, 255, 0.03);
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
		font-size: 10.5px;
		color: rgba(231, 231, 231, 0.38);
	}

	.followups {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.followup {
		padding: 7px 12px;
		border-radius: 9999px;
		background: rgba(10, 10, 10, 0.6);
		border: 1px solid rgba(255, 255, 255, 0.08);
		color: rgba(231, 231, 231, 0.65);
		font-size: 12px;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.2s;
	}
	.followup:hover {
		border-color: rgba(74, 222, 128, 0.4);
		color: #86efac;
	}

	.composer-wrap {
		flex-shrink: 0;
		position: relative;
		background: rgba(8, 8, 8, 0.98);
	}
	.composer {
		display: flex;
		align-items: flex-end;
		gap: 10px;
		padding: 10px 10px 10px 16px;
		border-radius: 14px;
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
		border-radius: 9px;
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
</style>
