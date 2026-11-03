// Cena Um — processo principal (Electron)
const { app, BrowserWindow, ipcMain, dialog, Menu, session, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const isWin = process.platform === 'win32';
const DIST = path.join(__dirname, '..', 'dist', 'index.html');
const RECENTES = () => path.join(app.getPath('userData'), 'recentes.json');

let janela = null;
let ficheiroInicial = null;
let podeFechar = false;
let porGuardar = false;

// ---------- utilitários ----------
function lerRecentes() {
  try { return JSON.parse(fs.readFileSync(RECENTES(), 'utf8')); } catch { return []; }
}
function gravarRecentes(lista) {
  try { fs.writeFileSync(RECENTES(), JSON.stringify(lista.slice(0, 12), null, 2)); } catch {}
}
function acharCena(argv) {
  return argv.find((a) => typeof a === 'string' && a.toLowerCase().endsWith('.cena') && fs.existsSync(a)) || null;
}

// ---------- janela ----------
function criarJanela() {
  janela = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1200,
    minHeight: 720,
    backgroundColor: '#121316',
    title: 'Cena Um',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#0E0F11', symbolColor: '#C9C7C2', height: 36 },
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true
    }
  });

  // Corretor ortográfico em português de Portugal
  try { janela.webContents.session.setSpellCheckerLanguages(['pt-PT']); } catch (e) { /* macOS ignora */ }

  janela.webContents.on('context-menu', (_e, params) => {
    const itens = [];
    if (params.misspelledWord) {
      const sugestoes = params.dictionarySuggestions.slice(0, 6);
      if (sugestoes.length === 0) itens.push({ label: 'Sem sugestões', enabled: false });
      for (const s of sugestoes) itens.push({ label: s, click: () => janela.webContents.replaceMisspelling(s) });
      itens.push({ type: 'separator' });
      itens.push({ label: 'Adicionar ao dicionário', click: () => janela.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord) });
      itens.push({ type: 'separator' });
    }
    if (params.isEditable) {
      itens.push({ label: 'Cortar', role: 'cut', enabled: params.editFlags.canCut });
      itens.push({ label: 'Copiar', role: 'copy', enabled: params.editFlags.canCopy });
      itens.push({ label: 'Colar', role: 'paste', enabled: params.editFlags.canPaste });
      itens.push({ label: 'Selecionar tudo', role: 'selectAll' });
    } else if (params.selectionText) {
      itens.push({ label: 'Copiar', role: 'copy' });
    }
    if (itens.length) Menu.buildFromTemplate(itens).popup({ window: janela });
  });

  janela.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  janela.on('close', (e) => {
    if (podeFechar || !porGuardar) return;
    e.preventDefault();
    const r = dialog.showMessageBoxSync(janela, {
      type: 'warning',
      buttons: ['Guardar', 'Não guardar', 'Cancelar'],
      defaultId: 0,
      cancelId: 2,
      title: 'Cena Um',
      message: 'Tens alterações por guardar.',
      detail: 'Queres guardar o guião antes de fechar?'
    });
    if (r === 0) janela.webContents.send('app:guardar-e-fechar');
    if (r === 1) { podeFechar = true; janela.close(); }
  });

  janela.once('ready-to-show', () => janela.show());
  janela.loadFile(DIST);
}

// ---------- IPC ----------
ipcMain.handle('app:ficheiro-inicial', () => {
  const f = ficheiroInicial; ficheiroInicial = null;
  if (!f) return null;
  try { return { caminho: f, conteudo: fs.readFileSync(f, 'utf8') }; } catch { return null; }
});

ipcMain.on('doc:por-guardar', (_e, valor) => { porGuardar = !!valor; });
ipcMain.on('app:fechar-agora', () => { podeFechar = true; if (janela) janela.close(); });

ipcMain.handle('ficheiro:abrir', async () => {
  const r = await dialog.showOpenDialog(janela, {
    title: 'Abrir guião',
    filters: [
      { name: 'Guiões', extensions: ['cena', 'fdx', 'fountain', 'txt'] },
      { name: 'Cena Um', extensions: ['cena'] },
      { name: 'Final Draft', extensions: ['fdx'] },
      { name: 'Fountain', extensions: ['fountain', 'txt'] }
    ],
    properties: ['openFile']
  });
  if (r.canceled || !r.filePaths[0]) return null;
  const caminho = r.filePaths[0];
  return { caminho, conteudo: fs.readFileSync(caminho, 'utf8') };
});

