# Projeto BD Gerenciado - Implementação TypeScript Completa

Este projeto demonstra a implementação de uma arquitetura de banco de dados Primary-Replica (leitura/escrita separadas) utilizando Node.js e TypeScript. Ele simula um cenário onde as operações de escrita são direcionadas para um banco de dados primário (PRIMARY) e as operações de leitura para um banco de dados de réplica (REPLICA), otimizando a performance e a escalabilidade.

## Pré-requisitos

Antes de iniciar, certifique-se de ter os seguintes softwares instalados:

*   **Node.js**: Versão 18 ou superior.
*   **npm**: Gerenciador de pacotes do Node.js (geralmente vem com o Node.js).
*   **MySQL Server**: Versão 8 ou superior. Você precisará de duas instâncias (ou configurações separadas) que simulem um Primary e um Replica, ou pelo menos dois bancos de dados distintos no mesmo servidor MySQL.

### ▶️ Como Rodar o Projeto
Você pode rodar o projeto em modo de desenvolvimento (com ts-node) ou compilá-lo para JavaScript e depois executá-lo.

Modo de Desenvolvimento (recomendado para testes)
bash

Copiar
npm run dev
Modo de Produção (compilado)
Compile o código TypeScript:
bash

Copiar
npm run build
Execute a aplicação compilada:
bash

Copiar
npm start
A aplicação irá iniciar, testar as conexões com o banco de dados, e então iterar sobre uma lista de produtos de exemplo:

A cada iteração, um produto é inserido no banco PRIMARY.
Após a inserção, a aplicação espera um breve período.
Em seguida, 10 produtos anteriores são consultados do banco REPLICA (ordenados pelo ID decrescente).
Os resultados são impressos no console de forma formatada.
Há uma pausa entre cada iteração.
No final, uma consulta de todos os produtos é feita no REPLICA para verificação.
Para sair do programa, pressione Ctrl+C. As conexões com o banco de dados serão fechadas elegantemente.

## Estrutura do Projeto
. ├── dist/ # Arquivos JavaScript compilados ├── node_modules/ # Dependências do Node.js ├── src/ │ ├── config/ │ │ └── database.ts # Configuração e pools de conexão DB │ ├── models/ │ │ └── produto.model.ts # Definição da interface Produto │ ├── services/ │ │ └── produto.service.ts # Lógica de negócio (inserção no Primary, consulta no Replica) │ ├── utils/ │ │ └── logger.ts # Utilitário de log colorido │ └── index.ts # Ponto de entrada da aplicação ├── database/ │ └── schema.sql # Script SQL para criação do DB e tabela ├── .env.example # Modelo de variáveis de ambiente ├── .gitignore # Arquivos e diretórios a serem ignorados pelo Git ├── package.json # Configurações do projeto e dependências ├── tsconfig.json # Configurações do TypeScript └── README.md # Este arquivo
🚀 Detalhes da Implementação
Separação de Leitura/Escrita
src/config/database.ts: Cria dois pools de conexão (primaryPool e replicaPool), cada um configurado para um endpoint de banco de dados diferente (definidos nas variáveis de ambiente).
src/services/produto.service.ts:
inserirProduto: Obtém uma conexão do primaryPool para executar a instrução INSERT.
consultarProdutosAnteriores e consultarTodosProdutos: Obtêm uma conexão do replicaPool para executar as instruções SELECT.
src/index.ts: Orquestra as chamadas para o serviço, garantindo que as operações de escrita e leitura ocorram nos pools corretos.
Delays (Atrasos)
A aplicação inclui sleep entre as operações para simular um comportamento mais realista e permitir a observação dos logs. Os atrasos são introduzidos após cada inserção e após cada bloco de consultas.

Log Detalhado
O módulo src/utils/logger.ts fornece funções para logs coloridos (INFO, SUCCESS, WARN, ERROR) com timestamps, facilitando a visualização do fluxo da aplicação e a identificação de problemas.