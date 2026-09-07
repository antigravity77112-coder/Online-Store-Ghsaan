const { Client } = require('pg');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is missing in .env');
    process.exit(1);
  }

  const client = new Client({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    const sql = fs.readFileSync('schema_utf8.sql', 'utf8');
    console.log('Connecting to Supabase using pg driver...');
    await client.connect();
    console.log('Successfully connected!');
    
    console.log('Executing schema SQL statement by statement...');
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      try {
        await client.query(statement);
      } catch (err) {
        // Ignore "already exists" errors if we're retrying
        if (err.code === '42P07' || err.code === '42710') {
          console.log(`Skipping: ${statement.substring(0, 50)}... (Already exists)`);
        } else {
          console.error(`Error executing: ${statement.substring(0, 100)}...`);
          throw err;
        }
      }
    }
    console.log('Successfully executed schema SQL and created tables!');
  } catch (error) {
    console.error('Failed to apply schema:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
