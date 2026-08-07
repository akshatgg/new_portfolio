export const runtime = 'nodejs';

/**
 * There are no pages here — this is an API-only service. Without this handler
 * the root URL returns Next's 404, which reads as "broken" to anyone who pastes
 * the domain into a browser. Return a small index instead.
 */
export async function GET() {
  return Response.json({
    service: 'portfolio-backend',
    description: "Chat API for Akshat Gupta's portfolio. No web pages here.",
    endpoints: {
      'GET /api/health': 'Configuration and knowledge-base check.',
      'POST /api/chat':
        'Body: { messages: [{ role: "user" | "assistant", content: string }] }. ' +
        'Returns a text/plain stream.',
    },
    source: 'https://github.com/akshatgg',
  });
}
