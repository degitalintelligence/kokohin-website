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
        body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`SQL execution failed (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    return result;
}

async function main() {
    try {
        console.log('Checking columns in materials table...');
        
        const columnsResult = await executeSql(`
            SELECT column_name, data_type, is_nullable, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'materials' 
            ORDER BY ordinal_position
        `);
        
        console.log('Columns in materials table:');
        console.table(columnsResult);
        
        // Check for price vs base_price_per_unit
        const priceCol = columnsResult.find(col => col.column_name === 'price');
        const basePriceCol = columnsResult.find(col => col.column_name === 'base_price_per_unit');
        
        console.log('\n--- Analysis ---');
        if (priceCol) {
            console.log(`✓ Found column 'price': ${priceCol.data_type} ${priceCol.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
        }
        if (basePriceCol) {
            console.log(`✓ Found column 'base_price_per_unit': ${basePriceCol.data_type} ${basePriceCol.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
        }
        if (!priceCol && !basePriceCol) {
            console.log('✗ Neither price nor base_price_per_unit column found!');
        }
        
        // Check for code column
        const codeCol = columnsResult.find(col => col.column_name === 'code');
        if (codeCol) {
            console.log(`✓ Found column 'code': ${codeCol.data_type}, unique constraint should exist`);
        } else {
            console.log('✗ Column code not found!');
        }
        
        // Check for is_active column
        const isActiveCol = columnsResult.find(col => col.column_name === 'is_active');
        if (isActiveCol) {
            console.log(`✓ Found column 'is_active': ${isActiveCol.data_type}, default = ${isActiveCol.column_default}`);
        } else {
            console.log('✗ Column is_active not found!');
        }
        
    } catch (err) {
        console.error('Failed to check columns:', err);
        process.exit(1);
    }
}

main();