export const SHORT_TERM_CONTEXT_MESSAGES = 12;
export const SUMMARY_REFRESH_INTERVAL = 8;

export type ChatRole = 'system' | 'user' | 'assistant';

export type PersistedMessage = {
  id: string;
  role: ChatRole;
  content: string;
  created_at: string;
  token_count: number;
};

export function estimateTokens(text: string) {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function buildFallbackSummary(recentMessages: Array<{ role: ChatRole; content: string }>) {
  const summary = recentMessages
    .slice(-6)
    .map((message) => `${message.role}: ${message.content}`)
    .join(' | ')
    .slice(0, 1500);

  return summary || 'No summary yet.';
}
