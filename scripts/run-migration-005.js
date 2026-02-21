/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require('fs');
const path = require('path');

function parseEnvFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const env = {};
    const lines = content.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex === -1) continue;
        const key = trimmed.substring(0, eqIndex).trim();
        const value = trimmed.substring(eqIndex + 1).trim();
        // Remove surrounding quotes if present
        env[key] = value.replace(/^['"]|['"]$/g, '');
    }
    return env;
}

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
    console.error('File .env.local not found at:', envPath);
    process.exit(1);
}
const env = parseEnvFile(envPath);

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase environment variables.');
    console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
    process.exit(1);
}

async function executeSql(sql) {
    // Use Supabase REST API /pg/query endpoint
    const url = `${supabaseUrl}/pg/query`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
            query: sql
        })
    });
    
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
    }
    
    return response;
}

async function runMigration() {
    try {
        // Read SQL file
        const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '005_add_is_active_columns.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        // Split SQL into individual statements (simple split by semicolon)
        // Note: This is a naive approach, but works for our migration file
        const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
        

        let errorCount = 0;
        
        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i] + ';'; // Add back semicolon
            try {
                await executeSql(stmt);
                console.log(`Statement ${i + 1} executed successfully`);
            } catch (err) {
                console.error(`Error executing statement ${i + 1}:`, err.message);
                errorCount++;
            }
        }
        
        if (errorCount > 0) {
            console.error('Migration had errors.');
            process.exit(1);
        } else {
            console.log('Migration 005 completed successfully');
        }
    } catch (err) {
        console.error('Failed to run migration:', err);
        process.exit(1);
    }
}

runMigration();