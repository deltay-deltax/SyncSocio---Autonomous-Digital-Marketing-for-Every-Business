"""
DM Flow Intelligence Agent
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Analyses each AI-generated post and decides whether a DM automation
flow should be created for it. If yes, generates a full flow structure
compatible with the DMFlow Mongoose schema plus a CTA to inject into
the post caption.
"""

import os
import json
import re
import uuid
from typing import Dict, Any, Optional
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage
from dotenv import load_dotenv

load_dotenv()

# ── Helpers ──────────────────────────────────────────────────────────────────
def _uid() -> str:
    return uuid.uuid4().hex[:7]

def _llm():
    return ChatGoogleGenerativeAI(
        model="gemini-flash-lite-latest",
        google_api_key=os.getenv("GOOGLE_API_KEY"),
    )

# ── Post-type heuristic (fast pre-filter before calling the LLM) ──────────
_DM_WORTHY_SIGNALS = {
    "product",
    "showcase",
    "offer",
    "launch",
    "price",
    "deal",
    "sale",
    "discount",
    "testimonial",
    "review",
    "educational",
    "tutorial",
    "guide",
    "tips",
    "link",
    "access",
    "download",
    "free",
    "exclusive",
    "giveaway",
    "new",
    "announce",
    "release",
    "order",
    "buy",
    "shop",
}

_NON_DM_SIGNALS = {
    "behind the scenes",
    "bts",
    "festival",
    "greeting",
    "motivation",
    "brand awareness",
    "awareness",
    "meme",
    "weekend",
    "inspiration",
}


def _quick_heuristic(topic: str, hook: str) -> Optional[bool]:
    """
    Fast keyword-based pre-filter.
    Returns True / False if confident, None if unsure (defer to LLM).
    """
    combined = f"{topic} {hook}".lower()

    # Strong negative signals
    for signal in _NON_DM_SIGNALS:
        if signal in combined:
            return False

    # Strong positive signals
    hit_count = sum(1 for s in _DM_WORTHY_SIGNALS if s in combined)
    if hit_count >= 2:
        return True

    return None  # Unsure — let the LLM decide


