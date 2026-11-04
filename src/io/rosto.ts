import type { FolhaRosto, MetaProjeto } from '../types';

export function rostoDe(meta: MetaProjeto): FolhaRosto {
  return {
    credito: 'Escrito por', autores: meta.autor || '', baseadoEm: '', versao: '', data: '', contacto: '', direitos: '', cartaz: false,
    ...(meta.rosto || {})
  };
}

export function dataRosto(r: FolhaRosto): string {
  return r.data.trim() || new Date().toLocaleDateString('pt-PT', { year: 'numeric', month: 'long', day: 'numeric' });
}
