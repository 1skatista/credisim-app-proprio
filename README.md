# CrediSim — aplicativo próprio e responsivo

Reconstrução independente do seu CrediSim, criada em 25/10/2026. O projeto usa HTML, CSS e JavaScript em módulos, com um pequeno servidor Node.js, sem dependências npm e sem bibliotecas internas da Whacka.

## Abrir no Windows

1. Abra a pasta deste projeto.
2. Dê dois cliques em **Iniciar.cmd**.
3. O aplicativo abre em **http://localhost:4173** no navegador padrão.

Node.js 20 ou superior é necessário e já estava disponível no computador durante a criação. Não é necessário executar `npm install`.

Alternativa pelo terminal, dentro desta pasta:

```powershell
npm.cmd start
```

Abra http://localhost:4173 e mantenha o terminal aberto. Para encerrar essa execução, pressione Ctrl+C. Se iniciou por Iniciar.cmd, execute `Parar.ps1` no PowerShell para parar apenas o processo identificado do CrediSim.

Não abra `index.html` diretamente por duplo clique: os módulos precisam do servidor HTTP. O servidor escuta somente no próprio computador, em 127.0.0.1; não abre acesso à rede local.

## O que foi entregue

- Simulador com SAC, Price, SAM, americano, pagamento único e alemão de juros antecipados.
- Juros mensais/anuais/nominais, data inicial, projeção de indexador, carência, balão, seguros, tarifa, aportes e etapas.
- Resumo dos resultados junto do formulário no desktop e indicador fixo no celular.
- Cronograma, curva do saldo e exportação XLSX com abas Resumo, Cronograma e Parâmetros.
- Propostas locais, comparação e edição a partir de uma proposta salva; cada salvamento gera uma nova versão.
- Regras de custos para 27 UFs, com município, valor fixo, percentual, base separada, faixa, vigência e fonte.
- Importação de custos em CSV, TSV ou XLSX; texto colado com prévia e modelo XLSX.
- Rotativo diário, fluxo livre, consórcio, fundo e leasing.
- Glossário, conversor, desconto de recebíveis e atraso.
- Backup e restauração JSON, remoção com opção de desfazer na sessão.
- Estilos de impressão para salvar cronograma ou comparação como PDF pelo navegador.
- Manifesto e service worker para cache local e abertura como aplicativo quando o navegador oferecer instalação.

## Correções sobre a versão analisada

1. Pagamento único inclui principal e juros no último pagamento; não zera a quitação nem omite o custo efetivo.
2. Fluxo livre com dívida restante mostra “Fluxo incompleto”, sem destacar uma TIR negativa como custo da operação quitada.
3. Taxa real usa os fatores anuais na fórmula de Fisher: 1,5% a.m. e inflação de 4,5% a.a. resultam em 14,4132% reais a.a.
4. Consórcio permite escolher reajuste anual por aniversário ou mensal equivalente. O padrão anual mantém as primeiras 12 parcelas iguais e altera no mês 13.
5. IOF diário preserva 0,0082% na entrada e na documentação, sem arredondá-lo para 0,01%.
6. Pagamentos ao credor e custos retidos têm conciliação explícita, sem adicionar retenções novamente ao total de pagamentos.
7. Rotativo distingue saldo sem IOF, IOF à parte e valor para quitação com IOF.
8. Custos locais ausentes, incompatíveis ou sobrepostos geram pendência; dados oficiais desconhecidos não são preenchidos por estimativa.
9. Fluxos SAM são a média das trajetórias SAC e Price; alemão antecipa efetivamente o pagamento dos juros. Essas definições podem gerar resultados diferentes da versão Whacka.
10. Campos monetários usam formato brasileiro; detalhes avançados recolhíveis, rótulos, foco visível e diálogo de proposta com foco contido substituem a dependência do modal Whacka.

## Dados e autonomia

O app está publicado no GitHub Pages em https://1skatista.github.io/credisim-app-proprio/. O repositório e o código-fonte são públicos. Não há login nem sincronização automática: propostas e custos ficam no `localStorage` do navegador, separados por dispositivo e endereço. O app aberto por `localhost:4173` no computador e o site publicado no celular mantêm dados independentes. Use o backup JSON para mover dados entre navegadores.

Faça backup em **Modo local → Exportar backup JSON**. A restauração valida o arquivo, pede confirmação e baixa um backup do estado anterior. Limpar os dados do navegador pode apagar os registros.

Uma proposta salva mantém seus parâmetros, regras locais e versão do motor. Alterar o cadastro atual não altera suas regras históricas. Ao editar uma proposta, as regras históricas continuam ativas; em Custos estaduais e municipais, “Usar cadastro atual” troca explicitamente para as novas regras.

