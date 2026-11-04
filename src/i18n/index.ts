import EN from './en';

/**
 * Tradução da interface. O português é a língua de origem: cada texto é a sua própria chave,
 * e o dicionário inglês (en.ts) diz como fica em inglês. Textos sem tradução aparecem em português.
 * Variáveis entre chavetas: t('{n} páginas', { n: 3 }).
 */
export type Idioma = 'pt' | 'en';
let idioma: Idioma = 'pt';

export function definirIdioma(i: Idioma) {
  idioma = i;
  if (typeof document !== 'undefined') document.documentElement.lang = i === 'en' ? 'en' : 'pt-PT';
}
export const idiomaAtual = () => idioma;
export const emIngles = () => idioma === 'en';
/** Para datas e números: 'pt-PT' ou 'en-GB' */
export const locale = () => (idioma === 'en' ? 'en-GB' : 'pt-PT');

export function t(s: string, vars?: Record<string, string | number>): string {
  let r = idioma === 'en' ? (EN[s] ?? s) : s;
  if (vars) r = r.replace(/\{(\w+)\}/g, (m: string, k: string) => (k in vars ? String(vars[k]) : m));
  return r;
}
/** Singular ou plural: tp(n, '{n} página', '{n} páginas') */
export function tp(n: number, um: string, varios: string, vars?: Record<string, string | number>): string {
  return t(n === 1 ? um : varios, { n, ...(vars || {}) });
}
