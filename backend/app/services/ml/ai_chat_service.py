"""
AI Financial Assistant
=======================
- Integrates with Anthropic Claude API
- Context-aware: injects portfolio, watchlist, market data into system prompt
- Understands NSE/BSE stocks, Indian tax (STCG/LTCG), F&O concepts
- Can run analysis, explain charts, suggest strategies
- Multi-turn conversation with session memory
- Structured output for trade ideas (parsed JSON)
- Safety: no direct trade execution, disclaimer enforcement
"""
import json
import httpx
from datetime import datetime
from typing import Dict, List, Optional, Generator
from loguru import logger

CLAUDE_API_URL = "https://api.anthropic.com/v1/messages"
CLAUDE_MODEL   = "claude-sonnet-4-20250514"

SYSTEM_PROMPT = """You are an expert Indian stock market financial analyst assistant for StockPro Ultimate.

You have deep expertise in:
- NSE/BSE listed stocks, indices (NIFTY50, SENSEX, Bank Nifty, etc.)
- Technical analysis (RSI, MACD, Bollinger Bands, Elliott Wave, Wyckoff)
- Fundamental analysis (DCF, EV/EBITDA, P/E, PEG, Altman Z-score)
- Options and derivatives (F&O, Greeks, IV, option strategies)
- Indian taxation (STCG 15%, LTCG 10% above ₹1L, STT, DDT)
- Portfolio risk management (VaR, Sharpe, Sortino, Factor models)
- Macro: RBI policy, inflation (CPI/WPI), FII/DII flows, India VIX
- Sector rotation, market cycles, breadth analysis

Guidelines:
1. Always cite specific data when making claims (P/E, revenue growth %, etc.)
2. Provide both bullish and bearish scenarios
3. Include risk considerations in every recommendation
4. Always end with: "This is for educational purposes only. Not SEBI-registered advice."
5. When asked for trade ideas, return structured JSON in a code block
6. Quantify your confidence: High/Medium/Low
7. Be concise but precise — max 400 words unless a detailed analysis is requested

Trade idea format (use this JSON when suggesting trades):
```json
{
  "symbol": "RELIANCE.NS",
  "action": "BUY",
  "entry_zone": {"low": 2900, "high": 2950},
  "target_1": 3100,
  "target_2": 3300,
  "stop_loss": 2820,
  "time_horizon": "3-6 months",
  "risk_reward": "1:2.8",
  "confidence": "High",
  "thesis": "Breaking out of consolidation on strong volume...",
  "risks": ["Global crude oil price rise", "SEBI probe concerns"]
}
```
"""


