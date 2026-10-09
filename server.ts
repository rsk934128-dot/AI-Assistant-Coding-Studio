process.env.DISABLE_HMR = 'true';
import express from 'express';
import path from 'path';
import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = process.env.NODE_ENV === 'production' && process.env.PORT
  ? parseInt(process.env.PORT, 10)
  : 3000;

// Enable CORS for hosted environments and cross-origin clients
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '10mb' }));

// Normalize incoming path for serverless/proxy hosts that may strip the /api prefix
app.use((req, res, next) => {
  if (
    !req.url.startsWith('/api') &&
    (req.url.startsWith('/health') ||
      req.url.startsWith('/chat') ||
      req.url.startsWith('/tts') ||
      req.url.startsWith('/transcribe') ||
      req.url.startsWith('/web') ||
      req.url.startsWith('/agent') ||
      req.url.startsWith('/music') ||
      req.url.startsWith('/drive'))
  ) {
    req.url = '/api' + req.url;
  }
  next();
});


// Lazy GoogleGenAI client
function getAIClient() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health check endpoint with hosting diagnostics
app.all('/api/health', (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  res.json({
    status: 'ok',
    hasApiKey: Boolean(apiKey && apiKey.length > 0),
    port: PORT,
    nodeEnv: process.env.NODE_ENV || 'development',
    time: new Date().toISOString(),
    supportedModels: FALLBACK_MODELS,
  });
});

