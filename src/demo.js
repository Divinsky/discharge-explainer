import results from './demo-results.json' with { type: 'json' };
import { SAMPLE1, SAMPLE2 } from './page.js';

export function preparedSample(text, language) {
  const id = text === SAMPLE1 ? '1' : text === SAMPLE2 ? '2' : null;
  if (!id || !Object.hasOwn(results[id] || {}, language)) return null;
  const result = structuredClone(results[id][language]);
  if (language === 'es') result.spanish = result.translation;
  return { model: 'nvidia/nemotron-3-super-120b-a12b', prepared: true, result };
}
