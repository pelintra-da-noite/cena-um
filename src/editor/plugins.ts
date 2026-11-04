import { Plugin, PluginKey, EditorState, TextSelection, Transaction } from 'prosemirror-state';
import { Decoration, DecorationSet, EditorView } from 'prosemirror-view';
import { keymap } from 'prosemirror-keymap';
import { history, undo, redo } from 'prosemirror-history';
import { baseKeymap, toggleMark } from 'prosemirror-commands';
import { schema, Elemento, DEPOIS_DE_ENTER, CICLO_TAB, novoId, ELEMENTOS } from './schema';
import { calcularLayout, Layout, nomePersonagem, extrairLocal, emTeatro } from './layout';
import type { Papel } from '../types';

type Cmd = (state: EditorState, dispatch?: (tr: Transaction) => void) => boolean;

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------
export function blocoAtual(state: EditorState) {
  const $from = state.selection.$from;
  const node = $from.node(1);
  const inicio = $from.before(1);
  return { node, inicio, fim: inicio + (node ? node.nodeSize : 0), el: node?.type.name as Elemento, $from };
}

export function definirElemento(el: Elemento): Cmd {
  return (state, dispatch) => {
    const { node, inicio } = blocoAtual(state);
    if (!node || node.type.name === el) return false;
    if (dispatch) {
      const id = node.attrs.id || (el === 'cena' ? novoId() : null);
      const tr = state.tr.setNodeMarkup(inicio, schema.nodes[el], { ...node.attrs, id });
      if (el === 'parentetico' && node.textContent === '') {
        tr.insertText('()', inicio + 1);
        tr.setSelection(TextSelection.create(tr.doc, inicio + 2));
      }
      if (node.type.name === 'parentetico' && /^\(\)$/.test(node.textContent)) {
        tr.delete(inicio + 1, inicio + 3);
      }
      dispatch(tr.scrollIntoView());
    }
    return true;
  };
}

const cicloTab = (reverso: boolean): Cmd => (state, dispatch) => {
  const { el } = blocoAtual(state);
  if (!el) return false;
  let destino: Elemento;
  if (!reverso) destino = CICLO_TAB[el];
  else destino = (Object.keys(CICLO_TAB) as Elemento[]).find((k) => CICLO_TAB[k] === el) || el;
  return definirElemento(destino)(state, dispatch);
};

// ---------------------------------------------------------------------------
// Autocompletar personagens e locais
// ---------------------------------------------------------------------------
const MOMENTOS = ['DIA', 'NOITE', 'MANHÃ', 'TARDE', 'FIM DE TARDE', 'MADRUGADA', 'CONTÍNUO', 'MAIS TARDE', 'MOMENTOS DEPOIS'];

export interface Sugestao { resto: string; pos: number; }

