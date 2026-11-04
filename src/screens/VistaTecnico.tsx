import React, { useMemo } from 'react';
import type { EditorState } from 'prosemirror-state';
import type { Plano, Projeto } from '../types';
import { formatarSegundos, Layout } from '../editor/layout';
import { dividirEmCenas, planosDaCena, novoPlano, ESCALAS, MOVIMENTOS } from '../editor/cenas';
import { IFechar } from '../components/Icones';
import { t, tp } from '../i18n';

interface Props {
  estado: EditorState;
  layout: Layout;
  projeto: Projeto;
  onProjeto: (f: (p: Projeto) => Projeto) => void;
  onIrParaCena: (indice: number) => void;
  onExportar: () => void;
  confirmar: (titulo: string, texto: string, acao: () => void) => void;
}

const titulo = (s: string) => s.toLowerCase().replace(/(^|\s)(\S)/g, (_m, a, b) => a + b.toUpperCase());

export default function VistaTecnico({ estado, layout, projeto, onProjeto, onIrParaCena, onExportar, confirmar }: Props) {
  const blocos = useMemo(() => new Map(dividirEmCenas(estado.doc).cenas.map((b) => [b.id, b])), [estado.doc]);
  const tecnico = projeto.tecnico || {};
  const totalPlanos = layout.cenas.reduce((s, c) => s + (tecnico[c.id]?.length || 0), 0);
  const porPlanificar = layout.cenas.filter((c) => !(tecnico[c.id]?.length)).length;

  const alterar = (cenaId: string, f: (l: Plano[]) => Plano[]) =>
    onProjeto((p) => ({ ...p, tecnico: { ...(p.tecnico || {}), [cenaId]: f((p.tecnico || {})[cenaId] || []) } }));
  const campo = (cenaId: string, id: string, chave: keyof Plano, valor: string | null) =>
    alterar(cenaId, (l) => l.map((x) => (x.id === id ? { ...x, [chave]: valor } : x)));
  const mover = (cenaId: string, i: number, d: number) => alterar(cenaId, (l) => {
    const c = [...l];
    const j = i + d;
    if (j < 0 || j >= c.length) return c;
    [c[i], c[j]] = [c[j], c[i]];
    return c;
  });

  const gerar = (cenaId: string) => {
    const b = blocos.get(cenaId);
    if (b) alterar(cenaId, () => planosDaCena(b, projeto.storyboard[cenaId] || []));
  };
  const preencherTudo = () => onProjeto((p) => {
    const t = { ...(p.tecnico || {}) };
    for (const c of layout.cenas) {
      const b = blocos.get(c.id);
      if (b && !(t[c.id]?.length)) t[c.id] = planosDaCena(b, p.storyboard[c.id] || []);
    }
    return { ...p, tecnico: t };
  });

  return (
    <main className="vista">
      <div className="vista-cab">
        <h1>{t('Guião técnico')}</h1>
        <span className="vista-sub">{tp(layout.cenas.length, '{n} cena', '{n} cenas')} · {tp(totalPlanos, '{n} plano', '{n} planos')}{porPlanificar ? ' · ' + t('{n} por planificar', { n: porPlanificar }) : ''}</span>
        <span className="flex1" />
        <button className="btn" disabled={!porPlanificar} onClick={preencherTudo}>{t('Preencher a partir do guião')}</button>
        <button className="btn btn-claro" onClick={onExportar}>{t('Exportar')}</button>
      </div>

      <div className="faixa-info">
        <span className="ponto" style={{ background: 'var(--ambar)' }} />
        {t('O Cena Um cria a estrutura a partir do guião literário: um plano por cada ação e por cada fala, com as imagens do storyboard ligadas pela ordem. A escala, o movimento e a duração são a tua planificação.')}
      </div>

      {layout.cenas.length === 0 && <div className="vista-vazia">{t('Ainda não há cenas. Escreve um cabeçalho (INT. ou EXT.) no guião e as cenas aparecem aqui.')}</div>}

      <div className="tec-lista">
        {layout.cenas.map((c) => {
          const planos = tecnico[c.id] || [];
          const quadros = projeto.storyboard[c.id] || [];
          return (
            <section key={c.id} className="tec-cena">
              <div className="tec-cab">
                <b className="num-ambar">{c.numero}</b>
                <button className="sb-cena-titulo" onClick={() => onIrParaCena(c.indice)} title={t('Abrir a cena no guião')}>{c.texto || t('Cena sem cabeçalho')}</button>
                {c.personagens.length > 0 && <><span className="sep-v" /><span className="vista-sub">{c.personagens.map(titulo).join(', ')}</span></>}
                <span className="flex1" />
                <span className="vista-sub">≈ {formatarSegundos(c.segundos)}</span>
                {planos.length > 0 && (
                  <button className="btn" onClick={() => confirmar(t('Gerar de novo esta cena?'), t('Os planos desta cena são substituídos pela estrutura tirada do guião. A planificação que fizeste nela perde-se.'), () => gerar(c.id))}>{t('Gerar de novo')}</button>
                )}
              </div>
              {planos.length === 0 ? (
                <div className="tec-vazio">
                  <span>{t('Esta cena ainda não tem planos.')}</span>
                  <button className="btn btn-ambar" onClick={() => gerar(c.id)}>{t('Gerar a partir do guião')}</button>
                  <button className="btn" onClick={() => alterar(c.id, () => [novoPlano()])}>{t('Começar em branco')}</button>
                </div>
              ) : (
                <table className="tec-tabela">
                  <thead>
                    <tr>
                      <th style={{ width: 54 }}>{t('Plano')}</th>
                      <th style={{ width: 150 }}>{t('Storyboard')}</th>
                      <th style={{ width: 150 }}>{t('Escala')}</th>
                      <th style={{ width: 136 }}>{t('Movimento')}</th>
                      <th>{t('Ação')}</th>
                      <th style={{ width: 160 }}>{t('Som')}</th>
                      <th style={{ width: 74 }}>{t('Duração')}</th>
                      <th style={{ width: 96 }} aria-label={t('Ações')} />
                    </tr>
                  </thead>
                  <tbody>
                    {planos.map((p, i) => {
                      const q = quadros.find((x) => x.id === p.quadroId);
                      return (
                        <tr key={p.id}>
                          <td className="tec-num">{c.numero}.{i + 1}</td>
                          <td>
                            <div className="tec-sb">
                              {q ? <img src={q.src} alt={q.legenda} /> : <div className="tec-sb-vazio">{t('sem imagem')}</div>}
                              {quadros.length > 0 && (
                                <select value={p.quadroId || ''} aria-label={t('Imagem do storyboard')} onChange={(e) => campo(c.id, p.id, 'quadroId', e.target.value || null)}>
                                  <option value="">{t('Sem imagem')}</option>
                                  {quadros.map((x, j) => <option key={x.id} value={x.id}>P{j + 1}{x.legenda ? ` · ${x.legenda}` : ''}</option>)}
                                </select>
                              )}
                            </div>
                          </td>
                          <td>
                            <select className={'tec-sel' + (p.escala ? '' : ' vazio')} value={p.escala} aria-label={t('Escala')} onChange={(e) => campo(c.id, p.id, 'escala', e.target.value)}>
                              <option value="">{t('a definir')}</option>
                              {ESCALAS.map((x) => <option key={x} value={x}>{t(x)}</option>)}
                            </select>
                          </td>
                          <td>
                            <select className={'tec-sel' + (p.movimento ? '' : ' vazio')} value={p.movimento} aria-label={t('Movimento')} onChange={(e) => campo(c.id, p.id, 'movimento', e.target.value)}>
                              <option value="">{t('a definir')}</option>
                              {MOVIMENTOS.map((x) => <option key={x} value={x}>{t(x)}</option>)}
                            </select>
                          </td>
                          <td>
                            <textarea className="tec-txt guiao" rows={Math.max(2, Math.ceil(p.acao.length / 48))} value={p.acao} aria-label={t('Ação')} spellCheck
                              onChange={(e) => campo(c.id, p.id, 'acao', e.target.value)} />
                          </td>
                          <td><textarea className="tec-txt" rows={2} value={p.som} placeholder={t('Ambiente, música…')} aria-label={t('Som')} spellCheck onChange={(e) => campo(c.id, p.id, 'som', e.target.value)} /></td>
                          <td><input className="tec-inp" value={p.duracao} placeholder="— s" aria-label={t('Duração')} onChange={(e) => campo(c.id, p.id, 'duracao', e.target.value)} /></td>
                          <td className="tec-acoes">
                            <button className="btn-icone" aria-label={t('Subir plano')} disabled={i === 0} onClick={() => mover(c.id, i, -1)}>↑</button>
                            <button className="btn-icone" aria-label={t('Descer plano')} disabled={i === planos.length - 1} onClick={() => mover(c.id, i, 1)}>↓</button>
                            <button className="btn-icone" aria-label={t('Remover plano')} onClick={() => alterar(c.id, (l) => l.filter((x) => x.id !== p.id))}><IFechar /></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              {planos.length > 0 && (
                <button className="btn btn-tracejado tec-mais" onClick={() => alterar(c.id, (l) => [...l, novoPlano()])}>{t('+ Plano')}</button>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}
