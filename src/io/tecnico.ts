import type { Papel, Projeto } from '../types';
import { calcularLayout } from '../editor/layout';
import { validarDoc } from './formatos';

/** Guião técnico em CSV (separador ";" e BOM, para o Excel em português abrir bem os acentos) */
export function paraCsv(p: Projeto, papel: Papel): string {
  const layout = calcularLayout(validarDoc(p.guiao), papel);
  const linhas: string[][] = [['Cena', 'Cabeçalho', 'Plano', 'Storyboard', 'Escala', 'Movimento', 'Ação', 'Som', 'Duração (s)']];
  for (const c of layout.cenas) {
    const quadros = p.storyboard[c.id] || [];
    const planos = (p.tecnico || {})[c.id] || [];
    if (!planos.length) linhas.push([String(c.numero), c.texto, '', '', '', '', '', '', '']);
    planos.forEach((pl, i) => {
      const qi = quadros.findIndex((q) => q.id === pl.quadroId);
      linhas.push([
        String(c.numero), c.texto, `${c.numero}.${i + 1}`,
        qi >= 0 ? `P${qi + 1}${quadros[qi].legenda ? ' · ' + quadros[qi].legenda : ''}` : '',
        pl.escala, pl.movimento, pl.acao, pl.som, pl.duracao
      ]);
    });
  }
  const esc = (v: string) => (/[";\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return '﻿' + linhas.map((l) => l.map(esc).join(';')).join('\r\n') + '\r\n';
}