# ── Core Agent ───────────────────────────────────────────────────────────────
def analyze_post_for_dm_flow(
    post: Dict[str, Any],
    brand_info: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Analyses a single generated post and returns a DM flow decision.

    Returns
    -------
    {
        "needsDMFlow": bool,
        "reason": str,
        "flow": { ... } | None,      # Full DMFlow-compatible object
        "captionCTA": str | ""        # CTA text to append to the caption
    }
    """
    topic = post.get("topic", post.get("title", ""))
    hook = post.get("content_hook", post.get("contentHook", ""))
    fmt = post.get("format", post.get("type", ""))
    why = post.get("why", "")
    brand_name = brand_info.get("brandName", "Brand")
    brand_usp = brand_info.get("usp", "")
    brand_category = (brand_info.get("otherCategory") if brand_info.get("businessCategory") == "Other" and brand_info.get("otherCategory") else brand_info.get("businessCategory", "General"))

    # ── Quick heuristic check ────────────────────────────────────────────
    heuristic = _quick_heuristic(topic, hook)
    if heuristic is False:
        print(f"[DM-AGENT] ⏭  Skipping '{topic}' (heuristic: no DM needed)")
        return {
            "needsDMFlow": False,
            "reason": "Post type is engagement/awareness-focused — no direct CTA needed.",
            "flow": None,
            "captionCTA": "",
        }

    # ── LLM Decision ─────────────────────────────────────────────────────
    prompt = f"""
You are the DM Automation Strategist for SyncSocio AI.
Analyse the following Instagram post and decide if a DM automation flow should be created.

POST DATA:
- Topic: {topic}
- Caption/Hook: {hook}
- Format: {fmt}
- Strategic Reason: {why}

BRAND CONTEXT:
- Brand Name: {brand_name}
- Category: {brand_category}
- USP: {brand_usp}

DECISION CRITERIA:
Ask yourself: "After seeing this post, would the viewer actively WANT something
delivered to their DMs — a price, a link, a checklist, a booking form?"

Posts that NEED DM automation (viewer expects a deliverable):
  ✅ Product showcases — viewer wants price or purchase link
  ✅ New launches / restocks — viewer wants early access or shop link
  ✅ Service demos / before-after results — viewer wants to book or get a quote
  ✅ Educational content WITH a downloadable (checklist, template, PDF) — viewer wants the resource
  ✅ Testimonials paired with a product — viewer wants the same product
  ✅ Limited-time offers / deals — viewer wants the coupon or link
  ✅ Comparison / review posts — viewer wants the full breakdown

Posts that DO NOT need DM automation (no deliverable exists):
  ❌ Behind-the-scenes / day-in-the-life — pure awareness, no deliverable
  ❌ Festival greetings / seasonal wishes — no deliverable
  ❌ Motivational quotes / mindset content — no deliverable
  ❌ Brand story / milestone / team posts — no deliverable
  ❌ Memes / trending audio / relatable content — no deliverable
  ❌ General tips WITHOUT a resource to send (e.g. "5 skincare tips" with no PDF = NO)
  ❌ Engagement-bait / polls / questions — no deliverable
  ❌ UGC reposts / community shoutouts — no deliverable
  ❌ Weekend vibes / mood / good morning posts — no deliverable

YOUR TASK:
1. Decide: Does this post need DM automation? (true/false)
2. If YES:
   a) Choose the BEST single trigger keyword (e.g., "PRICE", "LINK", "INFO", "ACCESS", "DETAILS", "FREE", "GUIDE"). 
      Pick one that feels natural for users to comment.
   b) Generate 3 DM messages:
      - Message 1 (Hook): A warm, engaging greeting that builds excitement. Include 1 "next" button.
      - Message 2 (if_not_following gate): A friendly nudge to follow. Include "Visit Profile" + "I'm following" buttons.
      - Message 3 (if_following delivery): The actual resource delivery. Use "{{{{asset_url}}}}" as placeholder for the user's link.
        Include 1 "url" button pointing to "{{{{asset_url}}}}".
   c) Generate a short CTA text (1 line) to append to the post caption, e.g.: '💬 Comment "PRICE" to get instant access via DM!'
   d) Generate a flow name using an emoji + the product/topic name.

RETURN ONLY VALID JSON:
{{
  "needsDMFlow": true/false,
  "reason": "...",
  "triggerKeyword": "KEYWORD",
  "flowName": "emoji + name",
  "hookMessage": "message 1 text",
  "hookButtonLabel": "button label",
  "gateMessage": "message 2 text (if not following)",
  "deliveryMessage": "message 3 text (if following, include {{{{asset_url}}}})",
  "captionCTA": "the CTA line to append to caption"
}}

