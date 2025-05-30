// require('dotenv').config();
import 'dotenv/config'
import express from 'express';
import cors from 'cors';
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(express.json());

// console.log('');
// console.log(process.env.API_SERVER);
// console.log(process.env.API_KEY);
// console.log('');

const client = new OpenAI({
  baseURL: process.env['API_SERVER'],
  apiKey: process.env['API_KEY']
});
// const model = 'openai/o4-mini';
const model = 'openai/gpt-4o';

app.post('/api/chat', async (req, res) => {
  const { question } = req.body;
  console.log('chatting:', question);

  const response = await client.chat.completions.create({
    messages: [
      { role:"system", content: "You are a helpful assistant." },
      { role:"user", content: question }
    ],
    model: model,
    max_completion_tokens: 2000
  });

  const result = response.choices[0].message.content;
  res.json(result);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
