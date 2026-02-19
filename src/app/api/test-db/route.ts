import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Test connection by querying a simple table
    const { count: materialsCount, error } = await supabase
      .from('materials')
      .select('*', { count: 'exact', head: true })
    
    if (error) {
      // Table might not exist, check other tables
      const { count: zonesCount, error: zonesError } = await supabase
        .from('zones')
        .select('*', { count: 'exact', head: true })
      
      if (zonesError) {
        return NextResponse.json({
          status: 'error',
          message: 'Database tables not found. Migration may not have been applied.',
          details: {
            materials_error: error.message,
            zones_error: zonesError.message
          },
          suggestion: 'Run the migration file: supabase/migrations/002_mini_erp_schema.sql'
        }, { status: 404 })
      }
      
      return NextResponse.json({
        status: 'partial',
        message: 'Some tables exist, but materials table not found',
        zones_count: zonesCount || 0
      })
    }
    
    return NextResponse.json({
      status: 'success',
      message: 'Database migration applied successfully',
      materials_count: materialsCount || 0
    })
    
  } catch (error: unknown) {
    return NextResponse.json({
      status: 'error',
      message: 'Failed to connect to Supabase',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}