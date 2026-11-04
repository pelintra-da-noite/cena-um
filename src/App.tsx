import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { EditorView } from 'prosemirror-view';
import type { Definicoes, Projeto, Recente, TipoProjeto, MetaProjeto, Episodio } from './types';
import { documentoInicial } from './editor/schema';
import { calcularLayout, definirTeatro } from './editor/layout';
import { deFdx, deFountain, paraFdx, paraFountain, validarDoc } from './io/formatos';
import { reduzirImagem } from './io/imagens';
import { paraCsv, levantamentoCsv } from './io/tecnico';
import { rostoDe } from './io/rosto';
import { equipaDe, equipaCsv } from './io/equipa';
import { sincronizar, migrarSerie, novoEpisodio, abrirEpisodio, ordenar, codigo, episodioAtivo } from './io/episodios';
import Inicio from './screens/Inicio';
import Editor from './screens/Editor';
import NovoProjeto from './screens/NovoProjeto';
import DialogoDefinicoes from './screens/DialogoDefinicoes';
import DialogoExportar, { OpcoesExportar } from './screens/DialogoExportar';
import BarraTitulo from './components/BarraTitulo';
import Confirmar, { PedidoConfirmacao } from './components/Confirmar';

const DEF_PADRAO: Definicoes = { papelEscuro: false, papel: 'a4', numerosCena: true, zoom: 1.0 };

function lerDefinicoes(): Definicoes {
  try { return { ...DEF_PADRAO, ...JSON.parse(localStorage.getItem('cena-um:definicoes') || '{}') }; }
  catch { return DEF_PADRAO; }
}

const nomeBase = (caminho: string) => caminho.split(/[\\/]/).pop()!.replace(/\.[^.]+$/, '');

