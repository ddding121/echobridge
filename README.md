# EchoBridge

EchoBridge is an AI-powered accessible classroom assistant for students who are deaf or hard of hearing, non-native speakers, and learners who benefit from structured notes.

**Live demo:** https://echobridge-ai.ramseye260.chatgpt.site

## What it does

- Uploads classroom recordings up to 90 minutes / 120 MB
- Splits long audio automatically and transcribes it with Qwen ASR
- Generates summaries, key points, review questions, and after-class tasks
- Answers questions only from the uploaded transcript and quotes supporting evidence
- Provides real audio playback with a draggable timeline and waveform
- Includes subtitle sizing, high contrast, focus reading, and reduced-motion options
- Saves recent transcripts and notes locally in the browser; raw audio is not persisted
- Exports a print-ready A4 study report
- Includes a reviewer demo that works without an API key or audio file

## Why EchoBridge

Classroom recordings are often difficult to revisit: important explanations are buried in long audio, automatic transcripts lack structure, and many learning tools do not treat accessibility as a first-class requirement. EchoBridge combines transcription, grounded AI assistance, and accessible reading controls in one focused workflow.

## Tech stack

- TypeScript, React, Vinext, Tailwind CSS
- Cloudflare Workers-compatible server routes
- DashScope `qwen3-asr-flash` for speech recognition
- DashScope `qwen3.7-plus` for study guides and grounded Q&A
- Web Audio API for local waveform analysis and long-audio segmentation
- Browser local storage for device-local classroom history

## Local development

Requirements: Node.js 22.13+ and pnpm.

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Set `DASHSCOPE_API_KEY` in `.env`, or enter a temporary key in the interface. Keys entered in the interface stay in page memory and are not stored in the source code or browser history.

## Main workflow

1. Upload an MP3, WAV, M4A, OGG, or WebM classroom recording.
2. EchoBridge decodes and splits long recordings into three-minute chunks in the browser.
3. Each chunk is transcribed, then merged into a complete transcript.
4. The AI generates a structured study guide from that transcript.
5. Students can review, ask questions, replay the source audio, and export a report.

## Privacy notes

- Raw classroom audio is used for the active browser session and is not saved in recent history.
- Recent transcripts and AI notes are stored only in the current browser.
- Do not commit real API keys. `.env` is ignored; `.env.example` contains placeholders only.

## Project status

EchoBridge is a working portfolio prototype developed for exploring inclusive learning and design intelligence. The public demo includes an offline reviewer mode so the core experience can be evaluated without credentials.
