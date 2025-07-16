import { simpleParser } from 'mailparser';

export interface Env {
  INBOX_KV: KVNamespace;
  TASK_KV: KVNamespace;
  OPENAI_API_KEY: string;
  AI?: any;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/email-inbox' && request.method === 'POST') {
      return handleEmailInbox(request, env);
    }

    return new Response('Not Found', { status: 404 });
  },
};

async function handleEmailInbox(request: Request, env: Env): Promise<Response> {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const { userId, raw, encoding = 'utf8' } = body;
  if (!userId || !raw) return new Response('Missing userId or raw', { status: 400 });

  const rawEmail = encoding === 'base64' ? atob(raw) : raw;

  let parsed;
  try {
    parsed = await simpleParser(rawEmail);
  } catch (err) {
    console.error('Email parse error', err);
    return new Response('Parse error', { status: 422 });
  }

  const msgId = crypto.randomUUID();
  const inboxKey = `user:${userId}:msg:${msgId}`;

  await env.INBOX_KV.put(
    inboxKey,
    JSON.stringify({
      receivedAt: Date.now(),
      from: parsed.from?.text ?? '',
      subject: parsed.subject ?? '',
      text: parsed.text ?? '',
      html: parsed.html ?? '',
      headers: Object.fromEntries(parsed.headers),
    }),
    { expirationTtl: 60 * 60 * 24 * 30 }
  );

  const actions = await detectActions(parsed, env);

  for (const act of actions) {
    const taskId = crypto.randomUUID();
    await env.TASK_KV.put(
      `user:${userId}:task:${taskId}`,
      JSON.stringify({
        ...act,
        source: 'email',
        inboxMsgId: msgId,
        createdAt: Date.now(),
        status: 'pending',
      })
    );
  }

  const summary = await summarizeEmail(parsed, actions, env);
  await pushNotification(userId, summary, env);

  return new Response(
    JSON.stringify({ ok: true, msgId, tasksCreated: actions.length }),
    { headers: { 'content-type': 'application/json' } }
  );
}

async function detectActions(parsed: any, env: Env) {
  const actions: any[] = [];
  const text = `${parsed.subject}\n${parsed.text}`.toLowerCase();

  const timeMatch = text.match(/\b(\d{1,2})(:\d{2})?\s?(am|pm)\b/);
  if (timeMatch) {
    actions.push({ title: parsed.subject || 'Meeting', due: timeMatch[0] });
  }

  for (const att of parsed.attachments ?? []) {
    if (att.contentType === 'text/calendar' || att.filename?.endsWith('.ics')) {
      const icsText = new TextDecoder().decode(att.content);
      const icsInfo = parseICS(icsText);
      if (icsInfo) actions.push(icsInfo);
    }
  }

  if (actions.length === 0) {
    const gptActions = await gptExtractTasks(text, env);
    actions.push(...gptActions);
  }

  return actions;
}

function parseICS(ics: string) {
  const dtstart = ics.match(/DTSTART[^:]*:(.*)/)?.[1];
  const summary = ics.match(/SUMMARY:(.*)/)?.[1];
  const rrule = ics.match(/RRULE:(.*)/)?.[1];
  if (!dtstart || !summary) return null;
  return { title: summary, due: dtstart, recurrence: rrule ?? null };
}

async function gptExtractTasks(text: string, env: Env) {
  const prompt = `
Extract tasks/reminders from the text below.
Return JSON array of objects with keys: title, due, recurrence (or null).

Text:
"""
${text}
"""
  `.trim();

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
    }),
  }).then(r => r.json());

  try {
    return JSON.parse(res.choices[0].message.content);
  } catch {
    return [];
  }
}

async function summarizeEmail(parsed: any, actions: any[], env: Env) {
  const prompt = `
Summarize this email in 2 sentences, then list any action items:

Subject: ${parsed.subject}
From: ${parsed.from?.text}
Body:
${parsed.text}

Action items: ${JSON.stringify(actions)}
`.trim();

  if (env.AI) {
    try {
      const { text } = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
        prompt,
        max_tokens: 120,
      });
      return text.trim();
    } catch (e) {
      console.warn('Workers AI failed, falling back to OpenAI', e);
    }
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 120,
    }),
  }).then(r => r.json());

  return res.choices?.[0]?.message?.content?.trim() ?? 'New email received.';
}

async function pushNotification(userId: string, message: string, env: Env) {
  console.log('Notify', userId, message);
}
