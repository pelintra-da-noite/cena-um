import { Fragment, Node as PMNode } from 'prosemirror-model';
import { TextSelection } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import type { MetaProjeto, Plano, TipoProjeto } from '../types';
import { nomePersonagem } from './layout';
import { novoId } from './schema';
import { t as tx } from '../i18n';

export interface BlocoCena {
  id: string;
  cabecalho: PMNode;
  nos: PMNode[]; // inclui o cabeçalho
}

/** Divide o documento em cenas (cabeçalho + tudo até ao cabeçalho seguinte) */
export function dividirEmCenas(doc: PMNode): { preambulo: PMNode[]; cenas: BlocoCena[] } {
  const preambulo: PMNode[] = [];
  const cenas: BlocoCena[] = [];
  doc.forEach((n) => {
    if (n.type.name === 'cena') cenas.push({ id: n.attrs.id, cabecalho: n, nos: [n] });
    else if (cenas.length) cenas[cenas.length - 1].nos.push(n);
    else preambulo.push(n);
  });
  return { preambulo, cenas };
}

/** Primeira linha de ação de cada cena, para os cartões do quadro */
export function sinopse(b: BlocoCena, max = 150): string {
  const acao = b.nos.find((n) => n.type.name === 'acao' && n.textContent.trim());
  if (!acao) return '';
  const t = acao.textContent.trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t;
}

/** Reescreve o documento com as cenas na ordem dada (pode ser anulado com Ctrl+Z) */
export function reordenarCenas(view: EditorView, ordem: string[]) {
  const { preambulo, cenas } = dividirEmCenas(view.state.doc);
  const porId = new Map(cenas.map((c) => [c.id, c]));
  const usados = new Set<string>();
  const nos: PMNode[] = [...preambulo];
  for (const id of ordem) {
    const c = porId.get(id);
    if (c && !usados.has(id)) { nos.push(...c.nos); usados.add(id); }
  }
  for (const c of cenas) if (!usados.has(c.id)) nos.push(...c.nos); // nada se perde
  const tr = view.state.tr.replaceWith(0, view.state.doc.content.size, Fragment.from(nos));
  tr.setSelection(TextSelection.atStart(tr.doc));
  tr.setMeta('rotulo', tx('Reorganizaste as cenas no quadro'));
  view.dispatch(tr);
}

// ---------------------------------------------------------------------------
// Atos (colunas do quadro)
// ---------------------------------------------------------------------------
export function atosPadrao(tipo: TipoProjeto): string[] {
  const a = (n: string) => tx('Ato {n}', { n });
  if (tipo === 'teatro') return [a('I'), a('II')];
  if (tipo === 'serie') return ['Teaser', a('I'), a('II'), a('III')];
  return [a('I'), a('II'), a('III')];
}

/** Ato de cada cena: a atribuída, ou a da cena anterior (as cenas novas seguem a vizinha) */
export function atosDasCenas(ids: string[], meta: MetaProjeto): number[] {
  const atos = meta.atos && meta.atos.length ? meta.atos : atosPadrao(meta.tipo);
  const mapa = meta.atoCena || {};
  let anterior = 0;
  return ids.map((id) => {
    const a = mapa[id];
    const v = typeof a === 'number' ? Math.min(Math.max(a, anterior), atos.length - 1) : anterior;
    anterior = v;
    return v;
  });
}

// ---------------------------------------------------------------------------
// Guião técnico: estrutura gerada a partir do guião literário
// ---------------------------------------------------------------------------
export function planosDaCena(b: BlocoCena, quadros: { id: string }[]): Plano[] {
  const planos: Plano[] = [];
  let personagem = '';
  for (const n of b.nos.slice(1)) {
    const t = n.textContent.trim();
    if (!t) continue;
    switch (n.type.name) {
      case 'acao': planos.push(novoPlano(t, '')); break;
      case 'personagem': personagem = nomePersonagem(t); break;
      case 'dialogo': planos.push(novoPlano(`${capital(personagem)}: «${t}»`, tx('Diálogo'))); break;
      default: break;
    }
  }
  if (!planos.length) planos.push(novoPlano('', ''));
  // liga as imagens do storyboard pela ordem
  quadros.forEach((q, i) => { if (planos[i]) planos[i].quadroId = q.id; });
  return planos;
}

export function novoPlano(acao = '', som = ''): Plano {
  return { id: novoId(), quadroId: null, escala: '', movimento: '', acao, som, duracao: '' };
}

const capital = (s: string) => s.toLowerCase().replace(/(^|\s)(\S)/g, (_m, a, b) => a + b.toUpperCase());

export const ESCALAS = [
  'Plano geral', 'Plano de conjunto', 'Plano médio', 'Plano americano', 'Plano aproximado',
  'Grande plano', 'Muito grande plano', 'Pormenor', 'Inserto', 'Plano subjetivo', 'Contracampo'
];
export const MOVIMENTOS = [
  'Fixo', 'Panorâmica', 'Tilt', 'Travelling', 'Zoom', 'Câmara à mão', 'Steadicam', 'Grua', 'Drone'
];
