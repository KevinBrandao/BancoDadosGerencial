import React, { useState } from 'react';
import axios from 'axios';

// URL da API de backend (que está rodando na porta 3000)
const API_URL = 'http://localhost:3000/produtos';

// Este formulário representa a ESCRITA (Banco PRIMARY)
function ProdutoForm({ onProdutoCriado }) {
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState('');
  const [valor, setValor] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!descricao || !categoria || !valor) {
      alert('Por favor, preencha todos os campos.');
      return;
    }

    const novoProduto = {
      descricao,
      categoria,
      valor: parseFloat(valor),
      // O 'criado_por' será definido pelo backend
    };

    try {
      // 1. Faz o POST para o endpoint de escrita
      const response = await axios.post(API_URL, novoProduto);
      
      // 2. Informa o componente pai sobre o sucesso
      onProdutoCriado(response.data);

      // 3. Limpa o formulário
      setDescricao('');
      setCategoria('');
      setValor('');

    } catch (error) {
      console.error('Erro ao criar produto:', error);
      if (error.response?.status === 409) {
        alert('Erro: Produto com esta descrição e autor já existe.');
      } else {
        alert('Falha ao criar produto.');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Descrição:</label>
        <input
          type="text"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Ex: Teclado Mecânico"
        />
      </div>
      <div>
        <label>Categoria:</label>
        <input
          type="text"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          placeholder="Ex: Periferico"
        />
      </div>
      <div>
        <label>Valor:</label>
        <input
          type="number"
          step="0.01"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="Ex: 150.00"
        />
      </div>
      <button type="submit">Adicionar Produto (PRIMARY)</button>
    </form>
  );
}

export default ProdutoForm;