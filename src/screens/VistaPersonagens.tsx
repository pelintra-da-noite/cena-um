import React, { useMemo, useState } from 'react';
import type { EditorState } from 'prosemirror-state';
import type { Papel, Projeto } from '../types';
import type { Layout } from '../editor/layout';
import { formatarSegundos, calcularLayout } from '../editor/layout';
import { schema } from '../editor/schema';
import { ordenar, codigo } from '../io/episodios';
import { analisar, atualizarPersonagem, titulo } from '../editor/levantamento';
import { IFechar } from '../components/Icones';

interface Props {
  estado: EditorState;
  layout: Layout;
  projeto: Projeto;
  papel: Papel;
  onProjeto: (f: (p: Projeto) => Projeto) => void;
  onIrParaCena: (indice: number) => void;
  avisar: (t: string) => void;
  onAbrirEpisodio?: (id: string) => void;
}

interface NaSerie { nome: string; comFalas: string[]; semFalas: string[]; falas: number; segundos: number }

export default function VistaPersonagens({ estado, layout, projeto, papel, onProjeto, onIrParaCena, avisar, onAbrirEpisodio }: Props) {
  const [novo, setNovo] = useState('');
  const serie = !!projeto.episodios?.length;
  const [ambito, setAmbito] = useState<'episodio' | 'serie'>('episodio');
  const { personagens, cenas } = useMemo(() => analisar(estado.doc, layout, projeto, papel), [estado.doc, layout, projeto, papel]);

  // Visão da série inteira: em que episódios entra cada personagem (o episódio aberto usa o texto que está no editor)
  const eps = useMemo(() => (serie ? ordenar(projeto.episodios!) : []), [serie, projeto.episodios]);
  const naSerie = useMemo<NaSerie[]>(() => {
    if (!serie || ambito !== 'serie') return [];
    const mapa = new Map<string, NaSerie>();
    for (const e of eps) {
      const ativo = e.id === projeto.episodioAtivo;
      let r;
      try {
        const doc = ativo ? estado.doc : schema.nodeFromJSON(e.guiao);
        r = analisar(doc, ativo ? layout : calcularLayout(doc, papel), { ...projeto, levantamento: ativo ? projeto.levantamento : e.levantamento }, papel);
      } catch { continue; }
      for (const p of r.personagens) {
        if (!p.falas && !p.cenasSemFalas.length) continue; // acrescentada à mão mas não entra neste episódio
        const x = mapa.get(p.nome) || { nome: p.nome, comFalas: [], semFalas: [], falas: 0, segundos: 0 };
        if (p.falas) x.comFalas.push(e.id); else x.semFalas.push(e.id);
        x.falas += p.falas; x.segundos += p.segundosDialogo;
        mapa.set(p.nome, x);
      }
    }
    for (const p of personagens) if (!mapa.has(p.nome)) mapa.set(p.nome, { nome: p.nome, comFalas: [], semFalas: [], falas: 0, segundos: 0 });
    return [...mapa.values()].sort((a, b) => b.comFalas.length + b.semFalas.length - (a.comFalas.length + a.semFalas.length) || b.falas - a.falas);
  }, [serie, ambito, eps, estado.doc, layout, projeto, papel, personagens]);
  const rotuloEp = (id: string) => { const e = eps.find((x) => x.id === id); return e ? codigo(e) : '?'; };
  const tituloEp = (id: string) => { const e = eps.find((x) => x.id === id); return e ? `${codigo(e)} — ${e.titulo}` : ''; };
  const chipsEp = (ids: string[]) => ids.map((id) => (
    <button key={id} className={'chip-cena chip-ep' + (id === projeto.episodioAtivo ? ' ativo' : '')} title={`Abrir ${tituloEp(id)}`}
      onClick={() => onAbrirEpisodio?.(id)}>{rotuloEp(id).replace('T', '').replace(' · E', '.')}</button>
  ));
  const descricaoDe = (nome: string) => (projeto.personagens || []).find((x) => x.nome === nome)?.descricao || '';
  const indicePorNumero = new Map(cenas.map((c) => [c.numero, c.indice]));

  const adicionar = () => {
    const nome = novo.trim().toUpperCase();
    if (!nome) return;
    if (personagens.some((p) => p.nome === nome)) { avisar(`${titulo(nome)} já está na lista.`); return; }
    onProjeto((p) => ({ ...p, personagens: atualizarPersonagem(p.personagens, nome, (x) => ({ ...x, manual: true })) }));
    setNovo('');
  };
  const descrever = (nome: string, descricao: string) =>
    onProjeto((p) => ({ ...p, personagens: atualizarPersonagem(p.personagens, nome, (x) => ({ ...x, descricao })) }));
  const remover = (nome: string) =>
    onProjeto((p) => ({ ...p, personagens: atualizarPersonagem(p.personagens, nome, () => null) }));

  const chips = (nums: number[]) => nums.map((n) => (
    <button key={n} className="chip-cena" onClick={() => onIrParaCena(indicePorNumero.get(n) ?? 0)} title={`Abrir a cena ${n}`}>{n}</button>
  ));

  return (
    <main className="vista">
      <div className="vista-cab">
        <h1>Personagens</h1>
        <span className="vista-sub">{ambito === 'serie' ? `${naSerie.length} personage${naSerie.length === 1 ? 'm' : 'ns'} em ${eps.length} episódios` : `${personagens.length} personage${personagens.length === 1 ? 'm' : 'ns'} · as que falam entram sozinhas; as outras acrescentas aqui`}</span>
        <span className="flex1" />
        {serie && (
          <div className="segmentos" role="radiogroup" aria-label="Âmbito">
            <button role="radio" aria-checked={ambito === 'episodio'} className={ambito === 'episodio' ? 'ativo' : ''} onClick={() => setAmbito('episodio')}>Este episódio</button>
            <button role="radio" aria-checked={ambito === 'serie'} className={ambito === 'serie' ? 'ativo' : ''} onClick={() => setAmbito('serie')}>Toda a série</button>
          </div>
        )}
        <form className="form-personagem" onSubmit={(e) => { e.preventDefault(); adicionar(); }}>
          <input className="entrada" value={novo} onChange={(e) => setNovo(e.target.value)} placeholder="Nome da personagem" aria-label="Nome da nova personagem" />
          <button className="btn btn-ambar" type="submit" disabled={!novo.trim()}>Adicionar personagem</button>
        </form>
      </div>

      {ambito === 'serie' && serie && (
        <div className="tabela-serie">
          <div className="ts-linha ts-cab"><span>Personagem</span><span>Fala nos episódios</span><span>Aparece sem falar</span><span>Falas</span><span>Diálogo</span></div>
          {naSerie.map((p) => (
            <div key={p.nome} className="ts-linha">
              <span><b>{titulo(p.nome)}</b>{descricaoDe(p.nome) && <small>{descricaoDe(p.nome)}</small>}
                <small>{p.comFalas.length + p.semFalas.length} de {eps.length} episódio{eps.length === 1 ? '' : 's'}</small></span>
              <span className="ts-chips">{p.comFalas.length ? chipsEp(p.comFalas) : '—'}</span>
              <span className="ts-chips">{p.semFalas.length ? chipsEp(p.semFalas) : '—'}</span>
              <span>{p.falas}</span>
              <span>{p.segundos ? formatarSegundos(Math.round(p.segundos)) : '—'}</span>
            </div>
          ))}
          {naSerie.length === 0 && <div className="vista-vazia">Ainda não há personagens em nenhum episódio.</div>}
          <div className="nota-rodape">Os números são temporada.episódio — clica para abrir esse episódio. A descrição de cada personagem é a mesma em todos os episódios.</div>
        </div>
      )}

      {ambito === 'episodio' && personagens.length === 0 && (
        <div className="vista-vazia">Ainda não há personagens. Escreve um nome no elemento Personagem do guião, ou acrescenta aqui quem aparece sem falar.</div>
      )}

      {ambito === 'episodio' && <div className="grelha-personagens">
        {personagens.map((p) => (
          <article key={p.nome} className="cartao-personagem">
            <div className="cp-cab">
              <span className="cp-inicial" aria-hidden="true">{p.nome.charAt(0)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b>{titulo(p.nome)}</b>
                <div className="vista-sub">
                  {p.falas ? `${p.falas} fala${p.falas === 1 ? '' : 's'} · ≈ ${formatarSegundos(Math.round(p.segundosDialogo))} de diálogo` : 'Sem falas'}
                  {p.manual && ' · acrescentada à mão'}
                </div>
              </div>
              {p.manual && <button className="btn-icone" aria-label={`Remover ${titulo(p.nome)}`} title="Remover da lista" onClick={() => remover(p.nome)}><IFechar /></button>}
            </div>
            <textarea className="cp-desc" rows={2} value={p.descricao} spellCheck placeholder="Quem é? Idade, traço marcante, o que quer…"
              aria-label={`Descrição de ${titulo(p.nome)}`} onChange={(e) => descrever(p.nome, e.target.value)} />
            <div className="cp-cenas">
              <span className="vista-sub">Fala nas cenas</span>
              <div>{p.cenasComFalas.length ? chips(p.cenasComFalas) : <span className="vista-sub">—</span>}</div>
            </div>
            <div className="cp-cenas">
              <span className="vista-sub">Aparece sem falar</span>
              <div>{p.cenasSemFalas.length ? chips(p.cenasSemFalas) : <span className="vista-sub">—</span>}</div>
            </div>
          </article>
        ))}
      </div>}
      {ambito === 'episodio' && <div className="nota-rodape">«Aparece sem falar» é detetado quando o nome da personagem está escrito na ação de uma cena onde ela não tem falas.</div>}
    </main>
  );
}
