/**
 * The static demo's replacement for the Convex backend functions the UI calls:
 *   users.createOrUpdateProfile, users.getUserProfile, analysis.analyzeRoutine, analysis.getAnalysisResults.
 *
 * analyzeRoutine follows Backend/convex/functions/analysis.ts step by step (parse, store, detect conflicts, score,
 * build recommendations, save). The one difference is step 3: where the live app asks its AI model for the analysis,
 * `adviseLocally` produces the same JSON shape from the compatibility matrix and the skin-type rules in knowledge.js.
 */
import {
  BENEFIT_RULES,
  CONCERN_ESCALATIONS,
  CONFLICT_TYPE,
  HYDRATORS,
  KNOWN_BRANDS,
  RECOMMENDED_ADDITIONS,
  RETINOIDS,
  SEED_INGREDIENTS,
  SEVERITY_FROM_SEED,
  WARNING_RULES,
  concentrationOf,
  findRule,
  isSynergy,
  normalise,
  resolveIngredient,
  soften,
} from './knowledge';
import { db } from './store';

// ─── Parsing (ported from analysis.ts) ──────────────────────────────────────────

/** Split an ingredient list on commas, semicolons and newlines, dropping "(...)" notes. */
export function parseIngredientList(text) {
  return text
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .map((item) => item.replace(/\s*\([^)]*\)/g, '').trim())
    .filter((item) => item.length > 0);
}

/** Brand extraction (the live app asks its AI model; the demo matches known brands, then guesses). */
export function extractBrandName(productName) {
  const name = productName.trim();
  const known = KNOWN_BRANDS.find((brand) => name.toLowerCase().startsWith(brand.toLowerCase()));
  if (known) return known;
  const words = name.split(/\s+/);
  return words.length > 1 ? words[0] : null;
}

/** Category used when an unknown ingredient is stored (same heuristics as _storeIngredient). */
function categoryFor(name) {
  const lower = name.toLowerCase();
  if (/(acid|retinol|peptide|vitamin|niacinamide|salicylic|glycolic|lactic)/.test(lower)) return 'active';
  if (/(paraben|phenoxyethanol|preservative)/.test(lower)) return 'preservative';
  if (/(fragrance|parfum|aroma)/.test(lower)) return 'fragrance';
  return 'base';
}

/** Find or create the ingredient document for a name. Known ingredients map onto the seeded database. */
function storeIngredient(rawName) {
  const canonical = resolveIngredient(rawName);
  const inciName = canonical ?? rawName;

  const existing = db.find('ingredients', (ingredient) => ingredient.inciName === inciName)[0];
  if (existing) return existing._id;

  const seeded = SEED_INGREDIENTS.find((ingredient) => ingredient.inciName === inciName);
  if (seeded) return db.insert('ingredients', seeded);

  const category = categoryFor(rawName);
  return db.insert('ingredients', {
    inciName: rawName,
    commonNames: [rawName],
    function: `User-added ingredient: ${rawName}`,
    category,
    isActive: category === 'active',
  });
}

// ─── The advisor that stands in for the AI model ──────────────────────────────────────