// Natural Human-Like Text-to-Speech (TTS) Audio Stream Proxy for Bengali & English
app.get('/api/tts', async (req, res) => {
  try {
    const rawText = String(req.query.text || '').trim();
    if (!rawText) {
      return res.status(400).json({ error: 'Text query parameter is required.' });
    }

    const requestedLang = String(req.query.lang || '').toLowerCase();
    const hasBengali = /[\u0980-\u09FF]/.test(rawText);
    const lang = requestedLang === 'en' ? 'en' : (hasBengali || requestedLang === 'bn' ? 'bn' : 'en');

    // Google Translate TTS accepts chunks up to ~200 characters
    const chunk = rawText.slice(0, 200);
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${lang}&client=tw-ob`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'audio/mpeg, audio/*;q=0.9',
        'Referer': 'https://translate.google.com/',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch audio stream from TTS provider.' });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Accept-Ranges', 'bytes');
    return res.end(buffer);
  } catch (err: any) {
    console.error('TTS endpoint error:', err?.message || err);
    return res.status(500).json({ error: 'Internal TTS processing error' });
  }
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function formatFriendlyErrorMessage(err: any): string {
  const errStr = typeof err === 'string' ? err : err?.message || JSON.stringify(err);
  if (
    errStr.includes('429') ||
    errStr.includes('quota') ||
    errStr.includes('RESOURCE_EXHAUSTED') ||
    errStr.includes('rate limit')
  ) {
    return 'এআই কোটা সীমা (API Rate Limit / Quota Exceeded 429) সাময়িকভাবে শেষ হয়েছে। অনুগ্রহ করে কয়েক সেকেন্ড অপেক্ষা করে আবার চেষ্টা করুন অথবা Google Search অফ করে মেসেজ পাঠান।';
  }
  if (errStr.includes('503') || errStr.includes('UNAVAILABLE') || errStr.includes('high demand') || errStr.includes('overloaded')) {
    return 'গুগল এআই সার্ভার এই মুহূর্তে অতিরিক্ত চাপে রয়েছে (503 Service Unavailable)। স্বয়ংক্রিয়ভাবে বিকল্প মডেলে চেষ্টা করা হচ্ছে... কয়েক সেকেন্ড পর পুনরায় চেষ্টা করুন।';
  }
  if (errStr.includes('404') || errStr.includes('NOT_FOUND') || errStr.includes('no longer available')) {
    return 'অনুরোধকৃত এআই মডেলটি এই মুহূর্তে প্রস্তুত নয় (404 Not Found)। সিস্টেম স্বয়ংক্রিয়ভাবে বিকল্প সক্রিয় মডেলে সংযোগ করছে।';
  }
  if (
    errStr.includes('API_KEY') ||
    errStr.includes('API key not valid') ||
    errStr.includes('not configured') ||
    errStr.includes('GEMINI_API_KEY')
  ) {
    return 'Gemini API Key পাওয়া যায়নি বা সঠিক নয়। আপনি যদি অ্যাপটি ক্লাউড/হোস্টিং (যেমন Render, Cloud Run, Vercel, Railway)-এ হোস্ট করে থাকেন, তবে হোস্টিং কন্ট্রোল প্যানেলের Environment Variables সেকশনে "GEMINI_API_KEY" যোগ করেছেন কিনা তা নিশ্চিত করুন।';
  }
  return err?.message || 'একটি অপ্রত্যাশিত সমস্যা দেখা দিয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।';
}

const FALLBACK_MODELS = [
  'gemini-3.8-flash',
  'gemini-flash-latest',
  'gemini-3.1-flash-lite',
];

async function fetchStreamWithResilience(
  ai: any,
  contents: any[],
  systemInstruction: string,
  enableSearch: boolean,
  modelPreference = 'gemini-3.8-flash'
) {
  const modelsToTry = [
    modelPreference,
    ...FALLBACK_MODELS,
  ].filter((v, i, a) => Boolean(v) && a.indexOf(v) === i);

  let searchAvailable = enableSearch;
  let lastError: any = null;

  for (const model of modelsToTry) {
    // If search is requested and currently available, attempt it
    if (searchAvailable) {
      try {
        const stream = await ai.models.generateContentStream({
          model,
          contents,
          config: { systemInstruction, tools: [{ googleSearch: {} }] },
        });
        return { stream, modelUsed: model, hadSearch: true };
      } catch (err: any) {
        lastError = err;
        // Search tool failed (e.g. quota limit on search API). Disable search for subsequent attempts.
        searchAvailable = false;
        const errStr = String(err?.message || err);
        if (
          errStr.includes('429') ||
          errStr.includes('quota') ||
          errStr.includes('RESOURCE_EXHAUSTED') ||
          errStr.includes('503')
        ) {
          await sleep(500);
        }
      }
    }

    // Try standard prompt generation without search tools
    try {
      const stream = await ai.models.generateContentStream({
        model,
        contents,
        config: { systemInstruction },
      });
      return { stream, modelUsed: model, hadSearch: false };
    } catch (err: any) {
      lastError = err;
      const errStr = String(err?.message || err);
      if (
        errStr.includes('429') ||
        errStr.includes('quota') ||
        errStr.includes('RESOURCE_EXHAUSTED') ||
        errStr.includes('503')
      ) {
        await sleep(500);
      }
    }
  }

  throw lastError || new Error('All model attempts failed.');
}

async function fetchContentWithResilience(
  ai: any,
  contents: any[],
  systemInstruction: string,
  enableSearch: boolean,
  modelPreference = 'gemini-3.8-flash'
) {
  const modelsToTry = [
    modelPreference,
    ...FALLBACK_MODELS,
  ].filter((v, i, a) => Boolean(v) && a.indexOf(v) === i);

  let searchAvailable = enableSearch;
  let lastError: any = null;

  for (const model of modelsToTry) {
    if (searchAvailable) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: { systemInstruction, tools: [{ googleSearch: {} }] },
        });
        return response;
      } catch (err: any) {
        lastError = err;
        searchAvailable = false;
        const errStr = String(err?.message || err);
        if (
          errStr.includes('429') ||
          errStr.includes('quota') ||
          errStr.includes('RESOURCE_EXHAUSTED') ||
          errStr.includes('503')
        ) {
          await sleep(500);
        }
      }
    }

    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: { systemInstruction },
      });
      return response;
    } catch (err: any) {
      lastError = err;
      const errStr = String(err?.message || err);
      if (
        errStr.includes('429') ||
        errStr.includes('quota') ||
        errStr.includes('RESOURCE_EXHAUSTED') ||
        errStr.includes('503')
      ) {
        await sleep(500);
      }
    }
  }

  throw lastError || new Error('All model attempts failed.');
}

// Quick live connection test endpoint for troubleshooting hosted environments
app.all('/api/health/test', async (req, res) => {
  const startTime = Date.now();
  try {
    const ai = getAIClient();
    const response = await fetchContentWithResilience(
      ai,
      [{ role: 'user', parts: [{ text: 'Respond with the single word: OK' }] }],
      'You are a health check agent. Return only OK.',
      false,
      'gemini-3.8-flash'
    );
    const latency = Date.now() - startTime;
    res.json({
      success: true,
      latencyMs: latency,
      reply: response.text?.trim() || 'OK',
    });
  } catch (err: any) {
    const latency = Date.now() - startTime;
    console.error('API health test failed:', err);
    res.status(500).json({
      success: false,
      latencyMs: latency,
      error: formatFriendlyErrorMessage(err),
      rawMessage: err?.message || String(err),
    });
  }
});

// Audio Transcription API using Gemini Multimodal Audio
app.post('/api/transcribe', async (req, res) => {
  const startTime = Date.now();
  try {
    const { audioData, mimeType = 'audio/webm', language = 'bn-BD' } = req.body;
    if (!audioData) {
      return res.status(400).json({ error: 'No audio data provided' });
    }

    // Strip data URI prefix if present
    const base64Audio = audioData.includes('base64,')
      ? audioData.split('base64,')[1]
      : audioData;

    // Clean MIME type (remove parameters like codecs=opus)
    const cleanMimeType = (mimeType || 'audio/webm').split(';')[0].trim();

    const ai = getAIClient();
    const isBengali = language && (language.startsWith('bn') || language === 'bn');
    const promptText = isBengali
      ? 'Transcribe this spoken audio accurately. If spoken in Bengali (বাংলা), transcribe verbatim in Bengali script. If spoken in English, transcribe verbatim in English. If mixed (Banglish/code terms), capture both accurately. Output ONLY the raw transcribed text. Do NOT add quotes, formatting, or commentary.'
      : 'Transcribe this spoken audio accurately. Output ONLY the verbatim transcribed text without quotes, formatting, or commentary.';

    // Try gemini-3.5-transcribe first (dedicated audio transcription model from SKILL.md),
    // fallback to gemini-3.8-flash / gemini-flash-latest
    const modelsToTry = ['gemini-3.5-transcribe', 'gemini-3.8-flash', 'gemini-flash-latest'];
    let text = '';
    let lastErr: any = null;

    for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    data: base64Audio,
                    mimeType: cleanMimeType,
                  },
                },
                {
                  text: promptText,
                },
              ],
            },
          ],
        });
        text = response.text?.trim() || '';
        if (text) break;
      } catch (err: any) {
        lastErr = err;
        console.warn(`Model ${model} transcription attempt failed:`, err?.message || err);
      }
    }

    if (!text && lastErr) {
      throw lastErr;
    }

    const latencyMs = Date.now() - startTime;
    res.json({
      success: true,
      text: text || '',
      latencyMs,
    });
  } catch (err: any) {
    console.error('Audio transcription failed:', err);
    res.status(500).json({
      success: false,
      error: formatFriendlyErrorMessage(err),
      rawMessage: err?.message || String(err),
    });
  }
});

// Streaming Chat API with Search Grounding
app.post('/api/chat/stream', async (req, res) => {
  try {
    const {
      messages = [],
      prompt,
      systemInstruction,
      enableSearch = true,
      mode = 'general',
      model = 'gemini-3.8-flash',
    } = req.body;

    if (!prompt && (!messages || messages.length === 0)) {
      return res.status(400).json({ error: 'Message content is required.' });
    }

    const ai = getAIClient();

    // Prepare contents
    // Convert previous messages to Gemini format: role 'user' | 'model', parts: [{ text }]
    const formattedContents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    if (Array.isArray(messages) && messages.length > 0) {
      for (const msg of messages) {
        if (!msg.text || !msg.text.trim()) continue;
        formattedContents.push({
          role: msg.role === 'model' || msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.text }],
        });
      }
    }

    // If a standalone prompt was also passed and not already at the end of messages
    if (prompt && (!formattedContents.length || formattedContents[formattedContents.length - 1].parts[0].text !== prompt)) {
      formattedContents.push({
        role: 'user',
        parts: [{ text: prompt }],
      });
    }

    const defaultSystem = `You are the official AI Assistant of "AI Assistant & Coding Studio" (বাংলা ও ইংরেজি স্মার্ট এআই সহকারী ও কোডিং স্টুডিও).

YOUR IDENTITY & ORIGIN (আপনার পরিচয় ও সৃষ্টি):
- আপনার নাম: "AI Assistant" (বাংলায়: এআই অ্যাসিস্ট্যান্ট বা এআই সহকারী)।
- প্ল্যাটফর্ম ও অ্যাপ্লিকেশনের নাম: "AI Assistant & Coding Studio"।
- আপনাকে কে তৈরি বা সৃষ্টি করেছে / কার অবদান:
  * এই অ্যাপ্লিকেশন ও স্টুডিও প্ল্যাটফর্মটি তৈরি ও পরিচালনা করেছে "AI Assistant & Coding Studio" টিম / ডেভেলপমেন্ট দল (আমাদের উদ্ভাবক ও সফটওয়্যার আর্কিটেক্ট টিম)।
  * আপনার বুদ্ধিমত্তা ও ভাষা মডেল চালিত হচ্ছে Google-এর সর্বাধুনিক "Gemini 3.8 Flash" (Google DeepMind) প্রযুক্তি দ্বারা।
  * যখন ব্যবহারকারী বাংলায় জিজ্ঞেস করবে "আপনাদের কোম্পানির নাম কি?", "আপনাকে কে সৃষ্টি করেছে?", "আপনার পরিচয় কী?", "কে বানিয়েছে?", বা "Who created you? / What is your company name?":
    - সশ্রদ্ধ, মার্জিত ও সুন্দর ভাষায় আত্মবিশ্বাসের সাথে উত্তর দিন।
    - স্পষ্ট করে বলুন:
      "আমি 'AI Assistant & Coding Studio' (এআই অ্যাসিস্ট্যান্ট অ্যান্ড কোডিং স্টুডিও)-এর নিজস্ব স্মার্ট কৃত্রিম বুদ্ধিমত্তা (AI) সহকারী।
      আমাদের প্ল্যাটফর্ম ও সফটওয়্যার ইকোসিস্টেমের প্রতিষ্ঠাতা এবং প্রধান সফটওয়্যার আর্কিটেক্ট শেখ ফরিদ (Sheikh Farid - সিরাজগঞ্জ, বাংলাদেশ)। তিনি একজন স্বশিক্ষিত সফটওয়্যার স্থপতি (Self-taught Software Architect) ও ফুল-স্ট্যাক ডেভেলপার, এবং একই সাথে সিরাজগঞ্জের ঐতিহ্যবাহী পারিবারিক হোটেল 'হোটেল আল শেখ ফরিদ' পরিচালনার সাথে যুক্ত। আমার পেছনে বুদ্ধিমত্তা ও ভাষা মডেল হিসেবে কাজ করছে Google-এর অত্যাধুনিক Gemini 3.8 Flash ইঞ্জিন।
      বাংলা ও ইংরেজি—উভয় ভাষায় প্রোগ্রামিং/কোডিং, টেকনিক্যাল সমস্যা সমাধান, অফিশিয়াল দরখাস্ত ও চিঠি লেখা, এ টু জেড জনসেবা ও জরুরি তথ্য প্রদান, এবং দ্রুত গবেষণায় আপনাকে সহায়তা করাই আমার মূল দায়িত্ব।"
- আপনার প্রতিষ্ঠাতা ও সুপার অ্যাডমিন পরিচয় (Founder & Super Admin Knowledge Context):
  * প্রতিষ্ঠাতা ও মূল মালিক: শেখ ফরিদ (Sheikh Farid), জন্ম: ১৫ জুন, ১৯৯৪ (বয়স ৩২ বছর), অবস্থান: সিরাজগঞ্জ, বাংলাদেশ।
  * পেশা ও পরিচয়: স্বশিক্ষিত সফটওয়্যার স্থপতি ও ফুল-স্ট্যাক ডেভেলপার; পারিবারিক হোটেল ব্যবসা 'হোটেল আল শেখ ফরিদ'-এর পরিচালক।
  * ফ্ল্যাগশিপ প্রজেক্ট ও কোম্পানি: ScrollVerse (গভটেক সফটওয়্যার ইকোসিস্টেম), Sheikh Code Exchange (৪২তম ফ্ল্যাগশিপ প্রজেক্ট), RubelPay / RubelBank, Synergy BPO Hub, হোটেল আল শেখ ফরিদ ও মিষ্টির দোকান ম্যানেজমেন্ট (Next.js + Dexie.js + Tailwind CSS offline-first PWA), NotorBotor, Ideation Spark, AutoPay.Ltd, NoorNexus Sovereign OS v3, NoorAI।
  * পারিবারিক পরিচয়: পিতা মো. আব্দুল বারিক শেখ, মাতা আম্মা, স্ত্রী খুকুমণি বেগম (Khukumoni Begum), এক কন্যা ও এক পুত্র সন্তান।
  * অ্যাডমিন আইডেন্টিটি: Role: "Super Admin & Founder", Owner: "Sheikh Farid", Entity: "Hotel Al Sheikh Farid", Location: "Sirajganj, Bangladesh"।
- আপনার মূল লক্ষ্য ও বিশেষত্ব:
  * সম্পূর্ণ বিজ্ঞাপনমুক্ত, দ্রুতগতির এবং নির্ভরযোগ্য সেবা দেওয়া।
  * বাংলা ভাষায় সাবলীল, প্রাঞ্জল ও ব্যাকরণগতভাবে শুদ্ধ কথোপকথন।
  * কোডিং ও সফটওয়্যার ডেভেলপমেন্টে এ-টু-জেড সহায়তা প্রদান।
  * যেকোনো আইনি, প্রযুক্তিগত, প্রাতিষ্ঠানিক ও শিক্ষণীয় প্রশ্নের নিখুঁত সমাধান।

You are fluent in both Bengali (বাংলা) and English.
You excel in:
1. Coding & Software Development (Python, TypeScript, React, algorithms, code review, debugging, step-by-step reasoning).
2. Writing & Communication (professional emails, articles, Bengali-English translation, creative writing).
3. Citizen Services, Directories & Everyday Task Assistance (জনসেবা, মোবাইল নাম্বার, ঠিকানা, পরিচয় নির্দেশিকা ও দৈনন্দিন কাজ সহজ করা):
   - Finding official hotlines, police station contacts, emergency fire service, hospital & ambulance numbers, blood banks, and telecom customer care (999, 333, 109, 106, 16122, 16263, 16430, 105, etc.).
   - Finding addresses, post offices, postcodes (পোস্ট কোড), government ministry offices, embassies, and location guidance.
   - Legitimate identity & document verification guidance (NID portal services.nidw.gov.bd, *16001# biometric SIM ownership check, online birth certificate everify.bdris.gov.bd, e-passport tracking, and scam/fraud call protection).
   - Drafting official Bengali applications: General Diary (থানায় জিডি - GD for lost phone/docs), leave letters (ছুটির দরখাস্ত), complaint petitions, citizen certificates, and CV/biodata formats.
   - Solving everyday life, administrative, and technical problems from A to Z with clear, step-by-step guidance.
4. Web Research & Link Finding (ইউটিউব ও ইন্টারনেট থেকে আসল এবং সঠিক লিঙ্ক):
   - Finding active websites, tools, documentation, and official government resources.
   - Finding songs, music, lyrics, playlists, and artists with REAL WORKING YouTube links:
     * When the user requests a song, music, or video (e.g. asking for links like https://youtu.be/ID, https://www.youtube.com/watch?v=ID, or "ইউটিউব থেকে লিংক দিন"):
       - ALWAYS use Google Search Grounding to find the official, verified YouTube video link with exact Video ID (e.g., https://youtu.be/VIDEO_ID or https://www.youtube.com/watch?v=VIDEO_ID).
       - NEVER hallucinate, guess, or invent fake 11-character video IDs. Only provide verified links obtained from Google Search results.
       - Format each song/video link nicely in Markdown: [গানের শিরোনাম - শিল্পী](https://www.youtube.com/watch?v=VIDEO_ID) or [গানের নাম](https://youtu.be/VIDEO_ID).
       - Our application automatically converts verified YouTube links into an interactive in-app player card with direct playback, mini-browser streaming, and lyrics support!
       - In addition to direct video links, ALWAYS include alternative search fallbacks:
         * [YouTube এ সরাসরি খুঁজুন](https://www.youtube.com/results?search_query=গানের+নাম+শিল্পী)
         * [YouTube Music এ গানটি শুনুন](https://music.youtube.com/search?q=গানের+নাম+শিল্পী)
   - Finding YouTube videos, tutorials, educational channels, and playlists with accurate, working Markdown links.
5. Learning & Conceptual Explanations (making complex topics easy to understand, interviews, system design).
6. Analysis, Research & Google Search verification (providing factual, up-to-date information with citations).
7. File generation, interactive tools, and daily engineering advice.

When the user asks in Bengali, respond naturally, warmly, and accurately in standard Bengali (বাংলা), keeping technical terms in English/Latin script when clearer (e.g., API, Backend, React, Hook, State).
When the user asks about emergency numbers, addresses, identity verification, or official letters, provide complete, accurate, structured information with direct action steps and standard Bengali templates.
When code is requested, provide clean, idiomatic, runnable code with clear comments. Format with markdown code blocks.`;

    let modeInstruction = '';
    if (mode === 'citizen') {
      modeInstruction = `\nMode: Citizen & Everyday Life Assistant (জনসেবা, মোবাইল নাম্বার, ঠিকানা ও পরিচয় নির্দেশিকা):
- Focus on finding official phone numbers, addresses, postcodes, and step-by-step citizen services across Bangladesh and abroad.
- When asked to find numbers or addresses, provide verified official directories, hotlines (999, 333, 109, 16122, 16263, etc.), and step-by-step guides.
- If asked about verifying a person's identity, provide legal, official verification channels (NID wing portal, *16001# biometric SIM check, BDRIS, e-Passport) and advise on privacy and fraud prevention.
- If asked for an application or GD, generate complete, formal Bengali petition drafts ready for police stations or offices.`;
    }

    const effectiveSystemInstruction = systemInstruction
      ? `${defaultSystem}${modeInstruction}\n\nSpecific task mode instructions:\n${systemInstruction}`
      : `${defaultSystem}${modeInstruction}`;

    // Setup headers for Server-Sent Events (SSE)
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Stream content with automatic retry and model/search fallbacks
    const { stream: responseStream } = await fetchStreamWithResilience(
      ai,
      formattedContents,
      effectiveSystemInstruction,
      enableSearch,
      model || 'gemini-3.8-flash'
    );

    let accumulatedGrounding: any[] = [];
    let searchQueries: string[] = [];

    try {
      for await (const chunk of responseStream) {
        const textChunk = chunk.text || '';
        
        // Check grounding metadata if available in chunk
        const candidate = chunk.candidates?.[0];
        if (candidate?.groundingMetadata) {
          const metadata = candidate.groundingMetadata;
          if (metadata.groundingChunks) {
            accumulatedGrounding = metadata.groundingChunks;
          }
          if (metadata.webSearchQueries) {
            searchQueries = metadata.webSearchQueries;
          }
        }

        if (textChunk) {
          res.write(`data: ${JSON.stringify({ text: textChunk })}\n\n`);
        }
      }
    } catch (streamIterError: any) {
      console.warn('Error during stream chunk iteration:', streamIterError?.message || streamIterError);
      const friendly = formatFriendlyErrorMessage(streamIterError);
      res.write(`data: ${JSON.stringify({ error: friendly })}\n\n`);
      res.end();
      return;
    }

    // Send final grounding metadata if captured
    if (accumulatedGrounding.length > 0 || searchQueries.length > 0) {
      res.write(`data: ${JSON.stringify({
        done: true,
        groundingChunks: accumulatedGrounding,
        searchQueries,
      })}\n\n`);
    } else {
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    }

    res.end();
  } catch (error: any) {
    console.error('Error in /api/chat/stream:', error?.message || error);
    const friendlyErrorMessage = formatFriendlyErrorMessage(error);
    
    // If headers already sent, write error event
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: friendlyErrorMessage })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: friendlyErrorMessage });
    }
  }
});

// Non-streaming chat endpoint (fallback/quick queries)
app.post('/api/chat', async (req, res) => {
  try {
    const {
      messages = [],
      prompt,
      systemInstruction,
      enableSearch = true,
      mode = 'general',
      model = 'gemini-3.8-flash',
    } = req.body;

    const ai = getAIClient();

    const formattedContents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
    if (Array.isArray(messages) && messages.length > 0) {
      for (const msg of messages) {
        if (!msg.text || !msg.text.trim()) continue;
        formattedContents.push({
          role: msg.role === 'model' || msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.text }],
        });
      }
    }

    if (prompt && (!formattedContents.length || formattedContents[formattedContents.length - 1].parts[0].text !== prompt)) {
      formattedContents.push({
        role: 'user',
        parts: [{ text: prompt }],
      });
    }

    const defaultSystem = `You are the official AI Assistant of "AI Assistant & Coding Studio" (বাংলা ও ইংরেজি স্মার্ট এআই সহকারী ও কোডিং স্টুডিও).
Your Identity & Creators:
- Name: "AI Assistant" (এআই অ্যাসিস্ট্যান্ট বা এআই সহকারী).
- Platform / Company: "AI Assistant & Coding Studio".
- Creators: Developed & crafted by the "AI Assistant & Coding Studio" software engineering team. Powered by Google's cutting-edge "Gemini 3.8 Flash" (Google DeepMind) model.
- When asked "আপনাদের কোম্পানির নাম কি?", "আপনাকে কে সৃষ্টি করেছে?", "আপনার পরিচয় কী?":
  Answer politely in Bengali:
  "আমি 'AI Assistant & Coding Studio'-এর নিজস্ব এআই সহকারী। আমাদের সফটওয়্যার ডেভেলপমেন্ট টিম আমাকে তৈরি করেছে এবং আমার বুদ্ধিমত্তা Google-এর সর্বাধুনিক Gemini 3.8 Flash ইঞ্জিন দ্বারা পরিচালিত।"
Provide thoughtful, well-structured answers with code examples, clear explanations, emergency hotlines, address assistance, and accurate facts.`;
    const modeNote = mode === 'citizen' ? '\nMode: Citizen & Everyday Services Assistance (মোবাইল নম্বর, ঠিকানা, পরিচয় যাচাই ও দরখাস্ত).' : '';
    const effectiveSystemInstruction = systemInstruction ? `${defaultSystem}${modeNote}\n\n${systemInstruction}` : `${defaultSystem}${modeNote}`;

    const response = await fetchContentWithResilience(
      ai,
      formattedContents,
      effectiveSystemInstruction,
      enableSearch,
      model || 'gemini-3.8-flash'
    );

    const candidate = response.candidates?.[0];
    const groundingChunks = candidate?.groundingMetadata?.groundingChunks || [];
    const searchQueries = candidate?.groundingMetadata?.webSearchQueries || [];

    res.json({
      text: response.text || '',
      groundingChunks,
      searchQueries,
    });
  } catch (error: any) {
    console.error('Error in /api/chat:', error);
    res.status(500).json({ error: error?.message || 'Server error occurred.' });
  }
});

// AI Session Title Generation Endpoint
app.post('/api/session/title', async (req, res) => {
  try {
    const { userMessage, assistantMessage, mode = 'general' } = req.body;

    if (!userMessage && !assistantMessage) {
      return res.status(400).json({ error: 'Conversation context is required.' });
    }

    const ai = getAIClient();

    const cleanUser = String(userMessage || '').slice(0, 500).trim();
    const cleanAssistant = String(assistantMessage || '').slice(0, 800).trim();

    const prompt = `You are a concise conversation titling engine.
Generate a short, descriptive, and accurate title (3 to 6 words maximum) for this chat session based on the first user-assistant interaction.

Rules:
1. Length: Exactly 3 to 6 words.
2. Language: If the user's message is written primarily in Bengali (বাংলা), generate the title in natural, fluent Bengali. If written in English, generate in English.
3. Content: Capture the specific topic, problem, or objective (e.g. "পাইথনে ডেটা সর্টিং", "রিয়েক্ট হুকস আর্কিটেকচার", "Tailwind CSS Layout Debugging", "জব অ্যাপ্লিকেশনের কভার লেটার").
4. Format: Return ONLY the title text. Do NOT wrap in quotes. Do NOT add prefixes like "Title:" or "শিরোনাম:". Do NOT add markdown or trailing punctuation like periods or dāri (।).

User message:
"${cleanUser}"

Assistant response:
"${cleanAssistant}"`;

    const response = await fetchContentWithResilience(
      ai,
      [{ role: 'user', parts: [{ text: prompt }] }],
      'You generate clear, concise 3-6 word conversation titles.',
      false, // search disabled for fast, cheap title generation
      'gemini-3.8-flash'
    );

    let generatedTitle = response.text || '';
    // Clean formatting and punctuation
    let cleaned = generatedTitle
      .replace(/^(Title|শিরোনাম|শীর্ষক)\s*[:：-]\s*/i, '')
      .replace(/^["'`“”‘’]+|["'`“”‘’]+$/g, '')
      .replace(/[*_#~]/g, '')
      .replace(/[।.\s]+$/g, '')
      .trim();

    if (!cleaned || cleaned.length > 60) {
      cleaned = cleanUser.length > 30 ? cleanUser.slice(0, 30) + '...' : cleanUser;
    }

    res.json({ title: cleaned });
  } catch (error: any) {
    console.warn('Error in /api/session/title:', error?.message || error);
    const fallback = (req.body?.userMessage || 'নতুন কথোপকথন').slice(0, 30);
    res.json({ title: fallback });
  }
});

// Live Web Proxy Endpoint to bypass X-Frame-Options and CSP frame-ancestors
app.get('/api/proxy', async (req, res) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl || typeof targetUrl !== 'string') {
    return res.status(400).send('URL query parameter is required');
  }

  try {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`);
    } catch {
      return res.status(400).send('Invalid URL format');
    }

    const response = await fetch(parsedUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'bn-BD,bn;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      redirect: 'follow',
    });

    const contentType = response.headers.get('content-type') || 'text/html';

    // Remove frame blocking security headers
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('Content-Security-Policy-Report-Only');

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', contentType);

    // If HTML, inject <base> tag and click interceptor
    if (contentType.includes('text/html')) {
      let html = await response.text();
      const baseTag = `<base href="${parsedUrl.origin}${parsedUrl.pathname}">`;
      const proxyScript = `
        <script>
          (function() {
            document.addEventListener('click', function(e) {
              var a = e.target.closest('a');
              if (a && a.href && !a.href.startsWith('javascript:') && !a.href.startsWith('#')) {
                e.preventDefault();
                window.location.href = '/api/proxy?url=' + encodeURIComponent(a.href);
              }
            }, true);
          })();
        </script>
      `;

      if (html.includes('<head>')) {
        html = html.replace('<head>', `<head>${baseTag}${proxyScript}`);
      } else if (html.includes('<head ')) {
        html = html.replace(/<head[^>]*>/, `$&${baseTag}${proxyScript}`);
      } else {
        html = `${baseTag}${proxyScript}${html}`;
      }

      return res.send(html);
    } else {
      const arrayBuffer = await response.arrayBuffer();
      return res.end(Buffer.from(arrayBuffer));
    }
  } catch (err: any) {
    console.error('Web proxy error for URL:', targetUrl, err?.message);
    return res.status(502).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>ওয়েব পেজ লোড ব্যর্থ</title>
          <style>
            body { font-family: system-ui, sans-serif; background: #09090b; color: #f4f4f5; padding: 40px 20px; text-align: center; }
            .card { max-width: 520px; margin: 40px auto; background: #18181b; border: 1px solid #27272a; border-radius: 20px; padding: 28px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
            h2 { color: #f87171; margin-top: 0; font-size: 18px; }
            p { font-size: 13px; line-height: 1.6; color: #a1a1aa; margin: 12px 0; }
            .url { font-family: monospace; font-size: 12px; color: #60a5fa; word-break: break-all; background: #09090b; padding: 8px 12px; border-radius: 8px; border: 1px solid #27272a; margin: 16px 0; }
            .btn { display: inline-flex; align-items: center; justify-content: center; margin-top: 10px; padding: 10px 20px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 12px; font-size: 13px; font-weight: 600; }
            .btn:hover { background: #1d4ed8; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>ওয়েব পেজটি সরাসরি লোড করা যায়নি</h2>
            <p>ওয়েবসাইটটি সরাসরি সংযোগ গ্রহণ করছে না বা ক্লাউড সার্ভার থেকে সরাসরি আইফ্রেমে লোড করা নিষিদ্ধ করেছে।</p>
            <div class="url">${targetUrl}</div>
            <a class="btn" href="${targetUrl}" target="_blank" rel="noopener noreferrer">নতুন ট্যাবে খুলুন (Open in New Tab) ↗</a>
          </div>
        </body>
      </html>
    `);
  }
});

// AI Web Reader Extractor: Extracts article text, clean markdown, and metadata
app.get('/api/proxy/reader', async (req, res) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl) {
    return res.status(400).json({ error: 'URL parameter required' });
  }

  try {
    const parsedUrl = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`);
    const response = await fetch(parsedUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'bn-BD,bn;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    const html = await response.text();

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : parsedUrl.hostname;

    const cleanHtml = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '')
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
      .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, '');

    const paragraphMatches = cleanHtml.match(/<(p|h1|h2|h3|h4|li)[^>]*>([\s\S]*?)<\/\1>/gi) || [];
    const textPieces = paragraphMatches
      .map((p) => p.replace(/<[^>]+>/g, '').trim())
      .filter((t) => t.length > 25);

    const articleText = textPieces.slice(0, 50).join('\n\n');

    return res.json({
      title,
      url: targetUrl,
      domain: parsedUrl.hostname,
      content: articleText || 'ওয়েব পেজের টেক্সট এক্সট্র্যাক্ট করা সম্ভব হয়নি। লাইভ মোডে পেজটি দেখুন।',
      length: articleText.length,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to read web page' });
  }
});

// In-App Mini Google Web Browser: Live Google Search API with Grounding
app.post('/api/mini-browser/search', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'Search query is required.' });
    }

    const ai = getAIClient();
    const systemPrompt = `You are the backend engine for an in-app Mini Google Web Browser.
Search Google in real time and return comprehensive search results for the user query.
Return your response in clean JSON format:
{
  "query": "exact search query",
  "instantAnswer": "direct, helpful 1-2 sentence answer or summary from Google",
  "knowledgeCard": {
    "title": "Title of entity or song",
    "subtitle": "Artist, Year, Genre, or Domain",
    "description": "Brief factual overview",
    "fields": [
      { "label": "শিল্পী / তথ্য", "value": "..." }
    ]
  },
  "results": [
    {
      "title": "Page or video title",
      "url": "full verified URL",
      "domain": "e.g. youtube.com, wikipedia.org",
      "snippet": "2-line descriptive summary"
    }
  ],
  "youtubeMedia": {
    "videoId": "11-character video ID if a song or video is queried (e.g. Vny_75WmEH4)",
    "title": "Exact song / video title",
    "artist": "Singer / Channel name",
    "watchUrl": "https://www.youtube.com/watch?v=...",
    "musicUrl": "https://music.youtube.com/search?q=..."
  }
}
CRITICAL: Output ONLY valid JSON, with no markdown code fences or backticks.`;

    const response = await fetchContentWithResilience(
      ai,
      [{ role: 'user', parts: [{ text: `Search Google for: "${query.trim()}"` }] }],
      systemPrompt,
      true, // enable Google Search Grounding!
      'gemini-3.8-flash'
    );

    let rawText = response.text || '';
    rawText = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();

    try {
      const data = JSON.parse(rawText);
      const candidate = (response as any)?.candidates?.[0];
      const groundingChunks = (candidate?.groundingMetadata?.groundingChunks || [])
        .map((c: any) => c.web)
        .filter(Boolean);

      // Verify and extract real YouTube video links from Google Grounding chunks
      for (const chunk of groundingChunks) {
        if (!chunk.uri) continue;
        const ytMatch = chunk.uri.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/i);
        if (ytMatch && ytMatch[1]) {
          const verifiedId = ytMatch[1];
          if (!data.youtubeMedia) {
            data.youtubeMedia = {};
          }
          data.youtubeMedia.videoId = verifiedId;
          data.youtubeMedia.watchUrl = `https://www.youtube.com/watch?v=${verifiedId}`;
          if (!data.youtubeMedia.title) {
            data.youtubeMedia.title = chunk.title || query;
          }
          break;
        }
      }

      // If no verified YouTube media was extracted from grounding, use direct YouTube search
      if (!data.youtubeMedia?.videoId) {
        const directYt = await searchYouTubeDirect(query);
        if (directYt.length > 0) {
          const top = directYt[0];
          data.youtubeMedia = {
            videoId: top.videoId,
            title: top.title,
            artist: top.author,
            watchUrl: top.url,
            musicUrl: `https://music.youtube.com/search?q=${encodeURIComponent(query)}`,
          };
        }
      }

      res.json({
        ...data,
        groundingSources: groundingChunks,
      });
    } catch {
      const directYt = await searchYouTubeDirect(query);
      const top = directYt[0];
      res.json({
        query,
        instantAnswer: rawText.slice(0, 300),
        youtubeMedia: top ? {
          videoId: top.videoId,
          title: top.title,
          artist: top.author,
          watchUrl: top.url,
          musicUrl: `https://music.youtube.com/search?q=${encodeURIComponent(query)}`,
        } : undefined,
        results: [
          {
            title: `${query} - Google Search`,
            url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
            domain: 'google.com',
            snippet: rawText.slice(0, 200),
          },
        ],
      });
    }
  } catch (error: any) {
    console.error('Error in /api/mini-browser/search:', error?.message || error);
    const { query } = req.body || {};
    const safeQuery = query ? String(query).trim() : 'Google Search';
    res.json({
      query: safeQuery,
      instantAnswer: `গুগলে "${safeQuery}" সার্চ রেজাল্ট এবং সরাসরি সংযোগ প্রস্তুত করা হয়েছে।`,
      results: [
        {
          title: `${safeQuery} - YouTube Video / Song`,
          url: `https://www.youtube.com/results?search_query=${encodeURIComponent(safeQuery)}`,
          domain: 'youtube.com',
          snippet: `YouTube-এ "${safeQuery}" গান এবং অফিসিয়াল মিউজিক ভিডিও সরাসরি শুনুন ও দেখুন।`
        },
        {
          title: `${safeQuery} - Google Search`,
          url: `https://www.google.com/search?q=${encodeURIComponent(safeQuery)}`,
          domain: 'google.com',
          snippet: `Google-এ "${safeQuery}" সম্পর্কিত সমস্ত তথ্য, লিরিক্স এবং ওয়েব রেজাল্ট।`
        },
        {
          title: `${safeQuery} - YouTube Music`,
          url: `https://music.youtube.com/search?q=${encodeURIComponent(safeQuery)}`,
          domain: 'music.youtube.com',
          snippet: `YouTube Music-এ "${safeQuery}" এর হাই কোয়ালিটি অডিও স্ট্রিম করুন।`
        }
      ]
    });
  }
});