export function calcularSugestao(state: EditorState, layout: Layout | null, extra: string[] = []): Sugestao | null {
  if (!layout || !state.selection.empty) return null;
  const { node, fim, el, $from } = blocoAtual(state);
  if (!node || $from.pos !== fim - 1) return null; // só no fim do bloco
  const texto = node.textContent;
  if (!texto.trim()) return null;
  const t = texto.toUpperCase();

  if (el === 'personagem') {
    if (texto.length < 1) return null;
    const outros = contarOcorrencias(state, nomePersonagem(texto));
    const todas = [...layout.personagens, ...extra.filter((x) => !layout.personagens.includes(x))];
    const cand = todas.find((p) => p.startsWith(t) && p !== t && !(p === nomePersonagem(texto) && outros <= 1));
    return cand ? { resto: cand.slice(t.length), pos: $from.pos } : null;
  }
  if (el === 'cena' && emTeatro()) {
    const p = ['ATO ', 'CENA ', 'PRÓLOGO', 'EPÍLOGO'].find((x) => x.startsWith(t) && x !== t);
    return p ? { resto: p.slice(t.length), pos: $from.pos } : null;
  }
  if (el === 'transicao' && emTeatro()) {
    const p = ['BLACKOUT.', 'PANO.', 'LUZ APAGA.', 'FIM.', 'INTERVALO.'].find((x) => x.startsWith(t) && x !== t);
    return p ? { resto: p.slice(t.length), pos: $from.pos } : null;
  }
  if (el === 'cena') {
    const m = t.match(/^((?:INT\.?\/EXT\.?|EXT\.?\/INT\.?|I\/E\.?|INT\.|EXT\.)\s+)(.*)$/);
    if (!m) {
      const prefixos = ['INT. ', 'EXT. ', 'INT./EXT. '];
      const p = prefixos.find((x) => x.startsWith(t) && x !== t);
      return p ? { resto: p.slice(t.length), pos: $from.pos } : null;
    }
    const corpo = m[2];
    const partes = corpo.split(/\s+[—–-]\s+/);
    if (partes.length >= 2 || /\s[—–-]\s?$/.test(corpo)) {
      const momento = corpo.replace(/^.*[—–-]\s?/, '');
      const espaco = /[—–-]$/.test(corpo) ? ' ' : '';
      const cand = MOMENTOS.find((x) => x.startsWith(momento) && x !== momento);
      return cand ? { resto: espaco + cand.slice(momento.length), pos: $from.pos } : null;
    }
    if (!corpo) return null;
    const atualLocal = extrairLocal(t);
    const cand = layout.locais.find((l) => l.startsWith(corpo) && l !== atualLocal);
    return cand ? { resto: cand.slice(corpo.length) + ' — ', pos: $from.pos } : null;
  }
  return null;
}

function contarOcorrencias(state: EditorState, nome: string): number {
  let n = 0;
  state.doc.forEach((b) => { if (b.type.name === 'personagem' && nomePersonagem(b.textContent) === nome) n++; });
  return n;
}

/** Insere a sugestão e normaliza o bloco em maiúsculas (personagens e cabeçalhos são sempre maiúsculos) */
function trAceitar(state: EditorState, s: Sugestao): Transaction {
  const { node, inicio } = blocoAtual(state);
  const tr = state.tr;
  const texto = (node.textContent + s.resto).toUpperCase();
  tr.replaceWith(inicio + 1, inicio + node.nodeSize - 1, schema.text(texto));
  tr.setSelection(TextSelection.create(tr.doc, inicio + 1 + texto.length));
  return tr;
}

const aceitarSugestao: Cmd = (state, dispatch) => {
  const s = paginasKey.getState(state)?.sugestao;
  if (!s) return false;
  if (dispatch) dispatch(trAceitar(state, s).scrollIntoView());
  return true;
};

// ---------------------------------------------------------------------------
// Enter inteligente
// ---------------------------------------------------------------------------
const enter: Cmd = (state, dispatch) => {
  const { node, inicio, fim, el, $from } = blocoAtual(state);
  if (!node) return false;

  // Com sugestão visível: aceita-a (no personagem, avança logo para o diálogo)
  const sug = paginasKey.getState(state)?.sugestao;
  if (sug && state.selection.empty) {
    if (el === 'personagem') {
      if (!dispatch) return true;
      const tr = trAceitar(state, sug);
      const novoFim = tr.selection.from;
      tr.split(novoFim, 1, [{ type: schema.nodes.dialogo }]);
      tr.setSelection(TextSelection.create(tr.doc, novoFim + 2));
      dispatch(tr.scrollIntoView());
      return true;
    }
    return aceitarSugestao(state, dispatch);
  }

  // Bloco vazio de diálogo/personagem/parentético → volta à ação
  if (node.textContent === '' && (el === 'personagem' || el === 'dialogo' || el === 'parentetico' || el === 'transicao')) {
    return definirElemento('acao')(state, dispatch);
  }

  if (!dispatch) return true;
  const tr = state.tr;
  if (!state.selection.empty) tr.deleteSelection();
  const $p = tr.selection.$from;
  const no = $p.node(1);
  const ini = $p.before(1);
  const fimNo = ini + no.nodeSize;
  const tipo = no.type.name as Elemento;
  let pos = $p.pos;
  // parentético: se o cursor está antes do ")" final, salta-o
  if (tipo === 'parentetico' && no.textContent.endsWith(')') && pos === fimNo - 2) pos = fimNo - 1;
  const noFim = pos === fimNo - 1;
  const proximo: Elemento = noFim ? DEPOIS_DE_ENTER[tipo] : tipo;
  const attrs = proximo === 'cena' ? { id: novoId() } : null;
  tr.split(pos, 1, [{ type: schema.nodes[proximo], attrs }]);
  tr.setSelection(TextSelection.create(tr.doc, pos + 2));
  dispatch(tr.scrollIntoView());
  void inicio; void fim; void $from;
  return true;
};

