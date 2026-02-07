import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Create a connection pool for MySQL
export const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    database: process.env.DB_NAME || 'case_monitoring',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    waitForConnections: true,
    connectionLimit: 20, // Maximum number of connections in the pool
    idleTimeout: 30000, // Close idle connections after 30 seconds
    connectTimeout: 2000, // Return error after 2 seconds if connection not available
});

// Test database connection
export async function testConnection(): Promise<boolean> {
    try {
        const connection = await pool.getConnection();
        await connection.query('SELECT NOW()');
        connection.release();
        console.log('✅ Database connection successful');
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        return false;
    }
}

// Graceful shutdown
export async function closePool(): Promise<void> {
    await pool.end();
    console.log('Database pool closed');
}