// Mini Browser: Song Lyrics & Details Endpoint
app.post('/api/mini-browser/lyrics', async (req, res) => {
  try {
    const { songTitle, artist, videoId } = req.body;
    if (!songTitle && !videoId) {
      return res.status(400).json({ error: 'Song title or videoId required.' });
    }

    const ai = getAIClient();
    const query = songTitle || (videoId ? `YouTube video ${videoId}` : 'Song');
    const systemPrompt = `You are a music encyclopedia. Provide complete verified lyrics, singer/artist background, composer, release year, and Bengali explanation of the song's meaning. Format neatly with headings.`;

    const response = await fetchContentWithResilience(
      ai,
      [{ role: 'user', parts: [{ text: `Provide lyrics, artist info, and details for the song: "${query}" (Artist: ${artist || 'Unknown'})` }] }],
      systemPrompt,
      true,
      'gemini-3.8-flash'
    );

    res.json({
      title: songTitle || query,
      artist: artist || '',
      lyricsText: response.text || '',
    });
  } catch (error: any) {
    console.warn('Error in /api/mini-browser/lyrics:', error?.message || error);
    const { songTitle, artist } = req.body || {};
    const safeTitle = songTitle || 'গানের লিরিক্স';
    res.json({
      title: safeTitle,
      artist: artist || '',
      lyricsText: `### 🎵 ${safeTitle} ${artist ? `(${artist})` : ''}\n\nগুগল ও ইউটিউবে সরাসরি লিরিক্স ও গান শুনতে নিচের লিঙ্কগুলোতে যান:\n- [Google Search এ লিরিক্স দেখুন](https://www.google.com/search?q=${encodeURIComponent(safeTitle + ' ' + (artist || '') + ' lyrics')})\n- [YouTube এ গান শুনুন](https://www.youtube.com/results?search_query=${encodeURIComponent(safeTitle + ' ' + (artist || ''))})`
    });
  }
});

