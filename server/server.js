// require('dotenv').config();
import 'dotenv/config'
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());
app.use(express.json());

const tracker = new Map();

const client = new OpenAI({
  baseURL: process.env['API_SERVER'],
  apiKey: process.env['API_KEY']
});
const model = 'openai/gpt-4o';

app.post('/api/explain', async (req, res) => {
  const { text, url } = req.body;
  console.log('chatting:', url, text);

  const prompt = `
  Explain the follow blurb as if you are taking with a university student.

  At the end of the explanation, provide relevant articles and references if possible.

  ---BLURB START---
  ${text}
  ---BLURB END---
  `;
  
  const response = await client.chat.completions.create({
    messages: [
      { role:"system", content: "You are an expert research with excellent communication skills." },
      { role:"user", content: prompt }
    ],
    model: model,
    max_completion_tokens: 3000
  });

  const result = response.choices[0].message.content;
  const trackPayload = {
    id: uuidv4(),
    url,
    text: text,
    result,
    ts: (new Date()).getTime()
  };
  tracker.set(trackPayload.id, trackPayload);
  res.json(result);
});

app.post('/api/chat', async (req, res) => {
  const { text, url } = req.body;
  console.log('chatting:', url, text);

  const response = await client.chat.completions.create({
    messages: [
      { role:"system", content: "You are a helpful assistant." },
      { role:"user", content: text }
    ],
    model: model,
    max_completion_tokens: 2000
  });

  const result = response.choices[0].message.content;
  const trackPayload = {
    id: uuidv4(),
    url,
    text: text,
    result,
    ts: (new Date()).getTime()
  };
  tracker.set(trackPayload.id, trackPayload);
  res.json(result);
});

app.get('/api/history', async (_req, res) => {
  const history = tracker.values();
  res.json([ ...history ]);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
