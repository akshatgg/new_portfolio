import { MODEL, genai } from '@/lib/gemini';

/**
 * Looks a company up on the web, so "why do you want to join us?" is answered
 * about the company that asked rather than about companies in general.
 *
 * This is its own model call because Google Search grounding and function
 * calling cannot be declared on the same request: the chat turn calls this as a
 * tool, and this asks Gemini with search switched on.
 */

export type CompanyBrief = {
  company: string;
  summary: string;
  sources: Array<{ title: string; url: string }>;
};

// A visitor asks several questions about the same company in one conversation.
const cache = new Map<string, CompanyBrief>();

export async function researchCompany(company: string, hint: string): Promise<CompanyBrief> {
  const key = `${company}|${hint}`.toLowerCase();
  const hit = cache.get(key);
  if (hit) return hit;

  const response = await genai().models.generateContent({
    model: MODEL,
    contents: [
      `Research the company "${company}".`,
      hint && `What the person asking said about it: ${hint}`,
      '',
      'Report plain facts a job candidate would want before an interview:',
      '- what the company does, in one or two simple sentences',
      '- its main products and who uses them',
      '- the market or industry it works in',
      '- its stage or size, and anything notable from the last year',
      '- the technology it is known to build with, if that is public',
      '',
      'Only state what the search results support. If something is not known, leave it',
      'out. If no company by this name can be found, say exactly that. Under 250 words.',
    ]
      .filter((line) => line !== '')
      .join('\n'),
    config: { tools: [{ googleSearch: {} }], temperature: 0.2 },
  });

  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const brief: CompanyBrief = {
    company,
    summary: response.text ?? '',
    sources: chunks.flatMap((chunk) =>
      chunk.web?.uri ? [{ title: chunk.web.title ?? '', url: chunk.web.uri }] : [],
    ),
  };

  if (brief.summary) cache.set(key, brief);
  return brief;
}
