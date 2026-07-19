const { Pool } = require('pg');

let pool;

const initializeDatabase = async () => {
    try {
        if (!process.env.DATABASE_URL) {
            throw new Error('DATABASE_URL environment variable is required');
        }
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.DB_SSL === 'true'
                ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
                : false,
            max: parseInt(process.env.DB_POOL_MAX || '20'),
            min: parseInt(process.env.DB_POOL_MIN || '5'),
            idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
            connectionTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT || '5000'),
            statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '30000'),
        });

        // Test the connection
        const client = await pool.connect();
        console.log('✅ PostgreSQL connected successfully');
        client.release();

        return pool;
    } catch (error) {
        console.error('❌ PostgreSQL connection error:', error);
        throw error;
    }
};

const getPool = () => {
    if (!pool) {
        throw new Error('Database not initialized. Call initializeDatabase() first.');
    }
    return pool;
};

const SLOW_QUERY_THRESHOLD_MS = parseInt(process.env.SLOW_QUERY_THRESHOLD_MS || '500');

const query = async (text, params) => {
    try {
        const start = Date.now();
        const res = await pool.query(text, params);
        const duration = Date.now() - start;

        // Log slow queries in all environments
        if (duration > SLOW_QUERY_THRESHOLD_MS) {
            console.warn(`SLOW QUERY (${duration}ms):`, {
                query: text.substring(0, 200),
                duration,
                rows: res.rowCount
            });
        } else if (process.env.NODE_ENV === 'development') {
            console.log('Executed query:', { text: text.substring(0, 100), duration, rows: res.rowCount });
        }

        return res;
    } catch (error) {
        console.error('Database query error:', { query: text.substring(0, 200), error: error.message });
        throw error;
    }
};

const transaction = async (callback) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

module.exports = {
    initializeDatabase,
    getPool,
    query,
    transaction
};