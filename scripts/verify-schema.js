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
            'Prefer': 'return=representation'
        },
        body: JSON.stringify({
            query: sql
        })
    });
    
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
    }
    
    return response.json();
}

async function verifySchema() {
    try {
        console.log('Verifying database schema after migration...');
        
        // Check if is_active column exists in materials table
        const materialsCheck = await executeSql(`
            SELECT column_name, data_type, is_nullable, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'materials' AND column_name = 'is_active'
        `);
        
        if (materialsCheck.length > 0) {
            console.log('✓ is_active column found in materials table:', materialsCheck[0]);
        } else {
            console.error('✗ is_active column NOT found in materials table');
            return false;
        }
        
        // Check if is_active column exists in zones table
        const zonesCheck = await executeSql(`
            SELECT column_name, data_type, is_nullable, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'zones' AND column_name = 'is_active'
        `);
        
        if (zonesCheck.length > 0) {
            console.log('✓ is_active column found in zones table:', zonesCheck[0]);
        } else {
            console.error('✗ is_active column NOT found in zones table');
            return false;
        }
        
        // Check if is_active column exists in catalogs table
        const catalogsCheck = await executeSql(`
            SELECT column_name, data_type, is_nullable, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'catalogs' AND column_name = 'is_active'
        `);
        
        if (catalogsCheck.length > 0) {
            console.log('✓ is_active column found in catalogs table:', catalogsCheck[0]);
        } else {
            console.log('ℹ is_active column NOT found in catalogs table (optional, but expected)');
        }
        
        // Test query to fetch materials with is_active filter
        const testQuery = await executeSql(`
            SELECT id, name, is_active FROM materials LIMIT 5
        `);
        
        console.log('✓ Test query successful. Sample materials:', testQuery);
        
        console.log('\n✅ Schema verification completed successfully!');
        return true;
        
    } catch (err) {
        console.error('Failed to verify schema:', err);
        return false;
    }
}

verifySchema().then(success => {
    if (!success) {
        process.exit(1);
    }
});