import type { Node as PMNode } from 'prosemirror-model';
import type { Elemento } from './schema';
import type { Papel } from '../types';

/**
 * Paginação de um guião segundo o formato clássico:
 * Courier 12 pt (10 caracteres por polegada, 6 linhas por polegada),
 * margens 1,5" à esquerda e 1" nas restantes. Uma página ≈ um minuto.
 */
export const FORMATO = {
  a4: { larguraIn: 8.27, alturaIn: 11.69, colunas: 57, linhasPagina: 56 },
  carta: { larguraIn: 8.5, alturaIn: 11, colunas: 60, linhasPagina: 53 }
} as const;

/** Recuo e largura de cada elemento, em caracteres, a partir da margem do texto */
export function geometria(el: Elemento, papel: Papel): { recuo: number; largura: number } {
  const col = FORMATO[papel].colunas;
  switch (el) {
    case 'personagem': return { recuo: 22, largura: col - 22 };
    case 'dialogo': return { recuo: 10, largura: 35 };
    case 'parentetico': return { recuo: 16, largura: 24 };
    default: return { recuo: 0, largura: col };
  }
}

export const LINHAS_ANTES: Record<Elemento, number> = {
  cena: 1, acao: 1, personagem: 1, dialogo: 0, parentetico: 0, transicao: 1
};

export function contarLinhas(texto: string, largura: number): number {
  if (!texto) return 1;
  let linhas = 0;
  for (const paragrafo of texto.split('\n')) {
    const palavras = paragrafo.split(/ +/);
    let atual = 0;
    linhas++;
    for (const p of palavras) {
      let palavra = p.length;
      if (atual === 0) {
        while (palavra > largura) { linhas++; palavra -= largura; }
        atual = palavra;
      } else if (atual + 1 + palavra <= largura) {
        atual += 1 + palavra;
      } else {
        linhas++;
        while (palavra > largura) { linhas++; palavra -= largura; }
        atual = palavra;
      }
    }
  }
  return linhas;
}

export interface CenaInfo {
  indice: number; // índice do nó no documento
  numero: number;
  id: string;
  texto: string;
  pagina: number;
  segundos: number;
  personagens: string[];
}

export interface Layout {
  linhasPagina: number;
  paginas: number;
  minutos: number; // fracionário
  paginaDoNo: number[];
  quebraAntes: boolean[]; // o nó começa uma página nova (exceto a primeira)
  cenas: CenaInfo[];
  linhasDialogo: number;
  linhasAcao: number;
  personagens: string[];
  locais: string[];
}

const tipoDe = (n: PMNode) => n.type.name as Elemento;

export function calcularLayout(doc: PMNode, papel: Papel): Layout {
  const LP = FORMATO[papel].linhasPagina;
  const nos: PMNode[] = [];
  doc.forEach((n) => { nos.push(n); });

  const corpo = nos.map((n) => contarLinhas(n.textContent, geometria(tipoDe(n), papel).largura));
  const paginaDoNo: number[] = new Array(nos.length).fill(0);
  const quebraAntes: boolean[] = new Array(nos.length).fill(false);
  const linhasNo: number[] = new Array(nos.length).fill(0);

  let pagina = 0;
  let usadas = 0;

  // Quantas linhas um "grupo" precisa para não ficar órfão no fundo da página
  const necessario = (i: number): number => {
    const el = tipoDe(nos[i]);
    if (el === 'cena') {
      const seguinte = i + 1 < nos.length ? Math.min(2, corpo[i + 1]) + LINHAS_ANTES[tipoDe(nos[i + 1])] : 0;
      return corpo[i] + seguinte;
    }
    if (el === 'personagem') {
      // personagem + parentéticos/diálogos que se seguem
      let total = corpo[i];
      let j = i + 1;
      while (j < nos.length && (tipoDe(nos[j]) === 'dialogo' || tipoDe(nos[j]) === 'parentetico')) {
        total += corpo[j];
        j++;
      }
      return Math.min(total, LP);
    }
    return Math.min(corpo[i], LP);
  };

  for (let i = 0; i < nos.length; i++) {
    const el = tipoDe(nos[i]);
    const antes = usadas === 0 ? 0 : LINHAS_ANTES[el];
    const dentroDeGrupo = el === 'dialogo' || el === 'parentetico';
    const precisa = dentroDeGrupo ? corpo[i] : necessario(i);
    if (usadas > 0 && usadas + antes + precisa > LP && !(dentroDeGrupo && usadas + corpo[i] <= LP)) {
      pagina++;
      usadas = 0;
      quebraAntes[i] = true;
    }
    const espaco = usadas === 0 ? 0 : LINHAS_ANTES[el];
    usadas += espaco + corpo[i];
    linhasNo[i] = espaco + corpo[i];
    paginaDoNo[i] = pagina;
    while (usadas > LP) { pagina++; usadas -= LP; } // bloco maior que uma página
  }

  const paginas = nos.length ? pagina + 1 : 1;
  const minutos = nos.length ? pagina + Math.max(usadas, 1) / LP : 0;

  // Cenas, personagens e locais
  const cenas: CenaInfo[] = [];
  const personagensSet = new Map<string, number>();
  const locaisSet = new Set<string>();
  let linhasDialogo = 0;
  let linhasAcao = 0;
  let atual: CenaInfo | null = null;
  let linhasCena = 0;
  const fecharCena = () => { if (atual) atual.segundos = Math.round((linhasCena / LP) * 60); };

  nos.forEach((n, i) => {
    const el = tipoDe(n);
    if (el === 'cena') {
      fecharCena();
      const texto = n.textContent.trim().toUpperCase();
      atual = { indice: i, numero: cenas.length + 1, id: n.attrs.id, texto, pagina: paginaDoNo[i] + 1, segundos: 0, personagens: [] };
      cenas.push(atual);
      linhasCena = 0;
      const local = extrairLocal(texto);
      if (local) locaisSet.add(local);
    }
    linhasCena += linhasNo[i];
    if (el === 'dialogo' || el === 'parentetico' || el === 'personagem') linhasDialogo += corpo[i];
    if (el === 'acao') linhasAcao += corpo[i];
    if (el === 'personagem') {
      const nome = nomePersonagem(n.textContent);
      if (nome) {
        personagensSet.set(nome, (personagensSet.get(nome) || 0) + 1);
        if (atual && !(atual as CenaInfo).personagens.includes(nome)) (atual as CenaInfo).personagens.push(nome);
      }
    }
  });
  fecharCena();

  const personagens = [...personagensSet.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n);

  return {
    linhasPagina: LP, paginas, minutos, paginaDoNo, quebraAntes, cenas,
    linhasDialogo, linhasAcao, personagens, locais: [...locaisSet]
  };
}

/** "MARTA (O.S.)" → "MARTA" */
export function nomePersonagem(texto: string): string {
  return texto.replace(/\(.*?\)/g, '').replace(/\^/g, '').trim().toUpperCase();
}

/** "INT. COZINHA DA AVÓ — MANHÃ" → "COZINHA DA AVÓ" */
export function extrairLocal(cabecalho: string): string {
  const semPrefixo = cabecalho.replace(/^(INT\.?\/EXT\.?|EXT\.?\/INT\.?|I\/E\.?|INT\.?|EXT\.?)\s*/i, '');
  return semPrefixo.split(/\s+[—–-]\s+/)[0].trim();
}

export function formatarTempo(minutos: number): string {
  const total = Math.round(minutos * 60);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatarSegundos(seg: number): string {
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${m} min ${String(s).padStart(2, '0')} s`;
}
