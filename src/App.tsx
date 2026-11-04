import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { EditorView } from 'prosemirror-view';
import type { Definicoes, Projeto, Recente, TipoProjeto, MetaProjeto } from './types';
import { documentoInicial } from './editor/schema';
import { calcularLayout } from './editor/layout';
import { deFdx, deFountain, paraFdx, paraFountain, validarDoc } from './io/formatos';
import { reduzirImagem } from './io/imagens';
import { paraCsv, levantamentoCsv } from './io/tecnico';
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
  useEffect(() => { window.cena.porGuardar(porGuardar); }, [porGuardar]);

  // ---------- projeto ----------
  const projetoAtual = useCallback((): Projeto | null => {
    const p = estadoRef.current.projeto;
    if (!p) return null;
    const v = viewRef.current;
    return v ? { ...p, guiao: v.state.doc.toJSON() } : p;
  }, []);

  const carregar = useCallback((p: Projeto, cam: string | null, sujo = false) => {
    setProjeto(p);
    setCaminho(cam);
    setPorGuardar(sujo);
    setSessao((s) => s + 1);
    setEcra('editor');
  }, []);

  const criar = useCallback((meta: Omit<MetaProjeto, 'criado' | 'modificado' | 'guiaFeito'>) => {
    const agora = new Date().toISOString();
    carregar({
      formato: 'cena', versao: 1,
      meta: { ...meta, guiaFeito: [], criado: agora, modificado: agora },
      guiao: documentoInicial(),
      storyboard: {}
    }, null, true);
    setDialogo(null);
  }, [carregar]);

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
      paginas: layout.paginas, minutos: layout.minutos, capa
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
    try {
      if (op.formato === 'pdf' || op.formato === 'tecnico-pdf') {
        const tec = op.formato === 'tecnico-pdf';
        const r = await window.cena.exportarPdf({
          nomeSugerido: tec ? `${nome} — guião técnico` : nome, papel: definicoes.papel, guiao: p.guiao, meta: p.meta,
          rosto: op.rosto, cartaz: op.cartaz, numeros: op.numeros,
          modo: tec ? 'tecnico' : 'guiao', paisagem: tec, tecnico: p.tecnico || {}, storyboard: tec ? p.storyboard : {}
        });
        if (r) avisar(tec ? 'Guião técnico exportado em PDF.' : 'PDF exportado.');
      } else if (op.formato === 'lev-pdf') {
        const r = await window.cena.exportarPdf({
          nomeSugerido: `${nome} — levantamento`, papel: definicoes.papel, guiao: p.guiao, meta: p.meta,
          rosto: false, cartaz: false, numeros: true, modo: 'levantamento', paisagem: true,
          personagens: p.personagens || [], levantamento: p.levantamento || {}
        });
        if (r) avisar('Levantamento exportado em PDF.');
      } else if (op.formato === 'lev-csv') {
        const r = await window.cena.exportarTexto({
          conteudo: levantamentoCsv(p, definicoes.papel), nomeSugerido: `${nome} — levantamento`, extensao: 'csv', nomeFormato: 'Folha de cálculo'
        });
        if (r) avisar('Levantamento exportado para folha de cálculo.');
      } else if (op.formato === 'csv') {
        const r = await window.cena.exportarTexto({
          conteudo: paraCsv(p, definicoes.papel), nomeSugerido: `${nome} — guião técnico`, extensao: 'csv', nomeFormato: 'Folha de cálculo'
        });
        if (r) avisar('Guião técnico exportado para folha de cálculo.');
      } else {
        const doc = validarDoc(p.guiao);
        const fdx = op.formato === 'fdx';
        const r = await window.cena.exportarTexto({
          conteudo: fdx ? paraFdx(doc, nome, p.meta.autor) : paraFountain(doc, nome, p.meta.autor),
          nomeSugerido: nome, extensao: fdx ? 'fdx' : 'fountain', nomeFormato: fdx ? 'Final Draft' : 'Fountain'
        });
        if (r) avisar(fdx ? 'Exportado para Final Draft.' : 'Exportado para Fountain.');
      }
      setDialogo(null);
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

  return (
    <div className="app">
      <BarraTitulo ficheiro={ecra === 'editor' ? nomeFicheiro : null} porGuardar={porGuardar}
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
        />
      )}
      {dialogo === 'novo' && (
        <NovoProjeto
          tipoInicial={tipoInicial}
          onCancelar={() => setDialogo(null)}
          onCriar={(meta) => comConfirmacao(() => criar(meta))}
          avisar={avisar}
        />
      )}
      {dialogo === 'definicoes' && (
        <DialogoDefinicoes definicoes={definicoes} onMudar={(d) => setDefinicoes((x) => ({ ...x, ...d }))} onFechar={() => setDialogo(null)}
          meta={ecra === 'editor' ? projeto?.meta : null}
          onMeta={(m) => { setProjeto((p) => (p ? { ...p, meta: { ...p.meta, ...m } } : p)); setPorGuardar(true); }} />
      )}
      {dialogo === 'exportar' && projeto && (
        <DialogoExportar temCartaz={!!projeto.meta.cartaz} papel={definicoes.papel} onExportar={exportar} onFechar={() => setDialogo(null)} inicial={exportarTipo} />
      )}
      {confirmacao && <Confirmar pedido={confirmacao} onFechar={() => setConfirmacao(null)} />}
      {aviso && <div className="aviso" role="status"><span className="ponto" style={{ background: 'var(--ambar)' }} />{aviso}</div>}
    </div>
  );
}
