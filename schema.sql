-- database/schema.sql

-- Create the database if it does not exist
CREATE DATABASE IF NOT EXISTS aula-db;

-- Use the created database
USE aula-db;

-- Create the 'produto' table with the specified structure
CREATE TABLE IF NOT EXISTS produto (
  id INT AUTO_INCREMENT,
  descricao VARCHAR(50) NOT NULL,
  categoria VARCHAR(10) NOT NULL,
  valor NUMERIC(15,2) NOT NULL,
  criado_em DATETIME DEFAULT NOW(),
  criado_por VARCHAR(20) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE (descricao, criado_por) -- Ensures a product with the same description by the same creator is unique
);

-- Optional: You can insert some initial sample data here if needed for testing
-- Example:
-- INSERT INTO produto (descricao, categoria, valor, criado_por) VALUES
-- ('Teclado ABNT2', 'Periferico', 120.50, 'Admin'),
-- ('Mouse Sem Fio', 'Periferico', 80.00, 'Admin');