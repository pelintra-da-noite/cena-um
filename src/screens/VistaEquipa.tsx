import React, { useMemo, useState } from 'react';
import type { Departamento, MembroEquipa, Projeto } from '../types';
import { equipaDe, novoMembro, novoDepartamento, preenchidos } from '../io/equipa';
import { IFechar } from '../components/Icones';
import { t, tp } from '../i18n';

interface Props {
  projeto: Projeto;
  onProjeto: (f: (p: Projeto) => Projeto) => void;
  onExportar: (formato: 'pdf' | 'csv', soPreenchidos: boolean) => void;
  confirmar: (titulo: string, texto: string, acao: () => void) => void;
}

export default function VistaEquipa({ projeto, onProjeto, onExportar, confirmar }: Props) {
  // Sem equipa guardada, mostra a lista por defeito; os ids têm de ser estáveis até à primeira edição
  const padrao = useMemo(() => equipaDe({ ...projeto, equipa: undefined }), [projeto.meta.tipo]); // eslint-disable-line
  const deps = projeto.equipa || padrao;
  const [procura, setProcura] = useState('');
  const [soPreenchidos, setSoPreenchidos] = useState(true);
  const mudar = (f: (d: Departamento[]) => Departamento[]) => onProjeto((p) => ({ ...p, equipa: f(p.equipa || padrao) }));
  const mudarDep = (id: string, f: (d: Departamento) => Departamento) => mudar((ds) => ds.map((d) => (d.id === id ? f(d) : d)));
  const mudarMembro = (dep: string, mid: string, campos: Partial<MembroEquipa>) =>
    mudarDep(dep, (d) => ({ ...d, membros: d.membros.map((m) => (m.id === mid ? { ...m, ...campos } : m)) }));
  const q = procura.trim().toLowerCase();
  const corresponde = (d: Departamento, m: MembroEquipa) => !q || [d.nome, m.funcao, m.nome, m.contacto, m.residencia, m.notas].some((x) => x.toLowerCase().includes(q));
  const total = preenchidos(deps);
  const funcoes = deps.reduce((n, d) => n + d.membros.length, 0);

  const campo = (d: Departamento, m: MembroEquipa, k: keyof MembroEquipa, ph: string, rot: string) => (
    <input className="eq-campo" value={m[k]} placeholder={ph} aria-label={`${rot} — ${m.funcao || t('função sem nome')}`} spellCheck={k === 'notas'}
      onChange={(e) => mudarMembro(d.id, m.id, { [k]: e.target.value })} />
  );

  return (
    <main className="vista">
      <div className="vista-cab">
        <h1>{t('Equipa')}</h1>
        <span className="vista-sub">{t('{k} de {n} funções preenchidas', { k: total, n: funcoes })}{projeto.episodios ? ' · ' + t('a mesma equipa para toda a série') : ''}</span>
        <span className="flex1" />
        <input className="entrada" style={{ width: 220 }} value={procura} onChange={(e) => setProcura(e.target.value)} placeholder={t('Procurar nome ou função')} aria-label={t('Procurar na equipa')} />
        <label className="eq-so" title={t('Na exportação, deixa de fora as funções sem nome')}>
          <input type="checkbox" checked={soPreenchidos} onChange={(e) => setSoPreenchidos(e.target.checked)} style={{ accentColor: '#E6A84A' }} />
          {t('Só preenchidas')}
        </label>
        <button className="btn" onClick={() => onExportar('csv', soPreenchidos)}>{t('Folha de cálculo')}</button>
        <button className="btn btn-claro" onClick={() => onExportar('pdf', soPreenchidos)}>{t('Exportar PDF')}</button>
      </div>

      <div className="eq-lista">
        {deps.map((d) => {
          const visiveis = d.membros.filter((m) => corresponde(d, m));
          if (q && !visiveis.length) return null;
          return (
            <section key={d.id} className="eq-dep">
              <div className="eq-dep-cab">
                <input className="eq-dep-nome" value={d.nome} aria-label={t('Nome do departamento')} onChange={(e) => mudarDep(d.id, (x) => ({ ...x, nome: e.target.value }))} />
                <span className="vista-sub">{d.membros.filter((m) => m.nome.trim()).length}/{d.membros.length}</span>
                <span className="flex1" />
                <button className="btn-fantasma" onClick={() => mudarDep(d.id, (x) => ({ ...x, membros: [...x.membros, novoMembro()] }))}>{t('+ Adicionar função')}</button>
                <button className="btn-icone" aria-label={t('Apagar o departamento {nome}', { nome: d.nome })} title={t('Apagar departamento')}
                  onClick={() => confirmar(t('Apagar departamento'), t('O departamento «{nome}» e as {n} funções que tem saem da lista.', { nome: d.nome, n: d.membros.length }), () => mudar((ds) => ds.filter((x) => x.id !== d.id)))}><IFechar /></button>
              </div>
              <div className="eq-linha eq-cab"><span>{t('Função')}</span><span>{t('Nome')}</span><span>{t('Contacto')}</span><span>{t('Residência')}</span><span>{t('Notas')}</span><span /></div>
              {visiveis.map((m) => (
                <div key={m.id} className={'eq-linha' + (m.nome.trim() ? ' cheio' : '')}>
                  <input className="eq-campo eq-funcao" value={m.funcao} placeholder={t('Função')} aria-label={t('Função')} spellCheck onChange={(e) => mudarMembro(d.id, m.id, { funcao: e.target.value })} />
                  {campo(d, m, 'nome', t('Nome'), t('Nome'))}
                  {campo(d, m, 'contacto', t('Telefone · email'), t('Contacto'))}
                  {campo(d, m, 'residencia', t('Cidade / morada'), t('Residência'))}
                  {campo(d, m, 'notas', t('Disponibilidade, cachê…'), t('Notas'))}
                  <button className="btn-icone" aria-label={t('Remover {nome}', { nome: m.funcao || t('função') })} title={t('Remover função')}
                    onClick={() => mudarDep(d.id, (x) => ({ ...x, membros: x.membros.filter((y) => y.id !== m.id) }))}><IFechar /></button>
                </div>
              ))}
            </section>
          );
        })}
        <button className="btn eq-novo" onClick={() => mudar((ds) => [...ds, novoDepartamento()])}>{t('+ Novo departamento')}</button>
      </div>
      <div className="nota-rodape">{t('Os contactos e moradas ficam guardados dentro do ficheiro .cena — tem isso em conta antes de o partilhares com alguém de fora da equipa.')}</div>
    </main>
  );
}