class AIChatService:

    def __init__(self):
        self._client_headers = {
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01",
        }

    def _build_context_block(self, context: Dict) -> str:
        """Build market context to inject into the conversation."""
        parts = []

        if context.get("portfolio_summary"):
            p = context["portfolio_summary"]
            parts.append(
                f"USER PORTFOLIO: Value=₹{p.get('total_value','?'):,}, "
                f"P&L=₹{p.get('total_pnl','?'):,} ({p.get('pnl_pct','?')}%), "
                f"Holdings={p.get('num_holdings','?')}"
            )

        if context.get("watchlist"):
            syms = ", ".join(context["watchlist"][:10])
            parts.append(f"WATCHLIST: {syms}")

        if context.get("market_indices"):
            idx = context["market_indices"]
            nifty = idx.get("NIFTY50", {})
            parts.append(
                f"MARKET: NIFTY50={nifty.get('price','?'):,} "
                f"({nifty.get('change_pct','?'):+.2f}%)"
            )

        if context.get("symbol"):
            parts.append(f"CURRENT SYMBOL: {context['symbol']}")

        if context.get("technical"):
            t = context["technical"]
            parts.append(
                f"TECHNICAL [{context.get('symbol','')}]: "
                f"RSI={t.get('rsi','?')}, Score={t.get('score','?')}/100, "
                f"Signal={t.get('overall','?')}"
            )

        return "\n".join(parts) if parts else ""

    def chat(self, messages: List[Dict], context: Dict = None,
             user_tier: str = "free") -> Dict:
        """Send messages to Claude and return response."""
        ctx_block  = self._build_context_block(context or {})
        system_msg = SYSTEM_PROMPT
        if ctx_block:
            system_msg += f"\n\nCURRENT CONTEXT:\n{ctx_block}"

        max_tokens = {"free": 512, "pro": 1500, "enterprise": 4096}.get(user_tier, 512)

        payload = {
            "model":      CLAUDE_MODEL,
            "max_tokens": max_tokens,
            "system":     system_msg,
            "messages":   messages[-20:],   # last 20 messages for context
        }

        try:
            with httpx.Client(timeout=30) as client:
                resp = client.post(CLAUDE_API_URL, json=payload,
                                   headers=self._client_headers)
                resp.raise_for_status()
                data    = resp.json()
                content = data["content"][0]["text"]

                # Parse trade ideas if present
                trade_ideas = self._extract_trade_ideas(content)

                return {
                    "content":     content,
                    "trade_ideas": trade_ideas,
                    "model":       data.get("model"),
                    "usage":       data.get("usage", {}),
                    "stop_reason": data.get("stop_reason"),
                }
        except httpx.HTTPStatusError as e:
            logger.error(f"Claude API error: {e.response.text}")
            return {"error": str(e), "content": "I'm temporarily unavailable. Please try again."}
        except Exception as e:
            logger.error(f"Chat error: {e}")
            return {"error": str(e), "content": "An error occurred processing your request."}

    def stream_chat(self, messages: List[Dict], context: Dict = None) -> Generator:
        """Stream response tokens for real-time display."""
        ctx_block  = self._build_context_block(context or {})
        system_msg = SYSTEM_PROMPT + (f"\n\nCONTEXT:\n{ctx_block}" if ctx_block else "")

        payload = {
            "model":      CLAUDE_MODEL,
            "max_tokens": 2048,
            "stream":     True,
            "system":     system_msg,
            "messages":   messages[-20:],
        }

        try:
            with httpx.Client(timeout=60) as client:
                with client.stream("POST", CLAUDE_API_URL, json=payload,
                                   headers=self._client_headers) as resp:
                    for line in resp.iter_lines():
                        if line.startswith("data: "):
                            data = line[6:]
                            if data == "[DONE]":
                                break
                            try:
                                event = json.loads(data)
                                if event.get("type") == "content_block_delta":
                                    delta = event.get("delta", {})
                                    if delta.get("type") == "text_delta":
                                        yield delta.get("text", "")
                            except json.JSONDecodeError:
                                continue
        except Exception as e:
            logger.error(f"Stream error: {e}")
            yield f"\n[Error: {e}]"

    def _extract_trade_ideas(self, content: str) -> List[Dict]:
        """Parse structured trade ideas from response."""
        import re
        ideas = []
        pattern = r"```json\s*(.*?)\s*```"
        matches = re.findall(pattern, content, re.DOTALL)
        for m in matches:
            try:
                obj = json.loads(m)
                if isinstance(obj, dict) and "symbol" in obj and "action" in obj:
                    ideas.append(obj)
            except:
                continue
        return ideas

    def suggest_screener_params(self, query: str) -> Optional[Dict]:
        """Convert natural language to screener parameters."""
        messages = [{
            "role": "user",
            "content": f"""Convert this to screener JSON params:
"{query}"

Return ONLY valid JSON like:
{{"min_pe": 5, "max_pe": 20, "min_roe": 15, "sector": "IT", "preset": "value"}}
Valid keys: min_pe, max_pe, min_rsi, max_rsi, min_roe, min_revenue_growth, sector, preset
preset options: hidden_gems, breakouts, value, momentum
If a field is not mentioned, omit it."""
        }]

        resp = self.chat(messages)
        content = resp.get("content", "")
        try:
            import re
            match = re.search(r'\{.*?\}', content, re.DOTALL)
            if match:
                return json.loads(match.group())
        except:
            pass
        return None

    def explain_indicator(self, indicator: str, value: float, symbol: str) -> str:
        """Explain what an indicator value means in context."""
        messages = [{
            "role": "user",
            "content": f"Briefly explain what {indicator}={value:.2f} means for {symbol} in 2-3 sentences."
        }]
        resp = self.chat(messages)
        return resp.get("content", "")


ai_chat_service = AIChatService()
