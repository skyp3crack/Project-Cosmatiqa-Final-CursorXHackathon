/**
 * The app's own ingredient database and hardcoded compatibility matrix, copied from
 * Backend/convex/functions/seed.ts (seedIngredients + seedCompatibilityMatrix).
 * 29 ingredients and 21 pair rules.
 */
export const SEED_INGREDIENTS = [
  {
    "inciName": "Retinol",
    "commonNames": [
      "Vitamin A",
      "Retinyl Palmitate"
    ],
    "function": "Anti-aging, cell turnover",
    "category": "active",
    "isActive": true
  },
  {
    "inciName": "Retinyl Palmitate",
    "commonNames": [
      "Vitamin A Palmitate"
    ],
    "function": "Anti-aging, cell turnover",
    "category": "active",
    "isActive": true
  },
  {
    "inciName": "Tretinoin",
    "commonNames": [
      "Retin-A",
      "All-trans Retinoic Acid"
    ],
    "function": "Prescription anti-aging, acne treatment",
    "category": "active",
    "isActive": true
  },
  {
    "inciName": "L-Ascorbic Acid",
    "commonNames": [
      "Vitamin C",
      "Ascorbic Acid",
      "AA"
    ],
    "function": "Antioxidant, brightening",
    "category": "active",
    "isActive": true
  },
  {
    "inciName": "Magnesium Ascorbyl Phosphate",
    "commonNames": [
      "MAP",
      "Vitamin C derivative"
    ],
    "function": "Antioxidant, brightening",
    "category": "active",
    "isActive": true
  },
  {
    "inciName": "Sodium Ascorbyl Phosphate",
    "commonNames": [
      "SAP",
      "Vitamin C derivative"
    ],
    "function": "Antioxidant, brightening",
    "category": "active",
    "isActive": true
  },
  {
    "inciName": "Tetrahexyldecyl Ascorbate",
    "commonNames": [
      "THD Ascorbate",
      "Vitamin C Ester"
    ],
    "function": "Antioxidant, brightening",
    "category": "active",
    "isActive": true
  },
  {
    "inciName": "Glycolic Acid",
    "commonNames": [
      "AHA",
      "Alpha Hydroxy Acid"
    ],
    "function": "Exfoliant, brightening",
    "category": "active",
    "isActive": true
  },
  {
    "inciName": "Lactic Acid",
    "commonNames": [
      "AHA",
      "Alpha Hydroxy Acid"
    ],
    "function": "Exfoliant, hydrating",
    "category": "active",
    "isActive": true
  },
  {
    "inciName": "Mandelic Acid",
    "commonNames": [
      "AHA",
      "Alpha Hydroxy Acid"
    ],
    "function": "Exfoliant, gentle",
    "category": "active",
    "isActive": true
  },
  {
    "inciName": "Citric Acid",
    "commonNames": [
      "AHA",
      "Alpha Hydroxy Acid"
    ],
    "function": "Exfoliant, pH adjuster",
    "category": "active",
    "isActive": true
  },
  {
    "inciName": "Salicylic Acid",
    "commonNames": [
      "BHA",
      "Beta Hydroxy Acid"
    ],
    "function": "Exfoliant, acne treatment",
    "category": "active",
    "isActive": true
  },
  {
    "inciName": "Niacinamide",
    "commonNames": [
      "Niacin",
      "Vitamin B3",
      "Nicotinamide"
    ],
    "function": "Anti-inflammatory, barrier repair",
    "category": "active",
    "isActive": true
  },
  {
    "inciName": "Copper Peptides",
    "commonNames": [
      "GHK-Cu",
      "Copper Tripeptide-1"
    ],
    "function": "Anti-aging, wound healing",
    "category": "active",
    "isActive": true
  },
  {
    "inciName": "Palmitoyl Tripeptide-1",
    "commonNames": [
      "Peptides",
      "Matrixyl 3000"
    ],
    "function": "Anti-aging, collagen support",
    "category": "active",
    "isActive": true
  },
  {
    "inciName": "Benzoyl Peroxide",
    "commonNames": [
      "BPO",
      "Benzoyl Peroxide"
    ],
    "function": "Acne treatment, antibacterial",
    "category": "active",
    "isActive": true
  },
  {
    "inciName": "Azelaic Acid",
    "commonNames": [
      "Azelaic Acid"
    ],
    "function": "Acne treatment, brightening",
    "category": "active",
    "isActive": true
  },
  {
    "inciName": "Hyaluronic Acid",
    "commonNames": [
      "HA",
      "Sodium Hyaluronate"
    ],
    "function": "Hydration, plumping",
    "category": "base",
    "isActive": false
  },
  {
    "inciName": "Ceramides",
    "commonNames": [
      "Ceramide NP",
      "Ceramide AP"
    ],
    "function": "Barrier repair, hydration",
    "category": "base",
    "isActive": false
  },
  {
    "inciName": "Niacin",
    "commonNames": [
      "Vitamin B3"
    ],
    "function": "Anti-inflammatory, barrier repair",
    "category": "active",
    "isActive": true
  },
  {
    "inciName": "Alpha Arbutin",
    "commonNames": [
      "Arbutin"
    ],
    "function": "Brightening, hyperpigmentation",
    "category": "active",
    "isActive": true
  },
  {
    "inciName": "Kojic Acid",
    "commonNames": [
      "Kojic Acid"
    ],
    "function": "Brightening, hyperpigmentation",
    "category": "active",
    "isActive": true
  },
  {
    "inciName": "Tranexamic Acid",
    "commonNames": [
      "TXA"
    ],
    "function": "Brightening, hyperpigmentation",
    "category": "active",
    "isActive": true
  },
  {
    "inciName": "Adapalene",
    "commonNames": [
      "Differin"
    ],
    "function": "Prescription retinoid, acne treatment",
    "category": "active",
    "isActive": true
  },
  {
    "inciName": "Tazarotene",
    "commonNames": [
      "Tazorac"
    ],
    "function": "Prescription retinoid, anti-aging",
    "category": "active",
    "isActive": true
  },
  {
    "inciName": "Bakuchiol",
    "commonNames": [
      "Natural Retinol Alternative"
    ],
    "function": "Anti-aging, plant-based retinol alternative",
    "category": "active",
    "isActive": true
  },
  {
    "inciName": "Resveratrol",
    "commonNames": [
      "Resveratrol"
    ],
    "function": "Antioxidant, anti-aging",
    "category": "active",
    "isActive": true
  },
  {
    "inciName": "Ferulic Acid",
    "commonNames": [
      "Ferulic Acid"
    ],
    "function": "Antioxidant, stabilizes Vitamin C",
    "category": "active",
    "isActive": true
  },
  {
    "inciName": "Vitamin E",
    "commonNames": [
      "Tocopherol",
      "Alpha Tocopherol"
    ],
    "function": "Antioxidant, moisturizing",
    "category": "active",
    "isActive": true
  }
];

