'use client'

import { deleteCatalog } from '@/app/actions/catalogs'

export default function DeleteCatalogButton({ id }: { id: string }) {
  return (
    <form 
      action={deleteCatalog} 
      className="inline-block"
      onSubmit={(e) => { 
        if (!confirm('Yakin ingin menghapus katalog ini?')) {
          e.preventDefault() 
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">
        Hapus
      </button>
    </form>
  )
}