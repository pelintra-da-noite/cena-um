import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { EditorView } from 'prosemirror-view';
import type { DadosMenuContexto } from '../types';
import { FONTES, TAMANHOS, CORES, Alinhamento } from '../editor/schema';
import { CATEGORIAS } from '../editor/levantamento';
import type { CategoriaLevantamento } from '../types';
import { lerFormatacao, alternarMarca, definirValor, definirAlinhamento, limparFormatacao } from '../editor/formatacao';
import { t, tp } from '../i18n';

interface Props {
  view: EditorView;
  dados: DadosMenuContexto;
  papelEscuro: boolean;
  onFechar: () => void;
  onJuntarLevantamento?: (cat: CategoriaLevantamento, texto: string) => void;
}

const sem = (e: React.MouseEvent) => e.preventDefault(); // não roubar a seleção ao editor

const IconeAlinhar = ({ tipo }: { tipo: Exclude<Alinhamento, null> }) => {
  const linhas: Record<string, [number, number][]> = {
    left: [[3, 21], [3, 15], [3, 19], [3, 12]],
    center: [[3, 21], [6, 18], [4, 20], [7, 17]],
    right: [[3, 21], [9, 21], [5, 21], [12, 21]],
    justify: [[3, 21], [3, 21], [3, 21], [3, 14]]
  };
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      {linhas[tipo].map(([a, b], i) => <path key={i} d={`M${a} ${5 + i * 4.7}h${b - a}`} />)}
    </svg>
  );
};