const enterMesmoTipo: Cmd = (state, dispatch) => {
  const { node, el } = blocoAtual(state);
  if (!node) return false;
  if (!dispatch) return true;
  const tr = state.tr.deleteSelection();
  const pos = tr.selection.from;
  tr.split(pos, 1, [{ type: schema.nodes[el], attrs: el === 'cena' ? { id: novoId() } : null }]);
  tr.setSelection(TextSelection.create(tr.doc, pos + 2));
  dispatch(tr.scrollIntoView());
  return true;
};

const setaDireita: Cmd = (state, dispatch) => aceitarSugestao(state, dispatch);

export function teclado() {
  const k: Record<string, Cmd> = {
    'Enter': enter,
    'Shift-Enter': enterMesmoTipo,
    'Tab': cicloTab(false),
    'Shift-Tab': cicloTab(true),
    'ArrowRight': setaDireita,
    'Mod-z': undo,
    'Mod-y': redo,
    'Mod-Shift-z': redo,
    'Mod-b': toggleMark(schema.marks.negrito),
    'Mod-i': toggleMark(schema.marks.italico),
    'Mod-u': toggleMark(schema.marks.sublinhado)
  };
  ELEMENTOS.forEach((el, i) => { k[`Mod-${i + 1}`] = definirElemento(el); });
  return [keymap(k), keymap(baseKeymap)];
}

// ---------------------------------------------------------------------------
// Automatismos: INT./EXT. → cabeçalho, "( " → parentético, transições, ids
// ---------------------------------------------------------------------------
const automatismos = new Plugin({
  appendTransaction(trs, _velho, state) {
    if (!trs.some((t) => t.docChanged)) return null;
    let tr: Transaction | null = null;
    const vistos = new Set<string>();
    const sel = state.selection.$from;
    const blocoCursor = sel.depth >= 1 ? sel.before(1) : -1;

    state.doc.forEach((node, pos) => {
      const el = node.type.name as Elemento;
      const txt = node.textContent;
      if (el === 'cena') {
        if (!node.attrs.id || vistos.has(node.attrs.id)) {
          tr = tr || state.tr;
          tr.setNodeMarkup(pos, undefined, { ...node.attrs, id: novoId() });
        } else vistos.add(node.attrs.id);
      }
      if (pos !== blocoCursor) return;
      // só no momento em que se escreve o prefixo, para respeitar quem muda o elemento à mão
      if (el === 'acao' && /^(INT\.?\/EXT\.|EXT\.?\/INT\.|I\/E\.|INT\.|EXT\.) $/i.test(txt)) {
        tr = tr || state.tr;
        tr.setNodeMarkup(pos, schema.nodes.cena, { ...node.attrs, id: node.attrs.id || novoId() });
      } else if (el === 'acao' && /^[A-ZÀ-Ý ]{2,}(PARA|A NEGRO|OUT|IN):$/.test(txt)) {
        tr = tr || state.tr;
        tr.setNodeMarkup(pos, schema.nodes.transicao, { ...node.attrs });
      } else if (el === 'dialogo' && txt === '(') {
        tr = tr || state.tr;
        tr.setNodeMarkup(pos, schema.nodes.parentetico, { ...node.attrs });
        tr.insertText(')', pos + 2);
        tr.setSelection(TextSelection.create(tr.doc, pos + 2));
      }
    });
    return tr;
  }
});

