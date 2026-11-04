import React, { useState } from 'react';
import type { MetaProjeto, TipoProjeto } from '../types';
import { IFechar, IImagem } from '../components/Icones';
import { lerFicheiroComoDataUrl, reduzirImagem } from '../io/imagens';
import { t, tp } from '../i18n';

const TIPOS: { id: TipoProjeto; nome: string; sub: string; dur: number; un: string }[] = [
  { id: 'curta', get nome() { return t('Curta-metragem'); }, get sub() { return t('5 a 30 páginas'); }, dur: 15, get un() { return t('minutos'); } },
  { id: 'longa', get nome() { return t('Longa-metragem'); }, get sub() { return t('90 a 120 páginas'); }, dur: 100, get un() { return t('minutos'); } },
  { id: 'serie', get nome() { return t('Série de TV'); }, get sub() { return t('por episódio'); }, dur: 45, get un() { return t('min por episódio'); } },
  { id: 'teatro', get nome() { return t('Peça de teatro'); }, get sub() { return t('cenas e didascálias'); }, dur: 75, get un() { return t('minutos'); } }
];

interface Props {
  tipoInicial: TipoProjeto;
  onCancelar: () => void;
  onCriar: (m: Omit<MetaProjeto, 'criado' | 'modificado' | 'guiaFeito'>, serie?: { temporada: number; episodios: number; primeiro: string }) => void;
  avisar: (t: string) => void;
}

