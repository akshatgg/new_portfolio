import * as THREE from 'three';

/**
 * The particle orb in the ASK panel. A Fibonacci-distributed point sphere with a
 * noise displacement shader, two orbital rings and a wireframe shell.
 *
 * It reacts to conversation state: `getPhase()` is polled each frame, driving
 * both displacement amplitude and spin speed, so the orb visibly quickens while
 * the agent is retrieving and settles once it answers.
 *
 * @param {HTMLElement} host    element to render into
 * @param {() => string} getPhase  'idle' | 'listening' | 'thinking' | 'speaking'
 * @param {{ density?: number }} [opts]
 * @returns {{ destroy: () => void, pulse: () => void }}
 */
export function mountOrb(host, getPhase, opts = {}) {
	const size = () => ({ w: host.clientWidth || 320, h: host.clientHeight || 320 });
	let { w, h } = size();

	const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
	renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
	renderer.setSize(w, h);
	renderer.setClearColor(0x000000, 0);
	host.appendChild(renderer.domElement);
	renderer.domElement.style.width = '100%';
	renderer.domElement.style.height = '100%';

	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 100);
	camera.position.set(0, 0, 3.5);

	// Fibonacci sphere — even coverage without the pole clustering you get from
	// naive spherical coordinates.
	const COUNT = Math.round(opts.density ?? 3400);
	const pos = new Float32Array(COUNT * 3);
	const rnd = new Float32Array(COUNT);
	const golden = Math.PI * (3 - Math.sqrt(5));
	for (let i = 0; i < COUNT; i++) {
		const y = 1 - (i / (COUNT - 1)) * 2;
		const r = Math.sqrt(Math.max(0, 1 - y * y));
		const th = golden * i;
		pos[i * 3] = Math.cos(th) * r;
		pos[i * 3 + 1] = y;
		pos[i * 3 + 2] = Math.sin(th) * r;
		rnd[i] = Math.random();
	}

	const geo = new THREE.BufferGeometry();
	geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
	geo.setAttribute('aRand', new THREE.BufferAttribute(rnd, 1));

	const uniforms = {
		uTime: { value: 0 },
		uEnergy: { value: 0 },
		uPulse: { value: 0 },
		uScale: { value: Math.min(1, h / 340) },
		uColor: { value: new THREE.Color(0x4ade80) }
	};

	const mat = new THREE.ShaderMaterial({
		uniforms,
		transparent: true,
		depthWrite: false,
		blending: THREE.AdditiveBlending,
		vertexShader: `
			uniform float uTime; uniform float uEnergy; uniform float uPulse; uniform float uScale;
			attribute float aRand; varying float vGlow;
			void main() {
				vec3 p = position;
				float n = sin(p.x * 3.1 + uTime * 0.9) * sin(p.y * 2.7 + uTime * 1.15) * sin(p.z * 3.4 + uTime * 0.75);
				float amp = 0.05 + uEnergy * 0.40 + uPulse * 0.16;
				p += normalize(position) * n * amp;
				p *= 1.0 + uPulse * 0.05;
				vec4 mv = modelViewMatrix * vec4(p, 1.0);
				float dep = smoothstep(-4.7, -2.4, mv.z);
				vGlow = (0.30 + abs(n) * 0.75 * (0.5 + uEnergy)) * (0.20 + 0.80 * dep);
				gl_PointSize = (1.05 + aRand * 1.7 + uEnergy * 1.9) * (28.0 / -mv.z) * (0.6 + 0.4 * dep) * uScale;
				gl_Position = projectionMatrix * mv;
			}`,
		fragmentShader: `
			uniform vec3 uColor; varying float vGlow;
			void main() {
				vec2 c = gl_PointCoord - 0.5;
				float d = length(c);
				if (d > 0.5) discard;
				float a = smoothstep(0.5, 0.05, d);
				gl_FragColor = vec4(uColor * (0.34 + vGlow * 1.15), a * vGlow * 0.95);
			}`
	});

	const group = new THREE.Group();
	group.add(new THREE.Points(geo, mat));

	const ringMat = new THREE.LineBasicMaterial({
		color: 0x4ade80,
		transparent: true,
		opacity: 0.22
	});
	for (const [rad, rx, rz] of [
		[1.55, 1.15, 0.4],
		[1.78, -0.55, 1.0]
	]) {
		const pts = [];
		for (let i = 0; i <= 128; i++) {
			const a = (i / 128) * Math.PI * 2;
			pts.push(new THREE.Vector3(Math.cos(a) * rad, 0, Math.sin(a) * rad));
		}
		const ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ringMat);
		ring.rotation.x = rx;
		ring.rotation.z = rz;
		group.add(ring);
	}

	const shell = new THREE.Mesh(
		new THREE.IcosahedronGeometry(0.72, 1),
		new THREE.MeshBasicMaterial({ color: 0x4ade80, wireframe: true, transparent: true, opacity: 0.07 })
	);
	group.add(shell);
	scene.add(group);

	const fit = () => {
		const s = size();
		if (!s.w || !s.h) return;
		w = s.w;
		h = s.h;
		renderer.setSize(w, h);
		camera.aspect = w / h;
		camera.updateProjectionMatrix();
		uniforms.uScale.value = Math.min(1, h / 340);
	};
	window.addEventListener('resize', fit);
	const ro = window.ResizeObserver ? new ResizeObserver(fit) : null;
	ro?.observe(host);

	// Displacement and spin per conversation phase — the orb is a status light.
	const energyFor = { idle: 0.1, listening: 0.24, thinking: 0.85, speaking: 0.5 };
	const spinFor = { idle: 0.0016, listening: 0.003, thinking: 0.011, speaking: 0.005 };

	let running = true;
	let raf = 0;
	let energy = 0;
	let pulse = 0;
	let pulseTarget = 0;
	let t = 0;

	const loop = () => {
		if (!running) return;
		const phase = getPhase();

		// The panel animates between docked and full-screen, so its box changes
		// every frame during the transition — re-fit rather than relying on the
		// observer, which fires too late to look right.
		const cw = host.clientWidth;
		const ch = host.clientHeight;
		if (cw > 0 && ch > 0 && (cw !== w || ch !== h)) {
			w = cw;
			h = ch;
			renderer.setSize(w, h);
			camera.aspect = w / h;
			camera.updateProjectionMatrix();
			uniforms.uScale.value = Math.min(1, h / 340);
		}

		t += 0.016;
		energy += ((energyFor[phase] ?? 0.06) - energy) * 0.06;
		pulseTarget *= 0.9;
		pulse += (pulseTarget - pulse) * 0.25;

		uniforms.uTime.value = t + energy * 1.6;
		uniforms.uEnergy.value = energy;
		uniforms.uPulse.value = pulse;

		group.rotation.y += spinFor[phase] ?? 0.0016;
		group.rotation.x = Math.sin(t * 0.19) * 0.16;
		shell.rotation.y -= 0.004;

		renderer.render(scene, camera);
		raf = requestAnimationFrame(loop);
	};
	loop();

	return {
		/** Nudge the orb — called on each streamed token so it reacts to output. */
		pulse: () => {
			pulseTarget = 1;
		},
		destroy: () => {
			running = false;
			cancelAnimationFrame(raf);
			window.removeEventListener('resize', fit);
			ro?.disconnect();
			geo.dispose();
			mat.dispose();
			renderer.dispose();
			renderer.domElement.remove();
		}
	};
}