ipcMain.handle('ficheiro:abrir-caminho', async (_e, caminho) => {
  try { return { caminho, conteudo: fs.readFileSync(caminho, 'utf8') }; } catch { return null; }
});

ipcMain.handle('ficheiro:guardar', async (_e, { caminho, conteudo, nomeSugerido }) => {
  let destino = caminho;
  if (!destino) {
    const r = await dialog.showSaveDialog(janela, {
      title: 'Guardar guião',
      defaultPath: (nomeSugerido || 'Sem título') + '.cena',
      filters: [{ name: 'Cena Um', extensions: ['cena'] }]
    });
    if (r.canceled || !r.filePath) return null;
    destino = r.filePath;
  }
  const tmp = destino + '.tmp';
  fs.writeFileSync(tmp, conteudo, 'utf8');
  fs.renameSync(tmp, destino); // escrita atómica: nunca deixa um ficheiro a meio
  return destino;
});

ipcMain.handle('ficheiro:exportar-texto', async (_e, { conteudo, nomeSugerido, extensao, nomeFormato }) => {
  const r = await dialog.showSaveDialog(janela, {
    title: 'Exportar',
    defaultPath: (nomeSugerido || 'Sem título') + '.' + extensao,
    filters: [{ name: nomeFormato, extensions: [extensao] }]
  });
  if (r.canceled || !r.filePath) return null;
  fs.writeFileSync(r.filePath, conteudo, 'utf8');
  return r.filePath;
});

ipcMain.handle('ficheiro:escolher-imagens', async (_e, multiplas) => {
  const r = await dialog.showOpenDialog(janela, {
    title: 'Escolher imagem',
    filters: [{ name: 'Imagens', extensions: ['jpg', 'jpeg', 'png', 'webp'] }],
    properties: multiplas ? ['openFile', 'multiSelections'] : ['openFile']
  });
  if (r.canceled) return [];
  return r.filePaths.map((p) => {
    const ext = path.extname(p).slice(1).toLowerCase();
    const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    return { nome: path.basename(p), dataUrl: `data:${mime};base64,${fs.readFileSync(p).toString('base64')}` };
  });
});

ipcMain.handle('recentes:listar', () => lerRecentes().filter((r) => fs.existsSync(r.caminho)));
ipcMain.handle('recentes:adicionar', (_e, item) => {
  const lista = lerRecentes().filter((r) => r.caminho !== item.caminho);
  lista.unshift({ ...item, aberto: Date.now() });
  gravarRecentes(lista);
});
ipcMain.handle('recentes:remover', (_e, caminho) => gravarRecentes(lerRecentes().filter((r) => r.caminho !== caminho)));

// Exportação PDF: abre uma janela invisível com a vista de impressão e grava o PDF
let dadosImpressao = null;
ipcMain.handle('print:dados', () => dadosImpressao);
ipcMain.handle('pdf:exportar', async (_e, dados) => {
  const r = await dialog.showSaveDialog(janela, {
    title: 'Exportar PDF',
    defaultPath: (dados.nomeSugerido || 'Sem título') + '.pdf',
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  });
  if (r.canceled || !r.filePath) return null;
  dadosImpressao = dados;
  const w = new BrowserWindow({
    show: false,
    width: 900,
    height: 1200,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true }
  });
  try {
    const pronto = new Promise((resolve) => ipcMain.once('print:pronto', resolve));
    await w.loadFile(DIST, { query: { imprimir: '1' } });
    await Promise.race([pronto, new Promise((res) => setTimeout(res, 8000))]);
    const pdf = await w.webContents.printToPDF({
      pageSize: dados.papel === 'carta' ? 'Letter' : 'A4',
      landscape: !!dados.paisagem,
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      margins: { marginType: 'none' }
    });
    fs.writeFileSync(r.filePath, pdf);
    shell.openPath(r.filePath);
    return r.filePath;
  } finally {
    dadosImpressao = null;
    w.destroy();
  }
});

// ---------- arranque ----------
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', (_e, argv) => {
    const f = acharCena(argv);
    if (janela) {
      if (janela.isMinimized()) janela.restore();
      janela.focus();
      if (f) janela.webContents.send('app:abrir-ficheiro', { caminho: f, conteudo: fs.readFileSync(f, 'utf8') });
    }
  });
  ficheiroInicial = acharCena(process.argv);
  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    criarJanela();
  });
  app.on('window-all-closed', () => app.quit());
}
