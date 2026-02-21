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
        env[key] = value.replace(/^['"]|['"]$/g, '');
    }
    return env;
}

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
    process.exit(1);
}

async function executeSql(sql) {
    const endpoint = `${supabaseUrl}/pg/query`;
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`SQL execution failed (${response.status}): ${errorText}`);
    }

    console.log('SQL executed successfully');
    return response;
}

async function main() {
    try {
        console.log('Running migration 008: Tighten Public Tables RLS...');
        
        const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '008_tighten_public_tables.sql');
        if (!fs.existsSync(migrationPath)) {
            console.error('Migration file not found:', migrationPath);
            process.exit(1);
        }
        
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');
        console.log('Migration SQL loaded, executing...');
        
        await executeSql(migrationSql);
        
        console.log('✅ Migration 008 executed successfully!');
        
    } catch (err) {
        console.error('Failed to run migration:', err);
        process.exit(1);
    }
}

main();
