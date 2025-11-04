import dotenv from "dotenv";
import { ProdutoService } from "./services/produto.service";
import { Produto } from "./models/produto.model";
import { info, success, error, warn } from "./utils/logger";
import { closePools, testConnections } from "./config/database";

dotenv.config();

// Utility function for introducing delays
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const CRIADO_POR = process.env.CRIADO_POR || "GrupoB";

const sampleProducts: Omit<Produto, "id" | "criado_em">[] = [
    {
        descricao: "Notebook Dell Inspiron",
        categoria: "Notebook",
        valor: 3500.0,
        criado_por: CRIADO_POR,
    },
    {
        descricao: "Mouse Logitech MX",
        categoria: "Periferico",
        valor: 250.0,
        criado_por: CRIADO_POR,
    },
    {
        descricao: "Teclado Mecanico",
        categoria: "Periferico",
        valor: 450.0,
        criado_por: CRIADO_POR,
    },
    {
        descricao: 'Monitor LG 27"',
        categoria: "Monitor",
        valor: 1200.0,
        criado_por: CRIADO_POR,
    },
    {
        descricao: "Webcam Full HD",
        categoria: "Periferico",
        valor: 350.0,
        criado_por: CRIADO_POR,
    },
    {
        descricao: "Headset Gamer",
        categoria: "Audio",
        valor: 280.0,
        criado_por: CRIADO_POR,
    },
    {
        descricao: "SSD 1TB Samsung",
        categoria: "Hardware",
        valor: 550.0,
        criado_por: CRIADO_POR,
    },
    {
        descricao: "Cadeira Gamer",
        categoria: "Moveis",
        valor: 1100.0,
        criado_por: CRIADO_POR,
    },
    {
        descricao: "Mousepad Grande",
        categoria: "Acessorios",
        valor: 80.0,
        criado_por: CRIADO_POR,
    },
    {
        descricao: "Hub USB-C 7 Portas",
        categoria: "Acessorios",
        valor: 150.0,
        criado_por: CRIADO_POR,
    },
    {
        descricao: "Mouse sem Fio",
        categoria: "Periferico",
        valor: 200.0,
        criado_por: CRIADO_POR,
    },
    {
        descricao: "Teclado Bluetooth",
        categoria: "Periferico",
        valor: 300.0,
        criado_por: CRIADO_POR,
    },
    {
    descricao: "Macbook Air M3",
    categoria: "Notebook",
    valor: 7500.0,
    criado_por: CRIADO_POR,
  },
  {
    descricao: "Placa de Video RTX 4070",
    categoria: "Hardware",
    valor: 4200.0,
    criado_por: CRIADO_POR,
  },
  {
    descricao: "Memoria RAM 16GB DDR5",
    categoria: "Hardware",
    valor: 650.0,
    criado_por: CRIADO_POR,
  },
  {
    descricao: "Processador AMD Ryzen 7",
    categoria: "Hardware",
    valor: 1800.0,
    criado_por: CRIADO_POR,
  },
  {
    descricao: 'Monitor Samsung Odyssey G5 32"',
    categoria: "Monitor",
    valor: 2100.0,
    criado_por: CRIADO_POR,
  },
  {
    descricao: "Fone de Ouvido Sony WH-1000XM5",
    categoria: "Audio",
    valor: 1900.0,
    criado_por: CRIADO_POR,
  },
  {
    descricao: "Caixa de Som JBL Flip 6",
    categoria: "Audio",
    valor: 550.0,
    criado_por: CRIADO_POR,
  },
  {
    descricao: "Microfone HyperX QuadCast",
    categoria: "Periferico",
    valor: 850.0,
    criado_por: CRIADO_POR,
  },
  {
    descricao: "Mesa de Escritorio",
    categoria: "Moveis",
    valor: 600.0,
    criado_por: CRIADO_POR,
  },
  {
    descricao: "Filtro de Linha Clamper",
    categoria: "Acessorios",
    valor: 90.0,
    criado_por: CRIADO_POR,
  },
  {
    descricao: "Suporte para Monitor Articulado",
    categoria: "Acessorios",
    valor: 180.0,
    criado_por: CRIADO_POR,
  },
  {
    descricao: "Notebook Lenovo Yoga",
    categoria: "Notebook",
    valor: 4800.0,
    criado_por: CRIADO_POR,
  },
  {
    descricao: "Placa Mae B550",
    categoria: "Hardware",
    valor: 900.0,
    criado_por: CRIADO_POR,
  },
  {
    descricao: "Impressora Multifuncional HP",
    categoria: "Periferico",
    valor: 750.0,
    criado_por: CRIADO_POR,
  },
  {
    descricao: "HD Externo 2TB Seagate",
    categoria: "Acessorios",
    valor: 420.0,
    criado_por: CRIADO_POR,
  },
];

