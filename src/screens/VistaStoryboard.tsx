import React, { useState } from 'react';
import type { Projeto, Quadro } from '../types';
import { formatarSegundos, Layout } from '../editor/layout';
import { novoId } from '../editor/schema';
import { lerFicheiroComoDataUrl, reduzirImagem } from '../io/imagens';
import { IFechar } from '../components/Icones';

interface Props {
  layout: Layout;
  projeto: Projeto;
  onProjeto: (f: (p: Projeto) => Projeto) => void;
  onIrParaCena: (indice: number) => void;
  onCarregarStoryboard: (cenaId: string) => void;
  avisar: (t: string) => void;
}

export default function VistaStoryboard({ layout, projeto, onProjeto, onIrParaCena, onCarregarStoryboard, avisar }: Props) {
  const [alvo, setAlvo] = useState<string | null>(null);
  const total = layout.cenas.reduce((s, c) => s + (projeto.storyboard[c.id]?.length || 0), 0);
  const semImagens = layout.cenas.filter((c) => !(projeto.storyboard[c.id]?.length)).length;

  // Imagens e planos cujo cabeçalho de cena desapareceu (apagado ou colado por cima)
  const idsCenas = new Set(layout.cenas.map((c) => c.id));
  const orfaos = [...new Set([...Object.keys(projeto.storyboard), ...Object.keys(projeto.tecnico || {})])]
    .filter((id) => !idsCenas.has(id) && ((projeto.storyboard[id]?.length || 0) + ((projeto.tecnico || {})[id]?.length || 0)) > 0);
  const ligar = (orfao: string, destino: string) => onProjeto((p) => {
    const sb = { ...p.storyboard };
    const tec = { ...(p.tecnico || {}) };
    sb[destino] = [...(sb[destino] || []), ...(sb[orfao] || [])];
    if (tec[orfao]?.length) tec[destino] = [...(tec[destino] || []), ...tec[orfao]];
    delete sb[orfao];
    delete tec[orfao];
    return { ...p, storyboard: sb, tecnico: tec };
  });
  const apagarOrfao = (orfao: string) => onProjeto((p) => {
    const sb = { ...p.storyboard };
    const tec = { ...(p.tecnico || {}) };
    delete sb[orfao];
    delete tec[orfao];
    return { ...p, storyboard: sb, tecnico: tec };
  });

  const alterar = (cenaId: string, f: (l: Quadro[]) => Quadro[]) =>
    onProjeto((p) => ({ ...p, storyboard: { ...p.storyboard, [cenaId]: f(p.storyboard[cenaId] || []) } }));

  const largarFicheiros = async (cenaId: string, e: React.DragEvent) => {
    e.preventDefault();
    setAlvo(null);
    const ficheiros = [...e.dataTransfer.files].filter((f) => /^image\//.test(f.type));
    if (!ficheiros.length) { avisar('Arrasta imagens JPG ou PNG.'); return; }
    const novos: Quadro[] = [];
    for (const f of ficheiros) {
      try { novos.push({ id: novoId(), src: await reduzirImagem(await lerFicheiroComoDataUrl(f), 1280, 0.85), legenda: f.name.replace(/\.[^.]+$/, '') }); }
      catch { avisar(`Não consegui ler ${f.name}.`); }
    }
    alterar(cenaId, (l) => [...l, ...novos]);
  };

  const mover = (cenaId: string, i: number, d: number) => alterar(cenaId, (l) => {
    const c = [...l];
    const j = i + d;
    if (j < 0 || j >= c.length) return c;
    [c[i], c[j]] = [c[j], c[i]];
    return c;
  });

  return (
    <main className="vista">
      <div className="vista-cab">
        <h1>Storyboard</h1>
        <span className="vista-sub">{total} imagem{total === 1 ? '' : 's'} · {semImagens} cena{semImagens === 1 ? '' : 's'} sem storyboard · podes arrastar imagens do Explorador para uma cena</span>
      </div>
      {layout.cenas.length === 0 && <div className="vista-vazia">Ainda não há cenas. Escreve um cabeçalho (INT. ou EXT.) no guião e as cenas aparecem aqui.</div>}
      <div className="sb-lista">
        {orfaos.map((id) => {
          const q = projeto.storyboard[id] || [];
          const n = (projeto.tecnico || {})[id]?.length || 0;
          return (
            <section key={id} className="sb-cena orfao">
              <div className="sb-cena-cab">
                <b style={{ color: 'var(--erro)' }}>Sem cena</b>
                <span className="vista-sub">
                  {q.length} imagem{q.length === 1 ? '' : 's'}{n ? ` e ${n} plano${n === 1 ? '' : 's'} do guião técnico` : ''} ficaram sem cabeçalho. Se voltares a pôr esse cabeçalho no guião, regressam sozinhas.
                </span>
                <span className="flex1" />
                <select className="tec-sel" style={{ width: 240 }} value="" aria-label="Ligar a uma cena"
                  onChange={(e) => { if (e.target.value) ligar(id, e.target.value); }}>
                  <option value="">Ligar à cena…</option>
                  {layout.cenas.map((c) => <option key={c.id} value={c.id}>{c.numero}. {c.texto}</option>)}
                </select>
                <button className="btn" style={{ color: 'var(--erro)' }} onClick={() => apagarOrfao(id)}>Apagar</button>
              </div>
              {q.length > 0 && (
                <div className="sb-grelha">
                  {q.map((x, i) => (
                    <figure key={x.id} className="sb-quadro"><img src={x.src} alt={x.legenda || `Imagem ${i + 1}`} /><figcaption><span className="sb-num">P{i + 1}</span><span className="vista-sub">{x.legenda}</span></figcaption></figure>
                  ))}
                </div>
              )}
            </section>
          );
        })}
        {layout.cenas.map((c) => {
          const quadros = projeto.storyboard[c.id] || [];
          return (
            <section key={c.id} className={'sb-cena' + (alvo === c.id ? ' alvo' : '')}
              onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setAlvo(c.id); } }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setAlvo(null); }}
              onDrop={(e) => largarFicheiros(c.id, e)}>
              <div className="sb-cena-cab">
                <b className="num-ambar">{c.numero}</b>
                <button className="sb-cena-titulo" onClick={() => onIrParaCena(c.indice)} title="Abrir a cena no guião">{c.texto || 'Cena sem cabeçalho'}</button>
                <span className="vista-sub">{formatarSegundos(c.segundos)} · pág. {c.pagina}</span>
                <span className="flex1" />
                <button className="btn" onClick={() => onCarregarStoryboard(c.id)}>Carregar imagens</button>
              </div>
              <div className="sb-grelha">
                {quadros.map((q, i) => (
                  <figure key={q.id} className="sb-quadro">
                    <img src={q.src} alt={q.legenda || `Plano ${i + 1}`} />
                    <figcaption>
                      <span className="sb-num">P{i + 1}</span>
                      <input value={q.legenda} placeholder="Legenda do plano" aria-label={`Legenda do plano ${i + 1}`}
                        onChange={(e) => alterar(c.id, (l) => l.map((x) => (x.id === q.id ? { ...x, legenda: e.target.value } : x)))} />
                    </figcaption>
                    <div className="sb-acoes">
                      <button className="btn-icone" aria-label="Mover para trás" disabled={i === 0} onClick={() => mover(c.id, i, -1)}>←</button>
                      <button className="btn-icone" aria-label="Mover para a frente" disabled={i === quadros.length - 1} onClick={() => mover(c.id, i, 1)}>→</button>
                      <button className="btn-icone" aria-label="Remover imagem" onClick={() => alterar(c.id, (l) => l.filter((x) => x.id !== q.id))}><IFechar /></button>
                    </div>
                  </figure>
                ))}
                <button className="sb-juntar" onClick={() => onCarregarStoryboard(c.id)}>
                  <span>+</span>
                  {quadros.length ? 'Juntar imagens' : 'Primeira imagem'}
                </button>
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
