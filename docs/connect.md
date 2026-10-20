# Connect a client

Your endpoint is the middleware's URL plus `/v1` (shown on the settings page), and the key is one you create there. Any OpenAI-compatible client works.

## rubry.ai

On [rubry.ai/chat](https://rubry.ai/chat), open the agent menu and pick **Connect your agent**. Paste the endpoint and the key and give it a name. Your agent joins the menu and is selected. The key stays in an encrypted cookie in your browser, and your agent runs on your provider, outside Rubry's daily limits.

## Open WebUI

Settings → Connections → OpenAI API: URL = your endpoint, key = your API key. Your agents (and `auto`) appear as models.

## OpenAI SDK

```ts
import OpenAI from 'openai';

const client = new OpenAI({ baseURL: 'https://rubry-middleware.<you>.workers.dev/v1', apiKey: 'rk_…' });
const stream = await client.chat.completions.create({
	model: 'auto',
	stream: true,
	messages: [{ role: 'user', content: 'Plan a 3-post LinkedIn week for a bakery' }],
});
for await (const chunk of stream) process.stdout.write(chunk.choices[0]?.delta?.content ?? '');
```
