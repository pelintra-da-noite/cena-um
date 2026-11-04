import React, { useMemo, useState } from 'react';
import type { EditorState } from 'prosemirror-state';
import type { Papel, Projeto, AjusteCena } from '../types';
import type { Layout } from '../editor/layout';
import { formatarSegundos, calcularLayout } from '../editor/layout';
import { schema } from '../editor/schema';
import { ordenar, codigo } from '../io/episodios';
import { analisar, atualizarPersonagem, titulo } from '../editor/levantamento';
import { IFechar } from '../components/Icones';
import { t, tp } from '../i18n';

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
    <button key={id} className={'chip-cena chip-ep' + (id === projeto.episodioAtivo ? ' ativo' : '')} title={t('Abrir {ep}', { ep: tituloEp(id) })}
      onClick={() => onAbrirEpisodio?.(id)}>{rotuloEp(id).replace('T', '').replace(' · E', '.')}</button>
  ));
  const descricaoDe = (nome: string) => (projeto.personagens || []).find((x) => x.nome === nome)?.descricao || '';
  const indicePorNumero = new Map(cenas.map((c) => [c.numero, c.indice]));
  const idPorNumero = new Map(cenas.map((c) => [c.numero, c.id]));

  // O que o programa deteta sozinho (sem as correções à mão), para saber o que foi mudado pelo utilizador
  const detetado = useMemo(() => {
    const limpo = { ...projeto, personagens: (projeto.personagens || []).map((p) => ({ ...p, cenas: undefined })) };
    const m = new Map<string, AjusteCena>();
    for (const p of analisar(estado.doc, layout, limpo, papel).personagens) {
      p.cenasComFalas.forEach((n) => m.set(`${p.nome}|${idPorNumero.get(n)}`, 'fala'));
      p.cenasSemFalas.forEach((n) => m.set(`${p.nome}|${idPorNumero.get(n)}`, 'sem'));
    }
    return m;
  }, [estado.doc, layout, projeto, papel]); // eslint-disable-line
  const ajustesDe = (nome: string) => (projeto.personagens || []).find((p) => p.nome === nome)?.cenas || {};
  const ajustar = (nome: string, cenaId: string, valor: AjusteCena) => {
    const natural = detetado.get(`${nome}|${cenaId}`) || 'fora';
    onProjeto((p) => ({ ...p, personagens: atualizarPersonagem(p.personagens, nome, (x) => {
      const c = { ...(x.cenas || {}) };
      if (valor === natural) delete c[cenaId]; else c[cenaId] = valor;
      return { ...x, cenas: Object.keys(c).length ? c : undefined };
    }) }));
  };
  const repor = (nome: string) => {
    const ids = new Set(cenas.map((c) => c.id));
    onProjeto((p) => ({ ...p, personagens: atualizarPersonagem(p.personagens, nome, (x) => {
      const c = Object.fromEntries(Object.entries(x.cenas || {}).filter(([k]) => !ids.has(k)));
      return { ...x, cenas: Object.keys(c).length ? c : undefined };
    }) }));
  };
  const [aAcrescentar, setAAcrescentar] = useState<string | null>(null); // "NOME|fala" ou "NOME|sem"

  const adicionar = () => {
    const nome = novo.trim().toUpperCase();
    if (!nome) return;
    if (personagens.some((p) => p.nome === nome)) { avisar(t('{nome} já está na lista.', { nome: titulo(nome) })); return; }
    onProjeto((p) => ({ ...p, personagens: atualizarPersonagem(p.personagens, nome, (x) => ({ ...x, manual: true })) }));
    setNovo('');
  };
  const descrever = (nome: string, descricao: string) =>
    onProjeto((p) => ({ ...p, personagens: atualizarPersonagem(p.personagens, nome, (x) => ({ ...x, descricao })) }));
  const remover = (nome: string) =>
    onProjeto((p) => ({ ...p, personagens: atualizarPersonagem(p.personagens, nome, () => null) }));

  const linhaCenas = (nome: string, tipo: 'fala' | 'sem', nums: number[], rot: string) => {
    const aj = ajustesDe(nome);
    const chave = `${nome}|${tipo}`;
    const livres = cenas.filter((c) => !nums.includes(c.numero));
    return (
      <div className="cp-cenas">
        <span className="vista-sub">{rot}</span>
        <div>
          {nums.map((n) => {
            const id = idPorNumero.get(n)!;
            const mexido = !!aj[id];
            return (
              <span key={n} className={'chip-cena chip-editavel' + (mexido ? ' mexido' : '')}>
                <button onClick={() => onIrParaCena(indicePorNumero.get(n) ?? 0)} title={t(mexido ? 'Abrir a cena {n} (corrigida à mão)' : 'Abrir a cena {n}', { n })}>{n}</button>
                <button className="chip-x" aria-label={t('Tirar a cena {n}', { n })} title={t('Tirar desta lista')} onClick={() => ajustar(nome, id, 'fora')}>×</button>
              </span>
            );
          })}
          {aAcrescentar === chave ? (
            <select className="chip-sel" autoFocus defaultValue="" aria-label={t('Acrescentar cena a «{lista}»', { lista: rot })}
              onBlur={() => setAAcrescentar(null)}
              onChange={(e) => { if (e.target.value) ajustar(nome, e.target.value, tipo); setAAcrescentar(null); }}>
              <option value="" disabled>{t('Cena…')}</option>
              {livres.map((c) => <option key={c.id} value={c.id}>{c.numero} · {c.cabecalho || t('sem cabeçalho')}</option>)}
            </select>
          ) : (
            livres.length > 0 && <button className="chip-cena chip-mais" title={t('Acrescentar uma cena')} aria-label={t('Acrescentar cena a «{lista}» de {nome}', { lista: rot, nome: titulo(nome) })} onClick={() => setAAcrescentar(chave)}>+</button>
          )}
        </div>
      </div>
    );
  };

  return (
    <main className="vista">
      <div className="vista-cab">
        <h1>{t('Personagens')}</h1>
        <span className="vista-sub">{ambito === 'serie' ? tp(naSerie.length, '{n} personagem em {e} episódios', '{n} personagens em {e} episódios', { e: eps.length }) : tp(personagens.length, '{n} personagem', '{n} personagens') + ' · ' + t('as que falam entram sozinhas; as outras acrescentas aqui')}</span>
        <span className="flex1" />
        {serie && (
          <div className="segmentos" role="radiogroup" aria-label={t('Âmbito')}>
            <button role="radio" aria-checked={ambito === 'episodio'} className={ambito === 'episodio' ? 'ativo' : ''} onClick={() => setAmbito('episodio')}>{t('Este episódio')}</button>
            <button role="radio" aria-checked={ambito === 'serie'} className={ambito === 'serie' ? 'ativo' : ''} onClick={() => setAmbito('serie')}>{t('Toda a série')}</button>
          </div>
        )}
        <form className="form-personagem" onSubmit={(e) => { e.preventDefault(); adicionar(); }}>
          <input className="entrada" value={novo} onChange={(e) => setNovo(e.target.value)} placeholder={t('Nome da personagem')} aria-label={t('Nome da nova personagem')} />
          <button className="btn btn-ambar" type="submit" disabled={!novo.trim()}>{t('Adicionar personagem')}</button>
        </form>
      </div>

      {ambito === 'serie' && serie && (
        <div className="rolar-serie"><div className="tabela-serie">
          <div className="ts-linha ts-cab"><span>{t('Personagem')}</span><span>{t('Fala nos episódios')}</span><span>{t('Aparece sem falar')}</span><span>{t('Falas')}</span><span>{t('Diálogo')}</span></div>
          {naSerie.map((p) => (
            <div key={p.nome} className="ts-linha">
              <span><b>{titulo(p.nome)}</b>{descricaoDe(p.nome) && <small>{descricaoDe(p.nome)}</small>}
                <small>{tp(eps.length, '{k} de {n} episódio', '{k} de {n} episódios', { k: p.comFalas.length + p.semFalas.length })}</small></span>
              <span className="ts-chips">{p.comFalas.length ? chipsEp(p.comFalas) : '—'}</span>
              <span className="ts-chips">{p.semFalas.length ? chipsEp(p.semFalas) : '—'}</span>
              <span>{p.falas}</span>
              <span>{p.segundos ? formatarSegundos(Math.round(p.segundos)) : '—'}</span>
            </div>
          ))}
          {naSerie.length === 0 && <div className="vista-vazia">{t('Ainda não há personagens em nenhum episódio.')}</div>}
          <div className="nota-rodape">{t('Os números são temporada.episódio — clica para abrir esse episódio. A descrição de cada personagem é a mesma em todos os episódios.')}</div>
        </div></div>
      )}

      {ambito === 'episodio' && personagens.length === 0 && (
        <div className="vista-vazia">{t('Ainda não há personagens. Escreve um nome no elemento Personagem do guião, ou acrescenta aqui quem aparece sem falar.')}</div>
      )}

      {ambito === 'episodio' && <div className="grelha-personagens">
        {personagens.map((p) => (
          <article key={p.nome} className="cartao-personagem">
            <div className="cp-cab">
              <span className="cp-inicial" aria-hidden="true">{p.nome.charAt(0)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b>{titulo(p.nome)}</b>
                <div className="vista-sub">
                  {p.falas ? tp(p.falas, '{n} fala', '{n} falas') + ' · ' + t('≈ {tempo} de diálogo', { tempo: formatarSegundos(Math.round(p.segundosDialogo)) }) : t('Sem falas')}
                  {p.manual && ' · ' + t('acrescentada à mão')}
                </div>
              </div>
              {p.manual && <button className="btn-icone" aria-label={t('Remover {nome}', { nome: titulo(p.nome) })} title={t('Remover da lista')} onClick={() => remover(p.nome)}><IFechar /></button>}
            </div>
            <textarea className="cp-desc" rows={2} value={p.descricao} spellCheck placeholder={t('Quem é? Idade, traço marcante, o que quer…')}
              aria-label={t('Descrição de {nome}', { nome: titulo(p.nome) })} onChange={(e) => descrever(p.nome, e.target.value)} />
            {linhaCenas(p.nome, 'fala', p.cenasComFalas, t('Fala nas cenas'))}
            {linhaCenas(p.nome, 'sem', p.cenasSemFalas, t('Aparece sem falar'))}
            {cenas.some((c) => ajustesDe(p.nome)[c.id]) && (
              <button className="btn-fantasma cp-repor" onClick={() => repor(p.nome)}>{t('Repor o que o programa deteta')}</button>
            )}
          </article>
        ))}
      </div>}
      {ambito === 'episodio' && <div className="nota-rodape">{t('«Aparece sem falar» é detetado quando o nome da personagem está escrito na ação de uma cena onde ela não tem falas. Podes corrigir à mão: + acrescenta uma cena, × tira-a. As cenas corrigidas ficam marcadas a âmbar e valem também para o Levantamento.')}</div>}
    </main>
  );
}
