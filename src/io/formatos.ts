import { schema, Elemento, novoId } from '../editor/schema';
import type { Node as PMNode } from 'prosemirror-model';
import type { FolhaRosto } from '../types';

// ---------------------------------------------------------------------------
// Final Draft (.fdx)
// ---------------------------------------------------------------------------
const PARA_FDX: Record<Elemento, string> = {
  cena: 'Scene Heading', acao: 'Action', personagem: 'Character',
  dialogo: 'Dialogue', parentetico: 'Parenthetical', transicao: 'Transition'
};
const DE_FDX: Record<string, Elemento> = {
  'Scene Heading': 'cena', 'Action': 'acao', 'Character': 'personagem', 'Dialogue': 'dialogo',
  'Parenthetical': 'parentetico', 'Transition': 'transicao', 'General': 'acao', 'Shot': 'acao'
};
const MAIUSCULAS: Elemento[] = ['cena', 'personagem', 'transicao'];

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function paraFdx(doc: PMNode, titulo: string, autor: string, rosto?: FolhaRosto): string {
  const paras: string[] = [];
  doc.forEach((n) => {
    const el = n.type.name as Elemento;
    const textos: string[] = [];
    if (n.childCount === 0) textos.push('<Text></Text>');
    n.forEach((t) => {
      const estilos = t.marks.map((m) => ({ negrito: 'Bold', italico: 'Italic', sublinhado: 'Underline', riscado: 'Strikeout' } as any)[m.type.name]).filter(Boolean);
      const txt = MAIUSCULAS.includes(el) ? (t.text || '').toUpperCase() : t.text || '';
      const fonte = t.marks.find((m) => m.type.name === 'fonte');
      const tam = t.marks.find((m) => m.type.name === 'tamanho');
      const extra = (fonte ? ` Font="${esc(String(fonte.attrs.css).split(',')[0].replace(/['"]/g, '').trim())}"` : '') + (tam ? ` Size="${tam.attrs.pt}"` : '');
      textos.push(`<Text${estilos.length ? ` Style="${estilos.join('+')}"` : ''}${extra}>${esc(txt)}</Text>`);
    });
    const alin = ({ left: 'Left', center: 'Center', right: 'Right', justify: 'Full' } as any)[n.attrs.alinhamento] || '';
    paras.push(`    <Paragraph${alin ? ` Alignment="${alin}"` : ''} Type="${PARA_FDX[el]}">\n      ${textos.join('')}\n    </Paragraph>`);
  });
  return `<?xml version="1.0" encoding="UTF-8" standalone="no" ?>
<FinalDraft DocumentType="Script" Template="No" Version="5">
  <Content>
${paras.join('\n')}
  </Content>
  <TitlePage>
    <Content>
${rostoFdx(titulo, autor, rosto)}
    </Content>
  </TitlePage>
</FinalDraft>
`;
}

export function deFdx(xml: string): { doc: any; titulo: string | null } {
  const d = new DOMParser().parseFromString(xml, 'application/xml');
  if (d.querySelector('parsererror')) throw new Error('O ficheiro Final Draft parece estar danificado.');
  const content = d.querySelector('FinalDraft > Content');
  if (!content) throw new Error('Não encontrei o guião dentro do ficheiro Final Draft.');
  const blocos: any[] = [];
  content.querySelectorAll(':scope > Paragraph').forEach((p) => {
    const el = DE_FDX[p.getAttribute('Type') || ''] || 'acao';
    const nos: any[] = [];
    p.querySelectorAll(':scope > Text').forEach((t) => {
      const texto = t.textContent || '';
      if (!texto) return;
      const estilo = t.getAttribute('Style') || '';
      const marks = [
        /Bold/.test(estilo) && { type: 'negrito' },
        /Italic/.test(estilo) && { type: 'italico' },
        /Underline/.test(estilo) && { type: 'sublinhado' },
        /Strikeout/.test(estilo) && { type: 'riscado' }
      ].filter(Boolean);
      nos.push(marks.length ? { type: 'text', text: texto, marks } : { type: 'text', text: texto });
    });
    const b = bloco(el, nos);
    const alin = ({ Center: 'center', Right: 'right', Full: 'justify' } as any)[p.getAttribute('Alignment') || ''];
    if (alin && el !== 'transicao') b.attrs = { ...(b.attrs || {}), alinhamento: alin };
    blocos.push(b);
  });
  let titulo: string | null = null;
  const tp = d.querySelector('FinalDraft > TitlePage Paragraph Text');
  if (tp && tp.textContent?.trim()) titulo = capitalizar(tp.textContent.trim());
  return { doc: { type: 'doc', content: blocos.length ? blocos : [bloco('cena', [])] }, titulo };
}