export const SEED_CONFLICTS = [
  {
    "ingredientA": "Retinol",
    "ingredientB": "L-Ascorbic Acid",
    "conflictType": "pH Conflict, Stability Risk",
    "severity": "severe",
    "recommendation": "Use separately - Retinol at night, Vitamin C in morning. Wait 30 minutes between applications.",
    "scientificBasis": "Retinol works best at pH 5.5-6.5, while L-Ascorbic Acid requires pH 2.5-3.5. Using together can deactivate both ingredients."
  },
  {
    "ingredientA": "Retinol",
    "ingredientB": "Glycolic Acid",
    "conflictType": "High Irritation",
    "severity": "severe",
    "recommendation": "Do not use together. Alternate nights or use on different days.",
    "scientificBasis": "Both are strong exfoliants that can cause excessive irritation and barrier damage when combined."
  },
  {
    "ingredientA": "Retinol",
    "ingredientB": "Salicylic Acid",
    "conflictType": "High Irritation",
    "severity": "severe",
    "recommendation": "Do not use together. Alternate nights or use on different days.",
    "scientificBasis": "Combining retinoids with BHA can cause severe irritation and compromise skin barrier."
  },
  {
    "ingredientA": "Retinol",
    "ingredientB": "Benzoyl Peroxide",
    "conflictType": "Deactivation",
    "severity": "critical",
    "recommendation": "Never use together. Benzoyl Peroxide deactivates Retinol completely.",
    "scientificBasis": "Benzoyl Peroxide oxidizes and deactivates Retinol, making both ingredients ineffective."
  },
  {
    "ingredientA": "L-Ascorbic Acid",
    "ingredientB": "Copper Peptides",
    "conflictType": "Deactivation",
    "severity": "moderate",
    "recommendation": "Use separately - Vitamin C in morning, Copper Peptides at night.",
    "scientificBasis": "Vitamin C can oxidize copper peptides, reducing their effectiveness."
  },
  {
    "ingredientA": "Niacinamide",
    "ingredientB": "L-Ascorbic Acid",
    "conflictType": "Stability Risk",
    "severity": "low",
    "recommendation": "Can be used together if pH is balanced, but separating AM/PM is safer.",
    "scientificBasis": "Older research suggested conflict, but modern formulations can work together. Separating is still recommended for optimal results."
  },
  {
    "ingredientA": "Glycolic Acid",
    "ingredientB": "Salicylic Acid",
    "conflictType": "High Irritation",
    "severity": "moderate",
    "recommendation": "Use on alternate days or in different routines. Both are strong exfoliants.",
    "scientificBasis": "Combining AHA and BHA can cause excessive exfoliation and irritation."
  },
  {
    "ingredientA": "Tretinoin",
    "ingredientB": "Benzoyl Peroxide",
    "conflictType": "Deactivation",
    "severity": "critical",
    "recommendation": "Never use together. Consult dermatologist for alternative acne treatment.",
    "scientificBasis": "Benzoyl Peroxide completely deactivates Tretinoin, making prescription treatment ineffective."
  },
  {
    "ingredientA": "Adapalene",
    "ingredientB": "Benzoyl Peroxide",
    "conflictType": "Deactivation",
    "severity": "critical",
    "recommendation": "Never use together. Some formulations combine them, but consult dermatologist first.",
    "scientificBasis": "Benzoyl Peroxide can deactivate Adapalene, though some prescription combinations exist."
  },
  {
    "ingredientA": "Retinol",
    "ingredientB": "Lactic Acid",
    "conflictType": "High Irritation",
    "severity": "moderate",
    "recommendation": "Use on alternate days. Lactic acid is gentler than glycolic but still risky with retinol.",
    "scientificBasis": "Combining retinol with AHA can cause irritation, though lactic acid is less harsh than glycolic."
  },
  {
    "ingredientA": "Glycolic Acid",
    "ingredientB": "L-Ascorbic Acid",
    "conflictType": "pH Conflict",
    "severity": "moderate",
    "recommendation": "Use separately - AHA at night, Vitamin C in morning. Both need low pH.",
    "scientificBasis": "Both require low pH (3.0-4.0), but using together can be too harsh and reduce effectiveness."
  },
  {
    "ingredientA": "Salicylic Acid",
    "ingredientB": "Benzoyl Peroxide",
    "conflictType": "High Irritation",
    "severity": "moderate",
    "recommendation": "Use on alternate days or in different routines. Both are strong acne treatments.",
    "scientificBasis": "Combining two strong acne treatments can cause excessive dryness and irritation."
  },
  {
    "ingredientA": "Tretinoin",
    "ingredientB": "Salicylic Acid",
    "conflictType": "High Irritation",
    "severity": "severe",
    "recommendation": "Do not use together. Alternate nights or use on different days.",
    "scientificBasis": "Prescription retinoids combined with BHA can cause severe irritation and barrier damage."
  },
  {
    "ingredientA": "Tretinoin",
    "ingredientB": "Glycolic Acid",
    "conflictType": "High Irritation",
    "severity": "severe",
    "recommendation": "Do not use together. Alternate nights or use on different days.",
    "scientificBasis": "Prescription retinoids combined with AHA can cause severe irritation and barrier damage."
  },
  {
    "ingredientA": "Azelaic Acid",
    "ingredientB": "L-Ascorbic Acid",
    "conflictType": "pH Conflict",
    "severity": "low",
    "recommendation": "Can be used together if pH is balanced, but separating is safer.",
    "scientificBasis": "Both work at low pH, but combining may reduce effectiveness. Separating is recommended."
  },
  {
    "ingredientA": "Retinol",
    "ingredientB": "Mandelic Acid",
    "conflictType": "High Irritation",
    "severity": "low",
    "recommendation": "Use on alternate days. Mandelic acid is gentler but still risky with retinol.",
    "scientificBasis": "Mandelic acid is the gentlest AHA, but combining with retinol can still cause irritation."
  },
  {
    "ingredientA": "Niacinamide",
    "ingredientB": "Glycolic Acid",
    "conflictType": "pH Conflict",
    "severity": "low",
    "recommendation": "Can be used together if pH is balanced. Niacinamide buffers AHA irritation.",
    "scientificBasis": "Niacinamide works at neutral pH while AHA needs low pH, but modern formulations can work together."
  },
  {
    "ingredientA": "Niacinamide",
    "ingredientB": "Salicylic Acid",
    "conflictType": "pH Conflict",
    "severity": "low",
    "recommendation": "Can be used together if pH is balanced. Niacinamide buffers BHA irritation.",
    "scientificBasis": "Niacinamide works at neutral pH while BHA needs low pH, but modern formulations can work together."
  },
  {
    "ingredientA": "Alpha Arbutin",
    "ingredientB": "L-Ascorbic Acid",
    "conflictType": "Synergy",
    "severity": "low",
    "recommendation": "Can be used together. They work synergistically for brightening.",
    "scientificBasis": "Both are brightening agents that can work together effectively."
  },
  {
    "ingredientA": "Ferulic Acid",
    "ingredientB": "L-Ascorbic Acid",
    "conflictType": "Synergy",
    "severity": "low",
    "recommendation": "Can be used together. Ferulic acid stabilizes Vitamin C.",
    "scientificBasis": "Ferulic acid stabilizes and enhances the effectiveness of L-Ascorbic Acid."
  },
  {
    "ingredientA": "Vitamin E",
    "ingredientB": "L-Ascorbic Acid",
    "conflictType": "Synergy",
    "severity": "low",
    "recommendation": "Can be used together. Vitamin E enhances Vitamin C effectiveness.",
    "scientificBasis": "Vitamin E works synergistically with Vitamin C to enhance antioxidant protection."
  }
];
