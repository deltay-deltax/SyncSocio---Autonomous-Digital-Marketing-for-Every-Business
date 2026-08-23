import OpenAI from 'openai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import SiteKnowledgeLead from '../models/SiteKnowledgeLead.js';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the comprehensive support KB at startup
let SUPPORT_KB = '';
try {
  const kbPath = path.join(__dirname, '..', 'data', 'syncsocio_support_kb.md');
  SUPPORT_KB = fs.readFileSync(kbPath, 'utf-8');
  console.log('[SiteChatbot] Loaded support KB:', kbPath);
} catch (err) {
  console.warn('[SiteChatbot] Could not load support KB file:', err.message);
}

const baseSystemPrompt = `You are Nexa, SyncSocio's AI assistant. You help visitors understand what SyncSocio does, answer their questions, and encourage them to sign up.

# About SyncSocio
SyncSocio is an AI-powered social media automation platform. 
Tagline: "Your brand, posting itself. Every single day."
Core value: Drop your URL, and watch your brand come to life in minutes. We automate content creation (images, carousels, festival posts, reels) and customer interaction (DM Automation, Nexa AI Sales Agent).

# Current Offer
We offer "7 Free Creatives" (35 credits) to anyone who signs up right now.

# Pricing Plans
1. Starter: 399 INR / $5 per month
- 80 credits / month (16 AI images)
- SD quality image exports
- Ecomm listing generator & Photoshoot mode
- 1 brand profile, 50 products catalog, schedule up to 30 posts

2. Growth (Most Popular): 1499 INR / $19 per month
- 400 credits / month (80 AI images)
- All content formats unlocked (including Video & Reels)
- Clone Mode & Sprint (bulk gen)
- DM Automation (IG + WA)
- Nexa AI Sales Agent (Razorpay + UPI payments)
- 500 Email sends/month

3. Pro: 3499 INR / $45 per month
- 1,000 credits / month (125 HD images)
- HD quality exports
- 500 products catalog, unlimited scheduling
- Nexa: Unlimited conversations & COD payments

# Guidelines
- You MUST ONLY answer questions related to SyncSocio, social media marketing, our pricing, or our features.
- If the user asks an irrelevant question (e.g., about exams, general knowledge, coding, writing essays, etc.), politely refuse by saying something like: "Sorry, I can only help you with information about SyncSocio and our services!"
- Be concise, friendly, and professional.
- Do not make up features or prices that are not listed here.
- If asked a complex technical question, payment issue, or something you don't know, include the exact phrase "[ESCALATE]" in your response, and assure the user that a human support agent will look into it.
- Keep responses short, ideally 1-3 sentences unless explaining a plan in detail.
`;

export const handleChat = async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!process.env.OPENAI_API_KEY) {
      console.warn('[SiteChatbot] OPENAI_API_KEY is missing');
      return res.status(503).json({ error: 'Chat service is temporarily unavailable.' });
    }

    // Load custom knowledge base answers from admin
    const answeredLeads = await SiteKnowledgeLead.find({ status: 'answered' });
    let dynamicKnowledge = '';
    if (answeredLeads.length > 0) {
      dynamicKnowledge = '\n# Additional Knowledge Base\n' + answeredLeads.map(lead => `Q: ${lead.question}\nA: ${lead.answer}`).join('\n\n');
    }

    const fullSystemPrompt = baseSystemPrompt + dynamicKnowledge;

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const messages = [
      { role: 'system', content: fullSystemPrompt },
      ...(history || []).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      { role: 'system', content: 'CRITICAL RULE: If the user asks about our company (SyncSocio), our location, team, services, or anything related to our business, YOU MUST TRY TO ANSWER IT. If you do not know the answer to a company-related question, you MUST include the exact phrase "support@syncsocio.com" in your reply so our team can follow up. ONLY if the message is completely irrelevant (e.g. math, cooking, coding help, general knowledge) should you refuse by saying exactly: "Sorry, I can only help you with information about SyncSocio and our services!"' },
      { role: 'user', content: message }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.7,
      max_tokens: 300,
    });

    const replyText = response.choices[0].message.content;

    // Capture the lead if the bot didn't know the answer and deferred to support
    if (replyText.includes('support@syncsocio.com')) {
      await SiteKnowledgeLead.findOneAndUpdate(
        { question: message },
        { $setOnInsert: { question: message, status: 'pending' } },
        { upsert: true, new: true }
      );
    }

    res.json({
      reply: replyText,
    });
  } catch (error) {
    console.error('Site Chatbot Error:', error);
    res.status(500).json({ error: 'An error occurred while processing your request.' });
  }
};

export const handleDashboardChat = async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!process.env.OPENAI_API_KEY) {
      console.warn('[DashboardChatbot] OPENAI_API_KEY is missing');
      return res.status(503).json({ error: 'Chat service is temporarily unavailable.' });
    }

    const dashboardSystemPrompt = `You are Nexa, SyncSocio's in-dashboard AI support agent. You help existing SyncSocio users understand how to use the platform, troubleshoot issues, and get the most out of their subscription.

Your role:
- Answer questions about SyncSocio features using the Knowledge Base below.
- Troubleshoot common problems with clear, actionable steps.
- If the issue involves payments, account restrictions, or is not covered in the KB, include the exact phrase "[ESCALATE]" in your response and tell the user you are raising a support ticket for them.
- Be warm, concise and helpful. Keep answers to 2-4 sentences unless explaining a multi-step workflow.
- NEVER make up features or prices not listed in the KB.
- Do NOT answer questions unrelated to SyncSocio.

${SUPPORT_KB}`;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const messages = [
      { role: 'system', content: dashboardSystemPrompt },
      ...(history || []).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.5,
      max_tokens: 400,
    });

    const replyText = response.choices[0].message.content;

    res.json({ reply: replyText });
  } catch (error) {
    console.error('Dashboard Chatbot Error:', error);
    res.status(500).json({ error: 'An error occurred while processing your request.' });
  }
};
