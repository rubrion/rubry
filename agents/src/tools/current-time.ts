import { createTool, z } from '@rubrion/mastra-cloudflare';

export const currentTime = createTool({
	id: 'current_time',
	description: 'The current date and time, optionally in an IANA time zone such as America/Sao_Paulo.',
	inputSchema: z.object({ timeZone: z.string().optional() }),
	execute: async ({ timeZone }) => {
		const now = new Date();
		try {
			return { iso: now.toISOString(), local: now.toLocaleString('en-US', { timeZone: timeZone || 'UTC', dateStyle: 'full', timeStyle: 'short' }), timeZone: timeZone || 'UTC' };
		} catch {
			return { iso: now.toISOString(), error: `Unknown time zone ${timeZone}` };
		}
	},
});
