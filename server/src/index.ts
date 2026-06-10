/*
 * Spike server: the only place that talks to the Anthropic API.
 *
 * The API key lives in env / server/.env and never reaches the browser
 * bundle, git, or logs. POST /api/turn streams raw text deltas to the
 * client as a chunked text/plain response (consumed by ClaudeEngine).
 * Per-session message history is kept in process memory — enough for
 * the spike, no persistence.
 */

import 'dotenv/config'
import Anthropic from '@anthropic-ai/sdk'
import express from 'express'
import type { TurnRequest } from '../../src/engine/claudeProtocol'
import { buildSystemPrompt, buildUserMessage } from './prompt'

const apiKey = process.env.ANTHROPIC_API_KEY
if (!apiKey) {
  console.error(
    'ANTHROPIC_API_KEY is not set. Copy server/.env.example to server/.env and fill in the key.',
  )
  process.exit(1)
}

const MODEL = 'claude-opus-4-8'
const MAX_TOKENS = 4000
/** Messages kept per session (pairs of user+assistant turns). */
const HISTORY_LIMIT = 30
const PORT = Number(process.env.PORT ?? 8787)

const client = new Anthropic({ apiKey })
const SYSTEM_PROMPT = buildSystemPrompt()
const sessions = new Map<string, Anthropic.MessageParam[]>()

const app = express()
app.use(express.json({ limit: '256kb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, model: MODEL })
})

app.post('/api/turn', async (req, res) => {
  const body = req.body as Partial<TurnRequest>
  if (
    typeof body.sessionId !== 'string' ||
    typeof body.playerText !== 'string' ||
    !body.context ||
    (body.mode !== 'narrative' && body.mode !== 'dialogue') ||
    (body.mode === 'dialogue' && !body.npc)
  ) {
    res.status(400).json({ error: 'bad turn request' })
    return
  }
  const turn = body as TurnRequest
  const history = sessions.get(turn.sessionId) ?? []
  const userMessage = buildUserMessage(turn)

  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache')
  res.flushHeaders()

  try {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      // Opus 4.8: adaptive thinking only; temperature/top_p/top_k would 400.
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium' },
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [...history, { role: 'user', content: userMessage }],
    })
    stream.on('text', (delta) => res.write(delta))
    const final = await stream.finalMessage()
    const text = final.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
    history.push(
      { role: 'user', content: userMessage },
      { role: 'assistant', content: text },
    )
    sessions.set(turn.sessionId, history.slice(-HISTORY_LIMIT))
  } catch (err) {
    // Never log the key; the message is enough. Mid-stream errors just end
    // the response — the client falls back to the fixture text.
    console.error('turn failed:', err instanceof Error ? err.message : err)
    if (!res.headersSent) res.status(502)
  } finally {
    res.end()
  }
})

app.listen(PORT, () => {
  console.log(`worldsim-ui spike server on http://localhost:${PORT} (model: ${MODEL})`)
})
