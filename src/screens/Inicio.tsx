import React, { useMemo, useState } from 'react';
import type { Recente, TipoProjeto } from '../types';
import { NOMES_TIPO } from '../types';
import { IProcura, IAbrir } from '../components/Icones';
import { formatarTempo } from '../editor/layout';
import { t, tp, locale } from '../i18n';

interface Props {
  recentes: Recente[];
  temProjetoAberto: boolean;
  onVoltar: () => void;
  onNovo: (t: TipoProjeto) => void;
  onAbrir: () => void;
  onAbrirRecente: (r: Recente) => void;
  onDefinicoes: () => void;
}

function quando(ms?: number): string {
  if (!ms) return '';
  const d = (Date.now() - ms) / 1000;
  if (d < 60) return t('agora mesmo');
  if (d < 3600) return t('há {n} min', { n: Math.floor(d / 60) });
  if (d < 86400) return tp(Math.floor(d / 3600), 'há {n} hora', 'há {n} horas');
  if (d < 172800) return t('ontem');
  if (d < 86400 * 30) return t('há {n} dias', { n: Math.floor(d / 86400) });
  return new Date(ms).toLocaleDateString(locale());
}

const Folha = ({ linhas }: { linhas: string[] }) => (
  <div className="folha">{linhas.map((c, i) => <i key={i} className={c.split(' ')[0]} style={{ width: c.split(' ')[1], marginLeft: c.split(' ')[2] }} />)}</div>
);

export default function Inicio({ recentes, temProjetoAberto, onVoltar, onNovo, onAbrir, onAbrirRecente, onDefinicoes }: Props) {
  const [procura, setProcura] = useState('');
  const filtrados = useMemo(
    () => recentes.filter((r) => r.titulo.toLowerCase().includes(procura.trim().toLowerCase())),
    [recentes, procura]
  );

  return (
    <main className="inicio">
      <div className="fade">{t('FADE IN')}</div>
      <h1>{t('Que história vais contar hoje?')}</h1>

      <div className="modelos">
        <button className="modelo" onClick={() => onNovo('curta')}>
          <div className="prev"><Folha linhas={['f 60%', 'n 92%', 'n 80%', 'm 30% 34%', 'n 52% 20%']} /></div>
          <div className="txt"><b>{t('Curta-metragem')}</b><small>{t('5 a 30 páginas · guia de estrutura')}</small></div>
        </button>
        <button className="modelo" onClick={() => onNovo('longa')}>
          <div className="prev">
            <div style={{ position: 'absolute', inset: '10px 18px 0 0', background: 'var(--linha-5)', borderRadius: 4 }} />
            <div style={{ position: 'absolute', inset: '0 0 10px 18px' }}><Folha linhas={['f 55%', 'n 90%', 'n 70%']} /></div>
          </div>
          <div className="txt"><b>{t('Longa-metragem')}</b><small>{t('90 a 120 páginas · três atos')}</small></div>
        </button>
        <button className="modelo" onClick={() => onNovo('serie')}>
          <div className="prev" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 6 }}>
            <div style={{ background: '#FBFAF7', borderRadius: 4 }} />
            <div style={{ background: '#FBFAF7', borderRadius: 4 }} />
            <div style={{ background: 'var(--fundo-1)', borderRadius: 4, border: '1px dashed var(--linha-4)' }} />
          </div>
          <div className="txt"><b>{t('Série de TV')}</b><small>{t('Episódios e temporadas num só projeto')}</small></div>
        </button>
        <button className="modelo" onClick={() => onNovo('teatro')}>
          <div className="prev"><Folha linhas={['f 26% 37%', 'n 90%', 'm 60%', 'f 22% 39%', 'n 84%']} /></div>
          <div className="txt"><b>{t('Peça de teatro')}</b><small>{t('Cenas e didascálias')}</small></div>
        </button>
        <button className="modelo branco" onClick={onAbrir}>
          <span className="mais"><IAbrir t={20} /></span>
          <b style={{ fontSize: 14 }}>{t('Abrir ou importar')}</b>
          <small style={{ color: 'var(--texto-3)', fontSize: 12 }}>{t('.cena, Final Draft ou Fountain')}</small>
        </button>
      </div>

      {temProjetoAberto && (
        <button className="btn" style={{ marginTop: 24 }} onClick={onVoltar}>{t('← Voltar ao guião aberto')}</button>
      )}

      <label className="caixa-procura">
        <IProcura t={15} />
        <input placeholder={t('Procurar nos projetos recentes')} value={procura} onChange={(e) => setProcura(e.target.value)} aria-label={t('Procurar nos projetos recentes')} />
        <kbd>{t('Ctrl + O')}</kbd>
      </label>

      <section className="recentes">
        <div className="sobretitulo">{t('Abertos recentemente')}</div>
        <div className="lista-recentes">
          {filtrados.length === 0 && (
            <div className="recente-vazio">{recentes.length ? t('Nenhum projeto com esse nome.') : t('Ainda não guardaste nenhum guião. Escolhe um tipo acima para começar.')}</div>
          )}
          {filtrados.map((r) => (
            <button key={r.caminho} className="recente" onClick={() => onAbrirRecente(r)} title={r.caminho}>
              {r.capa ? <img className="capa" src={r.capa} alt="" /> : <div className="capa" />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="nome">{r.titulo || t('Sem título')}</div>
                <div className="sub">{t(NOMES_TIPO[r.tipo])}{r.episodios ? ' · ' + tp(r.episodios, '{n} episódio', '{n} episódios') : ' · ' + tp(r.paginas, '{n} página', '{n} páginas') + ` · ≈ ${formatarTempo(r.minutos)}`}</div>
              </div>
              <span className="quando">{quando(r.aberto)}</span>
            </button>
          ))}
        </div>
      </section>
      <button className="btn" style={{ marginTop: 28 }} onClick={onDefinicoes}>{t('Definições e tema')}</button>
    </main>
  );
}
