import type { Node as PMNode } from 'prosemirror-model';
import type { CategoriaLevantamento, Papel, PersonagemInfo, Projeto } from '../types';
import { dividirEmCenas } from './cenas';
import { contarLinhas, extrairLocal, geometria, FORMATO, nomePersonagem, Layout } from './layout';
import type { Elemento } from './schema';
import { t } from '../i18n';

export const CATEGORIAS: { id: CategoriaLevantamento; nome: string; exemplo: string }[] = [
  { id: 'figurantes', get nome() { return t('Figurantes'); }, get exemplo() { return t('ex.: 3 pescadores'); } },
  { id: 'aderecos', get nome() { return t('Adereços'); }, get exemplo() { return t('ex.: envelope, bengala'); } },
  { id: 'guardaRoupa', get nome() { return t('Guarda-roupa'); }, get exemplo() { return t('ex.: casaco molhado'); } },
  { id: 'caracterizacao', get nome() { return t('Caracterização'); }, get exemplo() { return t('ex.: ferida na mão'); } },
  { id: 'cenografia', get nome() { return t('Cenografia'); }, get exemplo() { return t('ex.: mesa posta para dois'); } },
  { id: 'veiculos', get nome() { return t('Veículos'); }, get exemplo() { return t('ex.: barco de pesca'); } },
  { id: 'animais', get nome() { return t('Animais'); }, get exemplo() { return t('ex.: gaivotas'); } },
  { id: 'efeitos', get nome() { return t('Efeitos'); }, get exemplo() { return t('ex.: chuva, fumo'); } },
  { id: 'som', get nome() { return t('Som e música'); }, get exemplo() { return t('ex.: rádio a tocar'); } },
  { id: 'notas', get nome() { return t('Notas de produção'); }, get exemplo() { return t('ex.: pedir licença ao porto'); } }
];

export interface CenaLevantamento {
  id: string;
  indice: number;
  numero: number;
  cabecalho: string;
  intExt: 'INT' | 'EXT' | 'INT/EXT' | '—';
  local: string;
  momento: string;
  oitavos: number; // tamanho em oitavos de página (como nas folhas de produção)
  segundos: number;
  falam: string[];
  aparecem: string[]; // nomeadas na ação, sem falas nesta cena
  elementos: Partial<Record<CategoriaLevantamento, string[]>>;
}

export interface PersonagemResumo {
  nome: string;
  descricao: string;
  manual: boolean;
  falas: number;
  cenasComFalas: number[];
  cenasSemFalas: number[];
  segundosDialogo: number;
}

const re = (nome: string) => new RegExp(`(^|[^\\p{L}\\p{N}])${nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^\\p{L}\\p{N}])`, 'iu');

export function intExtDe(cab: string): CenaLevantamento['intExt'] {
  const t = cab.toUpperCase();
  if (/^(INT\.?\/EXT|EXT\.?\/INT|I\/E)/.test(t)) return 'INT/EXT';
  if (/^INT/.test(t)) return 'INT';
  if (/^EXT/.test(t)) return 'EXT';
  return '—';
}

export function momentoDe(cab: string): string {
  const partes = cab.toUpperCase().split(/\s+[—–-]\s+/);
  return partes.length > 1 ? partes[partes.length - 1].trim() : '—';
}

export function formatarOitavos(o: number): string {
  if (o <= 0) return '0';
  const inteiras = Math.floor(o / 8);
  const resto = o % 8;
  if (!inteiras) return `${resto}/8`;
  return resto ? `${inteiras} ${resto}/8` : String(inteiras);
}

/** Todas as personagens conhecidas: as que falam no guião e as acrescentadas à mão */
export function nomesPersonagens(layout: Layout, projeto: Projeto): string[] {
  const manuais = (projeto.personagens || []).map((p) => p.nome);
  return [...layout.personagens, ...manuais.filter((n) => !layout.personagens.includes(n))];
}