export default function MenuFormatacao({ view, dados, papelEscuro, onFechar, onJuntarLevantamento }: Props) {
  const caixa = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: dados.x, top: dados.y });
  const [, refrescar] = useState(0);
  const f = lerFormatacao(view.state);
  const depois = () => refrescar((n) => n + 1);

  // manter o menu dentro da janela
  useLayoutEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({
      left: Math.max(8, Math.min(dados.x, window.innerWidth - r.width - 8)),
      top: Math.max(44, Math.min(dados.y, window.innerHeight - r.height - 8))
    });
  }, [dados.x, dados.y]);

  useEffect(() => {
    const fora = (e: MouseEvent) => { if (caixa.current && !caixa.current.contains(e.target as Node)) onFechar(); };
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') { onFechar(); view.focus(); } };
    window.addEventListener('mousedown', fora, true);
    window.addEventListener('keydown', tecla);
    window.addEventListener('resize', onFechar);
    return () => {
      window.removeEventListener('mousedown', fora, true);
      window.removeEventListener('keydown', tecla);
      window.removeEventListener('resize', onFechar);
    };
  }, [onFechar, view]);

  const corAuto = papelEscuro ? '#DAD7D0' : '#1A1A1A';
  const fechar = (acao: () => void) => () => { acao(); onFechar(); };

  return (
    <div ref={caixa} className="menu-form" role="menu" aria-label={t('Formatação')} style={{ left: pos.left, top: pos.top }} onMouseDown={(e) => { if ((e.target as HTMLElement).tagName !== 'SELECT' && (e.target as HTMLElement).tagName !== 'INPUT') e.preventDefault(); }}>
      {dados.palavra && (
        <div className="mf-secao mf-orto">
          <div className="mf-rotulo">{t('Corretor')}</div>
          {dados.sugestoes.length === 0 && <div className="mf-vazio">{t('Sem sugestões para «{p}»', { p: dados.palavra })}</div>}
          {dados.sugestoes.map((s) => (
            <button key={s} className="mf-sugestao" onMouseDown={sem} onClick={fechar(() => window.cena.substituirPalavra(s))}>{s}</button>
          ))}
          <button className="mf-linha" onMouseDown={sem} onClick={fechar(() => window.cena.adicionarPalavra(dados.palavra))}>{t('Adicionar «{p}» ao dicionário', { p: dados.palavra })}</button>
        </div>
      )}

      <div className="mf-barra">
        <button className={'mf-ic' + (f.negrito ? ' ativo' : '')} aria-pressed={f.negrito} title={t('Negrito (Ctrl+B)')} onMouseDown={sem} onClick={() => { alternarMarca(view, 'negrito'); depois(); }}><b>B</b></button>
        <button className={'mf-ic' + (f.italico ? ' ativo' : '')} aria-pressed={f.italico} title={t('Itálico (Ctrl+I)')} onMouseDown={sem} onClick={() => { alternarMarca(view, 'italico'); depois(); }}><i style={{ fontFamily: 'Georgia, serif' }}>I</i></button>
        <button className={'mf-ic' + (f.sublinhado ? ' ativo' : '')} aria-pressed={f.sublinhado} title={t('Sublinhado (Ctrl+U)')} onMouseDown={sem} onClick={() => { alternarMarca(view, 'sublinhado'); depois(); }}><u>U</u></button>
        <button className={'mf-ic' + (f.riscado ? ' ativo' : '')} aria-pressed={f.riscado} title={t('Riscado')} onMouseDown={sem} onClick={() => { alternarMarca(view, 'riscado'); depois(); }}><s>S</s></button>
        <span className="mf-sep" />
        {(['left', 'center', 'right', 'justify'] as const).map((a) => (
          <button key={a} className={'mf-ic' + (f.alinhamento === a ? ' ativo' : '')} aria-pressed={f.alinhamento === a}
            title={t({ left: 'Alinhar à esquerda', center: 'Centrar', right: 'Alinhar à direita', justify: 'Justificar' }[a])}
            onMouseDown={sem} onClick={() => { definirAlinhamento(view, f.alinhamento === a ? null : a); depois(); }}>
            <IconeAlinhar tipo={a} />
          </button>
        ))}
        <span className="mf-sep" />
        <button className="mf-ic" title={t('Limpar formatação')} aria-label={t('Limpar formatação')} onMouseDown={sem} onClick={() => { limparFormatacao(view); depois(); }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M5 5h12M11 5l-3 14M4 20L20 4" /></svg>
        </button>
      </div>

      <div className="mf-secao">
        <label className="mf-rotulo" htmlFor="mf-fonte">{t('Tipo de letra')}</label>
        <select id="mf-fonte" className="mf-select" value={f.fonte}
          onChange={(e) => { definirValor(view, 'fonte', e.target.value); depois(); }}>
          {FONTES.map((x) => <option key={x.nome} value={x.css} style={{ fontFamily: x.css || "'Courier Prime', monospace" }}>{t(x.nome)}</option>)}
        </select>
      </div>

      <div className="mf-secao">
        <div className="mf-rotulo">{t('Tamanho')}</div>
        <div className="mf-tamanhos">
          {TAMANHOS.map((t) => (
            <button key={t} className={'mf-chip' + (f.tamanho === t ? ' ativo' : '')} aria-pressed={f.tamanho === t}
              onMouseDown={sem} onClick={() => { definirValor(view, 'tamanho', t); depois(); }}>{t}</button>
          ))}
        </div>
      </div>

      <div className="mf-secao">
        <div className="mf-rotulo">{t('Cor')}</div>
        <div className="mf-cores">
          <button className={'mf-cor auto' + (!f.cor ? ' ativo' : '')} title={t('Automática')} aria-label={t('Cor automática')}
            style={{ background: corAuto }} onMouseDown={sem} onClick={() => { definirValor(view, 'cor', null); depois(); }} />
          {CORES.map((c) => (
            <button key={c} className={'mf-cor' + (f.cor === c ? ' ativo' : '')} aria-label={`${t('Cor')} ${c}`} style={{ background: c }}
              onMouseDown={sem} onClick={() => { definirValor(view, 'cor', c); depois(); }} />
          ))}
          <label className="mf-cor mais" title={t('Outra cor')}>
            +
            <input type="color" aria-label={t('Escolher outra cor')} value={f.cor || '#E6A84A'}
              onChange={(e) => { definirValor(view, 'cor', e.target.value); depois(); }} />
          </label>
        </div>
      </div>

      {onJuntarLevantamento && (() => {
        const { from, to, empty } = view.state.selection;
        const texto = empty ? '' : view.state.doc.textBetween(from, to, ' ').trim();
        if (!texto || texto.length > 80) return null;
        return (
          <div className="mf-secao">
            <div className="mf-rotulo">{t('Juntar «{p}» ao levantamento como', { p: texto.length > 28 ? texto.slice(0, 27) + '…' : texto })}</div>
            <div className="mf-lev">
              {CATEGORIAS.filter((c) => c.id !== 'notas').map((c) => (
                <button key={c.id} onMouseDown={sem} onClick={fechar(() => onJuntarLevantamento(c.id, texto))}>{c.nome}</button>
              ))}
            </div>
          </div>
        );
      })()}

      <div className="mf-rodape">
        <button disabled={!dados.podeCortar} onMouseDown={sem} onClick={fechar(() => window.cena.editar('cortar'))}>{t('Cortar')}</button>
        <button disabled={!dados.podeCopiar} onMouseDown={sem} onClick={fechar(() => window.cena.editar('copiar'))}>{t('Copiar')}</button>
        <button disabled={!dados.podeColar} onMouseDown={sem} onClick={fechar(() => window.cena.editar('colar'))}>{t('Colar')}</button>
      </div>
    </div>
  );
}