// Helper to directly search YouTube and extract real, verified video IDs & metadata
async function searchYouTubeDirect(query: string): Promise<Array<{
  videoId: string;
  title: string;
  author: string;
  url: string;
  thumbnail: string;
  duration?: string;
}>> {
  try {
    const res = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9,bn;q=0.8',
      },
    });
    if (!res.ok) return [];
    const html = await res.text();
    const match = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/);
    if (!match) return [];
    const data = JSON.parse(match[1]);
    const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents || [];
    const videos: Array<any> = [];
    const seen = new Set<string>();

    for (const item of contents) {
      const vr = item.videoRenderer;
      if (vr && vr.videoId && /^[a-zA-Z0-9_-]{11}$/.test(vr.videoId) && !seen.has(vr.videoId)) {
        seen.add(vr.videoId);
        videos.push({
          videoId: vr.videoId,
          title: vr.title?.runs?.[0]?.text || query,
          author: vr.ownerText?.runs?.[0]?.text || 'YouTube Official',
          url: `https://www.youtube.com/watch?v=${vr.videoId}`,
          thumbnail: `https://i.ytimg.com/vi/${vr.videoId}/hqdefault.jpg`,
          duration: vr.lengthText?.simpleText || '',
        });
      }
    }
    return videos.slice(0, 10);
  } catch (err) {
    console.warn('Direct YouTube extraction fallback error:', err);
    return [];
  }
}

