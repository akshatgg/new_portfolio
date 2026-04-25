/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				primary: {
					DEFAULT: '#000000',
					text: 'rgb(231 231 231);',
					button: 'rgb(231 231 231);'
				},
				secondary: {
					DEFAULT: 'rgb(74 222 128);',
					left: 'rgb(74 222 128);',
					text: 'rgb(212 212 212);'
				},
				shadow: 'rgba(0,0,0,0.6);',
				border: {
					DEFAULT: 'rgba(74, 222, 128, 0.4);',
					bottom: 'rgba(255,255,255,0.06);'
				},
				ink: {
					DEFAULT: '#0a0a0a',
					raised: '#111111',
					muted: '#1a1a1a'
				}
			},
			fontFamily: {
				mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'SFMono-Regular', 'monospace']
			},
			animation: {
				'fade-up': 'fade-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) both'
			},
			keyframes: {
				'fade-up': {
					'0%': { opacity: 0, transform: 'translateY(20px)' },
					'100%': { opacity: 1, transform: 'translateY(0)' }
				}
			}
		}
	},
	plugins: []
};
