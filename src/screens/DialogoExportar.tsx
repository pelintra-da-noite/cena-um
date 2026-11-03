import React, { useState } from 'react';
import type { Papel } from '../types';
import { IFechar } from '../components/Icones';

export interface OpcoesExportar {
  formato: 'pdf' | 'fdx' | 'fountain' | 'tecnico-pdf' | 'csv';
  rosto: boolean;
  cartaz: boolean;
  numeros: boolean;
}

interface Props {
  temCartaz: boolean;
  papel: Papel;
  onExportar: (o: OpcoesExportar) => Promise<void> | void;
  onFechar: () => void;
  tecnico?: boolean;
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

export default function DialogoExportar({ temCartaz, papel, onExportar, onFechar, tecnico }: Props) {
  const [o, setO] = useState<OpcoesExportar>({ formato: tecnico ? 'tecnico-pdf' : 'pdf', rosto: true, cartaz: false, numeros: true });
  const [ocupado, setOcupado] = useState(false);
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
          <div className="sobretitulo">Guião</div>
          {FORMATOS.map((f) => (
            <button key={f.id} className={'tipo' + (o.formato === f.id ? ' ativo' : '')} style={{ height: 58 }}
              role="radio" aria-checked={o.formato === f.id} onClick={() => setO({ ...o, formato: f.id })}>
              <b>{f.nome}</b><small>{f.desc}</small>
            </button>
          ))}
          <div className="sobretitulo" style={{ marginTop: 8 }}>Guião técnico</div>
          {FORMATOS_TECNICO.map((f) => (
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
          <button className="btn btn-ambar" disabled={ocupado}
            onClick={async () => { setOcupado(true); try { await onExportar(o); } finally { setOcupado(false); } }}>
            {ocupado ? 'A exportar…' : 'Exportar'}
          </button>
        </div>
      </div>
    </div>
  );
}
