import React, { useState } from 'react';
import type { Papel } from '../types';
import { IFechar } from '../components/Icones';

export interface OpcoesExportar {
  formato: 'pdf' | 'fdx' | 'fountain' | 'tecnico-pdf' | 'csv' | 'lev-pdf' | 'lev-csv';
  rosto: boolean;
  cartaz: boolean;
  numeros: boolean;
  episodios?: string[]; // séries: ids dos episódios a exportar
}

interface Props {
  temCartaz: boolean;
  cartazPorDefeito?: boolean;
  papel: Papel;
  onExportar: (o: OpcoesExportar) => Promise<void> | void;
  onFechar: () => void;
  inicial?: 'guiao' | 'tecnico' | 'levantamento';
  episodios?: { id: string; rotulo: string }[]; // só nas séries
  episodioAtivo?: string;
  teatro?: boolean;
}

const FORMATOS: { id: OpcoesExportar['formato']; nome: string; desc: string }[] = [
  { id: 'pdf', nome: 'PDF', desc: 'Para ler, imprimir ou enviar a concursos.' },
  { id: 'fdx', nome: 'Final Draft (.fdx)', desc: 'Para quem trabalha no Final Draft.' },
  { id: 'fountain', nome: 'Fountain (.fountain)', desc: 'Texto simples, abre em quase todos os programas.' }
];
const FORMATOS_TECNICO: typeof FORMATOS = [
  { id: 'tecnico-pdf', nome: 'Guião técnico em PDF', desc: 'Tabela de planos com storyboard, em A4 horizontal.' },
  { id: 'csv', nome: 'Guião técnico em folha de cálculo (.csv)', desc: 'Abre no Excel, Numbers ou Google Sheets.' }
];
const FORMATOS_LEV: typeof FORMATOS = [
  { id: 'lev-pdf', nome: 'Levantamento em PDF', desc: 'Folha por cena com personagens e elementos, mais o resumo por local.' },
  { id: 'lev-csv', nome: 'Levantamento em folha de cálculo (.csv)', desc: 'Uma linha por cena, para planear a rodagem.' }
];

