import React from 'react';

export interface PedidoConfirmacao {
  titulo: string;
  texto: string;
  botoes: { rotulo: string; principal?: boolean; acao: () => void | Promise<void> }[];
}

export default function Confirmar({ pedido, onFechar }: { pedido: PedidoConfirmacao; onFechar: () => void }) {
  return (
    <div className="veu" onMouseDown={(e) => { if (e.target === e.currentTarget) onFechar(); }}>
      <div className="dialogo" role="alertdialog" aria-labelledby="conf-t" style={{ width: 460 }}>
        <div className="dialogo-corpo">
          <h2 id="conf-t" style={{ margin: 0, fontSize: 16 }}>{pedido.titulo}</h2>
          <p style={{ margin: '8px 0 0', color: 'var(--texto-2)', lineHeight: '19px' }}>{pedido.texto}</p>
        </div>
        <div className="dialogo-rodape">
          {pedido.botoes.map((b) => (
            <button key={b.rotulo} className={'btn' + (b.principal ? ' btn-ambar' : '')} autoFocus={b.principal}
              onClick={async () => { onFechar(); await b.acao(); }}>{b.rotulo}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
