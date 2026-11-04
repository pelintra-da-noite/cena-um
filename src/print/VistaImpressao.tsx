import React, { useEffect, useState } from 'react';
import type { Node as PMNode } from 'prosemirror-model';
import { schema, Elemento } from '../editor/schema';
import { calcularLayout, FORMATO, definirTeatro } from '../editor/layout';
import type { MetaProjeto, Papel, Plano, Quadro, PersonagemInfo, Projeto, Departamento } from '../types';
import { analisar, CATEGORIAS, formatarOitavos, titulo as tituloLev } from '../editor/levantamento';
import { formatarSegundos } from '../editor/layout';
import { rostoDe, dataRosto } from '../io/rosto';

interface Dados {
  guiao: any;
  meta: MetaProjeto;
  papel: Papel;
  rosto: boolean;
  cartaz: boolean;
  numeros: boolean;
  modo?: 'guiao' | 'tecnico' | 'levantamento' | 'equipa';
  equipa?: Departamento[];
  subtitulo?: string; // séries: "T1 · E02 — Título"
  unidades?: Partial<Dados>[]; // séries: vários episódios num só PDF
  personagens?: PersonagemInfo[];
  levantamento?: Projeto['levantamento'];
  locais?: Projeto['locais'];
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
      if (m.type.name === 'riscado') el = <s>{el}</s>;
      if (m.type.name === 'fonte') el = <span style={{ fontFamily: m.attrs.css }}>{el}</span>;
      if (m.type.name === 'tamanho') el = <span style={{ fontSize: `${m.attrs.pt}pt`, lineHeight: `${m.attrs.pt}pt` }}>{el}</span>;
      if (m.type.name === 'cor') el = <span style={{ color: m.attrs.valor }}>{el}</span>;
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
  const lista: Dados[] = d.unidades && d.unidades.length ? d.unidades.map((u) => ({ ...d, ...u, unidades: undefined } as Dados)) : [d];
  return (
    <>
      {lista.map((u, i) => (
        <div key={i} style={{ breakBefore: i ? 'page' : undefined }}>{renderUnidade(u)}</div>
      ))}
    </>
  );
}

