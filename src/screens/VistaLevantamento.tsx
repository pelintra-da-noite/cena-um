import React, { useMemo, useState } from 'react';
import type { EditorState } from 'prosemirror-state';
import type { CategoriaLevantamento, Papel, Projeto } from '../types';
import { formatarSegundos, Layout } from '../editor/layout';
import { analisar, CATEGORIAS, formatarOitavos, titulo, CenaLevantamento } from '../editor/levantamento';

interface Props {
  estado: EditorState;
  layout: Layout;
  projeto: Projeto;
  papel: Papel;
  onProjeto: (f: (p: Projeto) => Projeto) => void;
  onIrParaCena: (indice: number) => void;
  onExportar: () => void;
}

function CampoElementos({ valores, exemplo, onMudar, rotulo }: { valores: string[]; exemplo: string; rotulo: string; onMudar: (v: string[]) => void }) {
  const [txt, setTxt] = useState('');
  const juntar = () => {
    const novos = txt.split(/[,;]/).map((x) => x.trim()).filter(Boolean).filter((x) => !valores.includes(x));
    if (novos.length) onMudar([...valores, ...novos]);
    setTxt('');
  };
  return (
    <div className={'campo-lev' + (valores.length ? ' cheio' : '')}>
      <span className="campo-lev-rot">{rotulo}</span>
      <div className="campo-lev-chips">
        {valores.map((v) => (
          <span key={v} className="chip-lev">{v}
            <button aria-label={`Retirar ${v}`} onClick={() => onMudar(valores.filter((x) => x !== v))}>×</button>
          </span>
        ))}
        <input value={txt} placeholder={valores.length ? '+' : exemplo} aria-label={`Juntar a ${rotulo}`}
          onChange={(e) => setTxt(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); juntar(); } }}
          onBlur={juntar} />
      </div>
    </div>
  );
}

