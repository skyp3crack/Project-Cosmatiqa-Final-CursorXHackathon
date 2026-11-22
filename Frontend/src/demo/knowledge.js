/**
 * Domain knowledge for the static demo's analysis engine.
 *
 * In the live app, an AI model reads the ingredient lists and the user's profile and returns conflicts, warnings and
 * recommendations. The demo has no model, so this file holds the rules that stand in for it. The compatibility
 * matrix itself comes from the app's own seed data (seedData.js); everything here maps free-text ingredient names
 * onto it and adds skin-type guidance. It is general cosmetic-chemistry guidance, not medical advice.
 */
import { SEED_CONFLICTS, SEED_INGREDIENTS } from './seedData';

// ─── Name matching ──────────────────────────────────────────────────────────────

/** Lower-case, drop "(...)" notes, concentrations and punctuation: "15% L-Ascorbic Acid" -> "l-ascorbic acid". */
export const normalise = (name) =>
  String(name)
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\d+(\.\d+)?\s*%/g, ' ')
    .replace(/[^a-z0-9\- ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** The concentration written next to an ingredient, if any ("15% L-Ascorbic Acid" -> 15). */
export const concentrationOf = (rawName) => {
  const match = String(rawName).match(/(\d+(?:\.\d+)?)\s*%/);
  return match ? Number(match[1]) : null;
};

const ALIASES = {
  Retinol: ['retinol', 'vitamin a', 'retinal', 'retinaldehyde', 'granactive retinoid', 'hydroxypinacolone retinoate', 'hpr', 'retinoid'],
  'Retinyl Palmitate': ['retinyl palmitate', 'retinyl acetate', 'retinyl propionate'],
  Tretinoin: ['tretinoin', 'retin-a', 'retinoic acid', 'all-trans retinoic acid'],
  'L-Ascorbic Acid': ['l-ascorbic acid', 'l ascorbic acid', 'ascorbic acid', 'vitamin c', 'pure vitamin c'],
  'Magnesium Ascorbyl Phosphate': ['magnesium ascorbyl phosphate', 'map'],
  'Sodium Ascorbyl Phosphate': ['sodium ascorbyl phosphate', 'sap'],
  'Tetrahexyldecyl Ascorbate': ['tetrahexyldecyl ascorbate', 'thd ascorbate', 'ascorbyl tetraisopalmitate'],
  'Glycolic Acid': ['glycolic acid'],
  'Lactic Acid': ['lactic acid'],
  'Mandelic Acid': ['mandelic acid'],
  'Citric Acid': ['citric acid'],
  'Salicylic Acid': ['salicylic acid', 'bha', 'beta hydroxy acid'],
  Niacinamide: ['niacinamide', 'nicotinamide', 'vitamin b3'],
  Niacin: ['niacin'],
  'Copper Peptides': ['copper peptides', 'copper peptide', 'ghk-cu', 'copper tripeptide-1'],
  'Palmitoyl Tripeptide-1': ['palmitoyl tripeptide-1', 'palmitoyl tripeptide 1', 'matrixyl', 'peptides'],
  'Benzoyl Peroxide': ['benzoyl peroxide', 'bpo'],
  'Azelaic Acid': ['azelaic acid'],
  'Hyaluronic Acid': ['hyaluronic acid', 'sodium hyaluronate', 'hydrolyzed hyaluronic acid', 'ha'],
  Ceramides: ['ceramides', 'ceramide', 'ceramide np', 'ceramide ap', 'ceramide eop'],
  'Alpha Arbutin': ['alpha arbutin', 'arbutin'],
  'Kojic Acid': ['kojic acid'],
  'Tranexamic Acid': ['tranexamic acid', 'txa'],
  Adapalene: ['adapalene', 'differin'],
  Tazarotene: ['tazarotene', 'tazorac'],
  Bakuchiol: ['bakuchiol'],
  Resveratrol: ['resveratrol'],
  'Ferulic Acid': ['ferulic acid'],
  'Vitamin E': ['vitamin e', 'tocopherol', 'alpha tocopherol', 'alpha-tocopherol', 'tocopheryl acetate'],
};

// alias -> canonical name, with the longest aliases tried first so "retinyl palmitate" beats "retinyl".
const ALIAS_LIST = Object.entries(ALIASES)
  .flatMap(([canonical, list]) => list.map((alias) => [alias, canonical]))
  .sort((a, b) => b[0].length - a[0].length);

const wordIn = (text, alias) => new RegExp(`(^|[ \\-])${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[ \\-])`).test(text);

/** Match a free-text ingredient name to one of the 29 seeded ingredients, or null. */
export function resolveIngredient(rawName) {
  const text = normalise(rawName);
  if (!text) return null;
  for (const [alias, canonical] of ALIAS_LIST) {
    if (text === alias) return canonical;
  }
  for (const [alias, canonical] of ALIAS_LIST) {
    if (alias.length >= 4 && wordIn(text, alias)) return canonical;
  }
  return null;
}

// ─── Families: how derivatives inherit the rules of their parent ingredient ─────

/** For conflict lookup: the names to try for an ingredient, and how many severity levels to soften by. */
const FAMILIES = {
  'Retinyl Palmitate': [['Retinyl Palmitate', 0], ['Retinol', 1]],
  Adapalene: [['Adapalene', 0], ['Tretinoin', 1]],
  Tazarotene: [['Tazarotene', 0], ['Tretinoin', 0]],
  'Magnesium Ascorbyl Phosphate': [['Magnesium Ascorbyl Phosphate', 0], ['L-Ascorbic Acid', 1]],
  'Sodium Ascorbyl Phosphate': [['Sodium Ascorbyl Phosphate', 0], ['L-Ascorbic Acid', 1]],
  'Tetrahexyldecyl Ascorbate': [['Tetrahexyldecyl Ascorbate', 0], ['L-Ascorbic Acid', 1]],
};

export const basesOf = (canonical) => FAMILIES[canonical] ?? [[canonical, 0]];

export const RETINOIDS = ['Retinol', 'Retinyl Palmitate', 'Tretinoin', 'Adapalene', 'Tazarotene'];
export const VITAMIN_C = ['L-Ascorbic Acid', 'Magnesium Ascorbyl Phosphate', 'Sodium Ascorbyl Phosphate', 'Tetrahexyldecyl Ascorbate'];
export const EXFOLIANTS = ['Glycolic Acid', 'Lactic Acid', 'Mandelic Acid', 'Salicylic Acid'];

// ─── Compatibility matrix ───────────────────────────────────────────────────────

const pairKey = (a, b) => [a, b].sort().join('|');

/** Rules the seed data does not list but that follow from the same chemistry (clearly marked as demo additions). */
const DEMO_EXTENSIONS = [
  {
    ingredientA: 'Benzoyl Peroxide',
    ingredientB: 'L-Ascorbic Acid',
    conflictType: 'Deactivation',
    severity: 'moderate',
    recommendation: 'Use separately: Vitamin C in the morning, Benzoyl Peroxide at night.',
    scientificBasis: 'Benzoyl Peroxide is a strong oxidiser and degrades L-Ascorbic Acid, so the Vitamin C stops working.',
  },
  {
    ingredientA: 'Retinol',
    ingredientB: 'Tretinoin',
    conflictType: 'High Irritation',
    severity: 'severe',
    recommendation: 'Use only one retinoid at a time. Do not layer Retinol on top of Tretinoin.',
    scientificBasis: 'Both act on the same retinoid receptors, so combining them adds irritation without adding benefit.',
  },
  {
    ingredientA: 'Retinol',
    ingredientB: 'Adapalene',
    conflictType: 'High Irritation',
    severity: 'severe',
    recommendation: 'Use only one retinoid at a time. Pick Retinol or Adapalene, not both.',
    scientificBasis: 'Stacking retinoids multiplies dryness, peeling and redness while the benefit plateaus.',
  },
  {
    ingredientA: 'Glycolic Acid',
    ingredientB: 'Lactic Acid',
    conflictType: 'High Irritation',
    severity: 'low',
    recommendation: 'One alpha hydroxy acid is enough. Alternate them on different nights.',
    scientificBasis: 'Two AHAs in one routine over-exfoliate without extra benefit.',
  },
];

const MATRIX = new Map();
for (const rule of [...SEED_CONFLICTS, ...DEMO_EXTENSIONS]) {
  MATRIX.set(pairKey(rule.ingredientA, rule.ingredientB), rule);
}

/** The rule for two canonical ingredients (softened for derivatives), or null. */
export function findRule(canonicalA, canonicalB) {
  let best = null;
  for (const [baseA, softenA] of basesOf(canonicalA)) {
    for (const [baseB, softenB] of basesOf(canonicalB)) {
      if (baseA === baseB) continue;
      const rule = MATRIX.get(pairKey(baseA, baseB));
      if (!rule) continue;
      const soften = Math.max(softenA, softenB);
      if (!best || soften < best.soften) best = { rule, soften };
    }
  }
  return best;
}

export const isSynergy = (rule) => /synergy/i.test(rule.conflictType);

// ─── Vocabulary the UI and the original AI prompt use ───────────────────────────

export const SEVERITY_FROM_SEED = { critical: 'HIGH', severe: 'HIGH', moderate: 'MEDIUM', low: 'LOW' };
const ORDER = ['LOW', 'MEDIUM', 'HIGH'];
export const soften = (severity, steps) => ORDER[Math.max(0, ORDER.indexOf(severity) - steps)];

/** Seed conflict labels -> the identifiers the AI prompt asks for. */
export const CONFLICT_TYPE = {
  'pH Conflict, Stability Risk': 'pH_incompatibility',
  'pH Conflict': 'pH_incompatibility',
  'High Irritation': 'irritation_risk',
  Deactivation: 'chemical_reaction',
  'Stability Risk': 'stability_issue',
};

// ─── Brands (for the brand-name extraction the live app does with its AI model) ───────

export const KNOWN_BRANDS = [
  'The Ordinary', 'Drunk Elephant', "Paula's Choice", 'La Roche-Posay', 'CeraVe', 'Cetaphil', 'Neutrogena', 'COSRX',
  'HADA LABO', 'Hada Labo', 'Innisfree', 'Laneige', 'Skinceuticals', 'SkinCeuticals', 'Sunday Riley', 'Clinique', 'Bioderma',
  'Eucerin', 'Vichy', 'Avene', 'Kiehl\'s', 'Olay', 'Garnier', 'Simple', 'Some By Mi', 'Beauty of Joseon', 'Anua', 'Skin1004',
  'Dr. Jart+', 'Etude', 'Klairs', 'Purito', 'Medicube', 'Naturium', 'Good Molecules', 'Inkey List', 'The Inkey List', 'Byoma',
];

// ─── Skin-type guidance ─────────────────────────────────────────────────────────

const has = (names) => (ing) => names.includes(ing.canonical);
const rawHas = (pattern) => (ing) => pattern.test(ing.raw);

/**
 * Warnings: an ingredient that is a poor fit for a skin type or stated concern.
 * `severity` may depend on the ingredient and the profile.
 */
export const WARNING_RULES = [
  {
    when: has(['Tretinoin', 'Tazarotene']),
    skins: ['sensitive'],
    severity: 'HIGH',
    concern: (ing) => `${ing.canonical} is a prescription-strength retinoid that commonly causes redness, peeling and a damaged barrier on sensitive skin`,
    advice: () => 'Only use under a dermatologist\'s guidance, start two nights a week, and buffer with a plain moisturiser. Bakuchiol is a gentler alternative.',
  },
  {
    when: has(['Retinol', 'Adapalene']),
    skins: ['sensitive'],
    severity: 'MEDIUM',
    concern: (ing) => `${ing.canonical} can strip the barrier and cause redness and flaking on sensitive skin`,
    advice: () => 'Begin with a low strength once or twice a week, apply over moisturiser, and increase slowly. Consider Bakuchiol if irritation persists.',
  },
  {
    when: has(['Retinol', 'Adapalene', 'Tretinoin', 'Tazarotene']),
    skins: ['dry'],
    severity: 'MEDIUM',
    concern: () => 'Retinoids speed up cell turnover and add to dryness and flaking, which dry skin already struggles with',
    advice: () => 'Use it on alternate nights, apply after a hydrating layer, and pair it with a ceramide moisturiser.',
  },
  {
    when: has(['Glycolic Acid']),
    skins: ['sensitive'],
    severity: 'HIGH',
    concern: () => 'Glycolic Acid has the smallest molecule of the AHAs and penetrates fastest, which makes it the most irritating for sensitive skin',
    advice: () => 'Swap to Mandelic Acid or a PHA, or limit it to once a week at a low concentration.',
  },
  {
    when: has(['Lactic Acid', 'Salicylic Acid']),
    skins: ['sensitive'],
    severity: 'MEDIUM',
    concern: (ing) => `${ing.canonical} can sting and over-exfoliate sensitive skin if used often`,
    advice: () => 'Limit to once or twice a week, use a lower strength, and avoid using it on the same night as a retinoid.',
  },
  {
    when: has(['Mandelic Acid']),
    skins: ['sensitive'],
    severity: 'LOW',
    concern: () => 'Mandelic Acid is the gentlest AHA, but sensitive skin can still react to any exfoliating acid',
    advice: () => 'Patch-test first and start with once a week.',
  },
  {
    when: has(['Glycolic Acid', 'Salicylic Acid']),
    skins: ['dry'],
    severity: 'MEDIUM',
    concern: (ing) => `${ing.canonical} can strip surface oils and leave dry skin tight`,
    advice: () => 'Use it once or twice a week and follow with a rich moisturiser.',
  },
  {
    when: has(['Benzoyl Peroxide']),
    skins: ['sensitive', 'dry'],
    severity: 'HIGH',
    concern: () => 'Benzoyl Peroxide is very drying and a common cause of irritation on dry or sensitive skin',
    advice: () => 'Use a 2.5% wash-off product rather than a leave-on, apply to spots only, and moisturise afterwards.',
  },
  {
    when: (ing) => ing.canonical === 'L-Ascorbic Acid' && (ing.concentration === null || ing.concentration >= 10),
    skins: ['sensitive'],
    severity: 'MEDIUM',
    concern: (ing) =>
      `${ing.concentration ? `${ing.concentration}% ` : ''}L-Ascorbic Acid is formulated at a very low pH and can sting or flush sensitive skin`,
    advice: () => 'Try 5-10% or a gentler derivative such as Magnesium Ascorbyl Phosphate.',
  },
  {
    when: has(['Kojic Acid']),
    skins: ['sensitive'],
    severity: 'MEDIUM',
    concern: () => 'Kojic Acid is a known contact sensitiser and can trigger redness or rashes on reactive skin',
    advice: () => 'Patch-test for several days first, or choose Alpha Arbutin or Tranexamic Acid for pigmentation.',
  },
  {
    when: rawHas(/\b(parfum|fragrance|limonene|linalool|citral|geraniol|eugenol|lavender|peppermint|essential oil)\b/i),
    skins: ['sensitive'],
    severity: 'HIGH',
    concern: (ing) => `${ing.raw} is a fragrance component, one of the most common triggers of irritation and allergy on sensitive skin`,
    advice: () => 'Choose a fragrance-free version of this product.',
  },
  {
    when: rawHas(/\b(parfum|fragrance|limonene|linalool|citral|geraniol|eugenol|lavender|peppermint|essential oil)\b/i),
    skins: ['dry', 'combination', 'normal', 'oily'],
    severity: 'LOW',
    concern: (ing) => `${ing.raw} is a fragrance component that adds no skin benefit and can irritate over time`,
    advice: () => 'A fragrance-free alternative is the safer long-term choice.',
  },
  {
    when: rawHas(/\b(alcohol denat|sd alcohol|denatured alcohol|isopropyl alcohol|ethanol)\b/i),
    skins: ['dry', 'sensitive'],
    severity: 'MEDIUM',
    concern: (ing) => `${ing.raw} evaporates quickly and can dry out the skin barrier`,
    advice: () => 'Look for an alcohol-free formula, or use it only on the nights you do not use actives.',
  },
  {
    when: rawHas(/\b(sodium lauryl sulfate|sls|sodium laureth sulfate)\b/i),
    skins: ['dry', 'sensitive'],
    severity: 'MEDIUM',
    concern: (ing) => `${ing.raw} is a harsh surfactant that strips natural oils`,
    advice: () => 'Switch to a gentle, sulfate-free cleanser.',
  },
  {
    when: rawHas(/\b(coconut oil|cocos nucifera|cocoa butter|theobroma cacao|isopropyl myristate|isopropyl palmitate|lanolin|wheat germ oil)\b/i),
    skins: ['oily', 'combination'],
    severity: 'MEDIUM',
    concern: (ing) => `${ing.raw} is rich and highly comedogenic, which can clog pores on oily or combination skin`,
    advice: () => 'Choose a lightweight, non-comedogenic moisturiser or a gel texture.',
  },
];

/** Concerns the user ticks during onboarding can make a warning more serious. */
export const CONCERN_ESCALATIONS = [
  { concern: 'Acne', when: rawHas(/\b(coconut oil|cocos nucifera|cocoa butter|theobroma cacao|isopropyl myristate|isopropyl palmitate|lanolin)\b/i) },
  { concern: 'Redness', when: rawHas(/\b(parfum|fragrance|alcohol denat|sd alcohol|essential oil)\b/i) },
];

/**
 * Benefits: how well an ingredient suits each skin type and goal. Higher is better.
 * `text` explains the benefit; `forSkin` adds a skin-specific sentence.
 */
export const BENEFIT_RULES = {
  Niacinamide: {
    skins: { oily: 3, combination: 3, sensitive: 2, normal: 2, dry: 1 },
    goals: ['Acne', 'Redness', 'Oiliness', 'Hyperpigmentation'],
    text: 'calms inflammation, supports the skin barrier and helps regulate oil',
    forSkin: {
      oily: 'It visibly tightens the look of pores and keeps shine in check.',
      combination: 'It balances oily zones without drying the cheeks.',
      sensitive: 'It is well tolerated and reduces redness and reactivity.',
      dry: 'It strengthens the barrier so moisture stays in.',
      normal: 'It maintains a calm, even tone.',
    },
  },
  'Hyaluronic Acid': {
    skins: { dry: 3, sensitive: 2, normal: 2, combination: 2, oily: 1 },
    goals: ['Dryness', 'Aging'],
    text: 'draws water into the surface of the skin for lasting hydration and a plumper look',
    forSkin: {
      dry: 'Layer it on damp skin and seal it with a moisturiser to avoid pulling moisture out.',
      oily: 'It hydrates without adding any oil.',
    },
  },
  Ceramides: {
    plural: true,
    skins: { dry: 3, sensitive: 3, normal: 1, combination: 1, oily: 1 },
    goals: ['Dryness', 'Redness'],
    text: 'rebuild the lipid barrier, reducing water loss and sensitivity',
    forSkin: { dry: 'They are the single most useful barrier ingredient for dry, flaky skin.', sensitive: 'They repair a compromised barrier, which is the root of most sensitivity.' },
  },
  'Salicylic Acid': {
    skins: { oily: 3, combination: 2, normal: 1, dry: 0, sensitive: 0 },
    goals: ['Acne', 'Oiliness'],
    text: 'is oil-soluble, so it cleans inside pores and helps prevent breakouts and blackheads',
    forSkin: { oily: 'It is the gold-standard exfoliant for congested, oily skin.' },
  },
  'L-Ascorbic Acid': {
    skins: { normal: 3, oily: 2, combination: 2, dry: 1, sensitive: 0 },
    goals: ['Hyperpigmentation', 'Aging'],
    text: 'is a potent antioxidant that brightens dark marks and protects against daily environmental damage',
    forSkin: { normal: 'Used in the morning under sunscreen it boosts protection and glow.' },
  },
  Retinol: {
    skins: { normal: 3, oily: 3, combination: 2, dry: 1, sensitive: 0 },
    goals: ['Aging', 'Acne', 'Hyperpigmentation'],
    text: 'speeds up cell turnover, smooths fine lines and keeps pores clearer',
    forSkin: { oily: 'It also helps keep pores clear and texture smooth.' },
  },
  'Azelaic Acid': {
    skins: { sensitive: 3, oily: 2, combination: 2, normal: 2, dry: 1 },
    goals: ['Acne', 'Redness', 'Hyperpigmentation'],
    text: 'calms redness, fades marks and has mild antibacterial action',
    forSkin: { sensitive: 'It is one of the best-tolerated actives for reactive, redness-prone skin.' },
  },
  Bakuchiol: {
    skins: { sensitive: 3, dry: 2, normal: 2, combination: 1, oily: 1 },
    goals: ['Aging'],
    text: 'is a plant-based retinol alternative that improves fine lines with much less irritation',
    forSkin: { sensitive: 'It gives retinoid-like benefits without the usual flaking and redness.' },
  },
  'Alpha Arbutin': {
    skins: { normal: 2, oily: 2, combination: 2, dry: 2, sensitive: 2 },
    goals: ['Hyperpigmentation'],
    text: 'fades dark spots by slowing pigment production, with low irritation risk',
  },
  'Tranexamic Acid': {
    skins: { normal: 2, oily: 2, combination: 2, dry: 2, sensitive: 2 },
    goals: ['Hyperpigmentation'],
    text: 'targets stubborn discolouration and melasma-type pigmentation',
  },
  'Ferulic Acid': {
    skins: { normal: 2, oily: 2, combination: 2, dry: 2, sensitive: 1 },
    goals: ['Aging', 'Hyperpigmentation'],
    text: 'is an antioxidant that stabilises Vitamin C and boosts its protective effect',
  },
  'Vitamin E': {
    skins: { dry: 2, normal: 2, combination: 1, oily: 0, sensitive: 1 },
    goals: ['Dryness', 'Aging'],
    text: 'is an antioxidant that also softens and conditions the skin',
    forSkin: { dry: 'It adds comfort and softness to dry skin.' },
  },
  Resveratrol: {
    skins: { normal: 2, oily: 1, combination: 1, dry: 1, sensitive: 1 },
    goals: ['Aging'],
    text: 'is a polyphenol antioxidant that helps defend against free-radical damage',
  },
  'Copper Peptides': {
    plural: true,
    skins: { normal: 2, dry: 2, combination: 1, oily: 1, sensitive: 1 },
    goals: ['Aging'],
    text: 'support collagen and skin repair',
  },
  'Palmitoyl Tripeptide-1': {
    skins: { normal: 2, dry: 2, combination: 1, oily: 1, sensitive: 2 },
    goals: ['Aging'],
    text: 'signals the skin to build collagen and firms the look of fine lines, with little irritation',
  },
  'Lactic Acid': {
    skins: { dry: 2, normal: 2, combination: 1, oily: 1, sensitive: 0 },
    goals: ['Dryness', 'Aging', 'Hyperpigmentation'],
    text: 'is a gentle AHA that exfoliates while also drawing in moisture',
    forSkin: { dry: 'Unlike most acids it hydrates as it exfoliates, which suits dry skin.' },
  },
  'Mandelic Acid': {
    skins: { sensitive: 2, normal: 2, oily: 2, combination: 2, dry: 1 },
    goals: ['Acne', 'Hyperpigmentation'],
    text: 'is the gentlest AHA, a good way to exfoliate with a low chance of irritation',
  },
  'Benzoyl Peroxide': {
    skins: { oily: 2, combination: 1, normal: 0, dry: 0, sensitive: 0 },
    goals: ['Acne'],
    text: 'kills acne-causing bacteria and unclogs pores',
  },
};

/** Gentle plain ingredients worth recognising by name (not in the 29-ingredient database). */
export const HYDRATORS = /\b(glycerin|squalane|panthenol|allantoin|centella|cica|madecassoside|aloe)\b/i;

/** What to suggest when the routine lacks enough beneficial ingredients. */
export const RECOMMENDED_ADDITIONS = {
  dry: ['Hyaluronic Acid', 'Ceramides', 'Niacinamide'],
  oily: ['Niacinamide', 'Salicylic Acid', 'Hyaluronic Acid'],
  combination: ['Niacinamide', 'Hyaluronic Acid', 'Salicylic Acid'],
  sensitive: ['Ceramides', 'Niacinamide', 'Azelaic Acid'],
  normal: ['Niacinamide', 'Hyaluronic Acid', 'L-Ascorbic Acid'],
};

export { SEED_INGREDIENTS };
