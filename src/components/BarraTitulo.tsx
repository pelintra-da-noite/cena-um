import React from 'react';
import { Claquete } from './Icones';
import { t, tp, locale } from '../i18n';

interface Props {
  ficheiro: string | null;
  porGuardar: boolean;
  guardadoAs?: number | null;
  autoGuardar?: number; // minutos; 0 = desligada ou ainda sem ficheiro
  episodio?: string | null;
  onGuardar?: () => void;
  onGuardarComo?: () => void;
}

const IGuardar = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 3h11l3 3v13a2 2 0 01-2 2H7a2 2 0 01-2-2z" /><path d="M8 3v5h7V3M8 21v-7h8v7" />
  </svg>
);

export default function BarraTitulo({ ficheiro, porGuardar, guardadoAs, autoGuardar, onGuardar, onGuardarComo, episodio }: Props) {
  const hora = guardadoAs ? new Date(guardadoAs).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' }) : '';
  return (
    <header className="titulo-barra">
      <Claquete />
      <span className="marca">Cena Um</span>
      {ficheiro && (
        <>
          <span className="sep">/</span>
          <span className="ficheiro">{ficheiro}</span>
          {episodio && <><span className="sep">/</span><span className="ficheiro" style={{ color: 'var(--ambar)' }}>{episodio}</span></>}
          <span className={'estado' + (porGuardar ? ' pendente' : '')}
            title={autoGuardar ? t('Gravação automática a cada {n} min', { n: autoGuardar }) : t('Gravação automática desligada ou guião ainda sem ficheiro (fica uma cópia de segurança)')}>
            · {porGuardar ? t('Por guardar') : hora ? t('Guardado às {hora}', { hora }) : t('Guardado')}
          </span>
          {onGuardar && (
            <div className="acoes-ficheiro">
              <button className="btn-titulo" onClick={onGuardar} title={t('Guardar') + ' (Ctrl+S)'}><IGuardar />{t('Guardar')}</button>
              <button className="btn-titulo" onClick={onGuardarComo} title={t('Guardar como') + ' (Ctrl+Shift+S)'}>{t('Guardar como…')}</button>
            </div>
          )}
        </>
      )}
    </header>
  );
}