export default function DialogoExportar({ temCartaz, cartazPorDefeito, papel, onExportar, onFechar, inicial, episodios, episodioAtivo, teatro }: Props) {
  const [o, setO] = useState<OpcoesExportar>({ formato: inicial === 'tecnico' ? 'tecnico-pdf' : inicial === 'levantamento' ? 'lev-pdf' : 'pdf', rosto: true, cartaz: !!cartazPorDefeito, numeros: true });
  const [ocupado, setOcupado] = useState(false);
  const [alcance, setAlcance] = useState<'atual' | 'todos' | 'escolher'>('atual');
  const [escolhidos, setEscolhidos] = useState<string[]>(episodioAtivo ? [episodioAtivo] : []);
  const idsAExportar = !episodios ? undefined : alcance === 'atual' ? [episodioAtivo!] : alcance === 'todos' ? episodios.map((e) => e.id) : escolhidos;
  const varios = (idsAExportar?.length || 0) > 1;
  const rotuloAtivo = episodios?.find((e) => e.id === episodioAtivo)?.rotulo;
  const caixa = (chave: 'rosto' | 'cartaz' | 'numeros', rotulo: string, desativado = false) => (
    <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13, opacity: desativado ? 0.45 : 1 }}>
      <input type="checkbox" checked={o[chave] && !desativado} disabled={desativado}
        onChange={(e) => setO({ ...o, [chave]: e.target.checked })} style={{ accentColor: '#E6A84A', width: 16, height: 16 }} />
      {rotulo}
    </label>
  );

  return (
    <div className="veu" onMouseDown={(e) => { if (e.target === e.currentTarget && !ocupado) onFechar(); }}>
      <div className="dialogo" role="dialog" aria-labelledby="exp-t" style={{ width: 520 }}>
        <div className="dialogo-cab">
          <h2 id="exp-t">Exportar</h2>
          <span className="flex1" />
          <button className="btn-icone" aria-label="Fechar" onClick={onFechar}><IFechar /></button>
        </div>
        <div className="dialogo-corpo" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {episodios && (
            <div className="exp-episodios">
              <div className="sobretitulo">Episódios</div>
              <div className="segmentos" role="radiogroup" aria-label="Episódios a exportar" style={{ alignSelf: 'flex-start' }}>
                <button role="radio" aria-checked={alcance === 'atual'} className={alcance === 'atual' ? 'ativo' : ''} onClick={() => setAlcance('atual')}>Episódio aberto</button>
                <button role="radio" aria-checked={alcance === 'todos'} className={alcance === 'todos' ? 'ativo' : ''} onClick={() => setAlcance('todos')}>Todos ({episodios.length})</button>
                <button role="radio" aria-checked={alcance === 'escolher'} className={alcance === 'escolher' ? 'ativo' : ''} onClick={() => setAlcance('escolher')}>Escolher…</button>
              </div>
              {alcance === 'atual' && <span className="vista-sub">{rotuloAtivo}</span>}
              {alcance === 'todos' && <span className="vista-sub">Em PDF, ficam todos num só ficheiro, cada um com a sua folha de rosto. Em Final Draft ou Fountain, sai um ficheiro por episódio.</span>}
              {alcance === 'escolher' && (
                <div className="lista-ep-exp">
                  {episodios.map((e) => (
                    <label key={e.id}>
                      <input type="checkbox" checked={escolhidos.includes(e.id)} style={{ accentColor: '#E6A84A' }}
                        onChange={(ev) => setEscolhidos((l) => (ev.target.checked ? [...l, e.id] : l.filter((x) => x !== e.id)))} />
                      {e.rotulo}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="sobretitulo">Guião</div>
          {FORMATOS.map((f) => (
            <button key={f.id} className={'tipo' + (o.formato === f.id ? ' ativo' : '')} style={{ height: 58 }}
              role="radio" aria-checked={o.formato === f.id} onClick={() => setO({ ...o, formato: f.id })}>
              <b>{f.nome}</b><small>{f.desc}</small>
            </button>
          ))}
          {!teatro && <div className="sobretitulo" style={{ marginTop: 8 }}>Guião técnico</div>}
          {!teatro && FORMATOS_TECNICO.map((f) => (
            <button key={f.id} className={'tipo' + (o.formato === f.id ? ' ativo' : '')} style={{ height: 58 }}
              role="radio" aria-checked={o.formato === f.id} onClick={() => setO({ ...o, formato: f.id })}>
              <b>{f.nome}</b><small>{f.desc}</small>
            </button>
          ))}
          <div className="sobretitulo" style={{ marginTop: 8 }}>Levantamento</div>
          {FORMATOS_LEV.map((f) => (
            <button key={f.id} className={'tipo' + (o.formato === f.id ? ' ativo' : '')} style={{ height: 58 }}
              role="radio" aria-checked={o.formato === f.id} onClick={() => setO({ ...o, formato: f.id })}>
              <b>{f.nome}</b><small>{f.desc}</small>
            </button>
          ))}
          {o.formato === 'pdf' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8, padding: 14, borderRadius: 10, background: 'var(--superficie)' }}>
              {caixa('rosto', 'Folha de rosto com título e autoria')}
              {caixa('cartaz', temCartaz ? 'Incluir o cartaz na folha de rosto' : 'Incluir o cartaz (este projeto não tem cartaz)', !temCartaz || !o.rosto)}
              {caixa('numeros', 'Números de cena nas margens')}
              <span style={{ fontSize: 12, color: 'var(--texto-3)' }}>Papel {papel === 'a4' ? 'A4' : 'Carta'}, sempre branco, Courier 12 pt.</span>
            </div>
          )}
        </div>
        <div className="dialogo-rodape">
          <button className="btn" onClick={onFechar}>Cancelar</button>
          <button className="btn btn-ambar"
            disabled={ocupado || (!!episodios && !idsAExportar?.length)}
            onClick={async () => { setOcupado(true); try { await onExportar({ ...o, episodios: idsAExportar }); } finally { setOcupado(false); } }}>
            {ocupado ? 'A exportar…' : varios ? `Exportar ${idsAExportar!.length} episódios` : 'Exportar'}
          </button>
        </div>
      </div>
    </div>
  );
}
