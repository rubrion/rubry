import { createTool, z } from '@rubrion/mastra-cloudflare';

const MAX_CHARS = 8000;

export const fetchPage = createTool({
	id: 'fetch_page',
	description: 'Read a public web page: its title and main text (trimmed).',
	inputSchema: z.object({ url: z.string().url() }),
	execute: async ({ url }) => {
		if (!/^https?:\/\//i.test(url)) return { error: 'Only http(s) URLs' };
		const res = await fetch(url, { headers: { 'user-agent': 'rubry-agent/1.0' }, signal: AbortSignal.timeout(10_000) }).catch((e: Error) => e);
		if (res instanceof Error) return { url, error: res.message };
		if (!res.ok) return { url, error: `HTTP ${res.status}` };
		const html = await res.text();
		const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? '';
		const text = html
			.replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, ' ')
			.replace(/<[^>]+>/g, ' ')
			.replace(/&nbsp;/g, ' ')
			.replace(/&amp;/g, '&')
			.replace(/\s+/g, ' ')
			.trim();
		return { url, title, text: text.slice(0, MAX_CHARS), truncated: text.length > MAX_CHARS };
	},
});
