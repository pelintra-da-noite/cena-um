import type { Departamento, MembroEquipa, Projeto, TipoProjeto } from '../types';

const id = () => Math.random().toString(36).slice(2, 10);
export const novoMembro = (funcao = ''): MembroEquipa => ({ id: id(), funcao, nome: '', contacto: '', residencia: '', notas: '' });
export const novoDepartamento = (nome = 'Novo departamento', funcoes: string[] = ['']): Departamento => ({ id: id(), nome, membros: funcoes.map(novoMembro) });

const CINEMA: [string, string[]][] = [
  ['Realização', ['Realizador', '1.º Assistente de realização', '2.º Assistente de realização', 'Anotador / continuidade']],
  ['Produção', ['Produtor', 'Diretor de produção', 'Chefe de produção', 'Assistente de produção', 'Responsável de locais']],
  ['Fotografia', ['Diretor de fotografia', 'Operador de câmara', '1.º Assistente de câmara (foco)', '2.º Assistente de câmara', 'Logger / DIT']],
  ['Luz e maquinaria', ['Chefe eletricista', 'Eletricista', 'Chefe maquinista', 'Maquinista']],
  ['Som', ['Técnico de som', 'Perchista']],
  ['Arte', ['Diretor de arte', 'Cenógrafo', 'Aderecista']],
  ['Guarda-roupa', ['Figurinista', 'Assistente de guarda-roupa']],
  ['Caracterização', ['Maquilhagem', 'Cabelos']],
  ['Pós-produção', ['Montador', 'Colorista', 'Misturador de som', 'Compositor']],
  ['Fotografia de cena e making of', ['Fotógrafo de cena']]
];
const TEATRO: [string, string[]][] = [
  ['Encenação', ['Encenador', 'Assistente de encenação']],
  ['Produção', ['Produtor', 'Direção de produção', 'Assistente de produção']],
  ['Direção de cena', ['Diretor de cena', 'Contrarregra']],
  ['Cenografia e figurinos', ['Cenógrafo', 'Figurinista', 'Aderecista']],
  ['Luz e som', ['Desenho de luz', 'Operador de luz', 'Sonoplastia', 'Operador de som']],
  ['Caracterização', ['Maquilhagem', 'Cabelos']],
  ['Movimento e música', ['Coreografia / movimento', 'Música original']],
  ['Comunicação', ['Fotografia de cena', 'Design gráfico']]
];

export function equipaPadrao(tipo: TipoProjeto): Departamento[] {
  return (tipo === 'teatro' ? TEATRO : CINEMA).map(([nome, funcoes]) => novoDepartamento(nome, funcoes));
}
export const equipaDe = (p: Projeto): Departamento[] => p.equipa || equipaPadrao(p.meta.tipo);
/** Projetos feitos na 0.6.0 chamavam «Imagem» ao departamento de fotografia */
export const migrarEquipa = (deps?: Departamento[]) => deps?.map((d) => (d.nome === 'Imagem' ? { ...d, nome: 'Fotografia' } : d));
export const preenchidos = (deps: Departamento[]) => deps.reduce((n, d) => n + d.membros.filter((m) => m.nome.trim()).length, 0);

const cel = (s: string) => `"${(s || '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
export function equipaCsv(deps: Departamento[]): string {
  const linhas = ['Departamento;Função;Nome;Contacto;Residência;Notas'];
  for (const d of deps) for (const m of d.membros) linhas.push([d.nome, m.funcao, m.nome, m.contacto, m.residencia, m.notas].map(cel).join(';'));
  return '\uFEFF' + linhas.join('\r\n') + '\r\n';
}
