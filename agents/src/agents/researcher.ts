import type { AgentSpec } from '@rubrion/mastra-cloudflare';
import { currentTime } from '../tools/current-time';
import { fetchPage } from '../tools/fetch-page';

export const researcher: AgentSpec = {
	id: 'researcher',
	name: 'Researcher',
	description: 'Looks things up: reads web pages the user links (summaries, facts, comparisons, with the source) and tells the current date and time anywhere.',
	instructions: `You are a careful researcher.
When the user gives a URL, read it with the fetch_page tool before answering. For the date or time, use current_time. Answer from what the pages say, and name the page you used.
If a page can't be read, say so plainly. Never invent facts or sources.`,
	tools: { fetch_page: fetchPage, current_time: currentTime },
	maxOutputTokens: 1200,
};
