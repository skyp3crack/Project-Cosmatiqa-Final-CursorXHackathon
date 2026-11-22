/**
 * A tiny document store that stands in for the Convex database in the static demo.
 * Tables and ids follow the Convex schema (userProfiles, routines, products, ingredients, analysisResults,
 * detectedConflicts, ...). Data is kept in localStorage so a refresh keeps the user's profile and results.
 */

const STORAGE_KEY = 'cosmatiqa-demo-db-v1';

const TABLES = [
  'userProfiles',
  'ingredients',
  'routines',
  'products',
  'productIngredients',
  'analysisResults',
  'detectedConflicts',
];

const emptyDb = () => Object.fromEntries(TABLES.map((table) => [table, []]));

let data = load();
let version = 0;
const listeners = new Set();

function load() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (stored) return { ...emptyDb(), ...stored };
  } catch {
    // storage unavailable or corrupted: start empty
  }
  return emptyDb();
}

function save() {
  version += 1;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // storage unavailable: the data lasts for this page view only
  }
  listeners.forEach((listener) => listener());
}

const randomId = () =>
  Array.from({ length: 24 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('');

export const db = {
  /** Insert a document and return its id (like ctx.db.insert). */
  insert(table, doc) {
    const _id = `${table}:${randomId()}`;
    data[table].push({ ...doc, _id, _creationTime: Date.now() });
    save();
    return _id;
  },

  /** Fetch a document by id (like ctx.db.get). */
  get(id) {
    if (!id) return null;
    const table = String(id).split(':')[0];
    return data[table]?.find((doc) => doc._id === id) ?? null;
  },

  /** All documents of a table that match a predicate (like a filtered query). */
  find(table, predicate = () => true) {
    return data[table].filter(predicate);
  },

  /** Merge fields into an existing document (like ctx.db.patch). */
  patch(id, fields) {
    const doc = this.get(id);
    if (doc) {
      Object.assign(doc, fields);
      save();
    }
  },

  /** Wipe everything (used by "Reset demo"). */
  reset() {
    data = emptyDb();
    save();
  },

  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getVersion: () => version,
};
