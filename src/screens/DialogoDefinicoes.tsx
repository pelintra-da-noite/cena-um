import React from 'react';
import type { Definicoes, MetaProjeto } from '../types';
import { NOMES_TIPO } from '../types';
import { IFechar } from '../components/Icones';
import { reduzirImagem } from '../io/imagens';

interface Props {
  definicoes: Definicoes;
  onMudar: (d: Partial<Definicoes>) => void;
  onFechar: () => void;
  meta?: MetaProjeto | null;
  onMeta?: (m: Partial<MetaProjeto>) => void;
}

const Interruptor = ({ on, onClick, rotulo }: { on: boolean; onClick: () => void; rotulo: string }) => (
  <button role="switch" aria-checked={on} aria-label={rotulo} className={'interruptor' + (on ? ' on' : '')} onClick={onClick} />
);

export default function DialogoDefinicoes({ definicoes, onMudar, onFechar, meta, onMeta }: Props) {
  const trocarCartaz = async () => {
    const [img] = await window.cena.escolherImagens(false);
    if (img && onMeta) onMeta({ cartaz: await reduzirImagem(img.dataUrl, 1400) });
  };

  return (
    <div className="veu" onMouseDown={(e) => { if (e.target === e.currentTarget) onFechar(); }}>
      <div className="dialogo" role="dialog" aria-labelledby="def-t" style={{ width: 640 }}>
        <div className="dialogo-cab">
          <h2 id="def-t">Definições</h2>
          <span className="flex1" />
          <button className="btn-icone" aria-label="Fechar" onClick={onFechar}><IFechar /></button>
        </div>
        <div className="dialogo-corpo" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {meta && onMeta && (
            <>
              <div className="sobretitulo">Este projeto · {NOMES_TIPO[meta.tipo]}</div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="campo">
                    <label htmlFor="def-titulo">Título</label>
                    <input id="def-titulo" className="entrada" value={meta.titulo} onChange={(e) => onMeta({ titulo: e.target.value })} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="campo">
                      <label htmlFor="def-autor">Autoria</label>
                      <input id="def-autor" className="entrada" value={meta.autor} onChange={(e) => onMeta({ autor: e.target.value })} />
                    </div>
                    <div className="campo">
                      <label htmlFor="def-dur">Duração prevista (min)</label>
                      <input id="def-dur" className="entrada" inputMode="numeric" value={meta.duracaoPrevista || ''}
                        onChange={(e) => onMeta({ duracaoPrevista: parseInt(e.target.value.replace(/\D/g, ''), 10) || 0 })} />
                    </div>
                  </div>
                </div>
                <div style={{ width: 110, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
                  <span className="rot" style={{ fontSize: 12, color: 'var(--texto-3)' }}>Cartaz</span>
                  <button className="zona-cartaz" style={{ width: 110, height: 150, padding: 8, gap: 4 }} onClick={trocarCartaz} aria-label="Trocar cartaz">
                    {meta.cartaz ? <img src={meta.cartaz} alt="Cartaz" /> : <span style={{ fontSize: 12, color: 'var(--texto-3)' }}>Escolher</span>}
                  </button>
                  {meta.cartaz && <button className="btn-fantasma" style={{ fontSize: 12 }} onClick={() => onMeta({ cartaz: null })}>Remover</button>}
                </div>
              </div>
              {meta.tipo === 'curta' && (
                <div className="opcao">
                  <div style={{ flex: 1 }}><div className="t">Guia de estrutura</div><div className="d">Perguntas por página no painel da direita.</div></div>
                  <Interruptor on={meta.guia} rotulo="Guia de estrutura" onClick={() => onMeta({ guia: !meta.guia })} />
                </div>
              )}
              <div style={{ height: 8 }} />
            </>
          )}

          <div className="sobretitulo">Escrita</div>
          <div className="opcao">
            <div style={{ flex: 1 }}>
              <div className="t">Papel escuro</div>
              <div className="d">Escreve sobre papel preto para cansar menos os olhos. O PDF sai sempre em papel branco.</div>
            </div>
            <Interruptor on={definicoes.papelEscuro} rotulo="Papel escuro" onClick={() => onMudar({ papelEscuro: !definicoes.papelEscuro })} />
          </div>
          <div className="opcao">
            <div style={{ flex: 1 }}><div className="t">Números de cena</div><div className="d">Mostra o número de cada cena nas margens.</div></div>
            <Interruptor on={definicoes.numerosCena} rotulo="Números de cena" onClick={() => onMudar({ numerosCena: !definicoes.numerosCena })} />
          </div>
          <div className="opcao">
            <div style={{ flex: 1 }}><div className="t">Tamanho do papel</div><div className="d">A4 é o habitual na Europa; Carta nos Estados Unidos. Muda a contagem de páginas.</div></div>
            <div className="segmentos">
              <button className={definicoes.papel === 'a4' ? 'ativo' : ''} onClick={() => onMudar({ papel: 'a4' })}>A4</button>
              <button className={definicoes.papel === 'carta' ? 'ativo' : ''} onClick={() => onMudar({ papel: 'carta' })}>Carta</button>
            </div>
          </div>
        </div>
        <div className="dialogo-rodape"><button className="btn btn-claro" onClick={onFechar}>Concluído</button></div>
      </div>
    </div>
  );
}
