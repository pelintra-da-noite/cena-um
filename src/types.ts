export type TipoProjeto = 'curta' | 'longa' | 'serie' | 'teatro';
export type Papel = 'a4' | 'carta';

export interface Quadro {
  id: string;
  src: string; // dataURL (já reduzida)
  legenda: string;
}

export interface Plano {
  id: string;
  quadroId: string | null; // imagem do storyboard ligada
  escala: string;
  movimento: string;
  acao: string;
  som: string;
  duracao: string; // segundos, texto livre
}

export interface PersonagemInfo {
  nome: string; // sempre em maiúsculas
  descricao: string;
  manual: boolean; // acrescentada à mão (pode não ter falas)
}

export type CategoriaLevantamento =
  'figurantes' | 'aderecos' | 'guardaRoupa' | 'caracterizacao' | 'cenografia' | 'veiculos' | 'animais' | 'efeitos' | 'som' | 'notas';

export interface MetaProjeto {
  titulo: string;
  tipo: TipoProjeto;
  autor: string;
  duracaoPrevista: number; // minutos
  guia: boolean;
  guiaFeito: number[]; // índices de passos assinalados
  cartaz: string | null; // dataURL
  criado: string;
  modificado: string;
  atos?: string[]; // nomes das colunas do quadro de cenas
  atoCena?: Record<string, number>; // id da cena → índice do ato
}

export interface Projeto {
  formato: 'cena';
  versao: 1;
  meta: MetaProjeto;
  guiao: any; // JSON do documento ProseMirror
  storyboard: Record<string, Quadro[]>; // por id de cena
  tecnico?: Record<string, Plano[]>; // guião técnico, por id de cena
  personagens?: PersonagemInfo[];
  levantamento?: Record<string, Partial<Record<CategoriaLevantamento, string[]>>>; // por id de cena
}

export interface Recente {
  caminho: string;
  titulo: string;
  tipo: TipoProjeto;
  paginas: number;
  minutos: number;
  capa: string | null; // miniatura pequena
  aberto?: number;
}

export interface Definicoes {
  papelEscuro: boolean;
  papel: Papel;
  numerosCena: boolean;
  zoom: number;
  ajustar?: boolean; // limita o zoom à largura do ecrã
}

export interface DadosMenuContexto {
  x: number;
  y: number;
  palavra: string;
  sugestoes: string[];
  podeCortar: boolean;
  podeCopiar: boolean;
  podeColar: boolean;
}

export interface FicheiroLido {
  caminho: string;
  conteudo: string;
}

declare global {
  interface Window {
    cena: {
      plataforma: string;
      ficheiroInicial(): Promise<FicheiroLido | null>;
      abrir(): Promise<FicheiroLido | null>;
      abrirCaminho(caminho: string): Promise<FicheiroLido | null>;
      guardar(d: { caminho: string | null; conteudo: string; nomeSugerido: string }): Promise<string | null>;
      exportarTexto(d: { conteudo: string; nomeSugerido: string; extensao: string; nomeFormato: string }): Promise<string | null>;
      escolherImagens(multiplas: boolean): Promise<{ nome: string; dataUrl: string }[]>;
      recentes(): Promise<Recente[]>;
      adicionarRecente(r: Recente): Promise<void>;
      removerRecente(caminho: string): Promise<void>;
      exportarPdf(d: any): Promise<string | null>;
      dadosImpressao(): Promise<any>;
      impressaoPronta(): void;
      porGuardar(v: boolean): void;
      fecharAgora(): void;
      aoGuardarEFechar(fn: () => void): void;
      aoAbrirFicheiro(fn: (f: FicheiroLido) => void): void;
      aoMenuContexto(fn: (d: DadosMenuContexto) => void): () => void;
      menuNativo(): void;
      substituirPalavra(p: string): void;
      adicionarPalavra(p: string): void;
      editar(acao: 'cortar' | 'copiar' | 'colar' | 'tudo'): void;
    };
  }
}

export const NOMES_TIPO: Record<TipoProjeto, string> = {
  curta: 'Curta-metragem',
  longa: 'Longa-metragem',
  serie: 'Série de TV',
  teatro: 'Peça de teatro'
};
