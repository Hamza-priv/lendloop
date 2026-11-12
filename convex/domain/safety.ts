// Safety layer for the AI assistant. Messages about suicide, self-harm or
// harming someone get a fixed, human-written reply with real help, before any
// AI model sees them. The model's instructions cover the same ground for
// subtler wording this check can't catch.

const SELF_HARM = [
  /\bkill(ing)?\s+my\s?self\b/i,
  /\bsuicid/i,
  /\bend(ing)?\s+(my\s+life|it\s+all)\b/i,
  /\btake\s+my\s+(own\s+)?life\b/i,
  /\b(want|wanna|going)\s+(to\s+)?die\b/i,
  /\bself[-\s]?harm/i,
  /\b(hurt|harm|cut)(ting)?\s+my\s?self\b/i,
  /\bno\s+reason\s+to\s+live\b/i,
  /\bbetter\s+off\s+dead\b/i,
  /\bdon'?t\s+want\s+to\s+(live|be\s+alive|wake\s+up)\b/i,
  /\boverdose\b/i,
  /\bhang(ing)?\s+my\s?self\b/i,
  /\b(jump|jumping)\s+(off|in front of)\b/i,
  /\bslit\s+my\s+(wrists?|throat)\b/i,
  /\b(pills|tablets)\s+to\s+(die|end\s+it|sleep\s+forever)\b/i,
  /\bdon'?t\s+want\s+to\s+be\s+here\b/i,
  /\b(want|need)\s+(it\s+all\s+|everything\s+)?to\s+(stop|end)\s+(for\s?ever|for\s+good|permanently)\b/i,
  /\bno\s+point\s+(in\s+)?(living|being\s+alive)\b/i,
];

const HARM_OTHERS = [/\b(kill|hurt|attack|stab|shoot)\s+(him|her|them|someone|somebody|my\s+\w+|people|my\s?neighbou?r)\b/i];

export type SafetyFlag = "self_harm" | "harm_others";

export function detectCrisis(text: string): SafetyFlag | null {
  if (SELF_HARM.some((r) => r.test(text))) return "self_harm";
  if (HARM_OTHERS.some((r) => r.test(text))) return "harm_others";
  return null;
}

export const CRISIS_REPLY: Record<SafetyFlag, string> = {
  self_harm: `I'm really sorry you're feeling this way. You don't have to go through it alone, and talking to someone can help right now.

- If you might act on these thoughts or you're in danger, call your local emergency number now (for example 999 in the UK, 911 in the US, 112 in the EU, or 1122 in Pakistan).
- To talk to someone today, free and confidential: in the US call or text **988**; in the UK and Ireland call Samaritans on **116 123**. For other countries, **findahelpline.com** lists free helplines near you.
- If you can, tell someone you trust nearby how you're feeling, or stay with them.

I'm only a tool-lending assistant, so I can't give the support you deserve, but the people at those numbers can.`,
  harm_others: `It sounds like things are really intense right now. If anyone is in immediate danger, please call your local emergency number now (for example 999 in the UK, 911 in the US, 112 in the EU, or 1122 in Pakistan).

If you're feeling overwhelmed or angry and want to talk it through, **findahelpline.com** lists free, confidential helplines in your country.

I'm only a tool-lending assistant, so I can't help with this, but those services can.`,
};
