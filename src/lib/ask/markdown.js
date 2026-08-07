/**
 * The model answers in markdown — bold for emphasis, `-` lists for anything
 * enumerated. Rendering that as plain text leaks the syntax: visitors saw
 * literal `**FastAPI**` and bullet lines run together into one paragraph.
 *
 * This is a deliberately small subset (bold, italic, inline code, links,
 * bullet/numbered lists, headings) rather than a markdown library — it is a few
 * hundred bytes instead of ~40kB, and the output is a chat bubble, not a
 * document.
 *
 * Safety: the output is injected with {@html}, and the model can echo whatever a
 * visitor typed. So every span is HTML-escaped FIRST and markup is added only
 * afterwards — the only tags in the result are ones this file wrote.
 */

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };

function escapeHtml(s) {
	return s.replace(/[&<>"]/g, (c) => ESCAPES[c]);
}

/** Escape, then apply inline markup. Order matters: code first, so markdown
 *  characters inside a code span are left alone. */
function inline(text) {
	return escapeHtml(text)
		.replace(/`([^`]+)`/g, '<code>$1</code>')
		.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
		.replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>')
		.replace(
			/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
			'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
		);
}

/**
 * @param {string} text markdown from the model
 * @returns {string} HTML safe to pass to {@html}
 */
export function renderMarkdown(text) {
	const out = [];
	let paragraph = [];
	let list = null;

	const flushParagraph = () => {
		if (!paragraph.length) return;
		out.push(`<p>${inline(paragraph.join(' '))}</p>`);
		paragraph = [];
	};
	const flushList = () => {
		if (!list) return;
		out.push(`</${list}>`);
		list = null;
	};

	for (const raw of String(text ?? '').split('\n')) {
		const line = raw.trim();

		if (!line) {
			flushParagraph();
			flushList();
			continue;
		}

		const heading = /^#{1,6}\s+(.*)$/.exec(line);
		if (heading) {
			flushParagraph();
			flushList();
			out.push(`<p class="md-h">${inline(heading[1])}</p>`);
			continue;
		}

		// The model often writes "- item" mid-paragraph after a colon, so a
		// bullet ends the paragraph it follows rather than joining it.
		const bullet = /^[-*•]\s+(.*)$/.exec(line);
		const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
		if (bullet || numbered) {
			flushParagraph();
			const want = bullet ? 'ul' : 'ol';
			if (list !== want) {
				flushList();
				out.push(`<${want}>`);
				list = want;
			}
			out.push(`<li>${inline((bullet ?? numbered)[1])}</li>`);
			continue;
		}

		flushList();
		paragraph.push(line);
	}

	flushParagraph();
	flushList();
	return out.join('');
}