If needsDMFlow is false, just return:
{{
  "needsDMFlow": false,
  "reason": "..."
}}
"""

    try:
        llm = _llm()
        response = llm.invoke([
            SystemMessage(content="You are a JSON-only DM automation strategist. Return ONLY valid JSON."),
            HumanMessage(content=prompt),
        ])

        content = response.content
        if isinstance(content, list):
            content = "".join(
                part.get("text", "") if isinstance(part, dict) else str(part)
                for part in content
            )

        # Extract JSON
        json_match = re.search(r"\{.*\}", content, re.DOTALL)
        if json_match:
            decision = json.loads(json_match.group())
        else:
            decision = json.loads(content)

        if not decision.get("needsDMFlow"):
            print(f"[DM-AGENT] ⏭  '{topic}' → No DM flow (LLM: {decision.get('reason', 'N/A')})")
            return {
                "needsDMFlow": False,
                "reason": decision.get("reason", "LLM decided no DM flow needed."),
                "flow": None,
                "captionCTA": "",
            }

        # ── Build full DMFlow-compatible object ──────────────────────────
        keyword = decision.get("triggerKeyword", "LINK").upper()
        flow_name = decision.get("flowName", f"🎁 {topic} Flow")

        flow = {
            "name": flow_name,
            "trigger": "comment",
            "targetType": "all",
            "keyword": keyword,
            "commentReplyMessage": "{{username}} Check your DM 📩",
            "messages": [
                # Message 1: Hook
                {
                    "id": _uid(),
                    "text": decision.get(
                        "hookMessage",
                        f"Hey! Thanks for your interest! 🙌\nTap below and I'll send you everything you need ✨",
                    ),
                    "buttons": [
                        {
                            "id": _uid(),
                            "label": decision.get("hookButtonLabel", "Send me the details"),
                            "type": "next",
                        }
                    ],
                    "conditional": None,
                },
                # Message 2: Follow gate
                {
                    "id": _uid(),
                    "text": decision.get(
                        "gateMessage",
                        "Oops! Looks like you haven't followed me yet 👀\nIt would mean a lot if you could visit my profile and hit that follow button 😁.",
                    ),
                    "buttons": [
                        {
                            "id": _uid(),
                            "label": "Visit Profile",
                            "type": "visit_profile",
                            "url": "https://instagram.com/",
                        },
                        {
                            "id": _uid(),
                            "label": "I'm following ✅",
                            "type": "next",
                        },
                    ],
                    "conditional": "if_not_following",
                },
                # Message 3: Delivery
                {
                    "id": _uid(),
                    "text": decision.get(
                        "deliveryMessage",
                        "Here's your exclusive access! 🔗\n\n{{asset_url}}\n\nReply if you have any questions!",
                    ),
                    "buttons": [
                        {
                            "id": _uid(),
                            "label": "Open Link",
                            "type": "url",
                            "url": "{{asset_url}}",
                        }
                    ],
                    "conditional": "if_following",
                },
            ],
            "active": False,  # Draft — user must enable
            "source": "ai_suggested",
        }

        caption_cta = decision.get(
            "captionCTA",
            f'\n\n💬 Comment "{keyword}" to get instant access via DM!',
        )

        print(f"[DM-AGENT] ✅ '{topic}' → DM flow created! Keyword: '{keyword}'")

        return {
            "needsDMFlow": True,
            "reason": decision.get("reason", ""),
            "flow": flow,
            "captionCTA": caption_cta,
        }

    except Exception as e:
        print(f"[DM-AGENT] ❌ Error analyzing '{topic}': {e}")
        return {
            "needsDMFlow": False,
            "reason": f"Agent error: {str(e)}",
            "flow": None,
            "captionCTA": "",
        }


# ── Batch processor ──────────────────────────────────────────────────────────
def process_calendar_for_dm_flows(
    calendar: list,
    brand_info: Dict[str, Any],
) -> list:
    """
    Processes an entire content calendar and enriches each post with
    DM flow decisions. Returns the enriched calendar.
    """
    print(f"\n{'='*60}")
    print(f"🤖 DM FLOW INTELLIGENCE AGENT")
    print(f"   Analysing {len(calendar)} posts for DM automation potential...")
    print(f"{'='*60}\n")

    enriched = []
    dm_count = 0

    for i, post in enumerate(calendar):
        topic = post.get("topic", post.get("title", f"Post {i+1}"))
        print(f"[DM-AGENT] Analysing post {i+1}/{len(calendar)}: '{topic}'")

        result = analyze_post_for_dm_flow(post, brand_info)

        # Enrich the post with DM flow data
        post["dm_flow_decision"] = {
            "needsDMFlow": result["needsDMFlow"],
            "reason": result["reason"],
        }

        if result["needsDMFlow"] and result["flow"]:
            post["dm_flow"] = result["flow"]
            dm_count += 1

            # Inject CTA into caption/hook if not already present
            cta = result.get("captionCTA", "")
            if cta:
                existing_hook = post.get("content_hook", "")
                if existing_hook and cta.strip() not in existing_hook:
                    post["content_hook"] = f"{existing_hook}{cta}"

        enriched.append(post)

    print(f"\n{'='*60}")
    print(f"🤖 DM FLOW AGENT COMPLETE")
    print(f"   {dm_count}/{len(calendar)} posts will have DM automation")
    print(f"{'='*60}\n")

    return enriched
