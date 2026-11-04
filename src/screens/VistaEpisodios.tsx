import React, { useMemo } from 'react';
import type { Episodio, Papel, Projeto } from '../types';
import { schema } from '../editor/schema';
import { calcularLayout, formatarTempo, Layout } from '../editor/layout';
import { codigo, novoEpisodio, ordenar } from '../io/episodios';
import { novoId } from '../editor/schema';

interface Props {
  projeto: Projeto;
  layoutAtual: Layout;
  papel: Papel;
  onAbrir: (id: string) => void;
  onAlterar: (f: (l: Episodio[]) => Episodio[], abrir?: string) => void;
  confirmar: (titulo: string, texto: string, acao: () => void) => void;
}

const cacheLayouts = new WeakMap<object, Layout>();
function layoutDe(e: Episodio, papel: Papel): Layout | null {
  try {
    const chave = e.guiao as object;
    const guardado = cacheLayouts.get(chave);
    if (guardado) return guardado;
    const l = calcularLayout(schema.nodeFromJSON(e.guiao), papel);
    cacheLayouts.set(chave, l);
    return l;
  } catch { return null; }
}

export default function VistaEpisodios({ projeto, layoutAtual, papel, onAbrir, onAlterar, confirmar }: Props) {
  const eps = ordenar(projeto.episodios || []);
  const temporadas = [...new Set(eps.map((e) => e.temporada))];
  const stats = useMemo(() => new Map(eps.map((e) => [e.id, e.id === projeto.episodioAtivo ? layoutAtual : layoutDe(e, papel)])), [eps, layoutAtual, papel, projeto.episodioAtivo]);
  const totalMin = eps.reduce((s, e) => s + (stats.get(e.id)?.minutos || 0), 0);
  const totalPag = eps.reduce((s, e) => s + (stats.get(e.id)?.paginas || 0), 0);

  const mudar = (id: string, campos: Partial<Episodio>) => onAlterar((l) => l.map((e) => (e.id === id ? { ...e, ...campos } : e)));
  const juntar = (temporada: number) => {
    const n = Math.max(0, ...eps.filter((e) => e.temporada === temporada).map((e) => e.numero)) + 1;
    const e = novoEpisodio(temporada, n);
    onAlterar((l) => [...l, e], e.id);
  };
  const mover = (e: Episodio, d: number) => {
    const daTemp = eps.filter((x) => x.temporada === e.temporada);
    const i = daTemp.findIndex((x) => x.id === e.id);
    const outro = daTemp[i + d];
    if (!outro) return;
    onAlterar((l) => l.map((x) => (x.id === e.id ? { ...x, numero: outro.numero } : x.id === outro.id ? { ...x, numero: e.numero } : x)));
  };
  const duplicar = (e: Episodio) => {
    const n = Math.max(...eps.filter((x) => x.temporada === e.temporada).map((x) => x.numero)) + 1;
    const copia: Episodio = JSON.parse(JSON.stringify(e));
    copia.id = novoId();
    copia.numero = n;
    copia.titulo = `${e.titulo} (cópia)`;
    onAlterar((l) => [...l, copia]);
  };
  const apagar = (e: Episodio) => confirmar(
    `Apagar ${codigo(e)} — ${e.titulo}?`,
    'O guião, o storyboard, o guião técnico e o levantamento deste episódio desaparecem. Se ainda não guardaste, podes fechar sem guardar para recuperar.',
    () => onAlterar((l) => l.filter((x) => x.id !== e.id))
  );

  return (
    <main className="vista">
      <div className="vista-cab">
        <h1>Episódios</h1>
        <span className="vista-sub">{eps.length} episódio{eps.length === 1 ? '' : 's'} · {temporadas.length} temporada{temporadas.length === 1 ? '' : 's'} · {totalPag} páginas · ≈ {formatarTempo(totalMin)} no total</span>
        <span className="flex1" />
        <button className="btn" onClick={() => juntar(Math.max(...temporadas) + 1)}>+ Nova temporada</button>
      </div>
      <div className="tec-lista">
        {temporadas.map((t) => (
          <section key={t} className="temporada">
            <div className="temporada-cab">
              <h2>Temporada {t}</h2>
              <span className="flex1" />
              <button className="btn btn-ambar" onClick={() => juntar(t)}>+ Episódio</button>
            </div>
            <div className="grelha-episodios">
              {eps.filter((e) => e.temporada === t).map((e, i, daTemp) => {
                const l = stats.get(e.id);
                const ativo = e.id === projeto.episodioAtivo;
                return (
                  <article key={e.id} className={'cartao-episodio' + (ativo ? ' ativo' : '')}>
                    <div className="ce-cab">
                      <span className="ce-codigo">{codigo(e)}</span>
                      {ativo && <span className="ce-aberto">Aberto</span>}
                      <span className="flex1" />
                      <button className="btn-icone" aria-label="Mover para trás" disabled={i === 0} onClick={() => mover(e, -1)}>←</button>
                      <button className="btn-icone" aria-label="Mover para a frente" disabled={i === daTemp.length - 1} onClick={() => mover(e, 1)}>→</button>
                    </div>
                    <input className="ce-titulo" value={e.titulo} aria-label={`Título de ${codigo(e)}`} spellCheck
                      onChange={(ev) => mudar(e.id, { titulo: ev.target.value })} />
                    <textarea className="cp-desc" rows={3} value={e.sinopse} placeholder="Sinopse do episódio…" spellCheck
                      aria-label={`Sinopse de ${codigo(e)}`} onChange={(ev) => mudar(e.id, { sinopse: ev.target.value })} />
                    <div className="vista-sub">{l ? `${l.cenas.length} cena${l.cenas.length === 1 ? '' : 's'} · ${l.paginas} pág. · ≈ ${formatarTempo(l.minutos)}` : '—'}</div>
                    <div className="ce-acoes">
                      <button className="btn btn-claro" onClick={() => onAbrir(e.id)}>{ativo ? 'Ir para o guião' : 'Abrir'}</button>
                      <button className="btn" onClick={() => duplicar(e)}>Duplicar</button>
                      <button className="btn" style={{ color: 'var(--erro)' }} disabled={eps.length === 1} onClick={() => apagar(e)}>Apagar</button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
