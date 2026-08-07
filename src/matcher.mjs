const STOP = new Set(("a an and are be but for from get got has have i if in is it its just like me my of on or our ours so that the their them then there they this to us was we well what will with you your yours").split(" "));
const WORDNUM = { one: 1, two: 2, three: 3, four: 4, five: 5, first: 1, second: 2, third: 3, fourth: 4, fifth: 5, a: 1, b: 2, c: 3, d: 4, e: 5, alpha: 1, bravo: 2, charlie: 3, delta: 4, echo: 5 };
const CANON = { loneliness: "lonely", parties: "party", drugs: "drug", eating: "eat", unhealthy: "bad", invite: "party", invitation: "party" };

export const norm = (value) => String(value ?? "").toLowerCase().replace(/[^a-z0-9\s']/g, " ").replace(/\s+/g, " ").trim();

function explicitIndex(heard) {
  const value = norm(heard);
  if (value === "option") return 0;
  const token = "(\\d+|one|two|three|four|five|first|second|third|fourth|fifth|a|b|c|d|e|alpha|bravo|charlie|delta|echo)";
  let match = value.match(new RegExp("\\b(?:option|number|choice|answer|pick|letter)\\s+" + token + "\\b"));
  if (!match) match = value.match(new RegExp("^(?:the\\s+)?" + token + "(?:\\s+one)?$"));
  if (!match) return -1;
  const selected = /^\d+$/.test(match[1]) ? Number(match[1]) : WORDNUM[match[1]];
  return selected ? selected - 1 : -1;
}

function tokens(value) {
  return norm(value).replace(/\bunproductive\b/g, "not productive").split(" ")
    .filter((word) => (word.length > 2 || word === "no") && !STOP.has(word))
    .map((word) => CANON[word] || word);
}

function scoreOne(heard, choice) {
  const heardTokens = new Set(tokens(heard));
  const choiceTokens = tokens(choice);
  if (!choiceTokens.length || !heardTokens.size) return 0;
  const hits = choiceTokens.filter((word) => heardTokens.has(word)).length;
  const recall = hits / choiceTokens.length;
  const precision = hits / heardTokens.size;
  let score = hits >= 2 ? Math.max(recall, 0.7 * precision + 0.3 * recall) : recall;
  const normalizedHeard = norm(heard), normalizedChoice = norm(choice);
  if (normalizedHeard.length >= 10 && (normalizedChoice.includes(normalizedHeard) || normalizedHeard.includes(normalizedChoice))) score = Math.max(score, 0.95);
  return score;
}

export function matchChoices(alternatives, choices) {
  const heardValues = Array.isArray(alternatives) ? alternatives : [alternatives];
  let best = { index: -1, score: 0, second: 0, via: "none" };
  for (const heard of heardValues) {
    const explicit = explicitIndex(heard);
    if (explicit >= 0 && explicit < choices.length) return { index: explicit, score: 1, margin: 1, via: "ordinal", confident: true };
    const ranked = choices.map((choice, index) => {
      const phrases = typeof choice === "string"
        ? [choice]
        : [choice.label ?? choice.text, ...(Array.isArray(choice.aliases) ? choice.aliases : [])].filter(Boolean);
      return { index, score: Math.max(0, ...phrases.map((phrase) => scoreOne(heard, phrase))) };
    }).sort((a, b) => b.score - a.score);
    if (ranked[0] && ranked[0].score > best.score) best = { index: ranked[0].index, score: ranked[0].score, second: ranked[1]?.score || 0, via: "semantic" };
  }
  const margin = Math.round((best.score - best.second) * 100) / 100;
  return { index: best.index, score: Math.round(best.score * 100) / 100, margin, via: best.via, confident: best.score >= 0.5 && margin >= 0.15 };
}
