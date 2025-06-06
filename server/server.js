import 'dotenv/config'
import { readFile, writeFile } from 'fs/promises';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());
app.use(express.json());


let tracker = [];
const writeTracker = async () => {
  try {
    await writeFile('history.json', JSON.stringify(tracker, null, 2));
  } catch (err) {
    console.error(err);
  }
};
const readTracker = async () => {
  const jsonString = await readFile('history.json', 'utf-8');
  try {
    tracker = JSON.parse(jsonString);
    console.log(`read ${tracker.length} entries from history file`);
  } catch (err) {
    console.error(err);
    tracker = [];
  } 
};

const client = new OpenAI({
  baseURL: process.env['API_SERVER'],
  apiKey: process.env['API_KEY']
});
const model = 'openai/gpt-4o';

async function summarizePage(url) {
  const MAX_CHARS = 8000;
  const response = await fetch(url);
  const html = await response.text();

  // Load HTML into Cheerio and extract text
  const $ = cheerio.load(html);
  const text = $('body').text().replace(/\s+/g, ' ').trim();
  const content = text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) : text;

  // Request summary from OpenAI
  const summaryResponse = await client.chat.completions.create({
    messages: [
      { role: "system", content: "You are a helpful assistant that summarizes web pages." },
      { 
        role: "user", 
        content: `
          Summarize in 3-5 sentences, the following content from this URL: ${url}
          
          Use your knowledge of websites and domains from the URL to infer additional information.
          
          ---CONTENT START---
          ${content}
          ---CONTENT END---
        ` 
      },
    ],
    model: model,
    temperature: 0.1,
  });

  const result = summaryResponse.choices[0].message.content;
  return result; 
}

app.post('/api/explain', async (req, res) => {
  const { text, url } = req.body;
  console.log('explain', url, text);

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
    type: 'explain',
    text: text,
    result,
    ts: (new Date()).getTime()
  };
  tracker.push(trackPayload);
  
  writeTracker();
  res.json(result);
});

app.post('/api/chat', async (req, res) => {
  const { text, url } = req.body;
  console.log('chat', url, text);

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
    type: 'chat',
    text: text,
    result,
    ts: (new Date()).getTime()
  };
  tracker.push(trackPayload);
  
  writeTracker();
  res.json(result);
});

app.get('/api/history', async (_req, res) => {
  console.log('getting history', tracker.length);
  res.json(tracker);
});

app.get('/api/history-direction', async (req, res) => {
  const history = tracker;
  console.log(`getting history direction for ${history.length} entries`);

  const historyStr = history.map(h => {
    return `
    url: ${h.url}
    type: ${h.type}
    text: ${h.text}
    `
  }).join('\n\n\n');

  const prompt = `
  Here is a list of my chat history, with:
  - url: the webpage that I asked about
  - type: whether I have a question (chat), or whether I need a deeper explaination about a topic (explain) 
  - text: the question or text-blurb to be explained

  ${historyStr}

  Summarize the general directions given these requests, if possible provide additional resurces and a direction of study to develop an indepth appreciation of the subjects
  `;

  const response = await client.chat.completions.create({
    messages: [
      { role:"system", content: "You are a helpful assistant." },
      { role:"user", content: prompt }
    ],
    model: model,
    max_completion_tokens: 2000
  });

  const result = response.choices[0].message.content;
  res.json({
    historyDirection: result
  });
});

// Initialization
readTracker();
const PORT = process.env.PORT || 30303;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));



