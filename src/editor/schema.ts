import { Schema, NodeSpec } from 'prosemirror-model';
import type { TipoProjeto } from '../types';

export type Elemento = 'cena' | 'acao' | 'personagem' | 'dialogo' | 'parentetico' | 'transicao';

export const ELEMENTOS: Elemento[] = ['cena', 'acao', 'personagem', 'dialogo', 'parentetico', 'transicao'];

// Todos os blocos guardam um id: um cabeçalho que muda de tipo leva o id consigo
// e, ao voltar a ser cabeçalho, recupera o storyboard e os planos da cena.
const bloco = (nome: Elemento, extra: Partial<NodeSpec> = {}): NodeSpec => ({
  attrs: { id: { default: null } },
  content: 'text*',
  marks: '_',
  group: 'block',
  defining: true,
  parseDOM: [{ tag: `p.el-${nome}` }],
  toDOM: () => ['p', { class: `el el-${nome}` }, 0],
  ...extra
});

export const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    cena: bloco('cena', {
      attrs: { id: { default: null } },
      parseDOM: [{ tag: 'p.el-cena', getAttrs: (d) => ({ id: (d as HTMLElement).getAttribute('data-id') }) }],
      toDOM: (n) => ['p', { class: 'el el-cena', 'data-id': n.attrs.id }, 0]
    }),
    acao: bloco('acao', { parseDOM: [{ tag: 'p.el-acao' }, { tag: 'p', priority: 10 }] }),
    personagem: bloco('personagem', { toDOM: () => ['p', { class: 'el el-personagem', spellcheck: 'false' }, 0] }),
    dialogo: bloco('dialogo'),
    parentetico: bloco('parentetico'),
    transicao: bloco('transicao'),
    text: {}
  },
  marks: {
    negrito: { parseDOM: [{ tag: 'strong' }, { tag: 'b' }], toDOM: () => ['strong', 0] },
    italico: { parseDOM: [{ tag: 'em' }, { tag: 'i' }], toDOM: () => ['em', 0] },
    sublinhado: { parseDOM: [{ tag: 'u' }], toDOM: () => ['u', 0] }
  }
});

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
