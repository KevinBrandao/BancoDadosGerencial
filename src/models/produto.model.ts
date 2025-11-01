export interface Produto {
  id?: number;
  descricao: string;
  categoria: string;
  valor: number;
  criado_em?: Date; // Optional, as DB sets default now()
  criado_por: string;
}