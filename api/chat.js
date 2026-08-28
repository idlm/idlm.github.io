// Vercel Serverless Function — OpenAI chat proxy
//
// POST /api/chat
// Body: { messages: [{ role: 'user'|'assistant'|'system', content: string }] }
//
// Reads OPENAI_API_KEY from the Vercel project's environment variables.
// Streams back OpenAI's response as a server-sent-events (SSE) stream.

import OpenAI from 'openai';

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const SYSTEM_PROMPT = process.env.SYSTEM_PROMPT
  || 'You are a helpful AI assistant. Reply in the language the user uses. Be concise.';

export default async function handler(req, res) {
  // CORS — same-origin in production, but allow any origin for local dev.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'OPENAI_API_KEY not configured on the server' });
    return;
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (e) {
    res.status(400).json({ error: 'invalid JSON body' });
    return;
  }

  const messages = Array.isArray(body?.messages) ? body.messages : null;
  if (!messages || messages.length === 0) {
    res.status(400).json({ error: 'messages array is required' });
    return;
  }

  // Cap the conversation to the last 20 messages to keep the prompt
  // size bounded and avoid runaway token usage.
  const trimmed = messages.slice(-20);
  // Always prepend a system prompt.
  const fullMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...trimmed,
  ];

  const client = new OpenAI({ apiKey });

  try {
    const stream = await client.chat.completions.create({
      model: MODEL,
      messages: fullMessages,
      stream: true,
      temperature: 0.7,
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    for await (const chunk of stream) {
      const text = chunk.choices?.[0]?.delta?.content;
      if (text) {
        res.write(`data: ${JSON.stringify({ delta: text })}\n\n`);
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('openai error:', err);
    // If streaming already started, the only signal is to terminate.
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: String(err?.message || err) })}\n\n`);
      res.end();
    } else {
      const status = err?.status || 500;
      res.status(status).json({ error: String(err?.message || 'upstream error') });
    }
  }
}
