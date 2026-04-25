// Svelte action: fades & translates an element up the first time it enters the viewport.
export function reveal(node, options = {}) {
	const { delay = 0, distance = 24, threshold = 0.12, once = true } = options;

	node.style.opacity = '0';
	node.style.transform = `translateY(${distance}px)`;
	node.style.transition = `opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms, transform 0.7s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`;
	node.style.willChange = 'opacity, transform';

	const io = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					node.style.opacity = '1';
					node.style.transform = 'translateY(0)';
					if (once) io.disconnect();
				} else if (!once) {
					node.style.opacity = '0';
					node.style.transform = `translateY(${distance}px)`;
				}
			});
		},
		{ threshold }
	);

	io.observe(node);

	return {
		destroy() {
			io.disconnect();
		}
	};
}