export default function VistaLevantamento({ estado, layout, projeto, papel, onProjeto, onIrParaCena, onExportar }: Props) {
  const [separador, setSeparador] = useState<'cena' | 'resumo'>('cena');
  const [filtro, setFiltro] = useState('');
  const { cenas, personagens } = useMemo(() => analisar(estado.doc, layout, projeto, papel), [estado.doc, layout, projeto, papel]);

  // Local real de rodagem: um por local do guião, partilhado por todas as cenas desse local
  const rodagem = (local: string) => (projeto.locais || {})[local]?.rodagem || '';
  const mudarRodagem = (local: string, valor: string) => onProjeto((p) => ({
    ...p, locais: { ...(p.locais || {}), [local]: { rodagem: valor } }
  }));

  const mudar = (cenaId: string, cat: CategoriaLevantamento, v: string[]) => onProjeto((p) => ({
    ...p, levantamento: { ...(p.levantamento || {}), [cenaId]: { ...((p.levantamento || {})[cenaId] || {}), [cat]: v } }
  }));

  const q = filtro.trim().toUpperCase();
  const visiveis = q ? cenas.filter((c) =>
    c.cabecalho.includes(q) || c.falam.some((x) => x.includes(q)) || c.aparecem.some((x) => x.includes(q)) ||
    Object.values(c.elementos).some((l) => (l || []).some((x) => x.toUpperCase().includes(q)))) : cenas;

  // ---------- resumo ----------
  const resumo = useMemo(() => {
    const conta = (f: (c: CenaLevantamento) => string) => {
      const m = new Map<string, CenaLevantamento[]>();
      cenas.forEach((c) => { const k = f(c); m.set(k, [...(m.get(k) || []), c]); });
      return [...m.entries()];
    };
    const elementos = new Map<string, { cat: string; nome: string; cenas: number[] }>();
    for (const c of cenas) for (const cat of CATEGORIAS) for (const v of c.elementos[cat.id] || []) {
      const k = cat.id + '|' + v.toLowerCase();
      const e = elementos.get(k) || { cat: cat.nome, nome: v, cenas: [] };
      e.cenas.push(c.numero);
      elementos.set(k, e);
    }
    return {
      oitavos: cenas.reduce((s, c) => s + c.oitavos, 0),
      intExt: conta((c) => c.intExt),
      momentos: conta((c) => c.momento),
      locais: conta((c) => c.local).sort((a, b) => b[1].length - a[1].length),
      elementos: [...elementos.values()].sort((a, b) => a.cat.localeCompare(b.cat) || a.nome.localeCompare(b.nome))
    };
  }, [cenas]);

  const numeros = (l: CenaLevantamento[] | number[]) => l.map((c: any) => (typeof c === 'number' ? c : c.numero)).join(', ');

  return (
    <main className="vista">
      <div className="vista-cab">
        <h1>Levantamento</h1>
        <div className="segmentos" role="tablist" aria-label="Vista do levantamento">
          <button role="tab" aria-selected={separador === 'cena'} className={separador === 'cena' ? 'ativo' : ''} onClick={() => setSeparador('cena')}>Por cena</button>
          <button role="tab" aria-selected={separador === 'resumo'} className={separador === 'resumo' ? 'ativo' : ''} onClick={() => setSeparador('resumo')}>Resumo</button>
        </div>
        <span className="vista-sub">{cenas.length} cena{cenas.length === 1 ? '' : 's'} · {formatarOitavos(resumo.oitavos)} páginas · {resumo.locais.length} loca{resumo.locais.length === 1 ? 'l' : 'is'} · {personagens.length} personage{personagens.length === 1 ? 'm' : 'ns'}</span>
        <span className="flex1" />
        {separador === 'cena' && (
          <label className="procura" style={{ margin: 0, width: 240 }}>
            <input placeholder="Procurar local, personagem ou adereço" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
          </label>
        )}
        <button className="btn btn-claro" onClick={onExportar}>Exportar</button>
      </div>

      {cenas.length === 0 && <div className="vista-vazia">Ainda não há cenas. Escreve um cabeçalho (INT. ou EXT.) no guião e o levantamento começa a encher-se sozinho.</div>}

      {separador === 'cena' && (
        <div className="tec-lista">
          <div className="faixa-info" style={{ margin: 0 }}>
            <span className="ponto" style={{ background: 'var(--ambar)' }} />
            Local, interior/exterior, momento do dia, tamanho e personagens são lidos do guião. O resto escreves aqui, separado por vírgulas, ou seleciona uma palavra no guião e usa o botão direito → «Juntar ao levantamento».
          </div>
          {visiveis.map((c) => (
            <section key={c.id} className="tec-cena">
              <div className="tec-cab">
                <b className="num-ambar">{c.numero}</b>
                <button className="sb-cena-titulo" onClick={() => onIrParaCena(c.indice)} title="Abrir a cena no guião">{c.cabecalho || 'Cena sem cabeçalho'}</button>
                <span className="flex1" />
                <span className="etiqueta">{c.intExt}</span>
                <span className="etiqueta">{c.momento}</span>
                <span className="etiqueta">{formatarOitavos(c.oitavos)} pág.</span>
                <span className="vista-sub">≈ {formatarSegundos(c.segundos)}</span>
              </div>
              <div className="lev-personagens">
                <span className="campo-lev-rot">Local</span>
                <div className="lev-local">
                  <span className="chip-lev forte">{titulo(c.local)}</span>
                  <input className="lev-rodagem" value={rodagem(c.local)} placeholder="Local real de rodagem (morada, casa, estúdio…)"
                    aria-label={`Local real de rodagem de ${titulo(c.local)}`} spellCheck onChange={(e) => mudarRodagem(c.local, e.target.value)} />
                  {cenas.filter((x) => x.local === c.local).length > 1 && (
                    <span className="vista-sub">vale para as {cenas.filter((x) => x.local === c.local).length} cenas neste local</span>
                  )}
                </div>
              </div>
              <div className="lev-personagens">
                <span className="campo-lev-rot">Personagens</span>
                <div className="campo-lev-chips">
                  {c.falam.map((n) => <span key={n} className="chip-lev forte">{titulo(n)}</span>)}
                  {c.aparecem.map((n) => <span key={n} className="chip-lev" title="Aparece sem falar">{titulo(n)} · sem falas</span>)}
                  {!c.falam.length && !c.aparecem.length && <span className="vista-sub">Nenhuma personagem detetada</span>}
                </div>
              </div>
              <div className="grelha-lev">
                {CATEGORIAS.map((cat) => (
                  <CampoElementos key={cat.id} rotulo={cat.nome} exemplo={cat.exemplo} valores={c.elementos[cat.id] || []}
                    onMudar={(v) => mudar(c.id, cat.id, v)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {separador === 'resumo' && cenas.length > 0 && (
        <div className="tec-lista">
          <div className="resumo-totais">
            {resumo.intExt.map(([k, l]) => <div key={k} className="total"><b>{l.length}</b><span>{k === '—' ? 'Sem INT/EXT' : k}</span></div>)}
            {resumo.momentos.map(([k, l]) => <div key={'m' + k} className="total"><b>{l.length}</b><span>{k === '—' ? 'Sem momento' : titulo(k)}</span></div>)}
          </div>

          <section className="tec-cena">
            <h2 className="resumo-tit">Locais</h2>
            <table className="tec-tabela">
              <thead><tr><th>Local</th><th style={{ width: 260 }}>Local de rodagem</th><th style={{ width: 110 }}>INT/EXT</th><th style={{ width: 200 }}>Momentos</th><th style={{ width: 90 }}>Páginas</th><th style={{ width: 110 }}>Duração</th><th style={{ width: 200 }}>Cenas</th></tr></thead>
              <tbody>
                {resumo.locais.map(([local, l]) => (
                  <tr key={local}>
                    <td><b>{titulo(local)}</b></td>
                    <td><input className="lev-rodagem" style={{ width: '100%' }} value={rodagem(local)} placeholder="Onde vai ser filmado"
                      aria-label={`Local real de rodagem de ${titulo(local)}`} spellCheck onChange={(e) => mudarRodagem(local, e.target.value)} /></td>
                    <td>{[...new Set(l.map((c) => c.intExt))].join(', ')}</td>
                    <td>{[...new Set(l.map((c) => titulo(c.momento)))].join(', ')}</td>
                    <td>{formatarOitavos(l.reduce((s, c) => s + c.oitavos, 0))}</td>
                    <td>{formatarSegundos(l.reduce((s, c) => s + c.segundos, 0))}</td>
                    <td>{numeros(l)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="tec-cena">
            <h2 className="resumo-tit">Personagens</h2>
            <table className="tec-tabela">
              <thead><tr><th>Personagem</th><th style={{ width: 80 }}>Falas</th><th style={{ width: 240 }}>Cenas com falas</th><th style={{ width: 240 }}>Cenas sem falas</th><th style={{ width: 90 }}>Total</th></tr></thead>
              <tbody>
                {personagens.map((p) => (
                  <tr key={p.nome}>
                    <td><b>{titulo(p.nome)}</b>{p.descricao && <div className="vista-sub">{p.descricao}</div>}</td>
                    <td>{p.falas}</td>
                    <td>{numeros(p.cenasComFalas) || '—'}</td>
                    <td>{numeros(p.cenasSemFalas) || '—'}</td>
                    <td>{new Set([...p.cenasComFalas, ...p.cenasSemFalas]).size}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="tec-cena">
            <h2 className="resumo-tit">Elementos de produção</h2>
            {resumo.elementos.length === 0 ? <div className="vista-sub">Ainda não registaste adereços, guarda-roupa ou outros elementos. Faz isso no separador «Por cena».</div> : (
              <table className="tec-tabela">
                <thead><tr><th style={{ width: 180 }}>Categoria</th><th>Elemento</th><th style={{ width: 240 }}>Cenas</th></tr></thead>
                <tbody>
                  {resumo.elementos.map((e) => (
                    <tr key={e.cat + e.nome}><td>{e.cat}</td><td><b>{e.nome}</b></td><td>{numeros(e.cenas)}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

