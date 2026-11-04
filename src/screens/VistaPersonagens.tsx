import React, { useMemo, useState } from 'react';
import type { EditorState } from 'prosemirror-state';
import type { Papel, Projeto } from '../types';
import type { Layout } from '../editor/layout';
import { formatarSegundos } from '../editor/layout';
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
}

export default function VistaPersonagens({ estado, layout, projeto, papel, onProjeto, onIrParaCena, avisar }: Props) {
  const [novo, setNovo] = useState('');
  const { personagens, cenas } = useMemo(() => analisar(estado.doc, layout, projeto, papel), [estado.doc, layout, projeto, papel]);
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
        <span className="vista-sub">{personagens.length} personage{personagens.length === 1 ? 'm' : 'ns'} · as que falam entram sozinhas; as outras acrescentas aqui</span>
        <span className="flex1" />
        <form className="form-personagem" onSubmit={(e) => { e.preventDefault(); adicionar(); }}>
          <input className="entrada" value={novo} onChange={(e) => setNovo(e.target.value)} placeholder="Nome da personagem" aria-label="Nome da nova personagem" />
          <button className="btn btn-ambar" type="submit" disabled={!novo.trim()}>Adicionar personagem</button>
        </form>
      </div>

      {personagens.length === 0 && (
        <div className="vista-vazia">Ainda não há personagens. Escreve um nome no elemento Personagem do guião, ou acrescenta aqui quem aparece sem falar.</div>
      )}

      <div className="grelha-personagens">
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
      </div>
      <div className="nota-rodape">«Aparece sem falar» é detetado quando o nome da personagem está escrito na ação de uma cena onde ela não tem falas.</div>
    </main>
  );
}
