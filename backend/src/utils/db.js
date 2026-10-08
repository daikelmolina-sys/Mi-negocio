import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'pos_bodega',
});

export const initDB = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        barcode VARCHAR(100) UNIQUE,
        name VARCHAR(255) NOT NULL,
        price_usd DECIMAL(10, 2) NOT NULL,
        cost_usd DECIMAL(10, 2) DEFAULT 0,
        stock DECIMAL(10, 2) DEFAULT 0,
        category VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        document_id VARCHAR(50) UNIQUE,
        phone VARCHAR(50)
      );

      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        total_usd DECIMAL(10, 2) NOT NULL,
        total_ves DECIMAL(10, 2) NOT NULL,
        exchange_rate DECIMAL(10, 4) NOT NULL,
        payment_method VARCHAR(100),
        status VARCHAR(50) DEFAULT 'COMPLETED',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sale_items (
        id SERIAL PRIMARY KEY,
        sale_id INTEGER REFERENCES sales(id),
        product_id INTEGER REFERENCES products(id),
        quantity DECIMAL(10, 2) NOT NULL,
        price_usd DECIMAL(10, 2) NOT NULL,
        total_usd DECIMAL(10, 2) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS credits (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES clients(id),
        sale_id INTEGER REFERENCES sales(id),
        amount_usd DECIMAL(10, 2) NOT NULL,
        amount_ves DECIMAL(10, 2) NOT NULL,
        due_date TIMESTAMP,
        status VARCHAR(50) DEFAULT 'PENDING',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS cash_registers (
        id SERIAL PRIMARY KEY,
        opening_balance_usd DECIMAL(10, 2) DEFAULT 0,
        opening_balance_ves DECIMAL(10, 2) DEFAULT 0,
        closing_balance_usd DECIMAL(10, 2),
        closing_balance_ves DECIMAL(10, 2),
        opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        closed_at TIMESTAMP,
        status VARCHAR(20) DEFAULT 'OPEN'
      );

      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        exchange_rate DECIMAL(10, 4) NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'CASHIER',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS inventory_movements (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id),
        type VARCHAR(20) NOT NULL,
        quantity DECIMAL(10, 2) NOT NULL,
        stock_after DECIMAL(10, 2) NOT NULL,
        username VARCHAR(50) DEFAULT 'Sistema',
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      INSERT INTO settings (exchange_rate) 
      SELECT 36.5 
      WHERE NOT EXISTS (SELECT 1 FROM settings);
    `);

    // Comprobar si existe el admin, sino crearlo
    const adminCheck = await client.query("SELECT 1 FROM users WHERE username = 'admin'");
    if (adminCheck.rows.length === 0) {
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.default.hash('admin123', 10);
      await client.query("INSERT INTO users (username, password, role) VALUES ($1, $2, 'ADMIN')", ['admin', hashedPassword]);
    }

    console.log('Base de datos inicializada correctamente');
  } catch (err) {
    console.error('Error inicializando la base de datos:', err);
  } finally {
    client.release();
  }
};

export default pool;
