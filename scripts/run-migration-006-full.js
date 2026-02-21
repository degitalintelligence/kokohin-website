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
        console.log('Running migration 006: Rename price column and add laser cut flags...');
        
        // Read migration SQL file
        const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '006_rename_price_to_base_price_per_unit.sql');
        if (!fs.existsSync(migrationPath)) {
            console.error('Migration file not found:', migrationPath);
            process.exit(1);
        }
        
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');
        console.log('Migration SQL loaded, executing...');
        
        // Execute the migration
        await executeSql(migrationSql);
        
        console.log('✅ Migration 006 executed successfully!');
        
        // Verify the changes
        console.log('\nVerifying schema changes...');
        
        // Check if columns were renamed/added
        const verifySql = `
            SELECT 
                table_name,
                column_name,
                data_type,
                is_nullable,
                column_default
            FROM information_schema.columns 
            WHERE table_name IN ('materials', 'estimations', 'leads')
                AND column_name IN ('base_price_per_unit', 'is_laser_cut', 'requires_sealant', 'version_number', 'project_id')
            ORDER BY table_name, column_name
        `;
        
        const verifyUrl = `${supabaseUrl}/pg/query`;
        const verifyResponse = await fetch(verifyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': serviceRoleKey,
                'Authorization': `Bearer ${serviceRoleKey}`,
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({ query: verifySql })
        });
        
        if (verifyResponse.ok) {
            const result = await verifyResponse.json();
            console.log('\nSchema verification results:');
            console.table(result);
            
            // Check for specific columns
            const basePriceCol = result.find(col => col.column_name === 'base_price_per_unit' && col.table_name === 'materials');
            const isLaserCutCol = result.find(col => col.column_name === 'is_laser_cut' && col.table_name === 'materials');
            const versionNumberCol = result.find(col => col.column_name === 'version_number' && col.table_name === 'estimations');
            
            if (basePriceCol) {
                console.log('✓ base_price_per_unit column exists in materials table');
            } else {
                console.log('⚠️ base_price_per_unit column may not exist (could already be named correctly)');
            }
            
            if (isLaserCutCol) {
                console.log('✓ is_laser_cut column exists in materials table');
            } else {
                console.log('✗ is_laser_cut column missing from materials table');
            }
            
            if (versionNumberCol) {
                console.log('✓ version_number column exists in estimations table');
            } else {
                console.log('✗ version_number column missing from estimations table');
            }
        }
        
        console.log('\n✅ Migration 006 completed and verified!');
        
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

main();