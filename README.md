# Cena Um

Programa gratuito de escrita de guiões para cinema, televisão e teatro, feito em português de Portugal para Windows.

![Editor de guião](docs/editor.png)

## Descarregar

Vai a **[Releases](../../releases)** e descarrega o `Cena-Um-…-instalador.exe` mais recente.

Se já tiveres o Cena Um instalado, o instalador mostra **Atualizar** (versão antiga) ou **Reparar** (mesma versão). Os teus guiões não são tocados.

O instalador ainda não tem assinatura digital. Na primeira vez, o Windows mostra "O Windows protegeu o computador". Para continuar, carrega em **Mais informações** e depois em **Executar mesmo assim**.

## O que já faz

- **Editor de guião** com os seis elementos (Cabeçalho, Ação, Personagem, Diálogo, Parentético, Transição) em Courier 12 pt, A4 ou Carta.
- **Teclado de argumentista**: Tab muda de elemento, Enter avança para o elemento lógico seguinte, Ctrl+1 a Ctrl+6 escolhe o elemento.
- **Automatismos**: escrever `int.` ou `ext.` cria um cabeçalho; `(` no diálogo cria um parentético; `CORTA PARA:` vira transição.
- **Autocompletar** personagens, locais e momentos do dia (Enter ou → aceita).
- **Paginação real** com quebras de página visíveis e **duração estimada** (1 página ≈ 1 minuto), por guião e por cena. Os parágrafos vazios não contam para a duração.
- **Cenas bem demarcadas**: espaço extra antes de cada cabeçalho e entre a personagem e a fala.
- **Guia de estrutura** com perguntas por página, só nas curtas-metragens.
- **Storyboard por cena**: carregar imagens, legendar, reordenar.
- **Cartaz** do projeto, usado como capa nos recentes e (opcional) na folha de rosto do PDF.
- **Formatação livre com o botão direito**: tipo de letra, tamanho, cor, negrito, itálico, sublinhado, riscado e alinhamento (esquerda, centro, direita, justificado). A duração estimada não muda com a formatação.
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

## Licença

O Cena Um é software livre, distribuído sob a [GNU GPL 3.0](LICENSE). Podes usá-lo, estudá-lo, alterá-lo e partilhá-lo. Quem distribuir uma versão alterada tem de a publicar também sob a GPL 3.0, com o código aberto.

© 2026 Alexandre Serras.

O programa inclui componentes de código aberto de terceiros, com licenças compatíveis: MIT (React, ProseMirror, Electron) e SIL Open Font License 1.1 (fontes Courier Prime e IBM Plex Sans). Os textos completos estão em [`TERCEIROS.txt`](TERCEIROS.txt), que acompanha o instalador, e em `LICENSE.electron.txt` / `LICENSES.chromium.html`, na pasta de instalação.
