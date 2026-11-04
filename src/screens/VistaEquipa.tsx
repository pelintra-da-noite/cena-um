import React, { useMemo, useState } from 'react';
import type { Departamento, MembroEquipa, Projeto } from '../types';
import { equipaDe, novoMembro, novoDepartamento, preenchidos } from '../io/equipa';
import { IFechar } from '../components/Icones';

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
    <input className="eq-campo" value={m[k]} placeholder={ph} aria-label={`${rot} — ${m.funcao || 'função sem nome'}`} spellCheck={k === 'notas'}
      onChange={(e) => mudarMembro(d.id, m.id, { [k]: e.target.value })} />
  );

  return (
    <main className="vista">
      <div className="vista-cab">
        <h1>Equipa</h1>
        <span className="vista-sub">{total} de {funcoes} funções preenchidas{projeto.episodios ? ' · a mesma equipa para toda a série' : ''}</span>
        <span className="flex1" />
        <input className="entrada" style={{ width: 220 }} value={procura} onChange={(e) => setProcura(e.target.value)} placeholder="Procurar nome ou função" aria-label="Procurar na equipa" />
        <label className="eq-so" title="Na exportação, deixa de fora as funções sem nome">
          <input type="checkbox" checked={soPreenchidos} onChange={(e) => setSoPreenchidos(e.target.checked)} style={{ accentColor: '#E6A84A' }} />
          Só preenchidas
        </label>
        <button className="btn" onClick={() => onExportar('csv', soPreenchidos)}>Folha de cálculo</button>
        <button className="btn btn-claro" onClick={() => onExportar('pdf', soPreenchidos)}>Exportar PDF</button>
      </div>

      <div className="eq-lista">
        {deps.map((d) => {
          const visiveis = d.membros.filter((m) => corresponde(d, m));
          if (q && !visiveis.length) return null;
          return (
            <section key={d.id} className="eq-dep">
              <div className="eq-dep-cab">
                <input className="eq-dep-nome" value={d.nome} aria-label="Nome do departamento" onChange={(e) => mudarDep(d.id, (x) => ({ ...x, nome: e.target.value }))} />
                <span className="vista-sub">{d.membros.filter((m) => m.nome.trim()).length}/{d.membros.length}</span>
                <span className="flex1" />
                <button className="btn-fantasma" onClick={() => mudarDep(d.id, (x) => ({ ...x, membros: [...x.membros, novoMembro()] }))}>+ Adicionar função</button>
                <button className="btn-icone" aria-label={`Apagar o departamento ${d.nome}`} title="Apagar departamento"
                  onClick={() => confirmar('Apagar departamento', `O departamento «${d.nome}» e as ${d.membros.length} funções que tem saem da lista.`, () => mudar((ds) => ds.filter((x) => x.id !== d.id)))}><IFechar /></button>
              </div>
              <div className="eq-linha eq-cab"><span>Função</span><span>Nome</span><span>Contacto</span><span>Residência</span><span>Notas</span><span /></div>
              {visiveis.map((m) => (
                <div key={m.id} className={'eq-linha' + (m.nome.trim() ? ' cheio' : '')}>
                  <input className="eq-campo eq-funcao" value={m.funcao} placeholder="Função" aria-label="Função" spellCheck onChange={(e) => mudarMembro(d.id, m.id, { funcao: e.target.value })} />
                  {campo(d, m, 'nome', 'Nome', 'Nome')}
                  {campo(d, m, 'contacto', 'Telefone · email', 'Contacto')}
                  {campo(d, m, 'residencia', 'Cidade / morada', 'Residência')}
                  {campo(d, m, 'notas', 'Disponibilidade, cachê…', 'Notas')}
                  <button className="btn-icone" aria-label={`Remover ${m.funcao || 'função'}`} title="Remover função"
                    onClick={() => mudarDep(d.id, (x) => ({ ...x, membros: x.membros.filter((y) => y.id !== m.id) }))}><IFechar /></button>
                </div>
              ))}
            </section>
          );
        })}
        <button className="btn eq-novo" onClick={() => mudar((ds) => [...ds, novoDepartamento()])}>+ Novo departamento</button>
      </div>
      <div className="nota-rodape">Os contactos e moradas ficam guardados dentro do ficheiro .cena — tem isso em conta antes de o partilhares com alguém de fora da equipa.</div>
    </main>
  );
}
