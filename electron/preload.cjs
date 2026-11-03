const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cena', {
  plataforma: process.platform,
  ficheiroInicial: () => ipcRenderer.invoke('app:ficheiro-inicial'),
  abrir: () => ipcRenderer.invoke('ficheiro:abrir'),
  abrirCaminho: (caminho) => ipcRenderer.invoke('ficheiro:abrir-caminho', caminho),
  guardar: (dados) => ipcRenderer.invoke('ficheiro:guardar', dados),
  exportarTexto: (dados) => ipcRenderer.invoke('ficheiro:exportar-texto', dados),
  escolherImagens: (multiplas) => ipcRenderer.invoke('ficheiro:escolher-imagens', multiplas),
  recentes: () => ipcRenderer.invoke('recentes:listar'),
  adicionarRecente: (item) => ipcRenderer.invoke('recentes:adicionar', item),
  removerRecente: (caminho) => ipcRenderer.invoke('recentes:remover', caminho),
  exportarPdf: (dados) => ipcRenderer.invoke('pdf:exportar', dados),
  dadosImpressao: () => ipcRenderer.invoke('print:dados'),
  impressaoPronta: () => ipcRenderer.send('print:pronto'),
  porGuardar: (valor) => ipcRenderer.send('doc:por-guardar', valor),
  fecharAgora: () => ipcRenderer.send('app:fechar-agora'),
  aoGuardarEFechar: (fn) => ipcRenderer.on('app:guardar-e-fechar', () => fn()),
  aoAbrirFicheiro: (fn) => ipcRenderer.on('app:abrir-ficheiro', (_e, f) => fn(f))
});
