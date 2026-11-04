import type { EditorState, Transaction } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import type { MarkType } from 'prosemirror-model';
import { schema, Alinhamento } from './schema';
import { t } from '../i18n';

type NomeMarca = 'negrito' | 'italico' | 'sublinhado' | 'riscado';
type NomeValor = 'fonte' | 'tamanho' | 'cor';

/** Zona a formatar: a seleção, ou a palavra onde está o cursor (como no Word) */
function alvo(state: EditorState): { from: number; to: number } | null {
  const { from, to, empty, $from } = state.selection;
  if (!empty) return { from, to };
  const bloco = $from.parent;
  if (!bloco.isTextblock) return null;
  const texto = bloco.textContent;
  const off = $from.parentOffset;
  const letra = /[\p{L}\p{N}'’-]/u;
  let a = off;
  let b = off;
  while (a > 0 && letra.test(texto[a - 1])) a--;
  while (b < texto.length && letra.test(texto[b])) b++;
  if (a === b) return null;
  const inicio = $from.start();
  return { from: inicio + a, to: inicio + b };
}

function marcaEm(state: EditorState, tipo: MarkType) {
  const z = alvo(state);
  if (!z) return (state.storedMarks || state.selection.$from.marks()).find((m) => m.type === tipo) || null;
  let achada: any = null;
  let todos = true;
  state.doc.nodesBetween(z.from, z.to, (n) => {
    if (!n.isText) return;
    const m = tipo.isInSet(n.marks);
    if (m) achada = achada || m;
    else todos = false;
  });
  return todos ? achada : null;
}

export interface EstadoFormatacao {
  negrito: boolean;
  italico: boolean;
  sublinhado: boolean;
  riscado: boolean;
  fonte: string; // css ('' = padrão)
  tamanho: number;
  cor: string | null;
  alinhamento: Alinhamento;
}

export function lerFormatacao(state: EditorState): EstadoFormatacao {
  const m = (n: string) => marcaEm(state, schema.marks[n]);
  return {
    negrito: !!m('negrito'),
    italico: !!m('italico'),
    sublinhado: !!m('sublinhado'),
    riscado: !!m('riscado'),
    fonte: m('fonte')?.attrs.css || '',
    tamanho: m('tamanho')?.attrs.pt || 12,
    cor: m('cor')?.attrs.valor || null,
    alinhamento: state.selection.$from.parent.attrs.alinhamento ?? null
  };
}

function aplicar(view: EditorView, f: (tr: Transaction, z: { from: number; to: number } | null) => void) {
  const tr = view.state.tr;
  tr.setMeta('rotulo', t('Mudaste a formatação'));
  f(tr, alvo(view.state));
  view.dispatch(tr);
  view.focus();
}

export function alternarMarca(view: EditorView, nome: NomeMarca) {
  const tipo = schema.marks[nome];
  const ativa = !!marcaEm(view.state, tipo);
  aplicar(view, (tr, z) => {
    if (!z) { ativa ? tr.removeStoredMark(tipo) : tr.addStoredMark(tipo.create()); return; }
    ativa ? tr.removeMark(z.from, z.to, tipo) : tr.addMark(z.from, z.to, tipo.create());
  });
}

/** valor null (ou o valor de origem) retira a marca */
export function definirValor(view: EditorView, nome: NomeValor, valor: string | number | null) {
  const tipo = schema.marks[nome];
  const origem = valor === null || valor === '' || (nome === 'tamanho' && valor === 12);
  const attrs = nome === 'fonte' ? { css: valor } : nome === 'tamanho' ? { pt: valor } : { valor };
  aplicar(view, (tr, z) => {
    if (!z) {
      tr.removeStoredMark(tipo);
      if (!origem) tr.addStoredMark(tipo.create(attrs));
      return;
    }
    tr.removeMark(z.from, z.to, tipo);
    if (!origem) tr.addMark(z.from, z.to, tipo.create(attrs));
  });
}

export function definirAlinhamento(view: EditorView, valor: Alinhamento) {
  const { from, to } = view.state.selection;
  aplicar(view, (tr) => {
    view.state.doc.nodesBetween(from, to, (n, pos) => {
      if (n.isTextblock) { tr.setNodeMarkup(pos, undefined, { ...n.attrs, alinhamento: valor }); return false; }
      return true;
    });
  });
}

export function limparFormatacao(view: EditorView) {
  const { from, to } = view.state.selection;
  aplicar(view, (tr, z) => {
    const zona = z || { from, to };
    for (const m of Object.values(schema.marks)) tr.removeMark(zona.from, zona.to, m);
    tr.setStoredMarks([]);
    view.state.doc.nodesBetween(from, to, (n, pos) => {
      if (n.isTextblock && n.attrs.alinhamento) tr.setNodeMarkup(pos, undefined, { ...n.attrs, alinhamento: null });
      return !n.isTextblock;
    });
  });
}