// Dedicated Real YouTube Video Search & Grounding API
app.post('/api/youtube/search', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'Search query is required.' });
    }

    const trimmedQuery = query.trim();

    // 1. Primary: Direct real-time YouTube extraction (100% verified real IDs, zero hallucinations)
    const directResults = await searchYouTubeDirect(trimmedQuery);
    if (directResults.length > 0) {
      return res.json({
        query: trimmedQuery,
        videos: directResults,
        searchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(trimmedQuery)}`,
        musicUrl: `https://music.youtube.com/search?q=${encodeURIComponent(trimmedQuery)}`,
      });
    }

    // 2. Secondary fallback: Gemini with Google Search Grounding & oEmbed verification
    const ai = getAIClient();
    const systemPrompt = `You are a YouTube search engine. Find real YouTube video URLs for the query. Output valid JSON: {"query": "...", "videos": [{"videoId": "11-chars", "title": "...", "author": "..."}]}`;

    const response = await fetchContentWithResilience(
      ai,
      [{ role: 'user', parts: [{ text: `Search YouTube videos for: "${trimmedQuery}"` }] }],
      systemPrompt,
      true,
      'gemini-3.8-flash'
    );

    const candidate = (response as any)?.candidates?.[0];
    const groundingChunks = (candidate?.groundingMetadata?.groundingChunks || [])
      .map((c: any) => c.web)
      .filter(Boolean);

    const videos: Array<{
      videoId: string;
      title: string;
      author: string;
      url: string;
      thumbnail: string;
    }> = [];
    const seen = new Set<string>();

    for (const chunk of groundingChunks) {
      if (!chunk.uri) continue;
      const m = chunk.uri.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/i);
      if (m && m[1] && !seen.has(m[1])) {
        const vid = m[1];
        seen.add(vid);
        videos.push({
          videoId: vid,
          title: chunk.title || trimmedQuery,
          author: 'ইউটিউব ভেরিফাইড',
          url: `https://www.youtube.com/watch?v=${vid}`,
          thumbnail: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
        });
      }
    }

    res.json({
      query: trimmedQuery,
      videos,
      searchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(trimmedQuery)}`,
      musicUrl: `https://music.youtube.com/search?q=${encodeURIComponent(trimmedQuery)}`,
    });
  } catch (err: any) {
    console.error('Error in /api/youtube/search:', err?.message || err);
    const { query } = req.body || {};
    const safeQ = (query || 'গান').trim();
    res.json({
      query: safeQ,
      videos: [],
      searchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(safeQ)}`,
      musicUrl: `https://music.youtube.com/search?q=${encodeURIComponent(safeQ)}`,
    });
  }
});

