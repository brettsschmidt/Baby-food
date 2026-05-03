/**
 * Compact baby-food nutrition reference. Per 100 g raw, approximate.
 * Sources: USDA FoodData Central (rounded). For ballpark UI only — not a
 * substitute for medical advice.
 */

export interface NutritionFacts {
  /** Match against food name (case-insensitive substring). */
  match: string[];
  kcal: number;
  protein_g: number;
  iron_mg: number;
  vit_c_mg?: number;
  notes?: string;
}

export const NUTRITION_DB: NutritionFacts[] = [
  { match: ["sweet potato"], kcal: 86, protein_g: 1.6, iron_mg: 0.6, vit_c_mg: 2.4 },
  { match: ["banana"], kcal: 89, protein_g: 1.1, iron_mg: 0.3, vit_c_mg: 8.7 },
  { match: ["avocado"], kcal: 160, protein_g: 2.0, iron_mg: 0.6, vit_c_mg: 10 },
  { match: ["apple", "applesauce"], kcal: 52, protein_g: 0.3, iron_mg: 0.1, vit_c_mg: 4.6 },
  { match: ["pear"], kcal: 57, protein_g: 0.4, iron_mg: 0.2, vit_c_mg: 4.3 },
  { match: ["pea", "peas"], kcal: 81, protein_g: 5.4, iron_mg: 1.5, vit_c_mg: 40 },
  { match: ["carrot"], kcal: 41, protein_g: 0.9, iron_mg: 0.3, vit_c_mg: 5.9 },
  { match: ["broccoli"], kcal: 34, protein_g: 2.8, iron_mg: 0.7, vit_c_mg: 89 },
  { match: ["spinach"], kcal: 23, protein_g: 2.9, iron_mg: 2.7, vit_c_mg: 28 },
  { match: ["butternut", "squash"], kcal: 45, protein_g: 1.0, iron_mg: 0.7, vit_c_mg: 21 },
  { match: ["pumpkin"], kcal: 26, protein_g: 1.0, iron_mg: 0.8, vit_c_mg: 9 },
  { match: ["zucchini", "courgette"], kcal: 17, protein_g: 1.2, iron_mg: 0.4, vit_c_mg: 18 },
  { match: ["oat", "oatmeal", "porridge"], kcal: 71, protein_g: 2.5, iron_mg: 0.9 },
  { match: ["rice", "baby rice"], kcal: 130, protein_g: 2.7, iron_mg: 1.5 },
  { match: ["chicken"], kcal: 165, protein_g: 31, iron_mg: 1.0 },
  { match: ["beef"], kcal: 217, protein_g: 26, iron_mg: 2.6 },
  { match: ["fish", "salmon"], kcal: 208, protein_g: 20, iron_mg: 0.8 },
  { match: ["egg"], kcal: 143, protein_g: 13, iron_mg: 1.8, notes: "Common allergen" },
  { match: ["yogurt", "yoghurt"], kcal: 59, protein_g: 10, iron_mg: 0, notes: "Dairy" },
  { match: ["cheese"], kcal: 402, protein_g: 25, iron_mg: 0.7, notes: "Dairy · sodium" },
  { match: ["lentil"], kcal: 116, protein_g: 9, iron_mg: 3.3 },
  { match: ["bean", "kidney bean", "black bean"], kcal: 127, protein_g: 8.7, iron_mg: 2.9 },
  { match: ["mango"], kcal: 60, protein_g: 0.8, iron_mg: 0.2, vit_c_mg: 36 },
  { match: ["berry", "blueberry", "strawberry"], kcal: 57, protein_g: 0.7, iron_mg: 0.3, vit_c_mg: 9.7 },
  { match: ["potato"], kcal: 77, protein_g: 2.0, iron_mg: 0.8 },
];

export function lookupNutrition(name: string): NutritionFacts | null {
  const n = name.toLowerCase();
  for (const f of NUTRITION_DB) {
    if (f.match.some((m) => n.includes(m))) return f;
  }
  return null;
}