async function main() {
    info("Iniciando o projeto Primary-Replica...");

    // 1. Test database connections
    await testConnections();

    const produtoService = new ProdutoService();
    let lastInsertedProductId: number | undefined;

    // Graceful shutdown on Ctrl+C
    process.on("SIGINT", async () => {
        warn("SIGINT recebido. Fechando conexões do banco de dados...");
        await closePools();
        process.exit(0);
    });

    for (let i = 0; i < sampleProducts.length; i++) {
        const productToInsert = sampleProducts[i];
        info(`--- Iteração ${i + 1}/${sampleProducts.length} ---`);

        try {
            // a) Insere um produto no PRIMARY
            const insertedProduct = await produtoService.inserirProduto(
                productToInsert
            );
            lastInsertedProductId = insertedProduct.id;

            // b) Espera 500ms-1s
            await sleep(Math.floor(Math.random() * 501) + 500); // Between 500ms and 1000ms

            // c) Imprime o produto inserido com o ID gerado
            success(
                `Produto inserido: ID ${insertedProduct.id}, Descrição: ${
                    insertedProduct.descricao
                }, Criado em: ${insertedProduct.criado_em?.toLocaleString()}`
            );

            if (lastInsertedProductId !== undefined) {
                // d) Realiza 10 operações SELECT INDIVIDUAIS no REPLICA para IDs anteriores
                info(
                    `Consultando os 10 IDs anteriores ao ${lastInsertedProductId} no REPLICA (individualmente)...`
                );

                // Loop para consultar os 10 IDs anteriores
                for (let j = 1; j <= 10; j++) {
                    const idParaConsultar = lastInsertedProductId - j;

                    // Se o ID for 0 ou menor, não há o que consultar
                    if (idParaConsultar <= 0) {
                        warn(
                            `[ID ${idParaConsultar}] Busca interrompida (ID <= 0).`
                        );
                        break; // Para o loop 'for'
                    }

                    // Realiza a consulta individual
                    const produtoAnterior =
                        await produtoService.consultarProdutoPorId(
                            idParaConsultar
                        );

                    // Imprime o resultado de cada select individual, como solicitado
                    if (produtoAnterior) {
                        success(
                            `  [ID ${idParaConsultar}] Encontrado: ${
                                produtoAnterior.descricao
                            } (Valor: ${produtoAnterior.valor})`
                        );
                    } else {
                        // É normal não encontrar, seja pelo atraso da réplica ou por ser o início da lista
                        warn(
                            `  [ID ${idParaConsultar}] Não encontrado no REPLICA.`
                        );
                    }

                    // Uma pequena pausa entre cada SELECT individual para simulação
                    await sleep(100); // 100ms
                }
            }
            // f) Espera 1-2s antes da próxima iteração
            await sleep(Math.floor(Math.random() * 1001) + 1000); // Between 1000ms and 2000ms
        } catch (err: any) {
            error(`Falha na iteração ${i + 1}: ${err.message}`);
            // Continue to next product or decide to exit
            await sleep(2000); // Delay before next attempt even on error
        }
    }

    success("Todas as operações de inserção e consulta foram concluídas.");

    // Optionally, show all products at the end
    info("Consultando todos os produtos no REPLICA para verificação final...");
    const allProducts = await produtoService.consultarTodosProdutos();
    if (allProducts.length > 0) {
        info("Todos os produtos no banco de dados:");
        console.table(
            allProducts.map((p) => ({
                ID: p.id,
                Descricao: p.descricao,
                Categoria: p.categoria,
                Valor: p.valor,
                CriadoEm: p.criado_em?.toLocaleString(),
                CriadoPor: p.criado_por,
            }))
        );
    } else {
        warn("Nenhum produto encontrado no banco de dados.");
    }

    await closePools();
    success("Projeto Primary-Replica finalizado com sucesso.");
}

main().catch((err) => {
    error(`Erro fatal no programa principal: ${err.message}`);
    closePools().finally(() => process.exit(1));
});