export default function App() {
  const [ecra, setEcra] = useState<'inicio' | 'editor'>('inicio');
  const [projeto, setProjeto] = useState<Projeto | null>(null);
  const [caminho, setCaminho] = useState<string | null>(null);
  const [porGuardar, setPorGuardar] = useState(false);
  const [sessao, setSessao] = useState(0);
  const [definicoes, setDefinicoes] = useState<Definicoes>(lerDefinicoes);
  const [dialogo, setDialogo] = useState<null | 'novo' | 'definicoes' | 'exportar'>(null);
  const [exportarTipo, setExportarTipo] = useState<'guiao' | 'tecnico' | 'levantamento'>('guiao');
  const [tipoInicial, setTipoInicial] = useState<TipoProjeto>('curta');
  const [recentes, setRecentes] = useState<Recente[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);
  const [confirmacao, setConfirmacao] = useState<PedidoConfirmacao | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const estadoRef = useRef({ projeto, caminho, porGuardar });
  estadoRef.current = { projeto, caminho, porGuardar };

  const avisar = useCallback((t: string) => {
    setAviso(t);
    window.setTimeout(() => setAviso((a) => (a === t ? null : a)), 3500);
  }, []);

  const atualizarRecentes = useCallback(() => { window.cena.recentes().then(setRecentes); }, []);
  useEffect(atualizarRecentes, [atualizarRecentes]);

  useEffect(() => { localStorage.setItem('cena-um:definicoes', JSON.stringify(definicoes)); }, [definicoes]);
  useEffect(() => {
    const t = definicoes.tema || 'escuro';
    document.documentElement.dataset.tema = t;
    window.cena.tema(t);
  }, [definicoes.tema]);
  useEffect(() => { window.cena.porGuardar(porGuardar); }, [porGuardar]);

  // ---------- projeto ----------
  const projetoAtual = useCallback((): Projeto | null => {
    const p = estadoRef.current.projeto;
    if (!p) return null;
    const v = viewRef.current;
    return sincronizar(v ? { ...p, guiao: v.state.doc.toJSON() } : p);
  }, []);

  const carregar = useCallback((p: Projeto, cam: string | null, sujo = false) => {
    setProjeto(migrarSerie(p));
    setCaminho(cam);
    setPorGuardar(sujo);
    setSessao((s) => s + 1);
    setEcra('editor');
  }, []);

  const criar = useCallback((meta: Omit<MetaProjeto, 'criado' | 'modificado' | 'guiaFeito'>, serie?: { temporada: number; episodios: number; primeiro: string }) => {
    const agora = new Date().toISOString();
    const base: Projeto = {
      formato: 'cena', versao: 1,
      meta: { ...meta, guiaFeito: [], criado: agora, modificado: agora },
      guiao: documentoInicial(),
      storyboard: {}
    };
    if (meta.tipo === 'serie') {
      const n = Math.max(1, Math.min(serie?.episodios || 1, 40));
      const eps = Array.from({ length: n }, (_x, i) => novoEpisodio(serie?.temporada || 1, i + 1, i === 0 ? serie?.primeiro : ''));
      base.episodios = eps;
      base.episodioAtivo = eps[0].id;
      base.guiao = eps[0].guiao;
    }
    carregar(base, null, true);
    setDialogo(null);
  }, [carregar]);

  // ---------- episódios (séries) ----------
  const trocarEpisodio = useCallback((id: string) => {
    const p = projetoAtual();
    if (!p || !p.episodios || id === p.episodioAtivo) return;
    setProjeto(abrirEpisodio(p, id));
    setSessao((x) => x + 1);
  }, [projetoAtual]);

  /** Altera a lista de episódios; se o episódio aberto for apagado, abre outro */
  const alterarEpisodios = useCallback((f: (l: Episodio[]) => Episodio[], abrir?: string) => {
    const p = projetoAtual();
    if (!p || !p.episodios) return;
    const lista = ordenar(f(p.episodios));
    if (!lista.length) return;
    let novo: Projeto = { ...p, episodios: lista };
    const alvo = abrir || (lista.some((e) => e.id === p.episodioAtivo) ? p.episodioAtivo! : lista[0].id);
    if (alvo !== p.episodioAtivo) {
      const e = lista.find((x) => x.id === alvo)!;
      novo = { ...novo, episodioAtivo: alvo, guiao: e.guiao, storyboard: e.storyboard || {}, tecnico: e.tecnico || {}, levantamento: e.levantamento || {} };
      setSessao((x) => x + 1);
    }
    setProjeto(novo);
    setPorGuardar(true);
  }, [projetoAtual]);

  const abrirConteudo = useCallback((cam: string, conteudo: string) => {
    const ext = cam.split('.').pop()!.toLowerCase();
    const agora = new Date().toISOString();
    const metaVazia = (titulo: string, autor = ''): MetaProjeto => ({
      titulo, tipo: 'longa', autor, duracaoPrevista: 100, guia: false, guiaFeito: [], cartaz: null, criado: agora, modificado: agora
    });
    try {
      if (ext === 'cena') {
        const p = JSON.parse(conteudo) as Projeto;
        if (p.formato !== 'cena') throw new Error('Este ficheiro não é um projeto do Cena Um.');
        validarDoc(p.guiao);
        p.storyboard = p.storyboard || {};
        p.meta.guiaFeito = p.meta.guiaFeito || [];
        carregar(p, cam);
        return;
      }
      if (ext === 'fdx') {
        const { doc, titulo } = deFdx(conteudo);
        validarDoc(doc);
        carregar({ formato: 'cena', versao: 1, meta: metaVazia(titulo || nomeBase(cam)), guiao: doc, storyboard: {} }, null, true);
        avisar('Guião do Final Draft importado. Guarda-o como .cena para manter o storyboard.');
        return;
      }
      const { doc, titulo, autor } = deFountain(conteudo);
      validarDoc(doc);
      carregar({ formato: 'cena', versao: 1, meta: metaVazia(titulo || nomeBase(cam), autor || ''), guiao: doc, storyboard: {} }, null, true);
      avisar('Guião Fountain importado.');
    } catch (e: any) {
      avisar(e?.message || 'Não foi possível abrir este ficheiro.');
    }
  }, [carregar, avisar]);

  const comConfirmacao = useCallback((acao: () => void) => {
    if (!estadoRef.current.porGuardar) { acao(); return; }
    setConfirmacao({
      titulo: 'Tens alterações por guardar',
      texto: 'Se continuares sem guardar, perdes o que escreveste desde a última gravação.',
      botoes: [
        { rotulo: 'Cancelar', acao: () => {} },
        { rotulo: 'Não guardar', acao },
        { rotulo: 'Guardar', principal: true, acao: async () => { if (await guardarRef.current(false)) acao(); } }
      ]
    });
  }, []);

  const abrir = useCallback(() => comConfirmacao(async () => {
    const f = await window.cena.abrir();
    if (f) abrirConteudo(f.caminho, f.conteudo);
  }), [abrirConteudo, comConfirmacao]);

  const abrirRecente = useCallback((r: Recente) => comConfirmacao(async () => {
    const f = await window.cena.abrirCaminho(r.caminho);
    if (!f) { avisar('Este ficheiro já não existe neste sítio.'); window.cena.removerRecente(r.caminho); atualizarRecentes(); return; }
    abrirConteudo(f.caminho, f.conteudo);
  }), [abrirConteudo, comConfirmacao, avisar, atualizarRecentes]);

  const guardar = useCallback(async (comoNovo: boolean): Promise<boolean> => {
    const p = projetoAtual();
    if (!p) return false;
    const final: Projeto = { ...p, meta: { ...p.meta, modificado: new Date().toISOString() } };
    const destino = await window.cena.guardar({
      caminho: comoNovo ? null : estadoRef.current.caminho,
      conteudo: JSON.stringify(final),
      nomeSugerido: final.meta.titulo || 'Sem título'
    });
    if (!destino) return false;
    setProjeto(final);
    setCaminho(destino);
    setPorGuardar(false);
    const layout = calcularLayout(validarDoc(final.guiao), definicoes.papel);
    let capa: string | null = null;
    if (final.meta.cartaz) { try { capa = await reduzirImagem(final.meta.cartaz, 120, 0.8); } catch {} }
    await window.cena.adicionarRecente({
      caminho: destino, titulo: final.meta.titulo, tipo: final.meta.tipo,
      paginas: layout.paginas, minutos: layout.minutos, capa, episodios: final.episodios?.length
    });
    atualizarRecentes();
    return true;
  }, [projetoAtual, definicoes.papel, atualizarRecentes]);
  const guardarRef = useRef(guardar);
  guardarRef.current = guardar;

  const exportar = useCallback(async (op: OpcoesExportar) => {
    const p = projetoAtual();
    if (!p) return;
    const nome = p.meta.titulo || 'Sem título';
    // O que exportar: o guião inteiro, ou os episódios escolhidos (séries)
    const eps = p.episodios ? ordenar(p.episodios).filter((e) => (op.episodios || [p.episodioAtivo]).includes(e.id)) : [];
    const unidades = p.episodios
      ? eps.map((e) => ({ id: e.id, rotulo: `${codigo(e)} — ${e.titulo}`, ficheiro: `${nome} ${codigo(e).replace(' · ', '')} ${e.titulo}`, guiao: e.guiao, storyboard: e.storyboard || {}, tecnico: e.tecnico || {}, levantamento: e.levantamento || {} }))
      : [{ id: 'unico', rotulo: '', ficheiro: nome, guiao: p.guiao, storyboard: p.storyboard, tecnico: p.tecnico || {}, levantamento: p.levantamento || {} }];
    if (!unidades.length) { avisar('Escolhe pelo menos um episódio.'); return; }
    const varios = unidades.length > 1;
    const base = varios ? `${nome} — ${unidades.length} episódios` : unidades[0].ficheiro;
    const comoProjeto = (u: typeof unidades[number]): Projeto => ({ ...p, guiao: u.guiao, storyboard: u.storyboard, tecnico: u.tecnico, levantamento: u.levantamento });
    const csvJunto = (gerar: (x: Projeto) => string) => {
      if (!p.episodios) return gerar(comoProjeto(unidades[0]));
      const linhas: string[] = [];
      unidades.forEach((u, i) => {
        const l = gerar(comoProjeto(u)).replace(/^\uFEFF/, '').split('\r\n').filter(Boolean);
        if (i === 0) linhas.push('Episódio;' + l[0]);
        l.slice(1).forEach((x) => linhas.push(`"${u.rotulo.replace(/"/g, '""')}";` + x));
      });
      return '\uFEFF' + linhas.join('\r\n') + '\r\n';
    };
    try {
      if (op.formato === 'pdf' || op.formato === 'tecnico-pdf' || op.formato === 'lev-pdf') {
        const modo = op.formato === 'pdf' ? 'guiao' : op.formato === 'tecnico-pdf' ? 'tecnico' : 'levantamento';
        const sufixo = modo === 'tecnico' ? ' — guião técnico' : modo === 'levantamento' ? ' — levantamento' : '';
        const r = await window.cena.exportarPdf({
          nomeSugerido: base + sufixo, papel: definicoes.papel, meta: p.meta,
          rosto: modo === 'guiao' && op.rosto, cartaz: op.cartaz, numeros: op.numeros, modo, paisagem: modo !== 'guiao',
          personagens: p.personagens || [], locais: p.locais || {},
          unidades: unidades.map((u) => ({ subtitulo: u.rotulo, guiao: u.guiao, tecnico: u.tecnico, storyboard: modo === 'tecnico' ? u.storyboard : {}, levantamento: u.levantamento }))
        });
        if (r) avisar(varios ? `${unidades.length} episódios exportados num só PDF.` : 'PDF exportado.');
      } else if (op.formato === 'lev-csv' || op.formato === 'csv') {
        const lev = op.formato === 'lev-csv';
        const r = await window.cena.exportarTexto({
          conteudo: csvJunto((x) => (lev ? levantamentoCsv(x, definicoes.papel) : paraCsv(x, definicoes.papel))),
          nomeSugerido: base + (lev ? ' — levantamento' : ' — guião técnico'), extensao: 'csv', nomeFormato: 'Folha de cálculo'
        });
        if (r) avisar('Exportado para folha de cálculo.');
      } else {
        const fdx = op.formato === 'fdx';
        const gerar = (u: typeof unidades[number]) => {
          const doc = validarDoc(u.guiao);
          const t = u.rotulo ? `${nome} — ${u.rotulo}` : nome;
          return fdx ? paraFdx(doc, t, p.meta.autor, rostoDe(p.meta)) : paraFountain(doc, t, p.meta.autor, rostoDe(p.meta));
        };
        const ext = fdx ? 'fdx' : 'fountain';
        if (varios) {
          const r = await window.cena.exportarPasta(unidades.map((u) => ({ nome: `${u.ficheiro}.${ext}`, conteudo: gerar(u) })));
          if (r) avisar(`${unidades.length} episódios exportados para ${r}.`);
        } else {
          const r = await window.cena.exportarTexto({ conteudo: gerar(unidades[0]), nomeSugerido: base, extensao: ext, nomeFormato: fdx ? 'Final Draft' : 'Fountain' });
          if (r) avisar(fdx ? 'Exportado para Final Draft.' : 'Exportado para Fountain.');
        }
      }
      setDialogo(null);
    } catch (e: any) {
      avisar('A exportação falhou: ' + (e?.message || 'erro desconhecido'));
    }
  }, [projetoAtual, definicoes.papel, avisar]);

  const exportarEquipa = useCallback(async (formato: 'pdf' | 'csv', so: boolean) => {
    const p = projetoAtual();
    if (!p) return;
    const deps = equipaDe(p).map((d) => ({ ...d, membros: d.membros.filter((m) => !so || m.nome.trim()) })).filter((d) => d.membros.length);
    if (!deps.length) { avisar('Ainda não há ninguém na equipa — escreve pelo menos um nome.'); return; }
    const nome = `${p.meta.titulo || 'Sem título'} — equipa`;
    try {
      const r = formato === 'csv'
        ? await window.cena.exportarTexto({ conteudo: equipaCsv(deps), nomeSugerido: nome, extensao: 'csv', nomeFormato: 'Folha de cálculo' })
        : await window.cena.exportarPdf({ nomeSugerido: nome, papel: definicoes.papel, meta: p.meta, rosto: false, cartaz: false, numeros: false, modo: 'equipa', paisagem: true, guiao: p.guiao, equipa: deps });
      if (r) avisar(formato === 'csv' ? 'Equipa exportada para folha de cálculo.' : 'Lista da equipa exportada em PDF.');
    } catch (e: any) {
      avisar('A exportação falhou: ' + (e?.message || 'erro desconhecido'));
    }
  }, [projetoAtual, definicoes.papel, avisar]);

  // ---------- arranque, atalhos e gravação automática ----------
  useEffect(() => {
    window.cena.ficheiroInicial().then((f) => { if (f) abrirConteudo(f.caminho, f.conteudo); });
    window.cena.aoAbrirFicheiro((f) => abrirConteudo(f.caminho, f.conteudo));
    window.cena.aoGuardarEFechar(async () => { if (await guardarRef.current(false)) window.cena.fecharAgora(); });
  }, []); // eslint-disable-line

  useEffect(() => {
    const t = window.setInterval(() => {
      const { caminho: c, porGuardar: pg } = estadoRef.current;
      if (c && pg) guardarRef.current(false);
    }, 60000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === 's') { e.preventDefault(); if (estadoRef.current.projeto) guardarRef.current(e.shiftKey); }
      else if (k === 'o') { e.preventDefault(); abrir(); }
      else if (k === 'n') { e.preventDefault(); setTipoInicial('curta'); setDialogo('novo'); }
      else if (k === 'p') { e.preventDefault(); if (estadoRef.current.projeto && ecra === 'editor') { setExportarTipo('guiao'); setDialogo('exportar'); } }
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [abrir, ecra]);

  const nomeFicheiro = caminho ? caminho.split(/[\\/]/).pop()! : projeto ? `${projeto.meta.titulo || 'Sem título'} (não guardado)` : null;

  definirTeatro(projeto?.meta.tipo === 'teatro');
  return (
    <div className="app">
      <BarraTitulo ficheiro={ecra === 'editor' ? nomeFicheiro : null} porGuardar={porGuardar}
        episodio={ecra === 'editor' && projeto && episodioAtivo(projeto) ? `${codigo(episodioAtivo(projeto)!)} — ${episodioAtivo(projeto)!.titulo}` : null}
        onGuardar={() => guardarRef.current(false).then((ok) => { if (ok) avisar('Guião guardado.'); })}
        onGuardarComo={() => guardarRef.current(true).then((ok) => { if (ok) avisar('Guião guardado com outro nome.'); })} />
      {ecra === 'inicio' && (
        <Inicio
          recentes={recentes}
          temProjetoAberto={!!projeto}
          onVoltar={() => setEcra('editor')}
          onNovo={(t) => { setTipoInicial(t); setDialogo('novo'); }}
          onAbrir={abrir}
          onAbrirRecente={abrirRecente}
          onDefinicoes={() => setDialogo('definicoes')}
        />
      )}
      {ecra === 'editor' && projeto && (
        <Editor
          key={sessao}
          projeto={projeto}
          definicoes={definicoes}
          viewRef={viewRef}
          onAlterado={() => setPorGuardar(true)}
          onProjeto={(f) => { setProjeto((p) => (p ? f(p) : p)); setPorGuardar(true); }}
          onDefinicoes={(d) => setDefinicoes((x) => ({ ...x, ...d }))}
          onInicio={() => { const p = projetoAtual(); if (p) setProjeto(p); setEcra('inicio'); atualizarRecentes(); }}
          onAbrirDefinicoes={() => setDialogo('definicoes')}
          onExportar={(tipo) => { setExportarTipo(tipo || 'guiao'); setDialogo('exportar'); }}
          avisar={avisar}
          onTrocarEpisodio={trocarEpisodio}
          onExportarEquipa={exportarEquipa}
          onAlterarEpisodios={alterarEpisodios}
        />
      )}
      {dialogo === 'novo' && (
        <NovoProjeto
          tipoInicial={tipoInicial}
          onCancelar={() => setDialogo(null)}
          onCriar={(meta, serie) => comConfirmacao(() => criar(meta, serie))}
          avisar={avisar}
        />
      )}
      {dialogo === 'definicoes' && (
        <DialogoDefinicoes definicoes={definicoes} onMudar={(d) => setDefinicoes((x) => ({ ...x, ...d }))} onFechar={() => setDialogo(null)}
          meta={ecra === 'editor' ? projeto?.meta : null}
          onMeta={(m) => { setProjeto((p) => (p ? { ...p, meta: { ...p.meta, ...m } } : p)); setPorGuardar(true); }} />
      )}
      {dialogo === 'exportar' && projeto && (
        <DialogoExportar teatro={projeto.meta.tipo === 'teatro'} temCartaz={!!projeto.meta.cartaz} cartazPorDefeito={!!projeto.meta.rosto?.cartaz} papel={definicoes.papel} onExportar={exportar} onFechar={() => setDialogo(null)} inicial={exportarTipo}
          episodios={projeto.episodios ? ordenar(projeto.episodios).map((e) => ({ id: e.id, rotulo: `${codigo(e)} — ${e.titulo}` })) : undefined}
          episodioAtivo={projeto.episodioAtivo} />
      )}
      {confirmacao && <Confirmar pedido={confirmacao} onFechar={() => setConfirmacao(null)} />}
      {aviso && <div className="aviso" role="status"><span className="ponto" style={{ background: 'var(--ambar)' }} />{aviso}</div>}
    </div>
  );
}
