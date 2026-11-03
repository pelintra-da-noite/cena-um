import React, { useEffect, useState } from 'react';
import type { Node as PMNode } from 'prosemirror-model';
import { schema, Elemento } from '../editor/schema';
import { calcularLayout, FORMATO } from '../editor/layout';
import type { MetaProjeto, Papel, Plano, Quadro } from '../types';

interface Dados {
  guiao: any;
  meta: MetaProjeto;
  papel: Papel;
  rosto: boolean;
  cartaz: boolean;
  numeros: boolean;
  modo?: 'guiao' | 'tecnico';
  tecnico?: Record<string, Plano[]>;
  storyboard?: Record<string, Quadro[]>;
}

function conteudo(n: PMNode) {
  const partes: React.ReactNode[] = [];
  n.forEach((t, _o, i) => {
    let el: React.ReactNode = t.text;
    for (const m of t.marks) {
      if (m.type.name === 'negrito') el = <strong>{el}</strong>;
      if (m.type.name === 'italico') el = <em>{el}</em>;
      if (m.type.name === 'sublinhado') el = <u>{el}</u>;
    }
    partes.push(<React.Fragment key={i}>{el}</React.Fragment>);
  });
  return partes;
}

export default function VistaImpressao() {
  const [d, setD] = useState<Dados | null>(null);

  useEffect(() => { window.cena.dadosImpressao().then(setD); }, []);
  useEffect(() => {
    if (!d) return;
    document.fonts.ready.then(() => requestAnimationFrame(() => window.cena.impressaoPronta()));
  }, [d]);

  if (!d) return null;
  const doc = schema.nodeFromJSON(d.guiao);
  const layout = calcularLayout(doc, d.papel);
  const fmt = FORMATO[d.papel];

  if (d.modo === 'tecnico') {
    const estilo = { ['--larg-in' as any]: fmt.alturaIn, ['--alt-in' as any]: fmt.larguraIn };
    const titulo = (s: string) => s.toLowerCase().replace(/(^|\s)(\S)/g, (_m, a, b) => a + b.toUpperCase());
    return (
      <div className="impressao">
        <style>{`@page { size: ${d.papel === 'carta' ? 'letter' : 'A4'} landscape; margin: .5in; } html, body, #root { height: auto; overflow: visible; background: #fff; }`}</style>
        <section className="pagina paisagem" style={estilo}>
          <div className="tp-cab"><b>{d.meta.titulo || 'Sem título'} — guião técnico</b><span>{d.meta.autor}</span></div>
          {layout.cenas.map((c) => {
            const planos = (d.tecnico || {})[c.id] || [];
            const quadros = (d.storyboard || {})[c.id] || [];
            return (
              <div className="tp-cena" key={c.id}>
                <h3>{c.numero}. {c.texto}<small>{c.personagens.map(titulo).join(', ')}</small></h3>
                {planos.length === 0 ? <div style={{ color: '#666' }}>Sem planificação.</div> : (
                  <table className="tp">
                    <thead><tr>
                      <th style={{ width: '6%' }}>Plano</th><th style={{ width: '15%' }}>Storyboard</th><th style={{ width: '12%' }}>Escala</th>
                      <th style={{ width: '11%' }}>Movimento</th><th>Ação</th><th style={{ width: '15%' }}>Som</th><th style={{ width: '7%' }}>Dur.</th>
                    </tr></thead>
                    <tbody>
                      {planos.map((p, i) => {
                        const q = quadros.find((x) => x.id === p.quadroId);
                        return (
                          <tr key={p.id}>
                            <td><b>{c.numero}.{i + 1}</b></td>
                            <td>{q ? <img src={q.src} alt="" /> : ''}</td>
                            <td>{p.escala}</td><td>{p.movimento}</td>
                            <td className="ac">{p.acao}</td><td>{p.som}</td><td>{p.duracao ? `${p.duracao}${/\d$/.test(p.duracao) ? ' s' : ''}` : ''}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </section>
      </div>
    );
  }

  // agrupar blocos por página
  const paginas: { node: PMNode; i: number }[][] = [];
  let numCena = 0;
  const numeros: number[] = [];
  doc.forEach((node, _p, i) => {
    const pg = layout.paginaDoNo[i];
    while (paginas.length <= pg) paginas.push([]);
    paginas[pg].push({ node, i });
    if (node.type.name === 'cena') numCena++;
    numeros[i] = numCena;
  });

  const estiloPagina = { ['--larg-in' as any]: fmt.larguraIn, ['--alt-in' as any]: fmt.alturaIn };
  const comCartaz = d.rosto && d.cartaz && d.meta.cartaz;

  return (
    <div className="impressao">
      <style>{`@page { size: ${d.papel === 'carta' ? 'letter' : 'A4'}; margin: 0; } html, body, #root { height: auto; overflow: visible; background: #fff; }`}</style>
      {d.rosto && (
        <section className="pagina rosto" style={estiloPagina}>
          <div className="t" style={{ marginTop: comCartaz ? '1.2in' : '3in' }}>{d.meta.titulo || 'Sem título'}</div>
          <div style={{ marginTop: '24pt' }}>Escrito por</div>
          <div style={{ marginTop: '12pt' }}>{d.meta.autor || ''}</div>
          {comCartaz && <img className="cartaz" style={{ marginTop: '0.8in' }} src={d.meta.cartaz!} alt="" />}
          <div className="rodape">{new Date().toLocaleDateString('pt-PT', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </section>
      )}
      {paginas.map((blocos, pg) => (
        <section className="pagina" key={pg} style={estiloPagina}>
          {pg > 0 && <span className="npag">{pg + 1}.</span>}
          {blocos.map(({ node, i }, k) => {
            const el = node.type.name as Elemento;
            return (
              <p key={i} className={`el el-${el}${k === 0 ? ' primeiro' : ''}`}>
                {el === 'cena' && d.numeros && <span className="ncena e">{numeros[i]}</span>}
                {conteudo(node)}
                {el === 'cena' && d.numeros && <span className="ncena d">{numeros[i]}</span>}
              </p>
            );
          })}
        </section>
      ))}
    </div>
  );
}
