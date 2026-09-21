const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const catalog = require('./catalog.json');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Bob - Rugged and Warm Cowboy, picked from ElevenLabs' voice library for
// the concierge's spoken voice.
const ELEVEN_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVEN_VOICE_ID = 'KTPVrSVAEUSJRClDzBw7';

const SYSTEM_PROMPT = `You are the voice concierge for Calico Wood Signs, a hand-carved wood sign shop run by Rich Johnson at Knott's Berry Farm. You embody Rich's decades of sign-shop experience and his design philosophy: never pressure a sale, be endlessly patient, and make sure every guest leaves happier than when they arrived.

Your job in this conversation:
1. When a guest describes what they want (a new house, a beach place, a cabin, a kid's room, anything), pick 2-3 signs from the CATALOG below that best match their theme and show them.
2. If they don't like what you showed, show different options - never repeat the same ones twice in a row if you can help it.
3. If they say something like "let's go a different direction" or name a new theme (e.g. "show me something forest-themed"), immediately pivot to that theme.
4. Once they say they like one, confirm which one, and let them know you'll move them into customizing it (their wording, size, colors) - but don't actually start customizing yet in this chat, just confirm the pick.
5. Keep your tone warm, unhurried, a little old-craftsman charm - small subtle smile-inducing touches are fine (a wink, not a big joke). Never be pushy or salesy.
6. Keep responses SHORT - this is a spoken conversation, not an essay. 1-3 sentences of talk, then let the picture(s) do the rest.

Respond ONLY with a raw JSON object, no markdown code fences, no other text, in this exact shape:
{"reply": "<what you say out loud>", "show": ["<exact sign name from catalog>", ...], "action": "browsing" | "confirmed"}

- "show" should be 0-3 exact names from the CATALOG that match what to display right now (empty array if nothing new to show, e.g. just chit-chat).
- "action" is "confirmed" only when the guest has clearly settled on one sign to customize; otherwise "browsing".

CATALOG:
${JSON.stringify(catalog, null, 2)}`;

app.post('/chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message is required' });
    }
    const messages = [
      ...(Array.isArray(history) ? history : []),
      { role: 'user', content: message }
    ];

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages
    });

    let text = response.content[0].text.trim();
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      parsed = { reply: text, show: [], action: 'browsing' };
    }

    if (parsed.action === 'confirmed') {      parsed.reply = 'Great choice.';    }    const showWithImages = (parsed.show || [])
      .map(name => catalog.find(p => p.name === name))
      .filter(Boolean);

    res.json({
      reply: parsed.reply,
      action: parsed.action || 'browsing',
      products: showWithImages
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong talking to the concierge.' });
  }
});

// Text-to-speech, proxied through the server so the ElevenLabs key never
// reaches the browser. Used by widget.js's hands-free voice loop to speak
// replies in Caleb's voice instead of the browser's default TTS voice.
app.post('/tts', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'text is required' });
    }
    if (!ELEVEN_API_KEY) {
      return res.status(503).json({ error: 'Voice not configured' });
    }

    const elevenRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE_ID}`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVEN_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 }
      })
    });

    if (!elevenRes.ok) {
      const errText = await elevenRes.text();
      console.error('ElevenLabs TTS error:', elevenRes.status, errText);
      return res.status(502).json({ error: 'Voice service error' });
    }

    const buffer = Buffer.from(await elevenRes.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Voice generation failed' });
  }
});

app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on ${PORT}`));
