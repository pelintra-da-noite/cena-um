import React from 'react';
import { Claquete } from './Icones';

export default function BarraTitulo({ ficheiro, porGuardar }: { ficheiro: string | null; porGuardar: boolean }) {
  return (
    <header className="titulo-barra">
      <Claquete />
      <span className="marca">Cena Um</span>
      {ficheiro && (
        <>
          <span className="sep">/</span>
          <span className="ficheiro">{ficheiro}</span>
          <span className={'estado' + (porGuardar ? ' pendente' : '')}>· {porGuardar ? 'Por guardar' : 'Guardado'}</span>
        </>
      )}
    </header>
  );
}