function renderUnidade(d: Dados) {
  const teatro = d.meta.tipo === 'teatro';
  definirTeatro(teatro);
  const doc = schema.nodeFromJSON(d.guiao);
  const layout = calcularLayout(doc, d.papel);
  const fmt = FORMATO[d.papel];

  if (d.modo === 'equipa') {
    const deps = d.equipa || [];
    return (
      <div className="impressao">
        <style>{`@page { size: ${d.papel === 'carta' ? 'letter' : 'A4'} landscape; margin: 0; } :root { color-scheme: light; } html, body, #root { height: auto; overflow: visible; background: #fff !important; }`}</style>
        <section className="pagina paisagem">
          <div className="tp-cab"><b>{d.meta.titulo || 'Sem título'} — equipa</b><span>{deps.reduce((n, x) => n + x.membros.length, 0)} pessoas · {new Date().toLocaleDateString('pt-PT')}</span></div>
          {deps.map((dep) => (
            <div key={dep.id} className="tp-cena" style={{ breakInside: 'auto' }}>
              <h3>{dep.nome}</h3>
              <table className="tp">
                <thead><tr><th style={{ width: '20%' }}>Função</th><th style={{ width: '20%' }}>Nome</th><th style={{ width: '24%' }}>Contacto</th><th style={{ width: '18%' }}>Residência</th><th>Notas</th></tr></thead>
                <tbody>
                  {dep.membros.map((m) => (
                    <tr key={m.id}><td>{m.funcao}</td><td><b>{m.nome}</b></td><td>{m.contacto}</td><td>{m.residencia}</td><td>{m.notas}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </section>
      </div>
    );
  }

  if (d.modo === 'levantamento') {
    const projetoParcial = { personagens: d.personagens || [], levantamento: d.levantamento || {} } as Projeto;
    const { cenas, personagens } = analisar(doc, layout, projetoParcial, d.papel);
    const locais = new Map<string, typeof cenas>();
    cenas.forEach((c) => locais.set(c.local, [...(locais.get(c.local) || []), c]));
    return (
      <div className="impressao">
        <style>{`@page { size: ${d.papel === 'carta' ? 'letter' : 'A4'} landscape; margin: 0; } :root { color-scheme: light; } html, body, #root { height: auto; overflow: visible; background: #fff !important; }`}</style>
        <section className="pagina paisagem">
          <div className="tp-cab"><b>{d.meta.titulo || 'Sem título'}{d.subtitulo ? ` · ${d.subtitulo}` : ''} — levantamento</b><span>{d.meta.autor} · {cenas.length} cenas · {formatarOitavos(cenas.reduce((x, c) => x + c.oitavos, 0))} páginas</span></div>
          <table className="tp">
            <thead><tr>
              <th style={{ width: '5%' }}>Cena</th><th style={{ width: '24%' }}>Cabeçalho</th><th style={{ width: '7%' }}>Int/Ext</th><th style={{ width: '9%' }}>Momento</th>
              <th style={{ width: '7%' }}>Págs.</th><th style={{ width: '18%' }}>Personagens</th><th>Elementos de produção</th>
            </tr></thead>
            <tbody>
              {cenas.map((c) => (
                <tr key={c.id}>
                  <td><b>{c.numero}</b></td>
                  <td className="ac">{c.cabecalho}{d.locais?.[c.local]?.rodagem ? <div style={{ fontFamily: 'var(--ui)', color: '#555' }}>Rodagem: {d.locais[c.local].rodagem}</div> : null}</td>
                  <td>{c.intExt}</td><td>{tituloLev(c.momento)}</td><td>{formatarOitavos(c.oitavos)}</td>
                  <td>{c.falam.map(tituloLev).join(', ')}{c.aparecem.length ? <div style={{ color: '#555' }}>sem falas: {c.aparecem.map(tituloLev).join(', ')}</div> : null}</td>
                  <td>{CATEGORIAS.filter((k) => (c.elementos[k.id] || []).length).map((k) => (
                    <div key={k.id}><b>{k.nome}:</b> {(c.elementos[k.id] || []).join(', ')}</div>
                  ))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="tp-cena" style={{ marginTop: '18pt' }}>
            <h3>Por local</h3>
            <table className="tp">
              <thead><tr><th>Local</th><th style={{ width: '22%' }}>Local de rodagem</th><th style={{ width: '10%' }}>Int/Ext</th><th style={{ width: '18%' }}>Momentos</th><th style={{ width: '9%' }}>Págs.</th><th style={{ width: '11%' }}>Duração</th><th style={{ width: '22%' }}>Cenas</th></tr></thead>
              <tbody>
                {[...locais.entries()].map(([l, cs]) => (
                  <tr key={l}><td><b>{tituloLev(l)}</b></td><td>{d.locais?.[l]?.rodagem || '—'}</td><td>{[...new Set(cs.map((c) => c.intExt))].join(', ')}</td>
                    <td>{[...new Set(cs.map((c) => tituloLev(c.momento)))].join(', ')}</td>
                    <td>{formatarOitavos(cs.reduce((x, c) => x + c.oitavos, 0))}</td>
                    <td>{formatarSegundos(cs.reduce((x, c) => x + c.segundos, 0))}</td>
                    <td>{cs.map((c) => c.numero).join(', ')}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="tp-cena">
            <h3>Por personagem</h3>
            <table className="tp">
              <thead><tr><th>Personagem</th><th style={{ width: '8%' }}>Falas</th><th style={{ width: '30%' }}>Cenas com falas</th><th style={{ width: '30%' }}>Cenas sem falas</th></tr></thead>
              <tbody>
                {personagens.map((p) => (
                  <tr key={p.nome}><td><b>{tituloLev(p.nome)}</b>{p.descricao ? <div style={{ color: '#555' }}>{p.descricao}</div> : null}</td>
                    <td>{p.falas}</td><td>{p.cenasComFalas.join(', ') || '—'}</td><td>{p.cenasSemFalas.join(', ') || '—'}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  if (d.modo === 'tecnico') {
    const estilo = { ['--larg-in' as any]: fmt.alturaIn, ['--alt-in' as any]: fmt.larguraIn };
    const titulo = (s: string) => s.toLowerCase().replace(/(^|\s)(\S)/g, (_m, a, b) => a + b.toUpperCase());
    return (
      <div className="impressao">
        <style>{`@page { size: ${d.papel === 'carta' ? 'letter' : 'A4'} landscape; margin: 0; } :root { color-scheme: light; } html, body, #root { height: auto; overflow: visible; background: #fff !important; }`}</style>
        <section className="pagina paisagem" style={estilo}>
          <div className="tp-cab"><b>{d.meta.titulo || 'Sem título'}{d.subtitulo ? ` · ${d.subtitulo}` : ''} — guião técnico</b><span>{d.meta.autor}</span></div>
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
    <div className={'impressao' + (teatro ? ' teatro' : '')}>
      <style>{`@page { size: ${d.papel === 'carta' ? 'letter' : 'A4'}; margin: 0; } :root { color-scheme: light; } html, body, #root { height: auto; overflow: visible; background: #fff !important; }`}</style>
      {d.rosto && (() => {
        const r = rostoDe(d.meta);
        const comCartazR = (d.cartaz || r.cartaz) && !!d.meta.cartaz;
        return (
          <section className="pagina rosto" style={estiloPagina}>
            <div className="t" style={{ marginTop: comCartazR ? '1.2in' : '3in' }}>{d.meta.titulo || 'Sem título'}</div>
            {d.subtitulo && <div style={{ marginTop: '12pt' }}>{d.subtitulo}</div>}
            <div style={{ marginTop: '24pt' }}>{r.credito}</div>
            {r.autores.split('\n').filter(Boolean).map((a, i) => <div key={i} style={{ marginTop: i ? 0 : '12pt' }}>{a}</div>)}
            {r.baseadoEm && <div style={{ marginTop: '24pt' }}>{r.baseadoEm}</div>}
            {comCartazR && <img className="cartaz" style={{ marginTop: '0.6in' }} src={d.meta.cartaz!} alt="" />}
            <div className="rodape" style={{ whiteSpace: 'pre-line' }}>{r.contacto}{r.direitos ? `\n\n${r.direitos}` : ''}</div>
            <div className="rodape" style={{ left: 'auto', right: '1in', textAlign: 'right', whiteSpace: 'pre-line' }}>{r.versao ? `${r.versao}\n` : ''}{dataRosto(r)}</div>
          </section>
        );
      })()}
      {teatro && d.rosto && (layout.personagens.length > 0 || (d.personagens || []).length > 0) && (
        <section className="pagina elenco" style={estiloPagina}>
          <div className="el-titulo">PERSONAGENS</div>
          {[...layout.personagens, ...(d.personagens || []).filter((p) => p.manual && !layout.personagens.includes(p.nome)).map((p) => p.nome)].map((nome) => {
            const info = (d.personagens || []).find((p) => p.nome === nome);
            return <p key={nome} className="el-elenco"><b>{nome}</b>{info?.descricao ? `, ${info.descricao}` : ''}</p>;
          })}
        </section>
      )}
      {paginas.map((blocos, pg) => (
        <section className="pagina" key={pg} style={estiloPagina}>
          {pg > 0 && <span className="npag">{pg + 1}.</span>}
          {blocos.map(({ node, i }, k) => {
            const el = node.type.name as Elemento;
            return (
              <p key={i} className={`el el-${el}${k === 0 ? ' primeiro' : ''}`} style={node.attrs.alinhamento ? { textAlign: node.attrs.alinhamento } : undefined}>
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
