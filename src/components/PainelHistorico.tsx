import React, { useEffect, useRef } from 'react';
import type { Node as PMNode } from 'prosemirror-model';
import type { Momento } from '../editor/historico';
import { IFechar } from './Icones';
import { t, tp, locale } from '../i18n';

interface Props {
  momentos: Momento[];
  docAtual: PMNode;
  onVoltar: (m: Momento) => void;
  onFechar: () => void;
}

const hora = (ms: number) => new Date(ms).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export default function PainelHistorico({ momentos, docAtual, onVoltar, onFechar }: Props) {
  const caixa = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fora = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (caixa.current && !caixa.current.contains(t) && !t.closest('[data-abre-historico]')) onFechar();
    };
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar(); };
    window.addEventListener('mousedown', fora);
    window.addEventListener('keydown', tecla);
    return () => { window.removeEventListener('mousedown', fora); window.removeEventListener('keydown', tecla); };
  }, [onFechar]);

  const lista = [...momentos].reverse();
  const idxAtual = lista.findIndex((m) => m.doc.eq(docAtual));
  return (
    <div ref={caixa} className="painel-historico" role="dialog" aria-label={t('Histórico de alterações')}>
      <div className="ph-cab">
        <div>
          <b>{t('Histórico')}</b>
          <div className="ph-sub">{t('Desde que abriste o guião. Voltar a um momento também fica no histórico, por isso podes sempre regressar.')}</div>
        </div>
        <button className="btn-icone" aria-label={t('Fechar histórico')} onClick={onFechar}><IFechar /></button>
      </div>
      <ol className="ph-lista">
        {lista.map((m, i) => {
          const anterior = lista[i + 1];
          const dif = anterior ? m.palavras - anterior.palavras : 0;
          const atual = i === idxAtual;
          return (
            <li key={m.id} className={'ph-item' + (atual ? ' atual' : '')}>
              <span className="ph-hora">{hora(m.hora)}</span>
              <span className="ph-texto">
                <span>{m.rotulo}</span>
                <small>{tp(m.palavras, '{n} palavra', '{n} palavras')}{dif ? ` · ${dif > 0 ? '+' : '−'}${Math.abs(dif)}` : ''}</small>
              </span>
              {atual ? <span className="ph-agora">{t('Agora')}</span> : <button className="btn" onClick={() => onVoltar(m)}>{t('Voltar')}</button>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
