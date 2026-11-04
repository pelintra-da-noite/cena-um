import { Schema, NodeSpec } from 'prosemirror-model';
import type { TipoProjeto } from '../types';

export type Elemento = 'cena' | 'acao' | 'personagem' | 'dialogo' | 'parentetico' | 'transicao';

export const ELEMENTOS: Elemento[] = ['cena', 'acao', 'personagem', 'dialogo', 'parentetico', 'transicao'];

// Todos os blocos guardam um id: um cabeçalho que muda de tipo leva o id consigo
// e, ao voltar a ser cabeçalho, recupera o storyboard e os planos da cena.
// "alinhamento" é a escolha do argumentista no menu de formatação (null = o do elemento).
export type Alinhamento = 'left' | 'center' | 'right' | 'justify' | null;

const bloco = (nome: Elemento, extraAttrs: Record<string, string> = {}): NodeSpec => ({
  attrs: { id: { default: null }, alinhamento: { default: null } },
  content: 'text*',
  marks: '_',
  group: 'block',
  defining: true,
  parseDOM: [{
    tag: `p.el-${nome}`,
    getAttrs: (d) => ({
      id: (d as HTMLElement).getAttribute('data-id'),
      alinhamento: (d as HTMLElement).style.textAlign || null
    })
  }, ...(nome === 'acao' ? [{ tag: 'p', priority: 10 }] : [])],
  toDOM: (n) => {
    const a: Record<string, string> = { class: `el el-${nome}`, ...extraAttrs };
    if (nome === 'cena' && n.attrs.id) a['data-id'] = n.attrs.id;
    if (n.attrs.alinhamento) a.style = `text-align: ${n.attrs.alinhamento}`;
    return ['p', a, 0];
  }
});

// Fontes oferecidas no menu (a primeira é a de origem e não precisa de marca)
export const FONTES: { nome: string; css: string }[] = [
  { nome: 'Courier Prime (padrão)', css: '' },
  { nome: 'Courier New', css: "'Courier New', monospace" },
  { nome: 'IBM Plex Sans', css: "'IBM Plex Sans', sans-serif" },
  { nome: 'Arial', css: 'Arial, sans-serif' },
  { nome: 'Calibri', css: 'Calibri, Carlito, sans-serif' },
  { nome: 'Georgia', css: 'Georgia, serif' },
  { nome: 'Times New Roman', css: "'Times New Roman', serif" },
  { nome: 'Garamond', css: "Garamond, 'EB Garamond', serif" }
];
export const TAMANHOS = [10, 11, 12, 13, 14, 16, 18, 24];
export const CORES = ['#E5484D', '#E8833A', '#D9A21B', '#2BA58B', '#2F80ED', '#7B61FF', '#8A8F98'];

export const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    cena: bloco('cena'),
    acao: bloco('acao'),
    personagem: bloco('personagem', { spellcheck: 'false' }),
    dialogo: bloco('dialogo'),
    parentetico: bloco('parentetico'),
    transicao: bloco('transicao'),
    text: {}
  },
  marks: {
    negrito: { parseDOM: [{ tag: 'strong' }, { tag: 'b' }], toDOM: () => ['strong', 0] },
    italico: { parseDOM: [{ tag: 'em' }, { tag: 'i' }], toDOM: () => ['em', 0] },
    sublinhado: { parseDOM: [{ tag: 'u' }], toDOM: () => ['u', 0] },
    riscado: { parseDOM: [{ tag: 's' }, { tag: 'del' }], toDOM: () => ['s', 0] },
    fonte: {
      attrs: { css: {} },
      parseDOM: [{ tag: 'span[data-fonte]', getAttrs: (d) => ({ css: (d as HTMLElement).style.fontFamily }) }],
      toDOM: (m) => ['span', { 'data-fonte': '', style: `font-family: ${m.attrs.css}` }, 0]
    },
    tamanho: {
      attrs: { pt: {} },
      parseDOM: [{ tag: 'span[data-tamanho]', getAttrs: (d) => ({ pt: Number((d as HTMLElement).getAttribute('data-tamanho')) || 12 }) }],
      // em relativo ao papel: acompanha o zoom do editor
      toDOM: (m) => ['span', { 'data-tamanho': String(m.attrs.pt), style: `font-size: ${m.attrs.pt / 12}em; line-height: 1em` }, 0]
    },
    cor: {
      attrs: { valor: {} },
      parseDOM: [{ tag: 'span[data-cor]', getAttrs: (d) => ({ valor: (d as HTMLElement).getAttribute('data-cor') }) }],
      toDOM: (m) => ['span', { 'data-cor': m.attrs.valor, style: `color: ${m.attrs.valor}` }, 0]
    }
  }
});

/** Maior tamanho de letra usado num bloco (12 = o normal) */
export function tamanhoMaximo(n: import('prosemirror-model').Node): number {
  let max = 12;
  n.forEach((t) => { for (const m of t.marks) if (m.type.name === 'tamanho' && m.attrs.pt > max) max = m.attrs.pt; });
  return max;
}

const ROTULOS: Record<Elemento, string> = {
  cena: 'Cabeçalho',
  acao: 'Ação',
  personagem: 'Personagem',
  dialogo: 'Diálogo',
  parentetico: 'Parentético',
  transicao: 'Transição'
};

const ROTULOS_TEATRO: Partial<Record<Elemento, string>> = { cena: 'Cena', acao: 'Didascália' };

export function rotulo(el: Elemento, tipo: TipoProjeto): string {
  return (tipo === 'teatro' && ROTULOS_TEATRO[el]) || ROTULOS[el];
}

/** Elemento seguinte ao carregar Enter no fim de um bloco */
export const DEPOIS_DE_ENTER: Record<Elemento, Elemento> = {
  cena: 'acao',
  acao: 'acao',
  personagem: 'dialogo',
  dialogo: 'acao',
  parentetico: 'dialogo',
  transicao: 'cena'
};

/** Ciclo do Tab (Shift+Tab percorre ao contrário) */
export const CICLO_TAB: Record<Elemento, Elemento> = {
  acao: 'personagem',
  personagem: 'transicao',
  transicao: 'cena',
  cena: 'acao',
  dialogo: 'parentetico',
  parentetico: 'dialogo'
};

export function documentoInicial(): any {
  return { type: 'doc', content: [{ type: 'cena', attrs: { id: novoId() } }] };
}

export function novoId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
