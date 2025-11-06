#!/bin/bash
set -e

echo "=== INICIANDO CONFIGURAÇÃO DE REPLICAÇÃO ==="

# Variáveis
PRIMARY_HOST="${MYSQL_PRIMARY_HOST:-172.25.0.10}"
REPLICA_HOST="${MYSQL_REPLICA_HOST:-172.25.0.11}"
REPLICATION_USER="${MYSQL_REPLICATION_USER:-replicator}"
REPLICATION_PASSWORD="${MYSQL_REPLICATION_PASSWORD:-replicator_password}"
ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD}"

echo "PRIMARY_HOST: $PRIMARY_HOST"
echo "REPLICA_HOST: $REPLICA_HOST"
echo "REPLICATION_USER: $REPLICATION_USER"

# Validar variáveis obrigatórias
if [ -z "$ROOT_PASSWORD" ]; then
    echo "ERRO: MYSQL_ROOT_PASSWORD não está definida!"
    exit 1
fi

# Função para testar conectividade
wait_for_mysql() {
    local host=$1
    local max_attempts=60
    local attempt=1
    
    echo "Aguardando MySQL em $host..."
    
    while [ $attempt -le $max_attempts ]; do
        echo "Tentativa $attempt de $max_attempts..."
        
        if mysql -h "$host" -u root -p"$ROOT_PASSWORD" -e "SELECT 1" > /dev/null 2>&1; then
            echo "MySQL em $host está pronto!"
            return 0
        fi
        
        echo "MySQL em $host ainda não está pronto. Aguardando 5 segundos..."
        sleep 5
        attempt=$((attempt + 1))
    done
    
    echo "ERRO: Timeout aguardando MySQL em $host"
    return 1
}

# Aguardar ambos os servidores
echo ""
echo "=== VERIFICANDO CONECTIVIDADE ==="

# CHAMADAS PARA A FUNÇÃO DE ESPERA (A CORREÇÃO DO BUG 1)
wait_for_mysql "$PRIMARY_HOST"
wait_for_mysql "$REPLICA_HOST"

# Capturar status do master
echo ""
echo "=== CAPTURANDO STATUS DO MASTER ==="

MASTER_STATUS=$(mysql -h "$PRIMARY_HOST" -u root -p"$ROOT_PASSWORD" -e "SHOW MASTER STATUS\G" 2>&1)

if [ $? -ne 0 ]; then
    echo "ERRO ao capturar MASTER STATUS:"
    echo "$MASTER_STATUS"
    exit 1
fi

echo "=== MASTER STATUS CAPTURADO ==="
echo "$MASTER_STATUS"
echo ""

# Extrair File e Position

MASTER_LOG_FILE=$(echo "$MASTER_STATUS" | grep 'File:' | awk '{print $2}')
MASTER_LOG_POS=$(echo "$MASTER_STATUS" | grep 'Position:' | awk '{print $2}')

echo "=== VALORES EXTRAÍDOS ==="
echo "MASTER_LOG_FILE: '$MASTER_LOG_FILE'"
echo "MASTER_LOG_POS: '$MASTER_LOG_POS'"
echo ""

if [ -z "$MASTER_LOG_FILE" ] || [ -z "$MASTER_LOG_POS" ]; then
# Validar extração
    echo "ERRO: Não foi possível extrair MASTER_LOG_FILE ou MASTER_LOG_POS"
    echo "MASTER_LOG_FILE: '$MASTER_LOG_FILE'"
    echo "MASTER_LOG_POS: '$MASTER_LOG_POS'"
    exit 1
fi

# Configurar replicação no slave
echo "=== CONFIGURANDO REPLICAÇÃO NO SLAVE ==="

mysql -h "$PRIMARY_HOST" -u root -p"$MYSQL_ROOT_PASSWORD" <<-EOSQL
  DROP USER IF EXISTS 'repl'@'%';
  CREATE USER '$MYSQL_REPLICATION_USER'@'%' IDENTIFIED WITH mysql_native_password BY '$MYSQL_REPLICATION_PASSWORD';
  GRANT REPLICATION SLAVE ON *.* TO '$MYSQL_REPLICATION_USER'@'%';
  FLUSH PRIVILEGES;
EOSQL

mysql -h "$REPLICA_HOST" -u root -p"$ROOT_PASSWORD" <<-EOSQL
    STOP SLAVE;
    RESET SLAVE ALL;
    
    CHANGE MASTER TO
        MASTER_HOST='$PRIMARY_HOST',
        MASTER_USER='$REPLICATION_USER',
        MASTER_PASSWORD='$REPLICATION_PASSWORD',
        MASTER_LOG_FILE='$MASTER_LOG_FILE',
        MASTER_LOG_POS=$MASTER_LOG_POS,
        MASTER_SSL=0;
    
    START SLAVE;
    
    SHOW SLAVE STATUS\G
EOSQL

if [ $? -ne 0 ]; then
    echo "ERRO ao configurar replicação no slave"
    exit 1
fi

echo ""
echo "=== VERIFICANDO STATUS DA REPLICAÇÃO ==="

mysql -h "$REPLICA_HOST" -u root -p"$ROOT_PASSWORD" -e "SHOW SLAVE STATUS\G"

echo ""
echo "=== AGUARDANDO REPLICAÇÃO ==="
sleep 10

# Verificar se tabela foi replicada
echo ""
echo "=== VERIFICANDO DADOS REPLICADOS ==="

REPLICA_COUNT=$(mysql -h "$REPLICA_HOST" -u root -p"$ROOT_PASSWORD" -e "USE aula-db; SELECT COUNT(*) FROM produto;" 2>/dev/null | tail -n1)

echo "Registros na réplica: $REPLICA_COUNT"

if [ "$REPLICA_COUNT" -gt 0 ]; then
    echo ""
    echo "✅ REPLICAÇÃO CONFIGURADA COM SUCESSO!"
    echo "✅ Dados foram replicados corretamente!"
else
    echo ""
    echo "⚠️  ATENÇÃO: Replicação configurada, mas dados ainda não foram replicados"
    echo "⚠️  Verifique o status da replicação"
fi

echo ""
echo "=== CONFIGURAÇÃO CONCLUÍDA ==="