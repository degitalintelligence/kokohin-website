'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Upload, Loader2, Save } from 'lucide-react'
import { updateLogoUrl } from '@/app/actions/settings'
import { createClient } from '@/lib/supabase/client'

type LogoUploadFormProps = {
    currentLogoUrl: string | null
}

export default function LogoUploadForm({ currentLogoUrl }: LogoUploadFormProps) {
    const [logoUrl, setLogoUrl] = useState<string | null>(currentLogoUrl)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setPreviewUrl(URL.createObjectURL(file))
        }
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsLoading(true)
        setMessage(null)

        const formData = new FormData(e.currentTarget)
        const file = formData.get('logo') as File

        if (!file || file.size === 0) {
            setMessage({ type: 'error', text: 'Pilih file gambar terlebih dahulu.' })
            setIsLoading(false)
            return
        }

        // Client-side validation: Max 10MB
        if (file.size > 10 * 1024 * 1024) {
            setMessage({ type: 'error', text: 'Ukuran logo terlalu besar. Maksimal 10MB.' })
            setIsLoading(false)
            return
        }

        try {
            const supabase = createClient()
            const fileExt = file.name.split('.').pop()
            const fileName = `logo-${Date.now()}.${fileExt}`

            // Upload directly to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('settings')
                .upload(fileName, file, {
                    upsert: true
                })

            if (uploadError) {
                console.error('Error uploading logo:', uploadError)
                setMessage({ type: 'error', text: 'Gagal mengupload logo ke storage.' })
                setIsLoading(false)
                return
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('settings')
                .getPublicUrl(fileName)

            // Update database via Server Action
            const result = await updateLogoUrl(publicUrl)
            
            if (result.error) {
                setMessage({ type: 'error', text: result.error })
            } else if (result.success) {
                setLogoUrl(publicUrl)
                setPreviewUrl(null)
                setMessage({ type: 'success', text: 'Logo berhasil diperbarui!' })
                
                const fileInput = document.getElementById('logo-upload') as HTMLInputElement
                if (fileInput) fileInput.value = ''
            }
        } catch (err) {
            console.error(err)
            setMessage({ type: 'error', text: 'Terjadi kesalahan saat upload.' })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-2xl">
            <h3 className="text-lg font-bold mb-4">Logo Website</h3>
            <p className="text-gray-500 mb-6 text-sm">
                Upload logo baru untuk mengganti logo yang tampil di Navbar dan Footer.
                Format yang disarankan: PNG transparan, rasio 1:1 atau landscape, minimal 200px.
            </p>

            <div className="flex flex-col md:flex-row gap-8 items-start">
                {/* Preview Area */}
                <div className="flex-shrink-0">
                    <p className="text-xs font-semibold text-gray-400 mb-2 uppercase">Preview Saat Ini</p>
                    <div className="w-40 h-40 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden relative">
                        {previewUrl ? (
                            <Image 
                                src={previewUrl} 
                                alt="New Logo Preview" 
                                fill 
                                className="object-contain p-4"
                            />
                        ) : logoUrl ? (
                            <Image 
                                src={logoUrl} 
                                alt="Current Logo" 
                                fill 
                                className="object-contain p-4"
                            />
                        ) : (
                            <div className="text-gray-300 text-center p-4">
                                <Upload className="w-8 h-8 mx-auto mb-2" />
                                <span className="text-xs">Belum ada logo</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Form Area */}
                <form onSubmit={handleSubmit} className="flex-grow w-full">
                    <div className="mb-4">
                        <label htmlFor="logo-upload" className="block text-sm font-medium text-gray-700 mb-2">
                            Pilih File Gambar
                        </label>
                        <input
                            id="logo-upload"
                            name="logo"
                            type="file"
                            accept="image/png, image/jpeg, image/webp, image/svg+xml"
                            onChange={handleFileChange}
                            className="block w-full text-sm text-gray-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-primary/10 file:text-primary
                                hover:file:bg-primary/20
                                cursor-pointer"
                        />
                    </div>

                    {message && (
                        <div className={`p-3 rounded-lg text-sm mb-4 ${
                            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        }`}>
                            {message.text}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="btn btn-primary w-full flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Mengupload...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Simpan Logo
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}
