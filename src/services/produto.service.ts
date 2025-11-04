import { ResultSetHeader } from "mysql2/promise";
import { getPrimaryConnection, getReplicaConnection } from "../config/database";
import { Produto } from "../models/produto.model";
import { info, success, error } from "../utils/logger";

export class ProdutoService {
    /**
     * Insere um novo produto no banco de dados primário.
     * @param produto - Os dados do produto a serem inseridos.
     * @returns O produto inserido com o ID gerado e o timestamp de criação.
     */
    public async inserirProduto(
        produto: Omit<Produto, "id" | "criado_em">
    ): Promise<Produto> {
        const primaryDb = getPrimaryConnection();
        try {
            // O campo criado_em tem DEFAULT NOW() no BD, portanto não o enviamos.
            // O id é auto-incrementado.

            const [result] = await primaryDb.execute<ResultSetHeader>(
                `INSERT INTO produto (descricao, categoria, valor, criado_por)
                    VALUES (:descricao, :categoria, :valor, :criado_por)`,
                produto
            );

            const insertId = result.insertId;
            if (insertId) {
                // Recupera o produto recém-inserido para obter o timestamp criado_em exato do BD

                const [rows] = await primaryDb.execute<Produto[]>(
                    `SELECT id, descricao, categoria, valor, criado_em, criado_por FROM produto WHERE id = :id`,
                    { id: insertId }
                );
                if (rows && rows.length > 0) {
                    success(
                        `Produto inserido no PRIMARY: ${produto.descricao} (ID: ${insertId})`
                    );
                    return rows[0];
                }
            }
            throw new Error(
                "Failed to retrieve inserted product or no ID was generated."
            );
        } catch (err: any) {
            if (err.code === "ER_DUP_ENTRY") {
                error(
                    `Erro ao inserir produto (PRIMARY): Duplicidade para '${produto.descricao}' por '${produto.criado_por}'.`
                );
            } else {
                error(
                    `Erro ao inserir produto (PRIMARY) '${produto.descricao}': ${err.message}`
                );
            }
            throw err;
        }
    }

    /**
     * Consulta produtos no banco réplica que possuem ID menor que ultimoId.
     * @param ultimoId - O ID máximo a ser pesquisado (exclusivo).
     * @param quantidade - Número máximo de produtos a retornar.
     * @returns Um array de produtos que correspondem aos critérios.
     */
    public async consultarProdutosAnteriores(
        ultimoId: number,
        quantidade: number
    ): Promise<Produto[]> {
        const replicaDb = getReplicaConnection();
        try {
            const sql = `
         SELECT id, descricao, categoria, valor, criado_em, criado_por
         FROM produto
         WHERE id < :ultimoId
         ORDER BY id DESC
         LIMIT ${quantidade}`; // <-- MUDANÇA AQUI: Injeta o valor

            const [rows] = await replicaDb.execute<Produto[]>(
                sql,
                { ultimoId } // <-- MUDANÇA AQUI: Remove 'quantidade' do objeto de parâmetros
            );
            info(
                `Consulta no REPLICA para produtos com ID < ${ultimoId} (limite: ${quantidade}) retornou ${rows.length} resultados.`
            );
            return rows;
        } catch (err: any) {
            error(
                `Erro ao consultar produtos anteriores (REPLICA) para ID < ${ultimoId}: ${err.message}`
            );
            return [];
        }
    }

    /**
     * Consulta todos os produtos no banco réplica.
     * Útil para configuração inicial ou exibição da lista completa.
     * @returns Um array com todos os produtos.
     */
    public async consultarTodosProdutos(): Promise<Produto[]> {
        const replicaDb = getReplicaConnection();
        try {
            const [rows] = await replicaDb.execute<Produto[]>(
                `SELECT id, descricao, categoria, valor, criado_em, criado_por
                    FROM produto
                    ORDER BY id ASC`
            );
            info(
                `Consulta no REPLICA por todos os produtos retornou ${rows.length} resultados.`
            );
            return rows;
        } catch (err: any) {
            error(
                `Erro ao consultar todos os produtos (REPLICA): ${err.message}`
            );
            return [];
        }
    }

    /**
     * Consulta um produto no banco réplica pelo ID.
     * @param id - O ID do produto a ser consultado.
     * @returns O produto encontrado ou undefined se nenhuma corresponder ao ID.
     */
    public async consultarProdutoPorId(
        id: number
    ): Promise<Produto | undefined> {
        const replicaDb = getReplicaConnection();
        try {
            const [rows] = await replicaDb.execute<Produto[]>(
                `SELECT id, descricao, categoria, valor, criado_em, criado_por
                    FROM produto
                    WHERE id = :id`,
                { id }
            );
            // info(
            //     `Consulta no REPLICA por ID ${id} retornou ${rows.length} resultado(s).`
            // );

            if (rows.length > 0) {
                return rows[0];
            }
            return undefined;
        } catch (err: any) {
            error(
                `Erro ao consultar produto por ID (REPLICA) para ID ${id}: ${err.message}`
            );
            return undefined;
        }
    }
}
