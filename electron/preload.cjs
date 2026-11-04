const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cena', {
  plataforma: process.platform,
  ficheiroInicial: () => ipcRenderer.invoke('app:ficheiro-inicial'),
  abrir: () => ipcRenderer.invoke('ficheiro:abrir'),
  abrirCaminho: (caminho) => ipcRenderer.invoke('ficheiro:abrir-caminho', caminho),
  guardar: (dados) => ipcRenderer.invoke('ficheiro:guardar', dados),
  exportarTexto: (dados) => ipcRenderer.invoke('ficheiro:exportar-texto', dados),
  exportarPasta: (ficheiros) => ipcRenderer.invoke('ficheiro:exportar-pasta', ficheiros),
  escolherImagens: (multiplas) => ipcRenderer.invoke('ficheiro:escolher-imagens', multiplas),
  recentes: () => ipcRenderer.invoke('recentes:listar'),
  adicionarRecente: (item) => ipcRenderer.invoke('recentes:adicionar', item),
  removerRecente: (caminho) => ipcRenderer.invoke('recentes:remover', caminho),
  exportarPdf: (dados) => ipcRenderer.invoke('pdf:exportar', dados),
  dadosImpressao: () => ipcRenderer.invoke('print:dados'),
  impressaoPronta: () => ipcRenderer.send('print:pronto'),
  porGuardar: (valor) => ipcRenderer.send('doc:por-guardar', valor),
  guardarRecuperacao: (conteudo) => ipcRenderer.invoke('recuperacao:guardar', conteudo),
  lerRecuperacao: () => ipcRenderer.invoke('recuperacao:ler'),
  apagarRecuperacao: () => ipcRenderer.invoke('recuperacao:apagar'),
  fecharAgora: () => ipcRenderer.send('app:fechar-agora'),
  aoGuardarEFechar: (fn) => ipcRenderer.on('app:guardar-e-fechar', () => fn()),
  aoAbrirFicheiro: (fn) => ipcRenderer.on('app:abrir-ficheiro', (_e, f) => fn(f)),
  aoMenuContexto: (fn) => {
    const h = (_e, d) => fn(d);
    ipcRenderer.on('menu:contexto', h);
    return () => ipcRenderer.removeListener('menu:contexto', h);
  },
  menuNativo: () => ipcRenderer.send('menu:nativo'),
  substituirPalavra: (p) => ipcRenderer.send('ortografia:substituir', p),
  adicionarPalavra: (p) => ipcRenderer.send('ortografia:adicionar', p),
  editar: (acao) => ipcRenderer.send('editar', acao),
  tema: (t) => ipcRenderer.send('tema', t)
});
