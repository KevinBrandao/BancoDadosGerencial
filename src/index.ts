import dotenv from "dotenv";
import express, { Request, Response } from "express";
import cors from "cors";
import { ProdutoService } from "./services/produto.service";
import { info, success, error, warn } from "./utils/logger";
import { closePools, testConnections } from "./config/database";
import { Produto } from "./models/produto.model";

// Carrega variáveis de ambiente
dotenv.config();

const app = express();
const port = process.env.SERVER_PORT || 3000;
const produtoService = new ProdutoService();

// --- Middlewares ---
app.use(cors()); // Permite requisições de outros domínios
app.use(express.json()); // Habilita o parsing de JSON no body das requisições

// --- Rotas da API ---

/**
 * Rota de Health Check
 */
app.get("/health", (req: Request, res: Response) => {
    res.status(200).json({ status: "UP" });
});

/**
 * POST /produtos
 * Cria um novo produto.
 * Conecta-se ao banco de dados PRIMARY (Escrita).
 */
app.post("/produtos", async (req: Request, res: Response) => {
    try {
        const { descricao, categoria, valor, criado_por } = req.body;

        let cp = criado_por ? criado_por : process.env.CRIADO_POR || "GrupoB";

        if (!descricao || !categoria || !valor) {
            return res
                .status(400)
                .json({
                    message:
                        "Campos obrigatórios ausentes: descricao, categoria, valor",
                });
        }

        const novoProduto: Omit<Produto, "id" | "criado_em"> = {
            descricao,
            categoria,
            valor: Number(valor),
            criado_por: cp,
        };

        const produtoInserido = await produtoService.inserirProduto(
            novoProduto
        );
        res.status(201).json(produtoInserido); // 201 Created
    } catch (err: any) {
        if (err.code === "ER_DUP_ENTRY") {
            error(`[API] Falha ao criar produto: ${err.message}`);
            res.status(409).json({
                message: "Produto com esta descrição e autor já existe.",
            }); // 409 Conflict
        } else {
            error(`[API] Erro interno no POST /produtos: ${err.message}`);
            res.status(500).json({ message: "Erro interno do servidor." });
        }
    }
});

/**
 * GET /produtos
 * Lista todos os produtos.
 * Conecta-se ao banco de dados REPLICA (Leitura).
 */
app.get("/produtos", async (req: Request, res: Response) => {
    try {
        const produtos = await produtoService.consultarTodosProdutos();
        res.status(200).json(produtos);
    } catch (err: any) {
        error(`[API] Erro interno no GET /produtos: ${err.message}`);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
});

/**
 * GET /produtos/:id
 * Busca um produto específico pelo ID.
 * Conecta-se ao banco de dados REPLICA (Leitura).
 */
app.get("/produtos/:id", async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ message: "ID inválido." });
        }

        const produto = await produtoService.consultarProdutoPorId(id);
        if (produto) {
            res.status(200).json(produto);
        } else {
            res.status(404).json({ message: "Produto não encontrado." }); // 404 Not Found
        }
    } catch (err: any) {
        error(`[API] Erro interno no GET /produtos/:id: ${err.message}`);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
});

/**
 * Função de inicialização do servidor
 */
async function startServer() {
    info("Iniciando o servidor da API...");

    try {
        // 1. Testa as conexões com os bancos
        await testConnections();

        // 2. Inicia o listener da API
        app.listen(port, () => {
            success(`Servidor rodando na porta ${port}`);
            info(`Rotas disponíveis:`);
            info(
                `  POST http://localhost:${port}/produtos (Escreve no PRIMARY)`
            );
            info(`  GET  http://localhost:${port}/produtos (Lê do REPLICA)`);
            info(
                `  GET  http://localhost:${port}/produtos/:id (Lê do REPLICA)`
            );
        });
    } catch (err: any) {
        error(`Falha ao iniciar o servidor: ${err.message}`);
        process.exit(1);
    }
}

// --- Gerenciamento de Encerramento (Graceful Shutdown) ---
const shutdown = async () => {
    warn("SIGINT recebido. Fechando conexões do banco de dados...");
    await closePools();
    process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Inicia a aplicação
startServer();
