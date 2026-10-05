/**
 * Direct Client-Side Gemini Integration
 * 
 * Provides zero-config direct browser calls to Google Gemini REST API.
 * This ensures that when the app is deployed to static hosting (like Firebase Hosting,
 * GitHub Pages, Netlify, or Vercel static) where the Express server is not running,
 * the chat and AI features continue working seamlessly without requiring immediate
 * server-side configuration.
 */

import { getFounderSystemPromptContext } from '../data/founderProfile';

export interface DirectGeminiStreamOptions {
  messages: Array<{ role: string; text: string }>;
  prompt?: string;
  enableSearch?: boolean;
  mode?: string;
  signal?: AbortSignal;
  onChunk: (text: string) => void;
  onGrounding?: (grounding: any) => void;
  onSearchQueries?: (queries: string[]) => void;
}

export function getDirectGeminiApiKey(): string {
  const envKey = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)?.trim();
  return envKey || '';
}

export function isDirectGeminiAvailable(): boolean {
  return Boolean(getDirectGeminiApiKey());
}

const DEFAULT_SYSTEM_INSTRUCTION = `You are the official AI Assistant of "AI Assistant & Coding Studio" (বাংলা ও ইংরেজি স্মার্ট এআই সহকারী ও কোডিং স্টুডিও).

YOUR IDENTITY & ORIGIN (আপনার পরিচয় ও সৃষ্টি):
- আপনার নাম: "AI Assistant" (বাংলায়: এআই অ্যাসিস্ট্যান্ট বা এআই সহকারী)।
- প্ল্যাটফর্ম ও অ্যাপ্লিকেশনের নাম: "AI Assistant & Coding Studio"।
- প্রতিষ্ঠাতা ও প্রধান সফটওয়্যার আর্কিটেক্ট: শেখ ফরিদ (Sheikh Farid - সিরাজগঞ্জ, বাংলাদেশ)। স্বশিক্ষিত সফটওয়্যার স্থপতি ও ফুল-স্ট্যাক ডেভেলপার, এবং একই সাথে সিরাজগঞ্জের ঐতিহ্যবাহী পারিবারিক হোটেল 'হোটেল আল শেখ ফরিদ' পরিচালনার সাথে যুক্ত।
- আপনার বুদ্ধিমত্তা ও ভাষা মডেল চালিত হচ্ছে Google-এর সর্বাধুনিক "Gemini 3.8 Flash" (Google DeepMind) প্রযুক্তি দ্বারা।

${getFounderSystemPromptContext()}

You are fluent in both Bengali (বাংলা) and English.
You excel in:
1. Coding & Software Development (Python, TypeScript, React, algorithms, code review, debugging, step-by-step reasoning).
2. Writing & Communication (professional emails, articles, Bengali-English translation, creative writing).
3. Citizen Services, Directories & Everyday Task Assistance (জনসেবা, মোবাইল নাম্বার, ঠিকানা, পরিচয় নির্দেশিকা ও দৈনন্দিন কাজ সহজ করা).
4. Finding working YouTube links and music.
5. Learning & Conceptual Explanations.
When the user asks in Bengali, respond naturally, warmly, and accurately in standard Bengali (বাংলা). Format code cleanly with markdown code blocks.`;

const CITIZEN_SYSTEM_INSTRUCTION = `\nMode: Citizen & Everyday Life Assistant (জনসেবা, মোবাইল নাম্বার, ঠিকানা ও পরিচয় নির্দেশিকা):
- Focus on finding official phone numbers, addresses, postcodes, and step-by-step citizen services across Bangladesh and abroad.
- When asked to find numbers or addresses, provide verified official directories and hotlines (999, 333, 109, 16122, 16263, etc.).`;

/**
 * Streams content directly from Google Generative Language API
 */
