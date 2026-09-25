import { CARD_TYPE_META } from "@/lib/card-types";
import type { CardWithDetails } from "@/lib/cards";

export type CardMatch = {
  card: CardWithDetails;
  score: number;
  matchedField?: { key: string; value: string };
};

// Lowercase and strip diacritics so "Aadhár" finds "aadhar".
function norm(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// Score one token against one string: exact > prefix > word-start > substring.
function scoreText(text: string, token: string): number {
  if (!text) return 0;
  if (text === token) return 100;
  if (text.startsWith(token)) return 80;
  if (text.includes(` ${token}`)) return 60;
  if (text.includes(token)) return 40;
  return 0;
}

// Runs entirely in memory over the cards already loaded on the client, so
// results appear as you type with no server round trip. Every space-
// separated token must match somewhere on the card (AND). Secret field
// values are never searched — only their keys.
//
// This is deliberately simple; typo-tolerant Fuse + Postgres FTS/trigram
// arrives in phase 3.
export function searchCards(cards: CardWithDetails[], query: string, limit = 20): CardMatch[] {
  const tokens = norm(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];

  const results: CardMatch[] = [];

  for (const card of cards) {
    const title = norm(card.title);
    const aliases = card.aliases.map(norm);
    const tags = card.tags.map(norm);
    const typeLabel = norm(CARD_TYPE_META[card.type].label);
    const notes = norm(card.notes);
    const fieldEntries = card.fields.map((f) => ({
      field: f,
      key: norm(f.key),
      value: f.isSecret ? "" : norm(f.value),
    }));

    let total = 0;
    let matchedField: CardMatch["matchedField"];
    let allMatched = true;

    for (const token of tokens) {
      let best = scoreText(title, token) * 1.5;
      for (const a of aliases) best = Math.max(best, scoreText(a, token) * 1.3);
      for (const t of tags) best = Math.max(best, scoreText(t, token));
      best = Math.max(best, scoreText(typeLabel, token) * 0.8);

      for (const { field, key, value } of fieldEntries) {
        const s = Math.max(scoreText(key, token) * 0.6, scoreText(value, token) * 0.9);
        if (s > best) {
          best = s;
          // Only surface a non-secret value as the "why it matched" hint.
          if (!field.isSecret || scoreText(key, token) > 0) {
            matchedField = { key: field.key, value: field.isSecret ? "••••••" : field.value };
          }
        }
      }

      if (best === 0 && notes.includes(token)) best = 20;
      if (best === 0) {
        allMatched = false;
        break;
      }
      total += best;
    }

    if (allMatched) results.push({ card, score: total, matchedField });
  }

  return results
    .sort((a, b) => b.score - a.score || +b.card.updatedAt - +a.card.updatedAt)
    .slice(0, limit);
}