const overlaps = (a, b) => a === 'both' || b === 'both' || a === b;
const cap = (text) => text.charAt(0).toUpperCase() + text.slice(1);
const join = (items) => (items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`);

const SKIN_TAIL = {
  sensitive: ' Because your skin is sensitive, introduce one active at a time and patch-test first.',
  dry: ' Follow with a rich moisturiser to offset dryness.',
  oily: '',
  combination: ' Apply actives only to the zones that need them.',
  normal: '',
};

function layerRank(productName) {
  const name = productName.toLowerCase();
  if (/(cleanser|wash|cleansing|micellar)/.test(name)) return 0;
  if (/(toner|essence|mist|lotion toner)/.test(name)) return 1;
  if (/(eye)/.test(name)) return 3;
  if (/(spf|sunscreen|sun screen|sunblock|uv)/.test(name)) return 6;
  if (/(moisturi[sz]er|cream|gel cream|barrier|emulsion)/.test(name)) return 4;
  if (/(oil|balm)/.test(name)) return 5;
  return 2; // serums, treatments and everything else
}

/** Work out which products belong in the morning and evening routines, keeping conflicting actives apart. */
function buildRoutines(products, conflicts) {
  const inConflict = (name) => conflicts.some((c) => c.productA === name || c.productB === name);
  const usageOf = (name) => products.find((p) => p.name === name)?.usage;

  // A retinoid that clashes with something goes to the evening; its partner moves to the morning
  // when the user applies it at both times (a product used only in the evening stays there).
  const pmOnly = new Set(
    products
      .filter((p) => p.ingredients.some((i) => RETINOIDS.includes(i.canonical) && i.canonical !== 'Retinyl Palmitate') && inConflict(p.name))
      .map((p) => p.name),
  );
  const amOnly = new Set();
  for (const conflict of conflicts) {
    if (!conflict.isTemporalConflict) continue;
    const retinoidSide = [conflict.productA, conflict.productB].find((name) => pmOnly.has(name));
    if (!retinoidSide) continue;
    const other = retinoidSide === conflict.productA ? conflict.productB : conflict.productA;
    if (!pmOnly.has(other) && usageOf(other) === 'both') amOnly.add(other);
  }

  const inRoutine = (product, when) => {
    const sunscreen = layerRank(product.name) === 6;
    if (when === 'AM') return pmOnly.has(product.name) ? false : amOnly.has(product.name) || product.usage !== 'PM';
    return sunscreen ? false : amOnly.has(product.name) ? false : pmOnly.has(product.name) || product.usage !== 'AM';
  };

  const place = (when) =>
    products
      .map((product, index) => ({ product, index }))
      .filter(({ product }) => inRoutine(product, when))
      .sort((a, b) => layerRank(a.product.name) - layerRank(b.product.name) || a.index - b.index)
      .map(({ product }) => product.name);

  return { morningRoutine: place('AM'), eveningRoutine: place('PM') };
}

const RISK_WEIGHT = { HIGH: 3.5, MEDIUM: 2, LOW: 0.75 };
const WARNING_WEIGHT = { HIGH: 1.25, MEDIUM: 0.6, LOW: 0.2 };

function profileNarrative({ skin, goals, risk, productCount, activeCount, conflicts, warnings, benefits }) {
  const level = risk <= 3 ? 'low' : risk <= 6 ? 'moderate' : 'high';
  const verdict =
    level === 'low'
      ? 'a well-balanced fit'
      : level === 'moderate'
        ? 'workable, but it needs some refinement to suit'
        : 'not yet a comfortable fit for';

  const skinView = {
    sensitive: 'Sensitive skin rewards restraint: the barrier is easily overwhelmed, so the fewer strong actives you stack, the better it behaves.',
    dry: 'Dry skin is mostly a barrier story. Hydration and lipids matter more than strength, and anything that strips or exfoliates hard should be used sparingly.',
    oily: 'Oily skin tolerates actives well, but it does best with lightweight textures and a steady, moderate approach rather than harsh stripping, which can provoke even more oil.',
    combination: 'Combination skin is best treated as two skins. Balancing hydration on the cheeks with oil control through the T-zone matters more than any single product.',
    normal: 'Normal skin is forgiving, which makes this a good moment to build a routine that maintains what is working and prevents problems rather than reacting to them.',
  }[skin];

  const goalNotes = {
    Acne: 'For breakouts, consistency beats intensity. Gentle, regular use of a few well-chosen products clears skin more reliably than aggressive layering.',
    Aging: 'For visible ageing, the evidence-backed trio is a retinoid at night, an antioxidant in the morning and a daily sunscreen. Everything else is supporting cast.',
    Hyperpigmentation: 'For dark marks, sunscreen is the most important product in the routine. Brightening ingredients can only fade what new sun exposure is not re-darkening.',
    Dryness: 'For dryness, protect the barrier first. Gentle cleansing and a ceramide-rich moisturiser will do more than any serum.',
    Redness: 'For redness, soothing and barrier-supporting ingredients should lead, and anything that stings should be introduced slowly or left out.',
    Oiliness: 'For oiliness, aim to balance rather than strip. Over-cleansing signals the skin to make more oil.',
  };
  const goalText = goals.filter((g) => goalNotes[g]).map((g) => goalNotes[g]).join(' ');

  const system =
    `You are using ${productCount} products with ${activeCount} active ingredient${activeCount === 1 ? '' : 's'}. ` +
    (activeCount >= 4
      ? 'That is a busy line-up, and the simplest improvement is usually to spread the actives across the day and the week instead of using them all at once.'
      : 'That is a manageable number, which makes it easier to see what each product is doing and to adjust one thing at a time.') +
    (conflicts.length + warnings.length === 0
      ? ' Nothing in the combination raises a concern, so the work now is mostly consistency.'
      : ' The points raised in the other tabs are about timing and strength rather than a reason to abandon what you own.');

  const benefitText = benefits.length ? ' The ingredients you already use that suit your skin are worth protecting, so change as little as possible around them.' : '';

  return [
    `Taken as a whole, this routine looks like ${verdict} ${skin} skin, with an overall risk of ${risk}/10 placing it in the ${level} range. ${skinView}`,
    `${system}${benefitText}`,
    goalText || 'Because you did not pick a specific goal, a good default is to focus on protecting the barrier, wearing sunscreen every morning and adding new products one at a time.',
    'Build changes slowly. Introduce only one new active at a time, give it four to six weeks before judging it, and patch-test on the jawline or inner arm for a few days first. Mild tingling that settles quickly is normal; stinging, persistent redness or peeling means you should pause and go back to cleanser, moisturiser and sunscreen until the skin recovers.',
    'Wear a broad-spectrum SPF 30 or higher every morning, because several actives, particularly retinoids and exfoliating acids, make skin more sun-sensitive. Keep a simple note of what you used and how your skin reacted, which makes it much easier to spot the product responsible if something goes wrong.',
    'If you have a persistent skin condition such as rosacea, eczema or cystic acne, or you are using prescription treatments, check changes with a dermatologist. This analysis is general cosmetic guidance based on ingredient chemistry and is not medical advice.',
  ].join('\n\n');
}

/**
 * Produce what the AI model produces in the live app: risk score, conflicts, ingredient warnings and benefits,
 * AM/PM routines, a short summary and a longer personalised summary.
 */
export function adviseLocally({ userProfile, products }) {
  const skin = userProfile.skinType || 'normal';
  const concerns = userProfile.sensitivities || [];
  const goals = userProfile.goals || [];

  // 1. Resolve every ingredient against the knowledge base
  const resolved = products.map((product) => {
    const seen = new Set();
    const ingredients = [];
    for (const raw of product.ingredients) {
      const canonical = resolveIngredient(raw);
      const key = canonical ?? normalise(raw);
      if (seen.has(key)) continue;
      seen.add(key);
      ingredients.push({ raw, canonical, concentration: concentrationOf(raw) });
    }
    return { name: product.productName, usage: product.usageTime, ingredients };
  });

  // 2. Conflicts between ingredients of different products
  const conflicts = [];
  const synergies = [];
  const seenPairs = new Set();
  for (let i = 0; i < resolved.length; i++) {
    for (let j = i + 1; j < resolved.length; j++) {
      for (const a of resolved[i].ingredients) {
        for (const b of resolved[j].ingredients) {
          if (!a.canonical || !b.canonical || a.canonical === b.canonical) continue;
          const hit = findRule(a.canonical, b.canonical);
          if (!hit) continue;

          if (isSynergy(hit.rule)) {
            synergies.push({ ingredient: a.canonical, partner: b.canonical, product: resolved[i].name, text: hit.rule.scientificBasis });
            continue;
          }

          const temporal = overlaps(resolved[i].usage, resolved[j].usage);
          const conflictType = CONFLICT_TYPE[hit.rule.conflictType] ?? 'compatibility';
          let severity = soften(SEVERITY_FROM_SEED[hit.rule.severity] ?? 'MEDIUM', hit.soften);
          if (!temporal) {
            // Used at different times of day: only irritation carries over, as a low-level reminder.
            if (conflictType !== 'irritation_risk') continue;
            severity = 'LOW';
          }

          const pairKey = [i, j, [a.canonical, b.canonical].sort().join('|')].join(':');
          if (seenPairs.has(pairKey)) continue;
          seenPairs.add(pairKey);

          const timing = temporal
            ? ''
            : ' Using them at different times of day, as you do now, already reduces the risk. Do not layer them.';
          conflicts.push({
            ingredientA: a.canonical,
            ingredientB: b.canonical,
            productA: resolved[i].name,
            productB: resolved[j].name,
            severity,
            conflictType,
            explanation: hit.rule.scientificBasis,
            recommendation: `${hit.rule.recommendation}${timing}${SKIN_TAIL[skin] ?? ''}`.trim(),
            isTemporalConflict: temporal,
          });
        }
      }
    }
  }
  const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  conflicts.sort((x, y) => order[x.severity] - order[y.severity]);

  // 3. Ingredient warnings for this skin type and the concerns the user ticked
  const warningMap = new Map();
  for (const product of resolved) {
    for (const ing of product.ingredients) {
      for (const rule of WARNING_RULES) {
        if (!rule.skins.includes(skin) || !rule.when(ing)) continue;
        let severity = rule.severity;
        if (CONCERN_ESCALATIONS.some((e) => concerns.includes(e.concern) && e.when(ing))) {
          severity = severity === 'LOW' ? 'MEDIUM' : 'HIGH';
        }
        const key = `${ing.canonical ?? ing.raw}|${product.name}`;
        const existing = warningMap.get(key);
        if (existing && order[existing.severity] <= order[severity]) continue;
        warningMap.set(key, {
          ingredient: ing.canonical ?? ing.raw,
          product: product.name,
          concern: rule.concern(ing),
          recommendation: rule.advice(ing),
          severity,
        });
      }
    }
  }
  const ingredientWarnings = [...warningMap.values()].sort((x, y) => order[x.severity] - order[y.severity]).slice(0, 8);
  const warnedIngredients = new Set(ingredientWarnings.filter((w) => w.severity !== 'LOW').map((w) => w.ingredient));

  // 4. The three ingredients most worth keeping, then gaps worth filling
  const candidates = [];
  for (const product of resolved) {
    for (const ing of product.ingredients) {
      const rule = ing.canonical && BENEFIT_RULES[ing.canonical];
      if (rule && !warnedIngredients.has(ing.canonical)) {
        const goalHits = goals.filter((g) => rule.goals.includes(g)).length;
        const score = (rule.skins[skin] ?? 1) + goalHits * 1.5;
        if (score > 1) {
          const subject = rule.plural ? 'They' : 'It';
          candidates.push({
            ingredient: ing.canonical,
            product: product.name,
            score,
            benefit: `${cap(ing.canonical)} ${rule.text}. ${rule.forSkin?.[skin] ?? `${subject} suits ${skin} skin well.`}`,
          });
        }
      } else if (!ing.canonical && HYDRATORS.test(ing.raw) && ['dry', 'sensitive', 'normal'].includes(skin)) {
        candidates.push({
          ingredient: ing.raw,
          product: product.name,
          score: 1.6,
          benefit: `${cap(ing.raw)} is a gentle hydrating ingredient that supports comfort and the skin barrier, which suits ${skin} skin.`,
        });
      }
    }
  }
  const ingredientBenefits = [];
  const usedNames = new Set();
  for (const candidate of candidates.sort((x, y) => y.score - x.score)) {
    if (ingredientBenefits.length === 3) break;
    if (usedNames.has(candidate.ingredient)) continue;
    usedNames.add(candidate.ingredient);
    ingredientBenefits.push({ ingredient: candidate.ingredient, product: candidate.product, benefit: candidate.benefit });
  }
  const present = new Set(resolved.flatMap((p) => p.ingredients.map((i) => i.canonical).filter(Boolean)));
  for (const name of RECOMMENDED_ADDITIONS[skin] ?? RECOMMENDED_ADDITIONS.normal) {
    if (ingredientBenefits.length === 3) break;
    if (present.has(name) || usedNames.has(name) || warnedIngredients.has(name)) continue;
    const rule = BENEFIT_RULES[name];
    usedNames.add(name);
    ingredientBenefits.push({
      ingredient: name,
      product: 'Not in your routine yet',
      benefit: `${cap(name)} ${rule.text}. ${rule.forSkin?.[skin] ?? `Worth considering for ${skin} skin.`}`,
    });
  }

  // 5. Routines, risk score and summaries
  const { morningRoutine, eveningRoutine } = buildRoutines(resolved, conflicts);

  let risk = conflicts.reduce((sum, c) => sum + RISK_WEIGHT[c.severity], 0);
  risk += Math.min(3, ingredientWarnings.reduce((sum, w) => sum + WARNING_WEIGHT[w.severity], 0));
  if (skin === 'sensitive') risk *= 1.2;
  const overallRiskScore = Math.max(0, Math.min(10, Math.round(risk)));

  const activeCount = new Set(resolved.flatMap((p) => p.ingredients.filter((i) => i.canonical && !/^(Hyaluronic Acid|Ceramides)$/.test(i.canonical)).map((i) => i.canonical))).size;
  const actions = [];
  if (conflicts.some((c) => c.isTemporalConflict)) actions.push('separate the clashing actives (morning vs night)');
  if (ingredientWarnings.some((w) => w.severity === 'HIGH')) actions.push('patch-test the flagged ingredients');
  actions.push('wear SPF 30+ daily');
  const lead = conflicts[0];
  const summary =
    `Risk ${overallRiskScore}/10 for ${skin} skin` +
    (conflicts.length ? ` with ${conflicts.length} conflict${conflicts.length > 1 ? 's' : ''}.` : ', no conflicts found.') +
    (lead ? ` Main issue: ${lead.ingredientA} with ${lead.ingredientB}.` : '') +
    ` Actions: ${join(actions)}.`;

  return {
    overallRiskScore,
    conflicts,
    ingredientWarnings,
    ingredientBenefits,
    morningRoutine,
    eveningRoutine,
    summary,
    profileSummary: profileNarrative({
      skin,
      goals,
      risk: overallRiskScore,
      productCount: resolved.length,
      activeCount,
      conflicts,
      warnings: ingredientWarnings,
      benefits: ingredientBenefits,
    }),
    synergies,
  };
}

// ─── The Convex functions the UI calls ──────────────────────────────────────────

const SKIN_TYPES = ['oily', 'dry', 'combination', 'normal', 'sensitive'];

export function createOrUpdateProfile(args) {
  if (!SKIN_TYPES.includes(args.skinType)) throw new Error(`Invalid skin type: ${args.skinType}`);
  const now = Date.now();
  const existing = db.find('userProfiles', (p) => p.userId === args.userId)[0];

  if (existing) {
    db.patch(existing._id, { skinType: args.skinType, sensitivities: args.sensitivities, goals: args.goals, updatedAt: now });
    return { profileId: existing._id, isNew: false };
  }
  const profileId = db.insert('userProfiles', {
    userId: args.userId,
    skinType: args.skinType,
    sensitivities: args.sensitivities,
    goals: args.goals,
    createdAt: now,
    updatedAt: now,
  });
  return { profileId, isNew: true };
}

export const getUserProfile = (args) => db.find('userProfiles', (p) => p.userId === args.userId)[0] ?? null;

export function analyzeRoutine(args) {
  try {
    const now = Date.now();
    if (!args.products || args.products.length === 0) throw new Error('At least one product is required');

    // Step 1: save the routine, then read the user's profile
    const routineId = db.insert('routines', {
      userId: args.userId,
      name: args.routineName || `Routine ${new Date(now).toLocaleDateString()}`,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    const userProfile = getUserProfile({ userId: args.userId });

    // Step 2: parse and save the products and their ingredients
    const allMatchedIngredients = [];
    const productsForAI = [];
    args.products.forEach((product, index) => {
      if (!product.name || !product.ingredientList) return;
      const usageTime = product.usageTiming === 'Both' ? 'both' : product.usageTiming;
      if (!['AM', 'PM', 'both', 'alternate', 'weekly'].includes(usageTime)) throw new Error(`Invalid usageTime: ${usageTime}`);

      const productId = db.insert('products', {
        routineId,
        productName: product.name,
        brandName: extractBrandName(product.name) ?? undefined,
        rawInciList: product.ingredientList,
        usageTime,
        orderInRoutine: index + 1,
        createdAt: now,
      });

      const names = parseIngredientList(product.ingredientList);
      names.forEach((ingName, position) => {
        const ingredientId = storeIngredient(ingName);
        db.insert('productIngredients', { productId, ingredientId, position: position + 1 });
        allMatchedIngredients.push({ productId, productName: product.name, ingredientId, ingredientName: ingName, usageTime });
      });
      productsForAI.push({ productName: product.name, ingredients: names, usageTime });
    });

    // Step 3: the analysis (the AI model in the live app, the local advisor here)
    const aiAnalysis = adviseLocally({
      userProfile: {
        skinType: userProfile?.skinType || 'normal',
        sensitivities: userProfile?.sensitivities || [],
        goals: userProfile?.goals || [],
      },
      products: productsForAI,
    });

    // Keep the summary within the 300 character / 50 word limit the app enforces
    if (aiAnalysis.summary.length > 300 || aiAnalysis.summary.split(/\s+/).length > 50) {
      const truncated = aiAnalysis.summary.substring(0, 300).split(/\s+/).slice(0, 50).join(' ');
      aiAnalysis.summary = `${truncated}...`;
    }

    // Step 4: map the findings onto stored products and ingredients
    const productByName = (name) => allMatchedIngredients.find((m) => m.productName === name);
    const ingredientId = (name) => storeIngredient(name);
    const conflicts = aiAnalysis.conflicts
      .map((c) => {
        const a = productByName(c.productA);
        const b = productByName(c.productB);
        if (!a || !b) return null;
        return {
          productAId: a.productId,
          productBId: b.productId,
          ingredientA: ingredientId(c.ingredientA),
          ingredientB: ingredientId(c.ingredientB),
          severity: c.severity.toLowerCase(),
          conflictType: c.conflictType,
          explanation: c.explanation || c.recommendation || '',
          recommendation: c.recommendation || '',
          isTemporalConflict: c.isTemporalConflict,
        };
      })
      .filter(Boolean);

    // Step 5: safety score (the advisor returns a risk score where higher is worse)
    const riskScore = Math.max(0, Math.min(10, aiAnalysis.overallRiskScore));
    const safetyScore = Math.max(0, Math.min(10, 10 - riskScore));
    const overallRiskScore = safetyScore >= 7 ? 'safe' : safetyScore >= 4 ? 'caution' : 'high_risk';
    const summaryScore =
      safetyScore >= 9 ? 'A+' : safetyScore >= 8 ? 'A' : safetyScore >= 7 ? 'B+' : safetyScore >= 6 ? 'B' : safetyScore >= 5 ? 'C' : 'D';

    // Recommendations, in the exact format the Profile screen parses
    const recommendations = [];
    if (aiAnalysis.summary) recommendations.push(aiAnalysis.summary);
    const highWarnings = aiAnalysis.ingredientWarnings.filter((w) => w.severity === 'HIGH');
    if (highWarnings.length > 0) {
      recommendations.push('⚠️ INGREDIENT WARNINGS FOR YOUR SKIN TYPE:');
      highWarnings.forEach((w) => recommendations.push(`- ${w.ingredient} (in ${w.product}): ${w.concern}. ${w.recommendation}`));
    }
    if (aiAnalysis.ingredientBenefits.length > 0) {
      recommendations.push('✅ BENEFICIAL INGREDIENTS FOR YOUR SKIN TYPE:');
      aiAnalysis.ingredientBenefits.slice(0, 3).forEach((b) => recommendations.push(`- ${b.ingredient} (in ${b.product}): ${b.benefit}`));
    }
    if (conflicts.length === 0) {
      recommendations.push('Your routine looks great! No conflicts detected.');
    } else {
      recommendations.push(`Found ${conflicts.length} potential conflict(s).`);
      if (conflicts.some((c) => c.severity === 'high' || c.severity === 'severe')) recommendations.push('Review high-severity conflicts immediately.');
    }
    if (aiAnalysis.morningRoutine.length > 0) recommendations.push(`Morning routine: ${aiAnalysis.morningRoutine.join(', ')}`);
    if (aiAnalysis.eveningRoutine.length > 0) recommendations.push(`Evening routine: ${aiAnalysis.eveningRoutine.join(', ')}`);

    // Step 6-8: save the analysis and its conflicts
    const analysisData = JSON.stringify({
      totalIngredients: allMatchedIngredients.length,
      safetyScore,
      riskScore,
      conflictsSummary: conflicts.map((c) => ({ severity: c.severity, type: c.conflictType })),
      profileSummary: aiAnalysis.profileSummary,
      aiAnalysis: {
        overallRiskScore: aiAnalysis.overallRiskScore,
        summary: aiAnalysis.summary,
        profileSummary: aiAnalysis.profileSummary,
        ingredientWarnings: aiAnalysis.ingredientWarnings,
        ingredientBenefits: aiAnalysis.ingredientBenefits,
        morningRoutine: aiAnalysis.morningRoutine,
        eveningRoutine: aiAnalysis.eveningRoutine,
      },
    });

    const analysisId = db.insert('analysisResults', {
      userId: args.userId,
      routineId,
      overallRiskScore,
      summaryScore,
      conflictsFound: conflicts.length,
      analysisData,
      recommendations,
      profileSummary: aiAnalysis.profileSummary,
      createdAt: now,
    });
    for (const conflict of conflicts) {
      db.insert('detectedConflicts', {
        analysisId,
        productAId: conflict.productAId,
        productBId: conflict.productBId,
        ingredientAId: conflict.ingredientA,
        ingredientBId: conflict.ingredientB,
        severity: conflict.severity,
        conflictType: conflict.conflictType,
        explanation: conflict.explanation,
        recommendation: conflict.recommendation,
        isTemporalConflict: conflict.isTemporalConflict,
      });
    }

    return {
      analysisId,
      routineId,
      safetyScore,
      riskScore,
      summaryScore,
      conflictsFound: conflicts.length,
      ingredientsAnalyzed: allMatchedIngredients.length,
    };
  } catch (error) {
    throw new Error(`Analysis failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function getAnalysisResults(args) {
  const analysis = db.get(args.analysisId);
  if (!analysis) return null;

  const routine = db.get(analysis.routineId);
  const products = db.find('products', (p) => p.routineId === analysis.routineId);
  const conflicts = db
    .find('detectedConflicts', (c) => c.analysisId === args.analysisId)
    .map((conflict) => ({
      ...conflict,
      ingredientA: db.get(conflict.ingredientAId),
      ingredientB: db.get(conflict.ingredientBId),
      productA: db.get(conflict.productAId),
      productB: db.get(conflict.productBId),
    }));

  const parsed = analysis.analysisData ? JSON.parse(analysis.analysisData) : null;
  return {
    analysis: {
      ...analysis,
      safetyScore: parsed?.safetyScore || 0,
      overallSafetyScore: parsed?.safetyScore || 0,
      aiAnalysis: parsed?.aiAnalysis || null,
    },
    routine,
    products,
    conflicts,
  };
}

/** The functions the UI calls, keyed the way convex/server's getFunctionName names them. */
export const HANDLERS = {
  'functions/users:createOrUpdateProfile': createOrUpdateProfile,
  'functions/users:getUserProfile': getUserProfile,
  'functions/analysis:analyzeRoutine': analyzeRoutine,
  'functions/analysis:getAnalysisResults': getAnalysisResults,
};
