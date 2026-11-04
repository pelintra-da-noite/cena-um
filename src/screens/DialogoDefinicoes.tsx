import React, { useState } from 'react';
import type { Definicoes, MetaProjeto } from '../types';
import { NOMES_TIPO } from '../types';
import { IFechar } from '../components/Icones';
import { reduzirImagem } from '../io/imagens';
import DialogoRosto from './DialogoRosto';
import { t, tp } from '../i18n';
import { emIngles } from '../i18n';

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
  const [editarRosto, setEditarRosto] = useState(false);
  const trocarCartaz = async () => {
    const [img] = await window.cena.escolherImagens(false);
    if (img && onMeta) onMeta({ cartaz: await reduzirImagem(img.dataUrl, 1400) });
  };

  return (
    <div className="veu" onMouseDown={(e) => { if (e.target === e.currentTarget) onFechar(); }}>
      <div className="dialogo" role="dialog" aria-labelledby="def-t" style={{ width: 640 }}>
        <div className="dialogo-cab">
          <h2 id="def-t">{t('Definições')}</h2>
          <span className="flex1" />
          <button className="btn-icone" aria-label={t('Fechar')} onClick={onFechar}><IFechar /></button>
        </div>
        <div className="dialogo-corpo" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {meta && onMeta && (
            <>
              <div className="sobretitulo">{t('Este projeto')} · {t(NOMES_TIPO[meta.tipo])}</div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="campo">
                    <label htmlFor="def-titulo">{t('Título')}</label>
                    <input id="def-titulo" className="entrada" value={meta.titulo} onChange={(e) => onMeta({ titulo: e.target.value })} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="campo">
                      <label htmlFor="def-autor">{t('Autoria')}</label>
                      <input id="def-autor" className="entrada" value={meta.autor} onChange={(e) => onMeta({ autor: e.target.value })} />
                    </div>
                    <div className="campo">
                      <label htmlFor="def-dur">{t('Duração prevista (min)')}</label>
                      <input id="def-dur" className="entrada" inputMode="numeric" value={meta.duracaoPrevista || ''}
                        onChange={(e) => onMeta({ duracaoPrevista: parseInt(e.target.value.replace(/\D/g, ''), 10) || 0 })} />
                    </div>
                  </div>
                </div>
                <div style={{ width: 110, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
                  <span className="rot" style={{ fontSize: 12, color: 'var(--texto-3)' }}>{t('Cartaz')}</span>
                  <button className="zona-cartaz" style={{ width: 110, height: 150, padding: 8, gap: 4 }} onClick={trocarCartaz} aria-label={t('Trocar cartaz')}>
                    {meta.cartaz ? <img src={meta.cartaz} alt={t('Cartaz')} /> : <span style={{ fontSize: 12, color: 'var(--texto-3)' }}>{t('Escolher')}</span>}
                  </button>
                  {meta.cartaz && <button className="btn-fantasma" style={{ fontSize: 12 }} onClick={() => onMeta({ cartaz: null })}>{t('Remover')}</button>}
                </div>
              </div>
              <div className="opcao">
                <div style={{ flex: 1 }}><div className="t">{t('Folha de rosto')}</div><div className="d">{t('A capa do guião: título, crédito, autoria, versão, data e contactos.')}</div></div>
                <button className="btn" onClick={() => setEditarRosto(true)}>{t('Editar folha de rosto…')}</button>
              </div>
              {editarRosto && (
                <DialogoRosto meta={meta} onFechar={() => setEditarRosto(false)}
                  onGuardar={(titulo, autor, rosto) => onMeta({ titulo, autor, rosto })} />
              )}
              {meta.tipo === 'curta' && (
                <div className="opcao">
                  <div style={{ flex: 1 }}><div className="t">{t('Guia de estrutura')}</div><div className="d">{t('Perguntas por página no painel da direita.')}</div></div>
                  <Interruptor on={meta.guia} rotulo={t('Guia de estrutura')} onClick={() => onMeta({ guia: !meta.guia })} />
                </div>
              )}
              <div style={{ height: 8 }} />
            </>
          )}

          <div className="sobretitulo">{t('Língua')} · {emIngles() ? 'Língua' : 'Language'}</div>
          <div className="opcao">
            <div style={{ flex: 1 }}><div className="t">{t('Língua do programa')}</div><div className="d">{t('Menus, botões e PDFs. O que escreves no guião não é traduzido.')}</div></div>
            <div className="segmentos" role="radiogroup" aria-label={t('Língua do programa')}>
              <button role="radio" aria-checked={(definicoes.idioma || 'pt') === 'pt'} className={(definicoes.idioma || 'pt') === 'pt' ? 'ativo' : ''} onClick={() => onMudar({ idioma: 'pt' })}>Português</button>
              <button role="radio" aria-checked={definicoes.idioma === 'en'} className={definicoes.idioma === 'en' ? 'ativo' : ''} onClick={() => onMudar({ idioma: 'en' })}>English</button>
            </div>
          </div>
          <div className="opcao">
            <div style={{ flex: 1 }}><div className="t">{t('Corretor ortográfico')}</div><div className="d">{t('A língua em que escreves o guião, que pode não ser a do programa.')}</div></div>
            <div className="segmentos" role="radiogroup" aria-label={t('Corretor ortográfico')}>
              {([['pt', t('Português')], ['en', t('Inglês')], ['ambos', t('Ambos')]] as const).map(([v, r]) => (
                <button key={v} role="radio" aria-checked={(definicoes.corretor || 'pt') === v} className={(definicoes.corretor || 'pt') === v ? 'ativo' : ''} onClick={() => onMudar({ corretor: v })}>{r}</button>
              ))}
            </div>
          </div>
          <div style={{ height: 8 }} />
          <div className="sobretitulo">{t('Aparência')}</div>
          <div className="opcao">
            <div style={{ flex: 1 }}><div className="t">{t('Tema')}</div><div className="d">{t('Escuro cansa menos à noite; claro é melhor com muita luz. A folha do guião não muda.')}</div></div>
            <div className="segmentos" role="radiogroup" aria-label={t('Tema')}>
              <button role="radio" aria-checked={(definicoes.tema || 'escuro') === 'escuro'} className={(definicoes.tema || 'escuro') === 'escuro' ? 'ativo' : ''} onClick={() => onMudar({ tema: 'escuro' })}>{t('Escuro')}</button>
              <button role="radio" aria-checked={definicoes.tema === 'claro'} className={definicoes.tema === 'claro' ? 'ativo' : ''} onClick={() => onMudar({ tema: 'claro' })}>{t('Claro')}</button>
            </div>
          </div>
          <div style={{ height: 8 }} />
          <div className="sobretitulo">{t('Gravação')}</div>
          <div className="opcao">
            <div style={{ flex: 1 }}><div className="t">{t('Gravação automática')}</div><div className="d">{t('Guarda o ficheiro sozinho de tantos em tantos minutos. Um guião ainda sem ficheiro fica numa cópia de segurança e é recuperado se o programa fechar de repente.')}</div></div>
            <div className="segmentos" role="radiogroup" aria-label={t('Gravação automática')}>
              {[1, 5, 10, 0].map((m) => (
                <button key={m} role="radio" aria-checked={(definicoes.autoGuardar ?? 5) === m} className={(definicoes.autoGuardar ?? 5) === m ? 'ativo' : ''}
                  onClick={() => onMudar({ autoGuardar: m })}>{m ? `${m} min` : t('Desligada')}</button>
              ))}
            </div>
          </div>
          <div style={{ height: 8 }} />
          <div className="sobretitulo">{t('Escrita')}</div>
          <div className="opcao">
            <div style={{ flex: 1 }}>
              <div className="t">{t('Papel escuro')}</div>
              <div className="d">{t('Escreve sobre papel preto para cansar menos os olhos. O PDF sai sempre em papel branco.')}</div>
            </div>
            <Interruptor on={definicoes.papelEscuro} rotulo={t('Papel escuro')} onClick={() => onMudar({ papelEscuro: !definicoes.papelEscuro })} />
          </div>
          <div className="opcao">
            <div style={{ flex: 1 }}><div className="t">{t('Números de cena')}</div><div className="d">{t('Mostra o número de cada cena nas margens.')}</div></div>
            <Interruptor on={definicoes.numerosCena} rotulo={t('Números de cena')} onClick={() => onMudar({ numerosCena: !definicoes.numerosCena })} />
          </div>
          <div className="opcao">
            <div style={{ flex: 1 }}><div className="t">{t('Tamanho do papel')}</div><div className="d">{t('A4 é o habitual na Europa; Carta nos Estados Unidos. Muda a contagem de páginas.')}</div></div>
            <div className="segmentos">
              <button className={definicoes.papel === 'a4' ? 'ativo' : ''} onClick={() => onMudar({ papel: 'a4' })}>A4</button>
              <button className={definicoes.papel === 'carta' ? 'ativo' : ''} onClick={() => onMudar({ papel: 'carta' })}>{t('Carta')}</button>
            </div>
          </div>
        </div>
        <div className="dialogo-rodape"><button className="btn btn-claro" onClick={onFechar}>{t('Concluído')}</button></div>
      </div>
    </div>
  );
}
