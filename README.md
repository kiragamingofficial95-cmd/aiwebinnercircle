# AI Web Design Inner Circle

Premium video library for AI Web Design Inner Circle students, with an AI assistant (Groq) that answers doubts using all video transcripts.

## Run locally

```bash
npm install
cp .env.local.example .env.local
# add your Groq API key to .env.local
npm run dev
```

Open http://localhost:3000

## Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Set `GROQ_API_KEY` (and optional `GROQ_MODEL`) in the Vercel project environment variables.
