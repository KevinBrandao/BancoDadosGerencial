import dotenv from 'dotenv';
import { ProdutoService } from './services/produto.service';
import { Produto } from './models/produto.model';
import { info, success, error, warn } from './utils/logger';
import { closePools, testConnections } from './config/database';

dotenv.config();

// Utility function for introducing delays
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));


const sampleProducts: Omit<Produto, 'id' | 'criado_em'>[] = [
  { descricao: 'Notebook Dell Inspiron', categoria: 'Informatica', valor: 3500.00, criado_por: CRIADO_POR },
  { descricao: 'Mouse Logitech MX', categoria: 'Periferico', valor: 250.00, criado_por: CRIADO_POR },
  { descricao: 'Teclado Mecanico', categoria: 'Periferico', valor: 450.00, criado_por: CRIADO_POR },
  { descricao: 'Monitor LG 27"', categoria: 'Informatica', valor: 1200.00, criado_por: CRIADO_POR },
  { descricao: 'Webcam Full HD', categoria: 'Periferico', valor: 350.00, criado_por: CRIADO_POR },
  { descricao: 'Headset Gamer', categoria: 'Audio', valor: 280.00, criado_por: CRIADO_POR },
  { descricao: 'SSD 1TB Samsung', categoria: 'Hardware', valor: 550.00, criado_por: CRIADO_POR },
  { descricao: 'Cadeira Gamer', categoria: 'Moveis', valor: 1100.00, criado_por: CRIADO_POR },
  { descricao: 'Mousepad Grande', categoria: 'Acessorios', valor: 80.00, criado_por: CRIADO_POR },
  { descricao: 'Hub USB-C 7 Portas', categoria: 'Acessorios', valor: 150.00, criado_por: CRIADO_POR },
  // Add an extra product that might cause a unique constraint error if run multiple times without clearing DB
  // { descricao: 'Notebook Dell Inspiron', categoria: 'Informatica', valor: 3600.00, criado_por: CRIADO_POR },
];

async function main() {
  info('Iniciando o projeto Primary-Replica...');

  // 1. Test database connections
  await testConnections();

  const produtoService = new ProdutoService();
  let lastInsertedProductId: number | undefined;

  // Graceful shutdown on Ctrl+C
  process.on('SIGINT', async () => {
    warn('SIGINT recebido. Fechando conexões do banco de dados...');
    await closePools();
    process.exit(0);
  });

  for (let i = 0; i < sampleProducts.length; i++) {
    const productToInsert = sampleProducts[i];
    info(`--- Iteração ${i + 1}/${sampleProducts.length} ---`);

    try {
      // a) Insere um produto no PRIMARY
      const insertedProduct = await produtoService.inserirProduto(productToInsert);
      lastInsertedProductId = insertedProduct.id;

      // b) Espera 500ms-1s
      await sleep(Math.floor(Math.random() * 501) + 500); // Between 500ms and 1000ms

      // c) Imprime o produto inserido com o ID gerado
      success(`Produto inserido: ID ${insertedProduct.id}, Descrição: ${insertedProduct.descricao}, Criado em: ${insertedProduct.criado_em?.toLocaleString()}`);

      if (lastInsertedProductId !== undefined) {
        // d) Realiza 10 operações SELECT no REPLICA para IDs anteriores
        info(`Consultando os 10 produtos anteriores ao ID ${lastInsertedProductId} no REPLICA...`);
        const previousProducts = await produtoService.consultarProdutosAnteriores(lastInsertedProductId, 10);

        if (previousProducts.length > 0) {
          info('Produtos anteriores encontrados:');
          console.table(previousProducts.map(p => ({
            ID: p.id,
            Descricao: p.descricao,
            Categoria: p.categoria,
            Valor: p.valor.toFixed(2),
            CriadoEm: p.criado_em?.toLocaleString(),
            CriadoPor: p.criado_por
          })));
        } else {
          warn('Nenhum produto anterior encontrado no REPLICA.');
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

  success('Todas as operações de inserção e consulta foram concluídas.');

  // Optionally, show all products at the end
  info('Consultando todos os produtos no REPLICA para verificação final...');
  const allProducts = await produtoService.consultarTodosProdutos();
  if (allProducts.length > 0) {
    info('Todos os produtos no banco de dados:');
    console.table(allProducts.map(p => ({
      ID: p.id,
      Descricao: p.descricao,
      Categoria: p.categoria,
      Valor: p.valor.toFixed(2),
      CriadoEm: p.criado_em?.toLocaleString(),
      CriadoPor: p.criado_por
    })));
  } else {
    warn('Nenhum produto encontrado no banco de dados.');
  }

  await closePools();
  success('Projeto Primary-Replica finalizado com sucesso.');
}

main().catch(err => {
  error(`Erro fatal no programa principal: ${err.message}`);
  closePools().finally(() => process.exit(1));
});