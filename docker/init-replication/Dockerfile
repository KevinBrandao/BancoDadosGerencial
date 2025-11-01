FROM debian:bullseye-slim

RUN apt-get update && \
    apt-get install -y default-mysql-client && \
    rm -rf /var/lib/apt/lists/*

# Copia o script de inicialização para o container
COPY init-replica.sh /init-replica.sh
# Concede permissões de execução
RUN chmod +x /init-replica.sh

# Define o script como o ponto de entrada do container
ENTRYPOINT ["/init-replica.sh"]