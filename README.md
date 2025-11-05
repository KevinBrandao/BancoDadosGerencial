# Projeto BD Gerenciado - Arquitetura Primary-Replica

Este projeto demonstra a implementação de uma arquitetura de banco de dados Primary-Replica (separação de leitura/escrita) utilizando Node.js, TypeScript e MySQL, totalmente containerizado com Docker Compose.

O objetivo é simular um cenário onde operações de escrita (`INSERT`) são direcionadas para um banco de dados primário (PRIMARY) e operações de leitura (`SELECT`) são direcionadas para um banco de dados de réplica (REPLICA). Isso otimiza a performance e a escalabilidade da aplicação.

## Arquitetura

O ambiente é orquestrado pelo `docker-compose.yml` e consiste nos seguintes componentes:

  * **`mysql-primary`**: O container do banco de dados principal.
      * Responsável por todas as operações de **escrita**.
      * Configurado com `server-id=1` e `log_bin` habilitado para permitir a replicação.
      * Mapeia o `database/schema.sql` para inicializar a tabela `produto` automaticamente.
  * **`mysql-replica`**: O container do banco de dados de réplica.
      * Responsável por todas as operações de **leitura**.
      * Configurado com `server-id=2` e `read_only=1` para prevenir escritas acidentais.
  * **`init-replication`**: Um serviço temporário (ativado com o profile `setup`) que roda um script (`init-replica.sh`) para configurar automaticamente a replicação. Ele espera ambos os bancos de dados estarem prontos, cria o usuário de replicação no *primary* e aponta o *replica* para o *primary*.
  * **Aplicação Node.js (Host)**: A aplicação em si (API ou Script) que roda na sua máquina local e se conecta aos bancos de dados dentro dos containers Docker.

## Pré-requisitos

Antes de iniciar, certifique-se de ter os seguintes softwares instalados:

  * **Node.js**: Versão 18 ou superior.
  * **npm**: Gerenciador de pacotes do Node.js.
  * **Docker**: Para gerenciamento dos containers.
  * **Docker Compose**: Para orquestração do ambiente de banco de dados.

## ▶️ Como Começar

Siga estes passos para configurar e executar o projeto:

### 1\. Clone o Repositório

```bash
git clone https://github.com/KevinBrandao/BancoDadosGerencial
cd BancoDadosGerencial
```

### 2\. Crie o Arquivo de Ambiente

Copie o arquivo de exemplo para criar seu arquivo `.env` local. O projeto já está configurado para se conectar aos bancos de dados do Docker (`localhost:3306` e `localhost:3307`).

```bash
cp .env.example .env
```

### 3\. Instale as Dependências da Aplicação

```bash
npm install
```

### 4\. Inicie os Bancos de Dados com Docker

Primeiro, inicie os containers dos bancos de dados em background:

```bash
docker-compose up -d mysql-primary mysql-replica
```

Aguarde alguns segundos para que eles se inicializem.

### 5\. Configure a Replicação (Apenas na primeira vez)

Execute o serviço `init-replication` usando o profile `setup`. Isso irá configurar a comunicação entre o *primary* e o *replica*:

```bash
docker-compose --profile setup up --build
```

Você pode acompanhar os logs para confirmar que a replicação foi configurada com sucesso. Procure pela mensagem "✅ REPLICAÇÃO CONFIGURADA COM SUCESSO\!":

```bash
docker-compose logs -f init-replication
```

## 🚀 Como Executar a Aplicação

Com os bancos de dados rodando e a replicação ativa, você pode rodar a aplicação de duas formas:

### Opção A: Servidor API (Recomendado)

Inicia um servidor Express que expõe endpoints para interagir com o banco.

**Comando:**

```bash
npm run dev
```

**Rotas Disponíveis:**

  * **`POST /produtos`** (Escreve no **PRIMARY**)
      * Envia um produto no formato JSON.
      * Ex: `{"descricao": "Mouse Gamer", "categoria": "Periferico", "valor": 150.00}`
  * **`GET /produtos`** (Lê do **REPLICA**)
      * Retorna uma lista de todos os produtos.
  * **`GET /produtos/:id`** (Lê do **REPLICA**)
      * Retorna um produto específico pelo ID.

### Opção B: Script de Demonstração

Executa um script (`src/indexScript.ts`) que simula o uso da replicação. Ele insere produtos de exemplo no *primary* e, em seguida, tenta lê-los do *replica* para demonstrar o fluxo.

**Comando:**

```bash
npm run devScript
```

O script irá:

1.  Testar as conexões.
2.  Iterar sobre uma lista de produtos de exemplo.
3.  Inserir um produto no **PRIMARY**.
4.  Aguardar um breve período (simulando o atraso de replicação).
5.  Consultar produtos anteriores no **REPLICA**.
6.  Exibir os resultados no console.

## ⚙️ Detalhes da Implementação

  * **Separação de Leitura/Escrita**:

      * `src/config/database.ts`: Cria dois pools de conexão (`primaryPool` e `replicaPool`) com base nas variáveis de ambiente.
      * `src/services/produto.service.ts`:
          * `inserirProduto`: Utiliza `getPrimaryConnection()` para executar `INSERT`.
          * `consultar...`: Utilizam `getReplicaConnection()` para executar `SELECT`.

  * **Estrutura do Projeto**:

    ```
    .
    ├── database/
    │   └── schema.sql       # Schema do banco, aplicado automaticamente no primary
    ├── docker/
    │   ├── init-replication/  # Script e Dockerfile para configurar a replicação
    │   ├── mysql-primary/
    │   │   └── my.cnf         # Configuração do MySQL Primary (log-bin)
    │   └── mysql-replica/
    │       └── my.cnf         # Configuração do MySQL Replica (read-only)
    ├── src/
    │   ├── config/
    │   │   └── database.ts    # Criação dos pools de conexão (Primary e Replica)
    │   ├── models/
    │   │   └── produto.model.ts # Interface TypeScript do Produto
    │   ├── services/
    │   │   └── produto.service.ts # Lógica de negócio (onde a separação R/W ocorre)
    │   ├── utils/
    │   │   └── logger.ts      # Utilitário de log colorido
    │   ├── index.ts           # Ponto de entrada da API (npm run dev)
    │   └── indexScript.ts     # Ponto de entrada do Script (npm run devScript)
    ├── .env.example         # Modelo de variáveis de ambiente
    ├── docker-compose.yml   # Orquestração dos bancos de dados
    ├── package.json
    └── tsconfig.json
    ```

  * **Log Detalhado**:

      * O módulo `src/utils/logger.ts` fornece logs coloridos com timestamps para facilitar a visualização do fluxo da aplicação (INFO, SUCCESS, WARN, ERROR).

## 🛑 Parando o Ambiente

Para parar e remover os containers dos bancos de dados (incluindo os volumes de dados), execute:

```bash
docker-compose down -v
```