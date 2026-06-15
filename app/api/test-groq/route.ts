import { NextResponse } from 'next/server';

export async function GET() {
  const key = process.env.GROQ_API_KEY;
  if (!key) return NextResponse.json({ error: 'No GROQ key' });
  
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: 'Return only this JSON exactly: {"probability":85,"bull":["Spain ranked 1","Yamal best player"],"bear":["Cape Verde defensive"],"keyRisk":"Upset","verdict":"Spain wins"}' }],
        max_tokens: 200,
        temperature: 0.1,
      }),
    });
    const data = await res.json();
    return NextResponse.json({ status: res.status, data });
  } catch(e: any) {
    return NextResponse.json({ error: e.message });
  }
}
