import React, { useState, useEffect, useCallback }
from 'react';
import axios from 'axios';
import ProdutoForm from './ProdutoForm';
import './App.css';

// URL da API de backend
const API_URL = 'http://localhost:3000/produtos';

function App() {
  const [produtos, setProdutos] = useState([]);
  const [writeLog, setWriteLog] = useState('');
  const [replicationLog, setReplicationLog] = useState('');
  const [isPolling, setIsPolling] = useState(false);

  // --- Função para buscar a LISTA COMPLETA (REPLICA) ---
  const fetchProdutos = useCallback(async () => {
    try {
      const response = await axios.get(API_URL); //
      setProdutos(response.data);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
    }
  }, []);

  // Busca a lista inicial ao carregar
  useEffect(() => {
    fetchProdutos();
  }, [fetchProdutos]);

  // --- A MÁGICA DA DEMONSTRAÇÃO ESTÁ AQUI ---

  /**
   * Esta função "caça" um ID específico no REPLICA.
   * Ela tentará repetidamente até encontrar (200 OK) ou falhar por outro motivo.
   */
  const pollReplicaForId = async (idParaBuscar) => {
    const timestamp = new Date().toLocaleTimeString();
    
    // Tenta buscar o ID específico no REPLICA
    try {
      const response = await axios.get(`${API_URL}/${idParaBuscar}`);
      
      // SUCESSO! O produto foi encontrado
      const logMsg = `[${timestamp}] ✅ SUCESSO! ID ${idParaBuscar} (${response.data.descricao}) encontrado no REPLICA!`;
      setReplicationLog((prev) => prev + '\n' + logMsg);
      setIsPolling(false); // Para o loop
      fetchProdutos(); // Atualiza a lista principal agora que sabemos que funcionou

    } catch (error) {
      // FALHA! O mais provável é ser um 404 (Não Encontrado)
      if (error.response && error.response.status === 404) {
        const logMsg = `[${timestamp}] ⏳ (404) ID ${idParaBuscar} ainda NÃO encontrado no REPLICA. Tentando de novo em 1s...`;
        setReplicationLog((prev) => prev + '\n' + logMsg);
        
        // Tenta de novo após 1 segundo
        setTimeout(() => pollReplicaForId(idParaBuscar), 1000);

      } else {
        // Outro erro (ex: falha de rede)
        const logMsg = `[${timestamp}] ❌ Erro ao buscar ID ${idParaBuscar}: ${error.message}`;
        setReplicationLog((prev) => prev + '\n' + logMsg);
        setIsPolling(false); // Para o loop
      }
    }
  };

  /**
   * Esta função é chamada quando o formulário (PRIMARY) tem sucesso
   */
  const handleProdutoCriado = (produtoInserido) => {
    const timestamp = new Date().toLocaleTimeString();
    
    // 1. Atualiza o Log de Escrita (PRIMARY)
    setWriteLog(`[${timestamp}] Produto escrito no PRIMARY:\nID: ${produtoInserido.id}, Desc: ${produtoInserido.descricao}`);
    
    // 2. Limpa o log antigo e inicia a "caça" ao ID no REPLICA
    setReplicationLog(`[${timestamp}] 🚀 INICIANDO BUSCA PELA REPLICAÇÃO do ID: ${produtoInserido.id}`);
    setIsPolling(true);
    
    // 3. Inicia o polling (a "caça")
    pollReplicaForId(produtoInserido.id);
  };

  return (
    <div className="App">
      
      {/* PAINEL DE ESCRITA (PRIMARY) */}
      <div className="panel panel-write">
        <h2>Painel de Escrita (PRIMARY)</h2>
        <p>Adicione um novo produto. Os dados são enviados para o banco <strong>Primary</strong>.</p>
        <ProdutoForm onProdutoCriado={handleProdutoCriado} />
        
        <h3>Log de Escrita (Primary):</h3>
        <div className="log">{writeLog}</div>
      </div>

      {/* PAINEL DE LEITURA (REPLICA) */}
      <div className="panel panel-read">
        <h2>Painel de Leitura (REPLICA)</h2>
        <p>A lista abaixo vem do banco <strong>Replica</strong>. O log abaixo mostra a "caça" pelo ID recém-criado.</p>
        
        <h3>Log de Replicação (Leitura do Replica):</h3>
        <div className="log" style={{ height: '200px' }}>
          {replicationLog}
        </div>

        <button className="refresh-btn" onClick={fetchProdutos} disabled={isPolling}>
          Atualizar Lista Completa (Ler do REPLICA)
        </button>

        <div className="product-list">
          {produtos.length === 0 && <p>Nenhum produto encontrado no Replica.</p>}
          {produtos.map((produto) => (
            <div key={produto.id} className="product-item">
              <strong>ID: {produto.id}</strong> ({produto.descricao})
              <br />
              Valor: R$ {produto.valor}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;