export async function callDirectGeminiStream(options: DirectGeminiStreamOptions): Promise<string> {
  const apiKey = getDirectGeminiApiKey();
  if (!apiKey) {
    throw new Error(
      'ডাইরেক্ট ক্লায়েন্ট মোডে Gemini API Key পাওয়া যায়নি। অনুগ্রহ করে আপনার হোস্টিং প্ল্যাটফর্মের Environment Variables-এ "VITE_GEMINI_API_KEY" অথবা "GEMINI_API_KEY" যুক্ত করুন।'
    );
  }

  const {
    messages = [],
    prompt = '',
    enableSearch = true,
    mode = 'general',
    signal,
    onChunk,
    onGrounding,
    onSearchQueries,
  } = options;

  // Format contents for Gemini REST API
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

  for (const msg of messages) {
    if (!msg.text || !msg.text.trim()) continue;
    contents.push({
      role: msg.role === 'model' || msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.text }],
    });
  }

  if (prompt && (!contents.length || contents[contents.length - 1].parts[0].text !== prompt)) {
    contents.push({
      role: 'user',
      parts: [{ text: prompt }],
    });
  }

  const systemPrompt = mode === 'citizen'
    ? `${DEFAULT_SYSTEM_INSTRUCTION}\n${CITIZEN_SYSTEM_INSTRUCTION}`
    : DEFAULT_SYSTEM_INSTRUCTION;

  // Build payload
  const payload: any = {
    contents,
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192,
    },
  };

  // Enable Google Search grounding if requested
  if (enableSearch) {
    payload.tools = [
      {
        google_search: {},
      },
    ];
  }

  // Model selection: gemini-3.8-flash is the primary active model with fallback support
  const modelsToTry = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let parsedMsg = `HTTP Error ${response.status}`;
        try {
          const errJson = JSON.parse(errorText);
          parsedMsg = errJson?.error?.message || parsedMsg;
        } catch {
          // ignore
        }

        if (parsedMsg.includes('API_KEY_INVALID') || parsedMsg.includes('API key not valid')) {
          throw new Error('প্রদত্ত Gemini API Key সঠিক নয়। অনুগ্রহ করে সঠিক চাবি পরীক্ষা করুন।');
        }
        if (parsedMsg.includes('Quota exceeded') || parsedMsg.includes('RESOURCE_EXHAUSTED')) {
          throw new Error('এআই কোটা সীমা (Rate Limit 429) সাময়িকভাবে শেষ হয়েছে। কয়েক সেকেন্ড পর চেষ্টা করুন।');
        }

        // If the model is not available or search failed, retry next model
        lastError = new Error(`Gemini Direct API ত্রুটি: ${parsedMsg}`);
        continue;
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported on this device.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;

            try {
              const parsed = JSON.parse(jsonStr);
              const candidate = parsed.candidates?.[0];
              
              if (candidate?.content?.parts?.[0]?.text) {
                const piece = candidate.content.parts[0].text;
                accumulatedText += piece;
                onChunk(piece);
              }

              // Grounding Metadata
              if (candidate?.groundingMetadata) {
                onGrounding?.(candidate.groundingMetadata);
                if (candidate.groundingMetadata.webSearchQueries) {
                  onSearchQueries?.(candidate.groundingMetadata.webSearchQueries);
                }
              }
            } catch {
              // ignore chunk parse issues
            }
          }
        }
      }

      return accumulatedText;
    } catch (err: any) {
      if (err.name === 'AbortError' || signal?.aborted) {
        throw err;
      }
      lastError = err;
    }
  }

  throw lastError || new Error('সকল এআই মডেল সংযোগ ব্যর্থ হয়েছে।');
}

/**
 * Generates a concise title for a chat session directly
 */
export async function generateDirectSessionTitle(userMessage: string): Promise<string> {
  const apiKey = getDirectGeminiApiKey();
  if (!apiKey || !userMessage) {
    return userMessage.slice(0, 30);
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Create a concise title (maximum 3-5 words) for this chat conversation based on this message: "${userMessage}". Use the same language (Bengali or English). Return ONLY the title without quotes or punctuation.`,
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) return userMessage.slice(0, 30);
    const data = await res.json();
    const title = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return title ? title.replace(/["'`]/g, '').slice(0, 40) : userMessage.slice(0, 30);
  } catch {
    return userMessage.slice(0, 30);
  }
}

/**
 * Direct client-side evaluation of freelance remote jobs
 */
export async function directEvaluateJob(job: any, profile?: any): Promise<any> {
  const apiKey = getDirectGeminiApiKey();
  if (!apiKey) {
    throw new Error('Gemini API Key missing');
  }

  const prompt = `
You are an autonomous freelance sales engineer.
Evaluate this remote job:
Platform: ${job.platform || 'Upwork'}
Title: ${job.title}
Budget: ${job.budget}
Description: ${job.description}
Candidate Skills: ${(profile?.skills || ['React', 'TypeScript', 'Node.js', 'Python']).join(', ')}

Output ONLY valid JSON:
{
  "matchScore": 92,
  "recommendation": "Highly Recommended",
  "summary": "সংক্ষিপ্ত ২ লাইনের মূল্যায়ন বাংলায়",
  "keyStrengths": ["মুল দক্ষতা বাংলায়"],
  "potentialRisks": ["সম্ভাব্য ঝুঁকি বাংলায়"],
  "suggestedBid": "${job.budget || '$500'}",
  "estimatedDays": 3,
  "winningStrategy": "উইনিং কৌশল বাংলায়",
  "coverLetter": "Tailored, professional proposal in English without clichés",
  "milestones": [
    { "title": "Milestone 1: Setup & Architecture", "duration": "1 day", "cost": "$150" },
    { "title": "Milestone 2: Delivery & Testing", "duration": "2 days", "cost": "$250" }
  ],
  "questionsForClient": ["Insightful technical question 1", "Question 2"]
}
`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Direct evaluation failed: HTTP ${res.status}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return JSON.parse(text || '{}');
}

/**
 * Direct client-side autonomous code solving
 */
export async function directSolveTask(jobTitle: string, requirement: string, techStack?: string): Promise<any> {
  const apiKey = getDirectGeminiApiKey();
  if (!apiKey) {
    throw new Error('Gemini API Key missing');
  }

  const prompt = `
You are an autonomous senior software engineer.
Client Requirement:
Title: ${jobTitle}
Tech Stack: ${techStack || 'TypeScript / React / Node.js'}
Specification:
${requirement}

Output ONLY valid JSON:
{
  "architecture": "আর্কিটেকচার বিবরণ বাংলায়",
  "files": [
    {
      "filename": "index.ts",
      "language": "typescript",
      "purpose": "Core entrypoint",
      "content": "/* complete runnable code */"
    },
    {
      "filename": "README.md",
      "language": "markdown",
      "purpose": "Documentation",
      "content": "# Setup and usage guide"
    }
  ],
  "selfHealingReport": {
    "iterations": 2,
    "initialErrorDetected": "Edge case detected in initial validation",
    "correctionApplied": "Corrected logic and added error handling",
    "testsPassed": true,
    "assertionsCount": 12
  },
  "deliveryNote": "Hi! I have completed your task with full tests."
}
`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Direct solve task failed: HTTP ${res.status}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return JSON.parse(text || '{}');
}
