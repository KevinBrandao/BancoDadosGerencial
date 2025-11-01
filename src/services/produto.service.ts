import { getPrimaryConnection, getReplicaConnection } from '../config/database';
import { Produto } from '../models/produto.model';
import { info, success, error } from '../utils/logger';

export class ProdutoService {
  /**
   * Inserts a new product into the primary database.
   * @param produto - The product data to insert.
   * @returns The inserted product with its generated ID and creation timestamp.
   */
  public async inserirProduto(produto: Omit<Produto, 'id' | 'criado_em'>): Promise<Produto> {
    const primaryDb = getPrimaryConnection();
    try {
      // The criado_em field has a DEFAULT NOW() in the DB, so we don't send it.
      // The id is auto-incremented.
      const [result] = await primaryDb.execute(
        `INSERT INTO produto (descricao, categoria, valor, criado_por)
         VALUES (:descricao, :categoria, :valor, :criado_por)`,
        produto
      );

      const insertId = (result as any).insertId;
      if (insertId) {
        // Fetch the newly inserted product to get the exact criado_em timestamp from DB
        const [rows] = await primaryDb.execute<Produto[]>(
          `SELECT id, descricao, categoria, valor, criado_em, criado_por FROM produto WHERE id = :id`,
          { id: insertId }
        );
        if (rows && rows.length > 0) {
          success(`Produto inserido no PRIMARY: ${produto.descricao} (ID: ${insertId})`);
          return rows[0];
        }
      }
      throw new Error('Failed to retrieve inserted product or no ID was generated.');
    } catch (err: any) {
      if (err.code === 'ER_DUP_ENTRY') {
        error(`Erro ao inserir produto (PRIMARY): Duplicidade para '${produto.descricao}' por '${produto.criado_por}'.`);
      } else {
        error(`Erro ao inserir produto (PRIMARY) '${produto.descricao}': ${err.message}`);
      }
      throw err;
    }
  }

  /**
   * Consults products from the replica database that have an ID less than ultimoId.
   * @param ultimoId - The maximum ID to search for (exclusive).
   * @param quantidade - The maximum number of products to return.
   * @returns An array of products matching the criteria.
   */
  public async consultarProdutosAnteriores(ultimoId: number, quantidade: number): Promise<Produto[]> {
    const replicaDb = getReplicaConnection();
    try {
      const [rows] = await replicaDb.execute<Produto[]>(
        `SELECT id, descricao, categoria, valor, criado_em, criado_por
         FROM produto
         WHERE id < :ultimoId
         ORDER BY id DESC
         LIMIT :quantidade`,
        { ultimoId, quantidade }
      );
      info(`Consulta no REPLICA para produtos com ID < ${ultimoId} (limite: ${quantidade}) retornou ${rows.length} resultados.`);
      return rows;
    } catch (err: any) {
      error(`Erro ao consultar produtos anteriores (REPLICA) para ID < ${ultimoId}: ${err.message}`);
      return [];
    }
  }

  /**
   * Consults all products from the replica database.
   * Useful for initial setup or full list display.
   * @returns An array of all products.
   */
  public async consultarTodosProdutos(): Promise<Produto[]> {
    const replicaDb = getReplicaConnection();
    try {
      const [rows] = await replicaDb.execute<Produto[]>(
        `SELECT id, descricao, categoria, valor, criado_em, criado_por
         FROM produto
         ORDER BY id ASC`
      );
      info(`Consulta no REPLICA por todos os produtos retornou ${rows.length} resultados.`);
      return rows;
    } catch (err: any) {
      error(`Erro ao consultar todos os produtos (REPLICA): ${err.message}`);
      return [];
    }
  }
}