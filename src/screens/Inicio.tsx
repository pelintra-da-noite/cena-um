import React, { useMemo, useState } from 'react';
import type { Recente, TipoProjeto } from '../types';
import { NOMES_TIPO } from '../types';
import { IProcura, IAbrir } from '../components/Icones';
import { formatarTempo } from '../editor/layout';

interface Props {
  recentes: Recente[];
  temProjetoAberto: boolean;
  onVoltar: () => void;
  onNovo: (t: TipoProjeto) => void;
  onAbrir: () => void;
  onAbrirRecente: (r: Recente) => void;
}

function quando(ms?: number): string {
  if (!ms) return '';
  const d = (Date.now() - ms) / 1000;
  if (d < 60) return 'agora mesmo';
  if (d < 3600) return `há ${Math.floor(d / 60)} min`;
  if (d < 86400) { const h = Math.floor(d / 3600); return `há ${h} hora${h > 1 ? 's' : ''}`; }
  if (d < 172800) return 'ontem';
  if (d < 86400 * 30) return `há ${Math.floor(d / 86400)} dias`;
  return new Date(ms).toLocaleDateString('pt-PT');
}

const Folha = ({ linhas }: { linhas: string[] }) => (
  <div className="folha">{linhas.map((c, i) => <i key={i} className={c.split(' ')[0]} style={{ width: c.split(' ')[1], marginLeft: c.split(' ')[2] }} />)}</div>
);

export default function Inicio({ recentes, temProjetoAberto, onVoltar, onNovo, onAbrir, onAbrirRecente }: Props) {
  const [procura, setProcura] = useState('');
  const filtrados = useMemo(
    () => recentes.filter((r) => r.titulo.toLowerCase().includes(procura.trim().toLowerCase())),
    [recentes, procura]
  );

  return (
    <main className="inicio">
      <div className="fade">FADE IN</div>
      <h1>Que história vais contar hoje?</h1>

      <div className="modelos">
        <button className="modelo" onClick={() => onNovo('curta')}>
          <div className="prev"><Folha linhas={['f 60%', 'n 92%', 'n 80%', 'm 30% 34%', 'n 52% 20%']} /></div>
          <div className="txt"><b>Curta-metragem</b><small>5 a 30 páginas · guia de estrutura</small></div>
        </button>
        <button className="modelo" onClick={() => onNovo('longa')}>
          <div className="prev">
            <div style={{ position: 'absolute', inset: '10px 18px 0 0', background: '#D9D6CF', borderRadius: 4 }} />
            <div style={{ position: 'absolute', inset: '0 0 10px 18px' }}><Folha linhas={['f 55%', 'n 90%', 'n 70%']} /></div>
          </div>
          <div className="txt"><b>Longa-metragem</b><small>90 a 120 páginas · três atos</small></div>
        </button>
        <button className="modelo" onClick={() => onNovo('serie')}>
          <div className="prev" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 6 }}>
            <div style={{ background: '#FBFAF7', borderRadius: 4 }} />
            <div style={{ background: '#FBFAF7', borderRadius: 4 }} />
            <div style={{ background: '#3A3C43', borderRadius: 4, border: '1px dashed #5A5C63' }} />
          </div>
          <div className="txt"><b>Série de TV</b><small>Um ficheiro por episódio</small></div>
        </button>
        <button className="modelo" onClick={() => onNovo('teatro')}>
          <div className="prev"><Folha linhas={['f 26% 37%', 'n 90%', 'm 60%', 'f 22% 39%', 'n 84%']} /></div>
          <div className="txt"><b>Peça de teatro</b><small>Cenas e didascálias</small></div>
        </button>
        <button className="modelo branco" onClick={onAbrir}>
          <span className="mais"><IAbrir t={20} /></span>
          <b style={{ fontSize: 14 }}>Abrir ou importar</b>
          <small style={{ color: 'var(--texto-3)', fontSize: 12 }}>.cena, Final Draft ou Fountain</small>
        </button>
      </div>

      {temProjetoAberto && (
        <button className="btn" style={{ marginTop: 24 }} onClick={onVoltar}>← Voltar ao guião aberto</button>
      )}

      <label className="caixa-procura">
        <IProcura t={15} />
        <input placeholder="Procurar nos projetos recentes" value={procura} onChange={(e) => setProcura(e.target.value)} aria-label="Procurar nos projetos recentes" />
        <kbd>Ctrl + O</kbd>
      </label>

      <section className="recentes">
        <div className="sobretitulo">Abertos recentemente</div>
        <div className="lista-recentes">
          {filtrados.length === 0 && (
            <div className="recente-vazio">{recentes.length ? 'Nenhum projeto com esse nome.' : 'Ainda não guardaste nenhum guião. Escolhe um tipo acima para começar.'}</div>
          )}
          {filtrados.map((r) => (
            <button key={r.caminho} className="recente" onClick={() => onAbrirRecente(r)} title={r.caminho}>
              {r.capa ? <img className="capa" src={r.capa} alt="" /> : <div className="capa" />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="nome">{r.titulo || 'Sem título'}</div>
                <div className="sub">{NOMES_TIPO[r.tipo]} · {r.paginas} página{r.paginas === 1 ? '' : 's'} · ≈ {formatarTempo(r.minutos)}</div>
              </div>
              <span className="quando">{quando(r.aberto)}</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