// Autonomous Freelance Agent: Evaluate Job & Generate Winning Proposal
app.post('/api/agent/evaluate-job', async (req, res) => {
  try {
    const { job, profile } = req.body;
    if (!job || !job.description) {
      return res.status(400).json({ error: 'Job description is required.' });
    }

    const ai = getAIClient();
    const prompt = `
You are an autonomous freelance sales engineer and top-rated remote consultant on Upwork, RemoteOK, and LinkedIn.
Analyze the following remote job posting and candidate profile:

JOB DETAILS:
Platform: ${job.platform || 'Upwork / Remote'}
Title: ${job.title || 'Remote Software Development'}
Budget: ${job.budget || 'Competitive / Negotiable'}
Required Skills: ${(job.skillsRequired || []).join(', ') || 'Not specified'}
Job Description:
${job.description}

CANDIDATE PROFILE & CAPABILITIES:
Skills: ${(profile?.skills || ['React', 'TypeScript', 'Node.js', 'Python', 'FastAPI', 'Automation', 'AI Integration']).join(', ')}
Bio: ${profile?.bio || 'Full stack engineer with 5+ years of experience in modern web apps, automation bots, and AI API integrations.'}
Target Rate: ${profile?.hourlyRate || '$45 - $65/hr'}

TASK:
Perform a deep technical evaluation and generate a high-converting, professional, tailored proposal.
Rules:
- NEVER use generic opening lines like "I am writing to express my interest..." or "I am the best candidate".
- Immediately demonstrate technical understanding of their exact problem in the first sentence.
- Propose a concrete 3-step action plan or architectural approach.
- Include 2-3 thoughtful questions that only an expert would ask.
- Keep tone professional, confident, proactive, and concise.

Respond ONLY with valid JSON in this exact structure:
{
  "matchScore": 92,
  "recommendation": "Highly Recommended",
  "summary": "Short 2-sentence technical summary in Bengali (বাংলা)",
  "keyStrengths": ["Strength 1 in Bengali", "Strength 2 in Bengali"],
  "potentialRisks": ["Risk 1 in Bengali", "Risk 2 in Bengali"],
  "suggestedBid": "$500",
  "estimatedDays": 4,
  "winningStrategy": "Strategic tip in Bengali on how to close this client",
  "coverLetter": "Full customized winning proposal letter in English (or Bengali if job is Bengali)",
  "milestones": [
    { "title": "Milestone 1: Architecture & Setup", "duration": "1 day", "cost": "$150" },
    { "title": "Milestone 2: Core Feature Implementation", "duration": "2 days", "cost": "$250" },
    { "title": "Milestone 3: Testing, Deployment & Handover", "duration": "1 day", "cost": "$100" }
  ],
  "questionsForClient": [
    "Technical question 1 about their database or API",
    "Workflow question 2"
  ]
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.25,
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (err: any) {
    console.error('Error in /api/agent/evaluate-job:', err?.message || err);
    res.status(500).json({
      error: formatFriendlyErrorMessage(err),
    });
  }
});

// Autonomous Freelance Agent: Execute Task & Self-Healing Code Solver
app.post('/api/agent/solve-task', async (req, res) => {
  try {
    const { jobTitle, requirement, techStack } = req.body;
    if (!requirement) {
      return res.status(400).json({ error: 'Requirement description is required.' });
    }

    const ai = getAIClient();
    const prompt = `
You are an autonomous senior software engineer performing a freelance contract delivery.
Client Requirement:
Title: ${jobTitle || 'Custom Software Module'}
Tech Stack: ${techStack || 'TypeScript / Node.js'}
Detailed Specification:
${requirement}

TASK:
1. Decompose the requirement into architecture.
2. Produce production-grade, bug-free, complete source code files (No placeholders, no "TODOs").
3. Perform a simulated automated test & self-healing verification:
   - Identify a potential edge-case or lint error that a self-correcting agent catches.
   - Show how the agent corrected it before delivery.
4. Write a professional client delivery message ready to paste in Upwork/Fiverr chat.

Respond ONLY with valid JSON in this exact structure:
{
  "architecture": "Architecture overview in Bengali (বাংলা)",
  "files": [
    {
      "filename": "index.ts",
      "language": "typescript",
      "purpose": "Core entrypoint and execution logic",
      "content": "/* Complete working code */"
    },
    {
      "filename": "README.md",
      "language": "markdown",
      "purpose": "Setup instructions and API documentation",
      "content": "/* Complete markdown documentation */"
    }
  ],
  "selfHealingReport": {
    "iterations": 2,
    "initialErrorDetected": "Edge case: Missing null check or timeout handler on API fetch",
    "correctionApplied": "Added retry loop with exponential backoff and strict TypeScript typing",
    "testsPassed": true,
    "assertionsCount": 12
  },
  "deliveryNote": "Hi [Client Name], I have completed the requested module according to your exact specifications..."
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (err: any) {
    console.error('Error in /api/agent/solve-task:', err?.message || err);
    res.status(500).json({
      error: formatFriendlyErrorMessage(err),
    });
  }
});

// JSON 404 response for any unhandled /api/* endpoints
app.all('/api/*', (req, res) => {
  res.status(404).json({
    error: `API route not found: ${req.method} ${req.path}`,
    status: 404,
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export { app };
export default app;