Não foram copiadas contas ou propostas da Whacka. O site publicado original não foi alterado, porque o acesso disponível não expôs os arquivos e a exportação foi apresentada como recurso Pro. Este projeto é uma nova implementação local a partir do REA e do comportamento observado.

## Premissas financeiras

- Cálculos mensais regulares, com precisão interna e arredondamento apenas na exibição. Parcelas arredondadas somadas manualmente podem diferir alguns centavos do total calculado.
- Custo efetivo por TIR de períodos mensais; anualização composta. Não há XIRR por dias reais, feriados ou aniversários contratuais. A data inicial organiza o cronograma.
- Fluxos com mais de uma troca de sinal não recebem uma TIR única. Fluxos não quitados não exibem custo completo.
- O indexador projetado corrige o saldo antes dos juros. Seguros usam o saldo inicial do período e a tarifa é fixa mensal.
- O prazo inclui carência. Na opção capitalizada, juros entram no saldo. Aportes ocorrem depois da amortização e recalculam as prestações seguintes.
- Etapas: mês 0 é a contratação. Cada liberação entra no início do período seguinte. A amortização começa depois do período da última liberação. Os fluxos de recebimento usam os meses declarados, e as despesas iniciais ocorrem no mês 0.
- Custos iniciais e IOF são retidos na contratação. A estimativa simplificada de IOF usa principal × (percentual fixo + diário × dias), com limite de 365 dias. Os percentuais são parâmetros do cenário, não um catálogo tributário atualizado.
- No modelo alemão, cada juro é pago um período antes: o primeiro é retido na contratação. Por enquanto, essa opção aceita somente o cenário básico de taxa fixa, sem carência, etapas, indexação, aportes ou balão. Contratos diferentes devem usar Fluxo livre.
- SAM é a média dos dois fluxos completos; cada trajetória recebe as mesmas regras de extras. O principal e os saldos resultantes precisam ser interpretados segundo essa definição.
- No rotativo, pagamentos precedem os juros do dia e não criam saldo credor. IOF é estimado por utilização com dias médios e pago à parte no encerramento.
- Consórcio é um orçamento de cenário, não uma previsão de sorteio. Lance reduz igualmente o fundo comum de parcelas futuras; o app limita o lance ao fundo comum restante no modelo. Carta e parcelas seguem a convenção de reajuste selecionada. Não exibe taxa única para fluxo com sinais múltiplos.
- Fundo considera aportes no fim do mês e rendimento constante antes de tributos. Leasing considera entrada, parcelas e VRG final, sem benefícios fiscais.

## Responsividade e uso no celular

Foram verificadas as sete telas em larguras de 320, 390, 768 e 1440 pixels, sem transbordamento horizontal da página. Tabelas têm rolagem própria. No celular, há navegação inferior e resumo fixo do custo no simulador; no desktop, menu lateral e resultados ao lado do formulário.

A versão web está disponível em HTTPS no endereço do GitHub Pages acima. Os arquivos podem ser servidos como site estático: os cálculos e os dados permanecem no navegador. Atualizações enviadas à branch `main` são publicadas pelo workflow do GitHub Actions. Para rodar a cópia local, use o servidor descrito na seção Windows.

A instalação PWA e o funcionamento sem rede dependem do navegador e do cache ter sido preenchido. O manifesto usa ícone SVG; determinadas plataformas podem exigir ícones PNG para oferecer instalação. Não foi produzido APK ou pacote para loja.

## Verificação e desenvolvimento

```powershell
npm.cmd test
npm.cmd run check
```

Os 39 testes do núcleo passaram. Houve também verificação de edição numérica, diálogo e persistência de proposta após recarregar, cadastro e prévia de custos, resultados das ferramentas e download XLSX pelo navegador. O XLSX baixado foi validado como ZIP/XML e teve seu último pagamento e saldo conferidos. Não foi aberto no Excel instalado; importação XLSX externa e restauração de backup não tiveram ensaio completo no navegador.

Estrutura:

```text
index.html             Documento principal
server.mjs             Servidor local sem dependências
src/app.js             Telas, estado e interações
src/styles.css         Tema e regras responsivas
src/finance.js         Conversões, seis sistemas e custo efetivo
src/tools.js           Cinco calculadoras e auxiliares
src/costs.js           Validação, faixas e importação
src/storage.js         Armazenamento e validação de backup
src/exports.js         XLSX, ZIP e leitura de planilhas
tests/finance.test.js   39 testes automatizados
sw.js                  Cache para uso local
```

Para atualizar, edite os módulos, rode os testes e recarregue a página com o servidor ligado. O service worker usa estratégia de rede com fallback para cache. Antes de mudanças de formato de dados, exporte backup e altere a versão do schema com migração correspondente.
