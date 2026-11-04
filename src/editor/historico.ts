import type { Node as PMNode } from 'prosemirror-model';
import type { EditorState, Transaction } from 'prosemirror-state';
import { isHistoryTransaction } from 'prosemirror-history';

/**
 * Histórico de momentos do guião (para recuperar enganos).
 * Em vez de guardar cada tecla, agrupa: uma pausa de escrita, mover cenas, formatar, colar…
 * Cada momento guarda o documento completo tal como ficou depois dessa ação.
 */
export interface Momento {
  id: number;
  hora: number;
  rotulo: string;
  doc: PMNode;
  palavras: number;
}

const MAX = 120;
const PAUSA_ESCRITA = 2000;

export function contarPalavras(doc: PMNode): number {
  let n = 0;
  doc.forEach((b) => { const t = b.textContent.trim(); if (t) n += t.split(/\s+/).length; });
  return n;
}

function cenaDoCursor(state: EditorState): string {
  const idx = state.selection.$from.index(0);
  let nome = '';
  let num = 0;
  state.doc.forEach((n, _p, i) => {
    if (n.type.name === 'cena') { num++; if (i <= idx) nome = `cena ${num}`; }
  });
  return nome || 'início do guião';
}

/** Dá um nome à transação, ou null se for escrita normal (agrupada por pausas) */
export function rotuloDe(tr: Transaction, antes: EditorState): string | null {
  const meta = tr.getMeta('rotulo');
  if (meta) return meta;
  const ev = tr.getMeta('uiEvent');
  if (ev === 'paste') return `Colaste texto na ${cenaDoCursor(antes)}`;
  if (ev === 'cut') return `Cortaste texto na ${cenaDoCursor(antes)}`;
  if (ev === 'drop') return 'Arrastaste texto';
  const apagado = antes.doc.content.size - tr.doc.content.size;
  if (apagado > 200) return `Apagaste um bloco de texto na ${cenaDoCursor(antes)}`;
  return null;
}

export class Historico {
  momentos: Momento[] = [];
  private seq = 0;
  private timer: number | null = null;
  private pendente: { rotulo: string; obterDoc: () => PMNode } | null = null;
  constructor(private aoMudar: () => void) {}

  registar(rotulo: string, doc: PMNode) {
    this.descarregar();
    const ultimo = this.momentos[this.momentos.length - 1];
    if (ultimo && ultimo.doc.eq(doc)) return;
    this.momentos.push({ id: ++this.seq, hora: Date.now(), rotulo, doc, palavras: contarPalavras(doc) });
    if (this.momentos.length > MAX) this.momentos.splice(1, this.momentos.length - MAX); // guarda sempre o primeiro
    this.aoMudar();
  }

  /** Chamar a cada transação que altera o documento */
  transacao(tr: Transaction, antes: EditorState, depois: () => EditorState) {
    if (!tr.docChanged) return;
    // Desfazer/refazer só navega entre estados: não cria momentos novos (o painel marca onde estás)
    if (isHistoryTransaction(tr)) { this.descarregar(); return; }
    const r = rotuloDe(tr, antes);
    if (r) { this.registar(r, tr.doc); return; }
    const rotulo = `Escreveste na ${cenaDoCursor(antes)}`;
    if (this.pendente && this.pendente.rotulo !== rotulo) this.descarregar();
    this.pendente = { rotulo, obterDoc: () => depois().doc };
    if (this.timer) window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.descarregar(), PAUSA_ESCRITA);
  }

  descarregar() {
    if (this.timer) { window.clearTimeout(this.timer); this.timer = null; }
    const p = this.pendente;
    this.pendente = null;
    if (p) this.registar(p.rotulo, p.obterDoc());
  }

  limpar() { if (this.timer) window.clearTimeout(this.timer); }
}
