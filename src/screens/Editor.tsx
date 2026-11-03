import React, { useEffect, useMemo, useRef, useState } from 'react';
import { EditorState, TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import type { Definicoes, Projeto, Quadro } from '../types';
import { schema, ELEMENTOS, Elemento, rotulo, novoId } from '../editor/schema';
import { criarPlugins, paginasKey, definirElemento, blocoAtual, mudarPapel } from '../editor/plugins';
import { FORMATO, formatarSegundos, formatarTempo, Layout } from '../editor/layout';
import { reduzirImagem } from '../io/imagens';
import VistaQuadro from './VistaQuadro';
import VistaStoryboard from './VistaStoryboard';
import VistaTecnico from './VistaTecnico';
import Confirmar, { PedidoConfirmacao } from '../components/Confirmar';
import {
  ICasa, IGuiao, IQuadro, IStoryboard, ITecnico, IDefinicoes, IProcura, ICima, IBaixo, IFoco, IFechar, IVisto
} from '../components/Icones';

interface Props {
  projeto: Projeto;
  definicoes: Definicoes;
  viewRef: React.MutableRefObject<EditorView | null>;
  onAlterado: () => void;
  onProjeto: (f: (p: Projeto) => Projeto) => void;
  onDefinicoes: (d: Partial<Definicoes>) => void;
  onInicio: () => void;
  onAbrirDefinicoes: () => void;
  onExportar: (tecnico?: boolean) => void;
  avisar: (t: string) => void;
}

// Guia de estrutura para curtas (páginas pensadas para ~12 minutos; escala com a duração prevista)
const PASSOS = [
  { p: 1, t: 'Cena de abertura', q: 'Qual é a primeira imagem do filme? Deve dizer-nos logo algo sobre o mundo e o tom.' },
  { p: 2, t: 'Quem é a personagem', q: 'Quem seguimos e o que é que ela quer? Mostra-o em ação, não em explicação.' },
  { p: 3, t: 'Quem a rodeia', q: 'Que pessoas povoam o mundo dela? Cada uma devia empurrar ou travar o que ela quer.' },
  { p: 4, t: 'O obstáculo', q: 'O que se mete no caminho? Sem obstáculo não há história.' },
  { p: 6, t: 'Complicação', q: 'O que torna isto ainda mais difícil? Sobe a fasquia.' },
  { p: 8, t: 'Mudança', q: 'O que muda no estado de espírito ou na forma de ver da personagem?' },
  { p: 10, t: 'O pior momento', q: 'Qual é a pior coisa que pode acontecer agora?' },
  { p: 11, t: 'Reação', q: 'Como reage a personagem? É aqui que se vê quem ela realmente é.' },
  { p: 12, t: 'Desfecho', q: 'Dá para resolver? Onde deixamos as personagens no fim?' }
];

const SEM_TECLAS: Record<Elemento, string> = { cena: '1', acao: '2', personagem: '3', dialogo: '4', parentetico: '5', transicao: '6' };

export default function Editor(props: Props) {
  const { projeto, definicoes, viewRef, onProjeto, onDefinicoes, avisar } = props;
  const montagem = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const [estado, setEstado] = useState<EditorState | null>(null);
  const [procura, setProcura] = useState('');
  const [foco, setFoco] = useState(false);
  const [visor, setVisor] = useState<{ cenaId: string; i: number } | null>(null);
  const [vista, setVista] = useState<'guiao' | 'quadro' | 'storyboard' | 'tecnico'>('guiao');
  const [confirmacao, setConfirmacao] = useState<PedidoConfirmacao | null>(null);
  const confirmar = (titulo: string, texto: string, acao: () => void) => setConfirmacao({
    titulo, texto, botoes: [{ rotulo: 'Cancelar', acao: () => {} }, { rotulo: 'Continuar', principal: true, acao }]
  });
  const alteradoRef = useRef(props.onAlterado);
  alteradoRef.current = props.onAlterado;

  // ---------- montar o ProseMirror ----------
  useEffect(() => {
    const doc = schema.nodeFromJSON(projeto.guiao);
    const inicial = EditorState.create({ doc, plugins: criarPlugins(definicoes.papel) });
    const view: EditorView = new EditorView(montagem.current!, {
      state: inicial,
      attributes: { spellcheck: 'true', lang: 'pt-PT', 'aria-label': 'Guião', role: 'textbox', 'aria-multiline': 'true' },
      dispatchTransaction(tr) {
        const novo = view.state.apply(tr);
        view.updateState(novo);
        setEstado(novo);
        if (tr.docChanged) alteradoRef.current();
      }
    });
    viewRef.current = view;
    setEstado(inicial);
    // cursor no fim do documento
    const fim = TextSelection.atEnd(view.state.doc);
    view.dispatch(view.state.tr.setSelection(fim));
    view.focus();
    return () => { view.destroy(); viewRef.current = null; };
  }, []); // eslint-disable-line

  useEffect(() => { if (viewRef.current) mudarPapel(viewRef.current, definicoes.papel); }, [definicoes.papel, viewRef]);

  const [larguraArea, setLarguraArea] = useState(0);
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setLarguraArea(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape' && foco) setFoco(false); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [foco]);

  // ---------- dados derivados ----------
  const layout: Layout | null = estado ? paginasKey.getState(estado)?.layout || null : null;
  const indiceBloco = estado ? estado.selection.$from.index(0) : 0;
  const elAtual = estado ? (blocoAtual(estado).el as Elemento) : 'acao';
  const paginaAtual = layout ? (layout.paginaDoNo[indiceBloco] ?? 0) + 1 : 1;
  const cenaAtual = useMemo(() => {
    if (!layout) return null;
    let c = null;
    for (const x of layout.cenas) { if (x.indice <= indiceBloco) c = x; else break; }
    return c;
  }, [layout, indiceBloco]);

  const cenasFiltradas = useMemo(() => {
    if (!layout) return [];
    const q = procura.trim().toUpperCase();
    if (!q) return layout.cenas;
    return layout.cenas.filter((c) => c.texto.includes(q) || c.personagens.some((p) => p.includes(q)));
  }, [layout, procura]);

  const view = viewRef.current;

  // ---------- navegação ----------
  const irParaNo = (indice: number) => {
    const v = viewRef.current;
    if (!v) return;
    let pos = -1;
    v.state.doc.forEach((_n, p, i) => { if (i === indice) pos = p; });
    if (pos < 0) return;
    v.dispatch(v.state.tr.setSelection(TextSelection.create(v.state.doc, pos + 1)));
    const dom = v.nodeDOM(pos) as HTMLElement | null;
    dom?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    v.focus();
  };
  const irPara = (v: typeof vista) => {
    setVista(v);
    if (v === 'guiao') requestAnimationFrame(() => viewRef.current?.focus());
  };
  const irParaCena = (indice: number) => {
    setVista('guiao');
    requestAnimationFrame(() => requestAnimationFrame(() => irParaNo(indice)));
  };
  const irParaPagina = (n: number) => {
    if (!layout) return;
    const alvo = Math.min(Math.max(n, 1), layout.paginas) - 1;
    const i = layout.paginaDoNo.findIndex((p) => p === alvo);
    if (i >= 0) irParaNo(i);
  };
  const mudarElemento = (el: Elemento) => {
    const v = viewRef.current;
    if (!v) return;
    definirElemento(el)(v.state, v.dispatch);
    v.focus();
  };

  // ---------- storyboard ----------
  const quadrosDe = (id?: string | null): Quadro[] => (id ? projeto.storyboard[id] || [] : []);
  const carregarStoryboard = async (cenaId?: string) => {
    const id = cenaId || cenaAtual?.id;
    if (!id) return;
    const imgs = await window.cena.escolherImagens(true);
    if (!imgs.length) return;
    const novos: Quadro[] = [];
    for (const img of imgs) {
      try { novos.push({ id: novoId(), src: await reduzirImagem(img.dataUrl, 1280, 0.85), legenda: img.nome.replace(/\.[^.]+$/, '') }); }
      catch { avisar(`Não consegui ler ${img.nome}.`); }
    }
    onProjeto((p) => ({ ...p, storyboard: { ...p.storyboard, [id]: [...(p.storyboard[id] || []), ...novos] } }));
  };
  const alterarQuadro = (cenaId: string, i: number, f: (q: Quadro[]) => Quadro[]) => {
    onProjeto((p) => ({ ...p, storyboard: { ...p.storyboard, [cenaId]: f(p.storyboard[cenaId] || []) } }));
    void i;
  };

  // ---------- guia ----------
  const mostrarGuia = projeto.meta.tipo === 'curta' && projeto.meta.guia;
  const escala = Math.max(0.5, (projeto.meta.duracaoPrevista || 12) / 12);
  const passos = PASSOS.map((s, i) => ({ ...s, i, pag: s.p === 1 ? 1 : Math.max(2, Math.round(s.p * escala)) }));
  const passoAtual = [...passos].reverse().find((s) => s.pag <= paginaAtual) || passos[0];
  const feitos = new Set(projeto.meta.guiaFeito);
  const alternarPasso = (i: number) => onProjeto((p) => {
    const s = new Set(p.meta.guiaFeito);
    s.has(i) ? s.delete(i) : s.add(i);
    return { ...p, meta: { ...p.meta, guiaFeito: [...s] } };
  });
  const indiceAtualNaLista = passos.indexOf(passoAtual);
  const passosVisiveis = passos.slice(Math.max(0, indiceAtualNaLista - 1), Math.max(0, indiceAtualNaLista - 1) + 4);

  // ---------- duração ----------
  const minutos = layout?.minutos || 0;
  const alvo = projeto.meta.duracaoPrevista || 0;
  const racio = alvo ? minutos / alvo : 0;
  const totalLinhas = (layout?.linhasDialogo || 0) + (layout?.linhasAcao || 0);
  const pctDialogo = totalLinhas ? Math.round(((layout?.linhasDialogo || 0) / totalLinhas) * 100) : 0;

  const fmt = FORMATO[definicoes.papel];
  // Ajusta o zoom à largura disponível (portáteis de 1366 px, painéis abertos)
  const zoomAjuste = larguraArea > 0 ? (larguraArea - 32) / (fmt.larguraIn * 96) : 9;
  const zoomEfetivo = Math.max(0.7, definicoes.ajustar !== false ? Math.min(definicoes.zoom, zoomAjuste) : definicoes.zoom);
  const quadros = quadrosDe(cenaAtual?.id);
  const visorQuadros = visor ? quadrosDe(visor.cenaId) : [];
  const visorQ = visor ? visorQuadros[visor.i] : null;

  return (
    <div className={'corpo' + (foco && vista === 'guiao' ? ' foco' : '')}>
      {/* Barra de ícones */}
      <nav className="trilho" aria-label="Secções">
        <button aria-label="Início" title="Início" onClick={props.onInicio}><ICasa /></button>
        <button aria-label="Guião" title="Guião" className={vista === 'guiao' ? 'ativo' : ''} onClick={() => irPara('guiao')}><IGuiao /></button>
        <button aria-label="Quadro de cenas" title="Quadro de cenas" className={vista === 'quadro' ? 'ativo' : ''} onClick={() => irPara('quadro')}><IQuadro /></button>
        <button aria-label="Storyboard" title="Storyboard" className={vista === 'storyboard' ? 'ativo' : ''} onClick={() => irPara('storyboard')}><IStoryboard /></button>
        <button aria-label="Guião técnico" title="Guião técnico" className={vista === 'tecnico' ? 'ativo' : ''} onClick={() => irPara('tecnico')}><ITecnico /></button>
        <span className="espaco" />
        <button aria-label="Definições" title="Definições" onClick={props.onAbrirDefinicoes}><IDefinicoes /></button>
      </nav>

      <div style={{ display: vista === 'guiao' ? 'contents' : 'none' }}>
      {/* Cenas */}
      <aside className="painel-cenas" aria-label="Cenas">
        <div className="painel-cab">
          <span className="t">Cenas</span>
          <span className="n">{layout?.cenas.length || 0} cena{layout?.cenas.length === 1 ? '' : 's'}</span>
        </div>
        <label className="procura">
          <IProcura />
          <input placeholder="Procurar cena ou personagem" value={procura} onChange={(e) => setProcura(e.target.value)} />
        </label>
        <div className="lista-cenas">
          {cenasFiltradas.length === 0 && (
            <div className="lista-vazia">{procura ? 'Nenhuma cena encontrada.' : 'Escreve um cabeçalho (INT. ou EXT.) para criar a primeira cena.'}</div>
          )}
          {cenasFiltradas.map((c) => {
            const n = quadrosDe(c.id).length;
            return (
              <button key={c.id + c.numero} className={'item-cena' + (cenaAtual?.id === c.id ? ' ativo' : '')} onClick={() => irParaNo(c.indice)}>
                <span className="num">{c.numero}</span>
                <span className="info">
                  <div className="cab">{c.texto || 'Cena sem cabeçalho'}</div>
                  <div className="meta">{formatarSegundos(c.segundos)} · {n ? `${n} plano${n > 1 ? 's' : ''}` : 'sem storyboard'}</div>
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Centro */}
      <main className="centro">
        <div className="barra-elementos">
          <div className="grupo-elementos" role="group" aria-label="Elemento do guião">
            {ELEMENTOS.map((el) => (
              <button key={el} className={elAtual === el ? 'ativo' : ''} aria-pressed={elAtual === el}
                title={`${rotulo(el, projeto.meta.tipo)} (Ctrl+${SEM_TECLAS[el]})`}
                onMouseDown={(e) => e.preventDefault()} onClick={() => mudarElemento(el)}>
                {rotulo(el, projeto.meta.tipo)}
              </button>
            ))}
          </div>
          <span className="dica-teclas">Tab muda de elemento · Enter avança</span>
          <span className="flex1" />
          <button className="btn btn-claro" onClick={() => props.onExportar(false)}>Exportar</button>
        </div>

        <div className="area-papel" ref={areaRef} onMouseDown={(e) => { if (e.target === e.currentTarget) view?.focus(); }}>
          <div
            className={'papel' + (definicoes.papelEscuro ? ' escuro' : '') + (definicoes.numerosCena ? ' numeros' : '')}
            style={{ ['--z' as any]: zoomEfetivo, ['--larg-in' as any]: fmt.larguraIn, ['--alt-in' as any]: fmt.alturaIn }}
          >
            <div ref={montagem} />
          </div>
        </div>

        <div className="barra-flutuante">
          <button className="btn-icone" aria-label="Página anterior" onClick={() => irParaPagina(paginaAtual - 1)}><ICima /></button>
          <span className="pag">Página {paginaAtual} de {layout?.paginas || 1}</span>
          <button className="btn-icone" aria-label="Página seguinte" onClick={() => irParaPagina(paginaAtual + 1)}><IBaixo /></button>
          <span className="div" />
          <span className="tempo" title="Duração estimada: uma página ≈ um minuto">≈ {formatarTempo(minutos)}</span>
          <span className="div" />
          <button className="btn-icone" aria-label="Diminuir zoom" onClick={() => onDefinicoes({ zoom: Math.max(0.6, +(zoomEfetivo - 0.1).toFixed(2)) })}>−</button>
          <span className="zoom">{Math.round(zoomEfetivo * 100)}%</span>
          <button className="btn-icone" aria-label="Aumentar zoom" onClick={() => { const z = Math.min(2, +(zoomEfetivo + 0.1).toFixed(2)); onDefinicoes({ zoom: z, ajustar: z <= zoomAjuste }); }}>+</button>
          <button className="btn-icone" aria-label={foco ? 'Sair do modo foco' : 'Modo foco'} title={foco ? 'Sair do modo foco (Esc)' : 'Modo foco'} onClick={() => setFoco(!foco)}><IFoco /></button>
        </div>
      </main>

      {/* Painel direito */}
      <aside className="painel-dir" aria-label="Assistente de escrita">
        <section className="cartao">
          <div className="sobretitulo">Duração estimada</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
            <span className="grande">{formatarTempo(minutos)}</span>
            {alvo > 0 && <span style={{ color: 'var(--texto-3)', fontSize: 12 }}>de {alvo}:00 previstos{projeto.meta.tipo === 'serie' ? ' por episódio' : ''}</span>}
          </div>
          {alvo > 0 && <div className="barra-prog"><div className={racio > 1.1 ? 'excesso' : ''} style={{ width: `${Math.min(100, racio * 100)}%` }} /></div>}
          <div className="linha-meta">
            <span>{layout?.paginas || 1} página{layout?.paginas === 1 ? '' : 's'}</span>
            <span>Diálogo {pctDialogo}% · Ação {totalLinhas ? 100 - pctDialogo : 0}%</span>
          </div>
        </section>

        {mostrarGuia && (
          <section className="cartao">
            <div className="cartao-cab">
              <span className="sobretitulo">Guia de estrutura · Curta</span>
              <span style={{ fontSize: 11, color: 'var(--ambar)' }}>Pág. {paginaAtual}</span>
            </div>
            <div className="guia-titulo">{passoAtual.t}</div>
            <div className="guia-texto">{passoAtual.q}</div>
            <div className="passos">
              {passosVisiveis.map((s) => {
                const feito = feitos.has(s.i);
                return (
                  <button key={s.i} className={'passo' + (s === passoAtual ? ' atual' : '') + (feito ? ' feito' : '')}
                    onClick={() => alternarPasso(s.i)} aria-pressed={feito} title={feito ? 'Marcar como por fazer' : 'Marcar como feito'}>
                    <span className="caixa">{feito && <IVisto />}</span>
                    Pág. {s.pag} — {s.t}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section className="cartao">
          <div className="cartao-cab">
            <span className="sobretitulo">{cenaAtual ? `Storyboard · Cena ${cenaAtual.numero}` : 'Storyboard'}</span>
            {cenaAtual && <button className="btn-fantasma" style={{ fontSize: 12 }} onClick={() => carregarStoryboard()}>Carregar</button>}
          </div>
          {!cenaAtual && <div className="nota-pequena">Põe o cursor dentro de uma cena para lhe juntar imagens de storyboard.</div>}
          {cenaAtual && (
            <>
              <div className="grelha-sb">
                {quadros.map((q, i) => (
                  <button key={q.id} className="miniatura" onClick={() => setVisor({ cenaId: cenaAtual.id, i })} title={q.legenda}>
                    <img src={q.src} alt={q.legenda || `Plano ${i + 1}`} />
                    <span>P{i + 1}{q.legenda ? ` · ${q.legenda}` : ''}</span>
                  </button>
                ))}
                <button className="miniatura" onClick={() => carregarStoryboard()} aria-label="Juntar imagens de storyboard">
                  <div className="vaga">+</div>
                  <span>{quadros.length ? 'Juntar' : 'Primeiro plano'}</span>
                </button>
              </div>
              {cenaAtual.personagens.length > 0 && (
                <div className="nota-pequena">Nesta cena: {cenaAtual.personagens.map((p) => p.toLowerCase().replace(/(^|\s)(\S)/g, (_m, a, b) => a + b.toUpperCase())).join(', ')} · {formatarSegundos(cenaAtual.segundos)}</div>
              )}
            </>
          )}
        </section>

        <section className="cartao" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span className="ponto" style={{ background: 'var(--erro)', marginTop: 5 }} />
          <div style={{ fontSize: 12, lineHeight: '17px' }}>
            <div>Corretor PT-PT ativo</div>
            <div style={{ color: 'var(--texto-3)', fontSize: 11, marginTop: 2 }}>Clica com o botão direito numa palavra sublinhada para ver sugestões ou juntá-la ao dicionário.</div>
          </div>
        </section>
      </aside>

      </div>

      {vista === 'quadro' && view && estado && layout && (
        <VistaQuadro view={view} estado={estado} layout={layout} projeto={projeto} onProjeto={onProjeto}
          onIrParaCena={irParaCena} onCarregarStoryboard={carregarStoryboard} />
      )}
      {vista === 'storyboard' && layout && (
        <VistaStoryboard layout={layout} projeto={projeto} onProjeto={onProjeto} onIrParaCena={irParaCena}
          onCarregarStoryboard={carregarStoryboard} avisar={avisar} />
      )}
      {vista === 'tecnico' && estado && layout && (
        <VistaTecnico estado={estado} layout={layout} projeto={projeto} onProjeto={onProjeto} onIrParaCena={irParaCena}
          onExportar={() => props.onExportar(true)} confirmar={confirmar} />
      )}
      {confirmacao && <Confirmar pedido={confirmacao} onFechar={() => setConfirmacao(null)} />}

      {/* Visor de storyboard */}
      {visor && visorQ && (
        <div className="veu" onMouseDown={(e) => { if (e.target === e.currentTarget) setVisor(null); }}>
          <div className="dialogo visor" role="dialog" aria-label="Plano do storyboard" style={{ width: 'min(1180px, 88vw)' }}>
            <div className="dialogo-cab">
              <h2>Plano {visor.i + 1} de {visorQuadros.length}</h2>
              <span className="flex1" />
              <button className="btn-icone" aria-label="Fechar" onClick={() => setVisor(null)}><IFechar /></button>
            </div>
            <div className="dialogo-corpo">
              <img src={visorQ.src} alt={visorQ.legenda} />
              <div className="campo" style={{ marginTop: 16 }}>
                <label htmlFor="leg">Legenda</label>
                <input id="leg" className="entrada" value={visorQ.legenda} placeholder="Ex.: Plano geral, a Marta à janela"
                  onChange={(e) => alterarQuadro(visor.cenaId, visor.i, (l) => l.map((q, j) => (j === visor.i ? { ...q, legenda: e.target.value } : q)))} />
              </div>
            </div>
            <div className="dialogo-rodape" style={{ justifyContent: 'space-between' }}>
              <button className="btn" style={{ color: 'var(--erro)' }} onClick={() => {
                const { cenaId, i } = visor;
                alterarQuadro(cenaId, i, (l) => l.filter((_q, j) => j !== i));
                setVisor(visorQuadros.length > 1 ? { cenaId, i: Math.max(0, i - 1) } : null);
              }}>Remover plano</button>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn" disabled={visor.i === 0} onClick={() => {
                  const { cenaId, i } = visor;
                  alterarQuadro(cenaId, i, (l) => { const c = [...l]; [c[i - 1], c[i]] = [c[i], c[i - 1]]; return c; });
                  setVisor({ cenaId, i: i - 1 });
                }}>Mover para trás</button>
                <button className="btn" disabled={visor.i === 0} onClick={() => setVisor({ ...visor, i: visor.i - 1 })}>← Anterior</button>
                <button className="btn" disabled={visor.i >= visorQuadros.length - 1} onClick={() => setVisor({ ...visor, i: visor.i + 1 })}>Seguinte →</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