// ---------------------------------------------------------------------------
// Fountain (.fountain) — texto simples usado por muitos argumentistas
// ---------------------------------------------------------------------------
export function paraFountain(doc: PMNode, titulo: string, autor: string, rosto?: FolhaRosto): string {
  const r = rosto || { credito: 'Escrito por', autores: autor, baseadoEm: '', versao: '', data: '', contacto: '', direitos: '', cartaz: false };
  const multi = (k: string, v: string) => (v.includes('\n') ? [`${k}:`, ...v.split('\n').map((l) => `    ${l}`)] : [`${k}: ${v}`]);
  const linhas: string[] = [
    `Title: ${titulo}`, `Credit: ${r.credito}`, ...multi('Author', r.autores || autor),
    ...(r.baseadoEm ? [`Source: ${r.baseadoEm}`] : []),
    ...(r.versao || r.data ? [`Draft date: ${[r.versao, r.data].filter(Boolean).join(' · ')}`] : []),
    ...(r.contacto ? multi('Contact', r.contacto) : []),
    ...(r.direitos ? [`Copyright: ${r.direitos}`] : []),
    ''
  ];
  doc.forEach((n) => {
    const el = n.type.name as Elemento;
    let txt = n.textContent;
    switch (el) {
      case 'cena': {
        const t = txt.toUpperCase();
        linhas.push('', /^(INT|EXT|EST|I\/E)/.test(t) ? t : '.' + t);
        break;
      }
      case 'acao': linhas.push('', txt); break;
      case 'personagem': linhas.push('', txt.toUpperCase()); break;
      case 'parentetico': linhas.push(txt.startsWith('(') ? txt : `(${txt})`); break;
      case 'dialogo': linhas.push(txt); break;
      case 'transicao': {
        const t = txt.toUpperCase();
        linhas.push('', /TO:$/.test(t) ? t : '> ' + t);
        break;
      }
    }
  });
  return linhas.join('\n').replace(/^\n+/, '') + '\n';
}

