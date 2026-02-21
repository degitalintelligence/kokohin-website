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
    // Note: This endpoint might be specific to the self-hosted setup or extension
    const url = `${supabaseUrl}/rest/v1/rpc/execute_sql`; 
    // Wait, if it's standard Supabase, we usually use RPC or just direct connection.
    // But the previous script used /pg/query. Let's stick to what worked if possible.
    // However, the previous script `run-migration.js` used `${supabaseUrl}/pg/query`.
    // Let's try that first.
    
    let endpoint = `${supabaseUrl}/pg/query`;
    
    // Check if we should use a different endpoint or method
    // If the previous script worked with /pg/query, we use it.
    
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
        console.log('Running migration 007: Tighten RLS policies...');
        
        // Read migration SQL file
        const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '007_tighten_rls_policies.sql');
        if (!fs.existsSync(migrationPath)) {
            console.error('Migration file not found:', migrationPath);
            process.exit(1);
        }
        
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');
        console.log('Migration SQL loaded, executing...');
        
        // Execute the migration
        await executeSql(migrationSql);
        
        console.log('✅ Migration 007 executed successfully!');
        
    } catch (err) {
        console.error('Failed to run migration:', err);
        process.exit(1);
    }
}

main();
