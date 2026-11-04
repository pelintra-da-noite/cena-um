import type { Episodio, Projeto } from '../types';
import { documentoInicial, novoId } from '../editor/schema';

export function novoEpisodio(temporada: number, numero: number, titulo = ''): Episodio {
  return { id: novoId(), temporada, numero, titulo: titulo || `Episódio ${numero}`, sinopse: '', guiao: documentoInicial(), storyboard: {}, tecnico: {}, levantamento: {} };
}

export const ordenar = (l: Episodio[]) => [...l].sort((a, b) => a.temporada - b.temporada || a.numero - b.numero);

export const codigo = (e: Pick<Episodio, 'temporada' | 'numero'>) => `T${e.temporada} · E${String(e.numero).padStart(2, '0')}`;

/** Copia o trabalho do episódio aberto (campos de topo) para a lista de episódios */
export function sincronizar(p: Projeto): Projeto {
  if (!p.episodios || !p.episodioAtivo) return p;
  return {
    ...p,
    episodios: p.episodios.map((e) => (e.id === p.episodioAtivo
      ? { ...e, guiao: p.guiao, storyboard: p.storyboard, tecnico: p.tecnico || {}, levantamento: p.levantamento || {} }
      : e))
  };
}

/** Abre outro episódio: guarda o atual na lista e traz o escolhido para cima */
export function abrirEpisodio(p: Projeto, id: string): Projeto {
  const s = sincronizar(p);
  const alvo = s.episodios!.find((e) => e.id === id);
  if (!alvo) return s;
  return { ...s, episodioAtivo: id, guiao: alvo.guiao, storyboard: alvo.storyboard || {}, tecnico: alvo.tecnico || {}, levantamento: alvo.levantamento || {} };
}

/** Projetos de série criados antes da 0.5 passam a ter o guião como episódio 1 */
export function migrarSerie(p: Projeto): Projeto {
  if (p.meta.tipo !== 'serie' || (p.episodios && p.episodios.length)) return p;
  const ep: Episodio = {
    id: novoId(), temporada: 1, numero: 1, titulo: 'Episódio 1', sinopse: '',
    guiao: p.guiao, storyboard: p.storyboard || {}, tecnico: p.tecnico || {}, levantamento: p.levantamento || {}
  };
  return { ...p, episodios: [ep], episodioAtivo: ep.id };
}

export function episodioAtivo(p: Projeto): Episodio | null {
  return p.episodios?.find((e) => e.id === p.episodioAtivo) || null;
}
