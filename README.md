# Cena Um

Programa gratuito de escrita de guiões para cinema, televisão e teatro, feito em português de Portugal para Windows.

![Editor de guião](docs/editor.png)

## Descarregar

Vai a **[Releases](../../releases)** e descarrega o `Cena-Um-…-instalador.exe` mais recente.

O instalador ainda não tem assinatura digital. Na primeira vez, o Windows mostra "O Windows protegeu o computador". Para continuar, carrega em **Mais informações** e depois em **Executar mesmo assim**.

## O que já faz

- **Editor de guião** com os seis elementos (Cabeçalho, Ação, Personagem, Diálogo, Parentético, Transição) em Courier 12 pt, A4 ou Carta.
- **Teclado de argumentista**: Tab muda de elemento, Enter avança para o elemento lógico seguinte, Ctrl+1 a Ctrl+6 escolhe o elemento.
- **Automatismos**: escrever `int.` ou `ext.` cria um cabeçalho; `(` no diálogo cria um parentético; `CORTA PARA:` vira transição.
- **Autocompletar** personagens, locais e momentos do dia (Enter ou → aceita).
- **Paginação real** com quebras de página visíveis e **duração estimada** (1 página ≈ 1 minuto), por guião e por cena.
- **Guia de estrutura** com perguntas por página, só nas curtas-metragens.
- **Storyboard por cena**: carregar imagens, legendar, reordenar.
- **Cartaz** do projeto, usado como capa nos recentes e (opcional) na folha de rosto do PDF.
- **Corretor ortográfico PT-PT** do Windows (botão direito para sugestões).
- **Papel escuro** opcional para escrever (o PDF sai sempre branco).
- **Quadro de cenas**: cartões por ato, arrastar e largar para reordenar (o guião acompanha; Ctrl+Z desfaz), atos com nome editável, vistas por personagem e por local.
- **Storyboard completo**: todas as cenas com as suas imagens, legendas, reordenar e arrastar imagens do Explorador.
- **Guião técnico**: estrutura gerada do guião (um plano por ação e por fala, storyboard ligado), com escala, movimento, som e duração; exporta PDF horizontal e folha de cálculo (.csv).
- **Ficheiros**: guarda em `.cena`, gravação automática a cada minuto, exporta PDF, Final Draft (`.fdx`) e Fountain; importa `.fdx` e `.fountain`.

## Imagens

| Quadro de cenas | Guião técnico |
|---|---|
| ![Quadro de cenas](docs/quadro.png) | ![Guião técnico](docs/tecnico.png) |

## Atalhos

| Atalho | Ação |
|---|---|
| Ctrl+N | Novo projeto |
| Ctrl+O | Abrir |
| Ctrl+S / Ctrl+Shift+S | Guardar / Guardar como |
| Ctrl+P | Exportar |
| Ctrl+B / I / U | Negrito / itálico / sublinhado |
| Shift+Enter | Novo bloco do mesmo tipo |
| Esc | Sair do modo foco |

## Para programadores

```
npm install
npm run build      # compila a interface
npm start          # abre o programa
npm run dist       # gera o instalador para Windows (em release/)
```

Electron + React + TypeScript + ProseMirror. A paginação está em `src/editor/layout.ts`; os automatismos e o teclado em `src/editor/plugins.ts`; as cores e medidas em `src/styles.css` (`:root`).

## Próximas ideias

Guias de estrutura para longas e séries, revisões com cores, relatório de personagens e locais, colaboração.

## Licenças

Todo o código de terceiros incluído é de código aberto com licenças que permitem uso comercial e redistribuição (MIT para React, ProseMirror e Electron; SIL Open Font License 1.1 para as fontes Courier Prime e IBM Plex Sans). Os textos completos estão em `TERCEIROS.txt`, que vai com o instalador, e em `LICENSE.electron.txt` / `LICENSES.chromium.html`, que o Electron junta automaticamente. Não apagues estes ficheiros: mantê-los é o que estas licenças pedem em troca.

O código próprio do Cena Um ainda não tem licença pública escolhida (`"license": "UNLICENSED"` no package.json), o que significa todos os direitos reservados até decidires.