export function deFountain(fonte: string): { doc: any; titulo: string | null; autor: string | null } {
  let texto = fonte.replace(/\r\n?/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\[\[[\s\S]*?\]\]/g, '');
  let titulo: string | null = null;
  let autor: string | null = null;

  // Folha de rosto
  const primeira = texto.split('\n')[0] || '';
  if (/^[A-Za-z ]+:/.test(primeira)) {
    const fimRosto = texto.indexOf('\n\n');
    const rosto = fimRosto >= 0 ? texto.slice(0, fimRosto) : texto;
    texto = fimRosto >= 0 ? texto.slice(fimRosto + 2) : '';
    for (const l of rosto.split('\n')) {
      const m = l.match(/^\s*(Title|Titulo|Título|Author|Authors|Autor)\s*:\s*(.*)$/i);
      if (m) {
        if (/^t/i.test(m[1])) titulo = m[2].replace(/[_*]/g, '').trim() || titulo;
        else autor = m[2].trim() || autor;
      }
    }
  }

  const linhas = texto.split('\n');
  const blocos: any[] = [];
  let emDialogo = false;
  const ehMaiusculas = (l: string) => /[A-ZÀ-Ý]/.test(l) && l === l.toUpperCase();

  for (let i = 0; i < linhas.length; i++) {
    const raw = linhas[i];
    const l = raw.trim();
    const anteriorVazia = i === 0 || linhas[i - 1].trim() === '';
    const seguinte = (linhas[i + 1] || '').trim();
    if (l === '') { emDialogo = false; continue; }
    if (/^(#|=)/.test(l) && !/^===/.test(l)) continue; // secções e sinopses
    if (/^===+$/.test(l)) continue; // quebra de página

    if (emDialogo) {
      if (/^\(.*\)$/.test(l)) blocos.push(bloco('parentetico', txt(l)));
      else blocos.push(bloco('dialogo', txt(l)));
      continue;
    }
    if (anteriorVazia && (/^\.[^.]/.test(l) || /^(INT|EXT|EST|INT\.?\/EXT|I\/E)[.\s]/i.test(l))) {
      blocos.push(bloco('cena', txt(l.replace(/^\./, '').replace(/\s*#.*#\s*$/, ''))));
      continue;
    }
    if (/^>/.test(l) && !/<$/.test(l)) { blocos.push(bloco('transicao', txt(l.replace(/^>\s*/, '')))); continue; }
    if (anteriorVazia && ehMaiusculas(l) && /(TO|PARA):$/.test(l) && seguinte === '') { blocos.push(bloco('transicao', txt(l))); continue; }
    if (anteriorVazia && seguinte !== '' && (l.startsWith('@') || (ehMaiusculas(l.replace(/\(.*\)/, '')) && !/[.!?]$/.test(l.replace(/\(.*\)/, '').trim())))) {
      blocos.push(bloco('personagem', txt(l.replace(/^@/, '').replace(/\s*\^$/, ''))));
      emDialogo = true;
      continue;
    }
    const acao = l.replace(/^!/, '').replace(/^>\s*(.*)\s*<$/, '$1');
    const anterior = blocos[blocos.length - 1];
    if (!anteriorVazia && anterior && anterior.type === 'acao') {
      // junta linhas seguidas da mesma ação
      anterior.content = [...(anterior.content || []), { type: 'text', text: ' ' + acao }];
    } else blocos.push(bloco('acao', txt(acao)));
  }
  return { doc: { type: 'doc', content: blocos.length ? blocos : [bloco('cena', [])] }, titulo, autor };
}

// ---------------------------------------------------------------------------
function bloco(el: Elemento, conteudo: any[]): any {
  const b: any = { type: el };
  if (el === 'cena') b.attrs = { id: novoId() };
  if (conteudo.length) b.content = conteudo;
  return b;
}
const txt = (s: string) => (s ? [{ type: 'text', text: s }] : []);
const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

/** Garante que um JSON vindo de fora é um documento válido para o editor */
export function validarDoc(json: any): PMNode {
  return schema.nodeFromJSON(json);
}

function rostoFdx(titulo: string, autor: string, rosto?: FolhaRosto): string {
  const r = rosto || { credito: 'Escrito por', autores: autor, baseadoEm: '', versao: '', data: '', contacto: '', direitos: '', cartaz: false };
  const p = (t: string, al = 'Center') => `      <Paragraph Alignment="${al}" Type="General"><Text>${esc(t)}</Text></Paragraph>`;
  const linhas = [p(titulo.toUpperCase()), p(''), p(r.credito), ...(r.autores || autor).split('\n').filter(Boolean).map((a) => p(a))];
  if (r.baseadoEm) linhas.push(p(''), p(r.baseadoEm));
  for (let i = 0; i < 12; i++) linhas.push(p(''));
  for (const l of r.contacto.split('\n').filter(Boolean)) linhas.push(p(l, 'Left'));
  if (r.direitos) linhas.push(p(r.direitos, 'Left'));
  if (r.versao) linhas.push(p(r.versao, 'Right'));
  if (r.data) linhas.push(p(r.data, 'Right'));
  return linhas.join('\n');
}
