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
  cenas?: Record<string, AjusteCena>; // correções à mão, por id de cena: o que o utilizador diz manda sobre o que o programa deteta
}
export type AjusteCena = 'fala' | 'sem' | 'fora';

export type CategoriaLevantamento =
  'figurantes' | 'aderecos' | 'guardaRoupa' | 'caracterizacao' | 'cenografia' | 'veiculos' | 'animais' | 'efeitos' | 'som' | 'notas';

/** Folha de rosto (capa) do guião */
export interface FolhaRosto {
  credito: string; // "Escrito por", "Argumento de"…
  autores: string; // um por linha
  baseadoEm: string;
  versao: string; // "Rascunho 2", "Versão final"…
  data: string; // vazio = data do dia da exportação
  contacto: string; // várias linhas, canto inferior esquerdo
  direitos: string; // registo IGAC, ©…
  cartaz: boolean;
}

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
  rosto?: FolhaRosto;
  atoCena?: Record<string, number>; // id da cena → índice do ato
}

/** Um episódio de uma série: cada um tem o seu guião e os seus materiais de cena */
export interface Episodio {
  id: string;
  temporada: number;
  numero: number;
  titulo: string;
  sinopse: string;
  guiao: any;
  storyboard: Record<string, Quadro[]>;
  tecnico?: Record<string, Plano[]>;
  levantamento?: Record<string, Partial<Record<CategoriaLevantamento, string[]>>>;
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
  locais?: Record<string, { rodagem: string }>; // por local do guião (em maiúsculas): onde vai ser filmado
  equipa?: Departamento[]; // ficha técnica (partilhada por todos os episódios de uma série)
  // Séries: guiao/storyboard/tecnico/levantamento acima são os do episódio aberto;
  // a lista guarda todos (personagens, locais e atos são partilhados pela série)
  episodios?: Episodio[];
  episodioAtivo?: string;
}

export interface Recente {
  caminho: string;
  titulo: string;
  tipo: TipoProjeto;
  paginas: number;
  minutos: number;
  capa: string | null; // miniatura pequena
  episodios?: number;
  aberto?: number;
}

export interface Definicoes {
  papelEscuro: boolean;
  papel: Papel;
  numerosCena: boolean;
  zoom: number;
  ajustar?: boolean; // limita o zoom à largura do ecrã
  tema?: 'escuro' | 'claro';
  autoGuardar?: number; // minutos entre gravações automáticas; 0 = desligada
  idioma?: 'pt' | 'en'; // língua da interface
  corretor?: 'pt' | 'en' | 'ambos'; // língua do corretor ortográfico (o guião pode estar noutra língua que não a da interface)
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
      preferencias(p: { idioma: 'pt' | 'en'; corretor: 'pt' | 'en' | 'ambos' }): void;
      guardarRecuperacao(conteudo: string): Promise<boolean>;
      lerRecuperacao(): Promise<{ conteudo: string; quando: number } | null>;
      apagarRecuperacao(): Promise<boolean>;
      abrir(): Promise<FicheiroLido | null>;
      abrirCaminho(caminho: string): Promise<FicheiroLido | null>;
      guardar(d: { caminho: string | null; conteudo: string; nomeSugerido: string }): Promise<string | null>;
      exportarTexto(d: { conteudo: string; nomeSugerido: string; extensao: string; nomeFormato: string }): Promise<string | null>;
      exportarPasta(f: { nome: string; conteudo: string }[]): Promise<string | null>;
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
      tema(t: 'escuro' | 'claro'): void;
    };
  }
}

export const NOMES_TIPO: Record<TipoProjeto, string> = {
  curta: 'Curta-metragem',
  longa: 'Longa-metragem',
  serie: 'Série de TV',
  teatro: 'Peça de teatro'
};

export interface MembroEquipa {
  id: string;
  funcao: string;
  nome: string;
  contacto: string;
  residencia: string;
  notas: string;
}
export interface Departamento {
  id: string;
  nome: string;
  membros: MembroEquipa[];
}
