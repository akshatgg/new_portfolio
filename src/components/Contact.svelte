<script>
	import Icon from '@iconify/svelte';
	import { reveal } from '../lib/reveal.js';
	import { initializeApp } from 'firebase/app';
	import { getDatabase, ref, set } from 'firebase/database';
	import { firebaseConfig } from '../firebase/firebase';
	import { onMount } from 'svelte';

	const app = initializeApp(firebaseConfig);
	const database = getDatabase(app);

	onMount(() => {
		console.log('Firebase database initialized:', database);
	});

	let data = {
		firstname: '',
		lastname: '',
		email: '',
		description: '',
		phone: ''
	};

	let emailValid = true;
	let phoneValid = true;
	let sending = false;
	let sent = false;

	function writeUserData(userData) {
		return set(ref(database, `users/${userData.firstname}_${Date.now()}`), {
			...userData,
			submittedAt: new Date().toISOString()
		});
	}

	const handleSubmit = async (e) => {
		e.preventDefault();

		const validNumber = /^[6-9][0-9]{9}$/;
		const validEmail = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;

		emailValid = validEmail.test(data.email);
		phoneValid = validNumber.test(data.phone);

		if (emailValid && phoneValid) {
			sending = true;
			try {
				await writeUserData(data);
				sent = true;
				data = { firstname: '', lastname: '', email: '', description: '', phone: '' };
				setTimeout(() => (sent = false), 3500);
			} catch (err) {
				console.error('Error saving data:', err);
			} finally {
				sending = false;
			}
		}
	};

	const handleInput = (e) => {
		data = { ...data, [e.target.id]: e.target.value };
	};

	const channels = [
		{ label: 'Email', value: 'akshatg9636@gmail.com', icon: 'mdi:email-outline', href: 'mailto:akshatg9636@gmail.com' },
		{ label: 'LinkedIn', value: '/in/akshatgg', icon: 'mdi:linkedin', href: 'https://www.linkedin.com/in/akshatgg/' },
		{ label: 'GitHub', value: '@akshatgg', icon: 'mdi:github', href: 'https://github.com/akshatgg' },
		{ label: 'Phone', value: '+91 96362 86581', icon: 'mdi:phone-outline', href: 'tel:+919636286581' }
	];
</script>

<section class="section-bg h-max mt-[64px] md:mt-[80px] flex flex-col w-full items-center px-5 md:px-12 lg:container py-16 md:py-24">
	<div class="flex flex-col items-center gap-3 mb-12 md:mb-16" use:reveal>
		<span class="text-[11px] uppercase tracking-[0.3em] text-muted font-mono">// say hi</span>
		<h2 class="text-3xl md:text-5xl font-bold heading">Contact</h2>
		<div class="h-px w-16 bg-green-400/60 mt-2"></div>
	</div>

	<div class="text-center w-11/12 md:w-7/12 -mt-6 mb-8" use:reveal={{ delay: 80 }}>
		<p class="text-sm md:text-base text-muted">
			Got a problem worth solving, a role to fill, or just want to nerd out about observability? My inbox is open.
		</p>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-5 gap-5 w-full max-w-5xl">
		<div class="lg:col-span-2 flex flex-col gap-3" use:reveal={{ delay: 120 }}>
			{#each channels as c}
				<a
					href={c.href}
					target={c.href.startsWith('http') ? '_blank' : undefined}
					rel="noopener"
					class="surface surface-hover rounded-lg p-4 flex items-center gap-3 group"
				>
					<Icon icon={c.icon} class="text-xl text-muted group-hover:text-green-400 transition" />
					<div class="flex-1 min-w-0">
						<div class="text-[10px] uppercase tracking-widest text-muted font-mono">{c.label}</div>
						<div class="text-sm text-soft truncate">{c.value}</div>
					</div>
					<Icon icon="mdi:arrow-top-right" class="text-muted group-hover:text-green-400 transition" />
				</a>
			{/each}

			<div class="surface rounded-lg p-4 mt-1">
				<p class="font-mono text-[10px] uppercase tracking-widest text-muted">// response time</p>
				<p class="mt-1 text-sm text-soft">Usually within <span class="text-white">24 hours</span>. Faster if it's a fun problem.</p>
			</div>
		</div>

		<form on:submit={handleSubmit} class="lg:col-span-3 surface rounded-xl p-6 md:p-8 flex flex-col gap-4" use:reveal={{ delay: 200 }}>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div class="flex flex-col gap-1.5">
					<label for="firstname" class="text-[10px] uppercase tracking-widest text-muted font-mono">First name</label>
					<input required type="text" id="firstname" class="input" placeholder="Ada" on:input={handleInput} bind:value={data.firstname} />
				</div>
				<div class="flex flex-col gap-1.5">
					<label for="lastname" class="text-[10px] uppercase tracking-widest text-muted font-mono">Last name</label>
					<input required type="text" id="lastname" class="input" placeholder="Lovelace" on:input={handleInput} bind:value={data.lastname} />
				</div>
			</div>

			<div class="flex flex-col gap-1.5">
				<label for="email" class="text-[10px] uppercase tracking-widest text-muted font-mono">Email</label>
				<input required type="email" id="email" class="input" placeholder="you@domain.com" on:input={handleInput} bind:value={data.email} />
				{#if !emailValid}<span class="text-rose-400 text-xs">Enter a valid email</span>{/if}
			</div>

			<div class="flex flex-col gap-1.5">
				<label for="phone" class="text-[10px] uppercase tracking-widest text-muted font-mono">Phone</label>
				<input required type="tel" id="phone" class="input" placeholder="9XXXXXXXXX" on:input={handleInput} bind:value={data.phone} />
				{#if !phoneValid}<span class="text-rose-400 text-xs">Enter a valid 10-digit Indian number</span>{/if}
			</div>

			<div class="flex flex-col gap-1.5">
				<label for="description" class="text-[10px] uppercase tracking-widest text-muted font-mono">Tell me about it</label>
				<textarea required rows="4" id="description" class="input resize-none" placeholder="What are you building? What hurts?" on:input={handleInput} bind:value={data.description}></textarea>
			</div>

			<button
				type="submit"
				disabled={sending}
				class="self-end mt-1 inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-md bg-green-400 text-black font-medium hover:bg-green-300 transition disabled:opacity-60"
			>
				{#if sending}
					<Icon icon="mdi:loading" class="text-lg animate-spin" /> Sending…
				{:else if sent}
					<Icon icon="mdi:check-bold" class="text-lg" /> Sent — talk soon
				{:else}
					<Icon icon="mdi:send-outline" class="text-lg" /> Send Message
				{/if}
			</button>
		</form>
	</div>
</section>

<style>
	.input {
		padding: 0.6rem 0.85rem;
		border-radius: 0.5rem;
		color: rgb(231 231 231);
		background-color: rgba(0, 0, 0, 0.4);
		width: 100%;
		outline: none;
		border: 1px solid rgba(255, 255, 255, 0.08);
		transition: border-color 0.2s, box-shadow 0.2s;
		font-family: ui-monospace, SFMono-Regular, monospace;
		font-size: 0.9rem;
	}
	.input::placeholder {
		color: rgba(231, 231, 231, 0.3);
	}
	.input:focus {
		border-color: rgba(74, 222, 128, 0.5);
		box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.1);
	}
</style>
