import pg from 'pg';
import bcrypt from 'bcryptjs';

const client = new pg.Client({
    user: 'postgres',
    password: 'postgres',
    host: 'db',
    port: 5432,
    database: 'pos_bodega'
});

async function run() {
    await client.connect();
    const hash = await bcrypt.hash('admin123', 10);
    await client.query("UPDATE users SET password = $1 WHERE username = 'admin'", [hash]);
    console.log('Password updated successfully');
    process.exit(0);
}

run();