// ---------------------------------------------------------------------------
// Paginação, dicas de preenchimento e sugestões (decorações)
// ---------------------------------------------------------------------------
interface EstadoPaginas {
  papel: Papel;
  layout: Layout;
  sugestao: Sugestao | null;
  extra: string[]; // personagens acrescentadas à mão (sem falas)
}

export const paginasKey = new PluginKey<EstadoPaginas>('paginas');

const DICAS: Record<Elemento, string> = {
  cena: 'INT. LOCAL — DIA',
  acao: 'Descreve o que se vê…',
  personagem: 'NOME DA PERSONAGEM',
  dialogo: 'Fala…',
  parentetico: '',
  transicao: 'CORTA PARA:'
};

const DICAS_TEATRO: Partial<Record<Elemento, string>> = {
  cena: 'ATO I — CENA 1',
  acao: 'Didascália: espaço, entradas, gestos…',
  transicao: 'BLACKOUT.'
};

function paginasPlugin(papelInicial: Papel) {
  return new Plugin<EstadoPaginas>({
    key: paginasKey,
    state: {
      init(_c, state) {
        const layout = calcularLayout(state.doc, papelInicial);
        return { papel: papelInicial, layout, sugestao: calcularSugestao(state, layout), extra: [] };
      },
      apply(tr, valor, _velho, novo) {
        const papel: Papel = tr.getMeta('papel') || valor.papel;
        const extra: string[] = tr.getMeta('personagensExtra') || valor.extra;
        const layout = tr.docChanged || papel !== valor.papel ? calcularLayout(novo.doc, papel) : valor.layout;
        const sugestao = tr.docChanged || tr.selectionSet || papel !== valor.papel ? calcularSugestao(novo, layout, extra) : valor.sugestao;
        return { papel, layout, sugestao, extra };
      }
    },
    props: {
      decorations(state) {
        const st = paginasKey.getState(state);
        if (!st) return null;
        const decos: Decoration[] = [];
        let i = 0;
        state.doc.forEach((node, pos) => {
          if (st.layout.quebraAntes[i]) {
            const pagina = st.layout.paginaDoNo[i] + 1;
            decos.push(Decoration.widget(pos, () => {
              const d = document.createElement('div');
              d.className = 'quebra-pagina';
              d.contentEditable = 'false';
              const n = document.createElement('span');
              n.className = 'num-pagina';
              n.textContent = `${pagina}.`;
              d.appendChild(n);
              return d;
            }, { side: -1, key: `qp-${pagina}`, ignoreSelection: true }));
          }
          i++;
        });
        // dica no bloco vazio onde está o cursor
        const { node, inicio, el } = blocoAtual(state);
        const dica = (emTeatro() && DICAS_TEATRO[el]) || DICAS[el];
        if (node && node.textContent === '' && dica) {
          decos.push(Decoration.node(inicio, inicio + node.nodeSize, { class: 'vazio', 'data-dica': dica }));
        }
        // sugestão em fantasma
        if (st.sugestao) {
          const resto = st.sugestao.resto;
          decos.push(Decoration.widget(st.sugestao.pos, () => {
            const s = document.createElement('span');
            s.className = 'fantasma';
            s.textContent = resto;
            return s;
          }, { side: 1, key: 'sug-' + resto }));
        }
        return DecorationSet.create(state.doc, decos);
      }
    }
  });
}

export function criarPlugins(papel: Papel) {
  return [history(), ...teclado(), automatismos, paginasPlugin(papel)];
}

export function mudarPapel(view: EditorView, papel: Papel) {
  view.dispatch(view.state.tr.setMeta('papel', papel));
}

export function mudarPersonagensExtra(view: EditorView, nomes: string[]) {
  view.dispatch(view.state.tr.setMeta('personagensExtra', nomes));
}
