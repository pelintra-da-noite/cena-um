import type { FolhaRosto, MetaProjeto } from '../types';
import { t, locale } from '../i18n';

export function rostoDe(meta: MetaProjeto): FolhaRosto {
  return {
    credito: t('Escrito por'), autores: meta.autor || '', baseadoEm: '', versao: '', data: '', contacto: '', direitos: '', cartaz: false,
    ...(meta.rosto || {})
  };
}

export function dataRosto(r: FolhaRosto): string {
  return r.data.trim() || new Date().toLocaleDateString(locale(), { year: 'numeric', month: 'long', day: 'numeric' });
}