export function analisar(doc: PMNode, layout: Layout, projeto: Projeto, papel: Papel): { cenas: CenaLevantamento[]; personagens: PersonagemResumo[] } {
  const LP = FORMATO[papel].linhasPagina;
  const { cenas: blocos } = dividirEmCenas(doc);
  const info = new Map(layout.cenas.map((c) => [c.id, c]));
  const nomes = nomesPersonagens(layout, projeto);
  const resumo = new Map<string, PersonagemResumo>();
  const descr = new Map((projeto.personagens || []).map((p) => [p.nome, p]));
  for (const n of nomes) {
    const p = descr.get(n);
    resumo.set(n, { nome: n, descricao: p?.descricao || '', manual: !!p?.manual, falas: 0, cenasComFalas: [], cenasSemFalas: [], segundosDialogo: 0 });
  }

  const cenas: CenaLevantamento[] = blocos.map((b) => {
    const ci = info.get(b.id)!;
    const falam: string[] = [];
    let linhas = 0;
    let atual = '';
    let anterior = false;
    const acao: string[] = [];
    for (const n of b.nos) {
      const el = n.type.name as Elemento;
      const t = n.textContent.trim();
      if (!t) continue;
      linhas += contarLinhas(t, geometria(el, papel).largura) + (anterior ? 1 : 0);
      anterior = true;
      if (el === 'acao') acao.push(t);
      if (el === 'personagem') {
        atual = nomePersonagem(t);
        const r = resumo.get(atual);
        if (r) r.falas++;
        if (atual && !falam.includes(atual)) falam.push(atual);
      }
      if ((el === 'dialogo' || el === 'parentetico') && atual) {
        const r = resumo.get(atual);
        if (r) r.segundosDialogo += (contarLinhas(t, geometria(el, papel).largura) / LP) * 60;
      }
    }
    const textoAcao = acao.join(' ');
    const aparecem = nomes.filter((n) => !falam.includes(n) && re(n).test(textoAcao));
    // Correções feitas à mão no ecrã Personagens
    for (const n of nomes) {
      const aj = descr.get(n)?.cenas?.[b.id];
      if (!aj) continue;
      const tira = (l: string[]) => { const i = l.indexOf(n); if (i >= 0) l.splice(i, 1); };
      tira(falam); tira(aparecem);
      if (aj === 'fala') falam.push(n);
      if (aj === 'sem') aparecem.push(n);
    }
    for (const n of falam) resumo.get(n)?.cenasComFalas.push(ci.numero);
    for (const n of aparecem) resumo.get(n)?.cenasSemFalas.push(ci.numero);
    const cab = ci.texto;
    return {
      id: b.id, indice: ci.indice, numero: ci.numero, cabecalho: cab,
      intExt: intExtDe(cab), local: extrairLocal(cab) || '—', momento: momentoDe(cab),
      oitavos: Math.max(1, Math.ceil((linhas / LP) * 8)), segundos: ci.segundos,
      falam, aparecem, elementos: (projeto.levantamento || {})[b.id] || {}
    };
  });
  return { cenas, personagens: [...resumo.values()] };
}

const PEQUENAS = new Set(['a', 'o', 'as', 'os', 'e', 'de', 'da', 'do', 'das', 'dos', 'em', 'na', 'no', 'nas', 'nos', 'à', 'ao', 'aos', 'às', 'com', 'por', 'para']);

/** "COZINHA DA AVÓ" → "Cozinha da Avó" */
export function titulo(s: string): string {
  return s.toLowerCase().split(/(\s+)/).map((p, i) =>
    (i > 0 && PEQUENAS.has(p)) || !p.trim() ? p : p.replace(/(^|-)(\S)/g, (_m, a, b) => a + b.toUpperCase())
  ).join('');
}

export function atualizarPersonagem(lista: PersonagemInfo[] | undefined, nome: string, f: (p: PersonagemInfo) => PersonagemInfo | null): PersonagemInfo[] {
  const l = [...(lista || [])];
  const i = l.findIndex((p) => p.nome === nome);
  const base = i >= 0 ? l[i] : { nome, descricao: '', manual: false };
  const novo = f(base);
  if (i >= 0) { if (novo) l[i] = novo; else l.splice(i, 1); }
  else if (novo) l.push(novo);
  return l;
}
