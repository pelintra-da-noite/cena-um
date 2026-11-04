import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { EditorState } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import type { Projeto } from '../types';
import { dividirEmCenas, sinopse, reordenarCenas, atosPadrao, atosDasCenas } from '../editor/cenas';
import { extrairLocal, formatarSegundos, Layout } from '../editor/layout';
import { IFechar } from '../components/Icones';

interface Props {
  view: EditorView;
  estado: EditorState;
  layout: Layout;
  projeto: Projeto;
  onProjeto: (f: (p: Projeto) => Projeto) => void;
  onIrParaCena: (indice: number) => void;
  onCarregarStoryboard: (cenaId: string) => void;
}

type Modo = 'ato' | 'personagem' | 'local';

const titulo = (s: string) => s.toLowerCase().replace(/(^|\s)(\S)/g, (_m, a, b) => a + b.toUpperCase());

export default function VistaQuadro({ view, estado, layout, projeto, onProjeto, onIrParaCena, onCarregarStoryboard }: Props) {
  const [modo, setModo] = useState<Modo>('ato');
  const [arrasto, setArrasto] = useState<string | null>(null);
  const [alvo, setAlvo] = useState<{ col: number; antes: string | null } | null>(null);

  // ---------- scroll automático enquanto se arrasta ----------
  // Perto do topo/fundo de uma coluna, a coluna anda; perto das laterais do quadro, o quadro anda.
  const ponteiro = useRef<{ x: number; y: number } | null>(null);
  const colunasRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!arrasto) { ponteiro.current = null; return; }
    let raf = 0;
    const ZONA = 80;
    const velocidade = (dist: number) => Math.ceil(((ZONA - dist) / ZONA) * 18) + 2;
    const passo = () => {
      const p = ponteiro.current;
      if (p) {
        const debaixo = document.elementFromPoint(p.x, p.y) as HTMLElement | null;
        const lista = debaixo?.closest('.coluna')?.querySelector('.coluna-lista') as HTMLElement | null;
        if (lista) {
          const r = lista.getBoundingClientRect();
          if (p.y < r.top + ZONA) lista.scrollTop -= velocidade(Math.max(0, p.y - r.top));
          else if (p.y > r.bottom - ZONA) lista.scrollTop += velocidade(Math.max(0, r.bottom - p.y));
        }
        const cont = colunasRef.current;
        if (cont) {
          const r = cont.getBoundingClientRect();
          if (p.x < r.left + ZONA) cont.scrollLeft -= velocidade(Math.max(0, p.x - r.left));
          else if (p.x > r.right - ZONA) cont.scrollLeft += velocidade(Math.max(0, r.right - p.x));
        }
      }
      raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    const mover = (e: DragEvent) => { if (e.clientX || e.clientY) ponteiro.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener('dragover', mover, true);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('dragover', mover, true); };
  }, [arrasto]);

  const blocos = useMemo(() => dividirEmCenas(estado.doc).cenas, [estado.doc]);
  const info = useMemo(() => new Map(layout.cenas.map((c) => [c.id, c])), [layout]);
  const atos = projeto.meta.atos && projeto.meta.atos.length ? projeto.meta.atos : atosPadrao(projeto.meta.tipo);
  const ids = blocos.map((b) => b.id);
  const atoDe = atosDasCenas(ids, projeto.meta);
  const porId = new Map(blocos.map((b) => [b.id, b]));

  const colunas = useMemo(() => {
    if (modo === 'ato') return atos.map((nome, a) => ({ nome, ids: ids.filter((_x, i) => atoDe[i] === a) }));
    if (modo === 'personagem') {
      return layout.personagens.map((p) => ({ nome: titulo(p), ids: layout.cenas.filter((c) => c.personagens.includes(p)).map((c) => c.id) }));
    }
    const locais = new Map<string, string[]>();
    layout.cenas.forEach((c) => {
      const l = extrairLocal(c.texto) || 'Sem local';
      locais.set(l, [...(locais.get(l) || []), c.id]);
    });
    return [...locais.entries()].map(([nome, l]) => ({ nome: titulo(nome), ids: l }));
  }, [modo, atos, ids.join('|'), atoDe.join('|'), layout]); // eslint-disable-line

  // ---------- atos ----------
  const guardarAtos = (novos: string[], atoCena: Record<string, number>) =>
    onProjeto((p) => ({ ...p, meta: { ...p.meta, atos: novos, atoCena } }));
  const atribuicaoAtual = () => Object.fromEntries(ids.map((id, i) => [id, atoDe[i]]));
  const renomear = (a: number, nome: string) => {
    const novos = [...atos];
    novos[a] = nome.trim() || atos[a];
    guardarAtos(novos, atribuicaoAtual());
  };
  const adicionarAto = () => guardarAtos([...atos, `Ato ${numeroRomano(atos.length + 1)}`], atribuicaoAtual());
  const removerAto = (a: number) => {
    const atual = atribuicaoAtual();
    const nova: Record<string, number> = {};
    for (const [id, v] of Object.entries(atual)) nova[id] = v > a ? v - 1 : v;
    guardarAtos(atos.filter((_x, i) => i !== a), nova);
  };

  // ---------- arrastar e largar ----------
  const largar = () => {
    if (!arrasto || !alvo) { setArrasto(null); setAlvo(null); return; }
    const cols = atos.map((_n, a) => ids.filter((x, i) => atoDe[i] === a && x !== arrasto));
    const col = cols[alvo.col];
    const pos = alvo.antes ? col.indexOf(alvo.antes) : -1;
    col.splice(pos < 0 ? col.length : pos, 0, arrasto);
    const ordem = cols.flat();
    const atoCena: Record<string, number> = {};
    cols.forEach((c, a) => c.forEach((x) => { atoCena[x] = a; }));
    if (ordem.join('|') !== ids.join('|')) reordenarCenas(view, ordem);
    guardarAtos(atos, atoCena);
    setArrasto(null);
    setAlvo(null);
  };

  const sobreCartao = (e: React.DragEvent, col: number, id: string, lista: string[]) => {
    if (modo !== 'ato' || !arrasto) return;
    e.preventDefault();
    e.stopPropagation();
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const depois = e.clientY > r.top + r.height / 2;
    const i = lista.indexOf(id);
    const antes = depois ? lista[i + 1] ?? null : id;
    if (!alvo || alvo.col !== col || alvo.antes !== antes) setAlvo({ col, antes });
  };

  return (
    <main className="vista">
      <div className="vista-cab">
        <h1>Quadro de cenas</h1>
        <span className="vista-sub">{modo === 'ato' ? 'Arrasta um cartão para reordenar. O guião acompanha (Ctrl+Z desfaz).' : 'Vista de consulta. Para reordenar, usa a vista por ato.'}</span>
        <span className="flex1" />
        <div className="segmentos" role="group" aria-label="Agrupar">
          <button className={modo === 'ato' ? 'ativo' : ''} onClick={() => setModo('ato')}>Por ato</button>
          <button className={modo === 'personagem' ? 'ativo' : ''} onClick={() => setModo('personagem')}>Por personagem</button>
          <button className={modo === 'local' ? 'ativo' : ''} onClick={() => setModo('local')}>Por local</button>
        </div>
      </div>

      {blocos.length === 0 ? (
        <div className="vista-vazia">Ainda não há cenas. Escreve um cabeçalho (INT. ou EXT.) no guião e as cenas aparecem aqui.</div>
      ) : (
        <div className="colunas" ref={colunasRef} onDragEnd={() => { setArrasto(null); setAlvo(null); }}>
          {colunas.map((c, col) => {
            const segundos = c.ids.reduce((s, id) => s + (info.get(id)?.segundos || 0), 0);
            return (
              <section key={modo + col} className={'coluna' + (alvo?.col === col ? ' alvo' : '')}
                onDragOver={(e) => { if (modo === 'ato' && arrasto) { e.preventDefault(); if (!alvo || alvo.col !== col) setAlvo({ col, antes: null }); } }}
                onDrop={(e) => { e.preventDefault(); largar(); }}>
                <div className="coluna-cab">
                  {modo === 'ato' ? (
                    <input className="nome-ato" defaultValue={c.nome} key={c.nome} aria-label="Nome do ato"
                      onBlur={(e) => { if (e.target.value !== c.nome) renomear(col, e.target.value); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
                  ) : <span className="nome-ato">{c.nome}</span>}
                  <span className="coluna-resumo">{c.ids.length} cena{c.ids.length === 1 ? '' : 's'} · {formatarSegundos(segundos)}</span>
                  {modo === 'ato' && c.ids.length === 0 && atos.length > 1 && (
                    <button className="btn-icone" aria-label={`Remover ${c.nome}`} title="Remover este ato vazio" onClick={() => removerAto(col)}><IFechar /></button>
                  )}
                </div>
                <div className="coluna-lista">
                  {c.ids.map((id) => {
                    const b = porId.get(id);
                    const ci = info.get(id);
                    if (!b || !ci) return null;
                    const quadros = projeto.storyboard[id] || [];
                    return (
                      <React.Fragment key={id}>
                        {modo === 'ato' && alvo?.col === col && alvo.antes === id && arrasto !== id && <div className="indicador" />}
                        <article className={'cartao-cena' + (arrasto === id ? ' a-arrastar' : '')}
                          draggable={modo === 'ato'}
                          onDragStart={(e) => { setArrasto(id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', id); }}
                          onDrag={(e) => { if (e.clientX || e.clientY) ponteiro.current = { x: e.clientX, y: e.clientY }; }}
                          onDragOver={(e) => sobreCartao(e, col, id, c.ids)}
                          onDrop={(e) => { e.preventDefault(); e.stopPropagation(); largar(); }}>
                          <div className="cartao-sb">
                            {quadros[0] ? (
                              <button className="sb-mini" onClick={() => onIrParaCena(ci.indice)} title="Abrir a cena no guião">
                                <img src={quadros[0].src} alt="" />
                                <span>{quadros.length} plano{quadros.length > 1 ? 's' : ''}</span>
                              </button>
                            ) : (
                              <button className="sb-vazio" onClick={() => onCarregarStoryboard(id)}>+ Storyboard</button>
                            )}
                          </div>
                          <button className="cartao-texto" onClick={() => onIrParaCena(ci.indice)} title="Abrir a cena no guião">
                            <span className="cartao-titulo"><b>{ci.numero}</b><span>{ci.texto || 'Cena sem cabeçalho'}</span></span>
                            <span className="cartao-sinopse">{sinopse(b) || 'Sem ação escrita.'}</span>
                            <span className="cartao-meta">{formatarSegundos(ci.segundos)}{ci.personagens.length ? ' · ' + ci.personagens.map(titulo).join(', ') : ''}</span>
                          </button>
                        </article>
                      </React.Fragment>
                    );
                  })}
                  {modo === 'ato' && alvo?.col === col && alvo.antes === null && <div className="indicador" />}
                  {c.ids.length === 0 && <div className="coluna-vazia">Larga aqui uma cena.</div>}
                </div>
              </section>
            );
          })}
          {modo === 'ato' && <button className="btn btn-tracejado coluna-nova" onClick={adicionarAto}>+ Ato</button>}
        </div>
      )}
    </main>
  );
}

function numeroRomano(n: number): string {
  const t: [number, string][] = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let r = '';
  for (const [v, s] of t) while (n >= v) { r += s; n -= v; }
  return r;
}
