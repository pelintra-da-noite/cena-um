import React from 'react';
import { Claquete } from './Icones';

interface Props {
  ficheiro: string | null;
  porGuardar: boolean;
  onGuardar?: () => void;
  onGuardarComo?: () => void;
}

const IGuardar = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 3h11l3 3v13a2 2 0 01-2 2H7a2 2 0 01-2-2z" /><path d="M8 3v5h7V3M8 21v-7h8v7" />
  </svg>
);

export default function BarraTitulo({ ficheiro, porGuardar, onGuardar, onGuardarComo }: Props) {
  return (
    <header className="titulo-barra">
      <Claquete />
      <span className="marca">Cena Um</span>
      {ficheiro && (
        <>
          <span className="sep">/</span>
          <span className="ficheiro">{ficheiro}</span>
          <span className={'estado' + (porGuardar ? ' pendente' : '')}>· {porGuardar ? 'Por guardar' : 'Guardado'}</span>
          {onGuardar && (
            <div className="acoes-ficheiro">
              <button className="btn-titulo" onClick={onGuardar} title="Guardar (Ctrl+S)"><IGuardar />Guardar</button>
              <button className="btn-titulo" onClick={onGuardarComo} title="Guardar como (Ctrl+Shift+S)">Guardar como…</button>
            </div>
          )}
        </>
      )}
    </header>
  );
}
