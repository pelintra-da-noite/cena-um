import React, { useState } from 'react';
import type { FolhaRosto, MetaProjeto } from '../types';
import { IFechar } from '../components/Icones';
import { rostoDe, dataRosto } from '../io/rosto';

interface Props {
  meta: MetaProjeto;
  subtitulo?: string; // séries: episódio aberto, para a pré-visualização
  onGuardar: (titulo: string, autor: string, rosto: FolhaRosto) => void;
  onFechar: () => void;
}

export default function DialogoRosto({ meta, subtitulo, onGuardar, onFechar }: Props) {
  const [titulo, setTitulo] = useState(meta.titulo);
  const [r, setR] = useState<FolhaRosto>(rostoDe(meta));
  const m = (campos: Partial<FolhaRosto>) => setR((x) => ({ ...x, ...campos }));
  const campo = (id: keyof FolhaRosto, rotulo: string, ph: string, linhas = 1) => (
    <div className="campo">
      <label htmlFor={`fr-${id}`}>{rotulo}</label>
      {linhas > 1 ? (
        <textarea id={`fr-${id}`} className="entrada area" rows={linhas} value={r[id] as string} placeholder={ph} spellCheck onChange={(e) => m({ [id]: e.target.value })} />
      ) : (
        <input id={`fr-${id}`} className="entrada" value={r[id] as string} placeholder={ph} spellCheck onChange={(e) => m({ [id]: e.target.value })} />
      )}
    </div>
  );

  return (
    <div className="veu" style={{ zIndex: 60 }} onMouseDown={(e) => { if (e.target === e.currentTarget) onFechar(); }}>
      <div className="dialogo" role="dialog" aria-labelledby="fr-t" style={{ width: 980 }}>
        <div className="dialogo-cab">
          <h2 id="fr-t">Folha de rosto</h2>
          <span className="flex1" />
          <button className="btn-icone" aria-label="Fechar" onClick={onFechar}><IFechar /></button>
        </div>
        <div className="dialogo-corpo" style={{ display: 'flex', gap: 28 }}>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="campo">
              <label htmlFor="fr-titulo">Título</label>
              <input id="fr-titulo" className="entrada" value={titulo} spellCheck onChange={(e) => setTitulo(e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '180px minmax(0,1fr)', gap: 12 }}>
              {campo('credito', 'Crédito', 'Escrito por')}
              {campo('autores', 'Autoria (um nome por linha)', 'O teu nome', 2)}
            </div>
            {campo('baseadoEm', 'Baseado em (opcional)', 'ex.: no conto «Maré», de Ana Silva')}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 12 }}>
              {campo('versao', 'Versão (opcional)', 'ex.: Rascunho 2')}
              {campo('data', 'Data (vazio = data da exportação)', dataRosto({ ...r, data: '' }))}
            </div>
            {campo('contacto', 'Contacto (canto inferior)', 'Nome\nTelefone · email\nMorada', 3)}
            {campo('direitos', 'Direitos (opcional)', 'ex.: Registado no IGAC n.º …')}
            <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13, opacity: meta.cartaz ? 1 : 0.5 }}>
              <input type="checkbox" checked={r.cartaz && !!meta.cartaz} disabled={!meta.cartaz} style={{ accentColor: '#E6A84A', width: 16, height: 16 }}
                onChange={(e) => m({ cartaz: e.target.checked })} />
              {meta.cartaz ? 'Mostrar o cartaz na folha de rosto' : 'Mostrar o cartaz (este projeto ainda não tem cartaz)'}
            </label>
          </div>

          <div className="rosto-previa" aria-label="Pré-visualização da folha de rosto">
            <div className="rp-folha">
              <div className="rp-meio" style={{ marginTop: r.cartaz && meta.cartaz ? '14%' : '34%' }}>
                <b>{(titulo || 'Sem título').toUpperCase()}</b>
                {subtitulo && <span>{subtitulo}</span>}
                <span style={{ marginTop: 14 }}>{r.credito}</span>
                {r.autores.split('\n').filter(Boolean).map((a, i) => <span key={i}>{a}</span>)}
                {r.baseadoEm && <span style={{ marginTop: 14 }}>{r.baseadoEm}</span>}
                {r.cartaz && meta.cartaz && <img src={meta.cartaz} alt="" />}
              </div>
              <div className="rp-rodape">
                <div>{r.contacto.split('\n').map((l, i) => <div key={i}>{l}</div>)}{r.direitos && <div style={{ marginTop: 4 }}>{r.direitos}</div>}</div>
                <div style={{ textAlign: 'right' }}>{r.versao && <div>{r.versao}</div>}<div>{dataRosto(r)}</div></div>
              </div>
            </div>
            <span className="vista-sub">Aparece no PDF (quando escolhes «Folha de rosto»), no Final Draft e no Fountain.</span>
          </div>
        </div>
        <div className="dialogo-rodape">
          <button className="btn" onClick={onFechar}>Cancelar</button>
          <button className="btn btn-ambar" onClick={() => { onGuardar(titulo.trim() || 'Sem título', r.autores.split('\n')[0]?.trim() || '', r); onFechar(); }}>Guardar folha de rosto</button>
        </div>
      </div>
    </div>
  );
}
