/**
 * Word filter for public content (App Store guideline 1.2: "a method for
 * filtering objectionable material from being posted"). Applied when a
 * profile, listing or Crash & Cash post is saved. Private messages are
 * deliberately not filtered: reports and blocks cover them, and keyword
 * filtering a negotiation between two students would mostly catch false
 * positives.
 *
 * Whole words only, after lowercasing, stripping accents and undoing common
 * character swaps ($h1t), so "class", "Scunthorpe" and "fire retardant" pass.
 * Words with an innocent everyday meaning or that are also surnames (Dick,
 * Coon) are left out on purpose, or people couldn't save their own names:
 * reports catch those in context.
 */

/** Exact words. */
const BLOCKED_WORDS = new Set([
  // Slurs
  "nigger", "niggers", "nigga", "niggas", "niggaz", "faggot", "faggots", "fag", "fags", "dyke", "dykes",
  "tranny", "trannies", "retard", "retards", "retarded", "chink", "chinks", "gook", "gooks", "spic", "spics",
  "kike", "kikes", "wetback", "wetbacks", "beaner", "beaners", "raghead", "ragheads",
  "towelhead", "towelheads", "paki", "pakis", "slut", "sluts", "whore", "whores",
  // Strong profanity
  "cunt", "cunts", "bitch", "bitches", "asshole", "assholes", "bastard", "bastards",
  // Sexual content and solicitation
  "porn", "porno", "pornhub", "nudes", "onlyfans", "blowjob", "blowjobs", "handjob", "cumshot",
  // Self-harm encouragement
  "kys",
]);

/** Word stems: any word starting with one of these, unless it's listed as fine. */
const BLOCKED_STEMS = ["fuck", "motherfuck", "shit"];
const FINE_WORDS = new Set(["shitake", "shiitake"]);

/** Multi-word phrases, matched on the normalized text. */
const BLOCKED_PHRASES = ["kill yourself", "kill urself", "go die"];

const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "!": "i" };

function normalize(text: string): string {
  return text
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[013457@$!]/g, ch => LEET[ch] ?? ch);
}

/** True if `text` contains a blocked word or phrase. */
export function isObjectionable(text: string): boolean {
  const norm = normalize(text);
  const words = norm.split(/[^a-z]+/).filter(Boolean);
  for (const w of words) {
    if (BLOCKED_WORDS.has(w)) return true;
    if (!FINE_WORDS.has(w) && BLOCKED_STEMS.some(stem => w.startsWith(stem))) return true;
  }
  const spaced = ` ${words.join(" ")} `;
  return BLOCKED_PHRASES.some(p => spaced.includes(` ${p} `));
}

/** Every string inside a value (strings, arrays, plain objects). */
function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}

/**
 * The first field (by its user-facing label) whose text is objectionable,
 * or null. `fields` maps labels to values: { bio: "...", "listing description": "..." }.
 */
export function objectionableField(fields: Record<string, unknown>): string | null {
  for (const [label, value] of Object.entries(fields)) {
    if (strings(value).some(isObjectionable)) return label;
  }
  return null;
}

/** The 400 body for a refused save. Names the field, never the word. */
export function filteredError(label: string) {
  return {
    error: `Your ${label} has language that isn't allowed on PopMatch. Please change it and try again.`,
    code: "content_filtered",
    field: label,
  };
}