export default function NovoProjeto({ tipoInicial, onCancelar, onCriar, avisar }: Props) {
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState<TipoProjeto>(tipoInicial);
  const [duracao, setDuracao] = useState(String(TIPOS.find((t) => t.id === tipoInicial)!.dur));
  const [autor, setAutor] = useState(() => localStorage.getItem('cena-um:autor') || '');
  const [guia, setGuia] = useState(true);
  const [cartaz, setCartaz] = useState<string | null>(null);
  const [arrastar, setArrastar] = useState(false);
  const [temporada, setTemporada] = useState('1');
  const [nEpisodios, setNEpisodios] = useState('6');
  const [primeiro, setPrimeiro] = useState(() => t('Piloto'));
  const atual = TIPOS.find((t) => t.id === tipo)!;

  const usarImagem = async (dataUrl: string) => {
    try { setCartaz(await reduzirImagem(dataUrl, 1400)); } catch (e: any) { avisar(e.message); }
  };
  const escolher = async () => {
    const [img] = await window.cena.escolherImagens(false);
    if (img) usarImagem(img.dataUrl);
  };
  const largar = async (e: React.DragEvent) => {
    e.preventDefault();
    setArrastar(false);
    const f = e.dataTransfer.files[0];
    if (!f || !/^image\//.test(f.type)) { avisar(t('Arrasta uma imagem JPG ou PNG.')); return; }
    usarImagem(await lerFicheiroComoDataUrl(f));
  };

  const criar = () => {
    const d = parseInt(duracao, 10);
    localStorage.setItem('cena-um:autor', autor.trim());
    onCriar({
      titulo: titulo.trim() || t('Sem título'),
      tipo,
      autor: autor.trim(),
      duracaoPrevista: Number.isFinite(d) && d > 0 ? d : atual.dur,
      guia: tipo === 'curta' && guia,
      cartaz
    }, tipo === 'serie' ? {
      temporada: Math.max(1, parseInt(temporada, 10) || 1),
      episodios: Math.max(1, Math.min(40, parseInt(nEpisodios, 10) || 1)),
      primeiro: primeiro.trim()
    } : undefined);
  };

  return (
    <div className="veu" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancelar(); }}>
      <form className="dialogo" role="dialog" aria-labelledby="np-t" style={{ width: 920 }}
        onSubmit={(e) => { e.preventDefault(); criar(); }}>
        <div className="dialogo-cab">
          <h2 id="np-t">{t('Novo projeto')}</h2>
          <span className="flex1" />
          <button type="button" className="btn-icone" aria-label={t('Fechar')} onClick={onCancelar}><IFechar /></button>
        </div>

        <div className="dialogo-corpo" style={{ display: 'flex', gap: 28 }}>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="campo">
              <label htmlFor="np-titulo">{t('Título')}</label>
              <input id="np-titulo" className="entrada" autoFocus value={titulo} placeholder={t('Sem título')} onChange={(e) => setTitulo(e.target.value)} />
            </div>

            <div className="campo">
              <span className="rot" id="np-tipos">{t('Tipo de história')}</span>
              <div className="tipos" role="radiogroup" aria-labelledby="np-tipos">
                {TIPOS.map((t) => (
                  <button type="button" key={t.id} role="radio" aria-checked={tipo === t.id}
                    className={'tipo' + (tipo === t.id ? ' ativo' : '')}
                    onClick={() => { setTipo(t.id); setDuracao(String(t.dur)); }}>
                    <b>{t.nome}</b><small>{t.sub}</small>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 12 }}>
              <div className="campo">
                <label htmlFor="np-dur">{t('Duração prevista')}</label>
                <div className="entrada" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input id="np-dur" inputMode="numeric" value={duracao} onChange={(e) => setDuracao(e.target.value.replace(/\D/g, ''))}
                    style={{ width: 60, border: 0, background: 'transparent', color: 'var(--texto)', fontSize: 14, outline: 'none' }} />
                  <span style={{ color: 'var(--texto-3)', fontSize: 12 }}>{atual.un}</span>
                </div>
              </div>
              <div className="campo">
                <label htmlFor="np-autor">{t('Autoria')}</label>
                <input id="np-autor" className="entrada" value={autor} placeholder={t('O teu nome')} onChange={(e) => setAutor(e.target.value)} />
              </div>
            </div>

            {tipo === 'serie' && (
              <div style={{ display: 'grid', gridTemplateColumns: '90px 130px minmax(0,1fr)', gap: 12 }}>
                <div className="campo">
                  <label htmlFor="np-temp">{t('Temporada')}</label>
                  <input id="np-temp" className="entrada" inputMode="numeric" value={temporada} onChange={(e) => setTemporada(e.target.value.replace(/\D/g, ''))} />
                </div>
                <div className="campo">
                  <label htmlFor="np-neps">{t('Episódios previstos')}</label>
                  <input id="np-neps" className="entrada" inputMode="numeric" value={nEpisodios} onChange={(e) => setNEpisodios(e.target.value.replace(/\D/g, ''))} />
                </div>
                <div className="campo">
                  <label htmlFor="np-prim">{t('Título do 1.º episódio')}</label>
                  <input id="np-prim" className="entrada" value={primeiro} placeholder={t('Piloto')} onChange={(e) => setPrimeiro(e.target.value)} />
                </div>
              </div>
            )}
            {tipo === 'serie' && <div className="aviso-tracejado" style={{ marginTop: -6 }}>{t('Todos os episódios ficam neste projeto. Podes juntar, renomear e reordenar episódios a qualquer momento no ecrã Episódios.')}</div>}
            {tipo === 'curta' ? (
              <div className="opcao">
                <div style={{ flex: 1 }}>
                  <div className="t">{t('Guia de estrutura para curtas')}</div>
                  <div className="d">{t('Perguntas por página enquanto escreves. Desliga quando quiseres.')}</div>
                </div>
                <button type="button" role="switch" aria-checked={guia} aria-label={t('Guia de estrutura')}
                  className={'interruptor' + (guia ? ' on' : '')} onClick={() => setGuia(!guia)} />
              </div>
            ) : (
              <div className="aviso-tracejado">{t('O guia de estrutura só existe para curtas-metragens. Este tipo de projeto abre sem ele.')}</div>
            )}
          </div>

          <div style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="rot" style={{ fontSize: 12, color: 'var(--texto-3)' }}>{t('Cartaz')} <span style={{ color: 'var(--texto-4)' }}>{t('(opcional)')}</span></span>
            <button type="button" className={'zona-cartaz' + (arrastar ? ' arrastar' : '')} onClick={escolher}
              onDragOver={(e) => { e.preventDefault(); setArrastar(true); }} onDragLeave={() => setArrastar(false)} onDrop={largar}
              aria-label={cartaz ? t('Trocar cartaz') : t('Escolher cartaz')}>
              {cartaz ? <img src={cartaz} alt={t('Cartaz escolhido')} /> : (
                <>
                  <IImagem />
                  <span style={{ fontWeight: 600, color: 'var(--texto)' }}>{t('Arrasta o cartaz para aqui')}</span>
                  <span style={{ fontSize: 12, color: 'var(--texto-3)', lineHeight: '17px', textAlign: 'center' }}>{t('ou clica para escolher')}<br />{t('JPG ou PNG, formato vertical')}</span>
                </>
              )}
            </button>
            {cartaz && <button type="button" className="btn-fantasma" style={{ alignSelf: 'flex-start', fontSize: 12 }} onClick={() => setCartaz(null)}>{t('Remover cartaz')}</button>}
            <span style={{ fontSize: 11, color: 'var(--texto-3)', lineHeight: '16px' }}>{t('Aparece como capa nos projetos recentes e, se quiseres, na folha de rosto do PDF. Podes juntar ou trocar mais tarde.')}</span>
          </div>
        </div>

        <div className="dialogo-rodape">
          <button type="button" className="btn" onClick={onCancelar}>{t('Cancelar')}</button>
          <button type="submit" className="btn btn-ambar">{t('Criar projeto')}</button>
        </div>
      </form>
    </div>
  );
}
