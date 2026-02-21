'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Loader2, Save, Image as ImageIcon } from 'lucide-react'
import { updateLoginBackgroundUrl } from '@/app/actions/settings'
import { createClient } from '@/lib/supabase/client'

type BackgroundUploadFormProps = {
    currentBackgroundUrl: string | null
}

export default function BackgroundUploadForm({ currentBackgroundUrl }: BackgroundUploadFormProps) {
    const [backgroundUrl, setBackgroundUrl] = useState<string | null>(currentBackgroundUrl)
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
        const file = formData.get('background') as File

        if (!file || file.size === 0) {
            setMessage({ type: 'error', text: 'Pilih file gambar terlebih dahulu.' })
            setIsLoading(false)
            return
        }

        // Client-side validation: Max 50MB
        if (file.size > 50 * 1024 * 1024) {
            setMessage({ type: 'error', text: 'Ukuran file terlalu besar. Maksimal 50MB.' })
            setIsLoading(false)
            return
        }

        try {
            const supabase = createClient()
            const fileExt = file.name.split('.').pop()
            const fileName = `login-bg-${Date.now()}.${fileExt}`

            // Upload directly to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('settings')
                .upload(fileName, file, {
                    upsert: true
                })

            if (uploadError) {
                console.error('Error uploading background:', uploadError)
                setMessage({ type: 'error', text: 'Gagal mengupload gambar ke storage.' })
                setIsLoading(false)
                return
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('settings')
                .getPublicUrl(fileName)

            // Update database via Server Action
            const result = await updateLoginBackgroundUrl(publicUrl)
            
            if (result.error) {
                setMessage({ type: 'error', text: result.error })
            } else if (result.success) {
                setBackgroundUrl(publicUrl)
                setPreviewUrl(null)
                setMessage({ type: 'success', text: 'Background login berhasil diperbarui!' })
                
                const fileInput = document.getElementById('background-upload') as HTMLInputElement
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
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-2xl mt-8">
            <h3 className="text-lg font-bold mb-4">Background Halaman Login</h3>
            <p className="text-gray-500 mb-6 text-sm">
                Upload gambar background untuk halaman login admin.
                Format yang disarankan: JPG/PNG, resolusi 1920x1080px (Landscape).
            </p>

            <div className="flex flex-col md:flex-row gap-8 items-start">
                {/* Preview Area */}
                <div className="flex-shrink-0">
                    <p className="text-xs font-semibold text-gray-400 mb-2 uppercase">Preview Saat Ini</p>
                    <div className="w-64 h-36 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden relative">
                        {previewUrl ? (
                            <Image 
                                src={previewUrl} 
                                alt="New Background Preview" 
                                fill 
                                className="object-cover"
                            />
                        ) : backgroundUrl ? (
                            <Image 
                                src={backgroundUrl} 
                                alt="Current Background" 
                                fill 
                                className="object-cover"
                            />
                        ) : (
                            <div className="text-gray-300 text-center p-4">
                                <ImageIcon className="w-8 h-8 mx-auto mb-2" />
                                <span className="text-xs">Default Gradient</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Form Area */}
                <form onSubmit={handleSubmit} className="flex-grow w-full">
                    <div className="mb-4">
                        <label htmlFor="background-upload" className="block text-sm font-medium text-gray-700 mb-2">
                            Pilih File Gambar
                        </label>
                        <div className="relative">
                            <input
                                type="file"
                                id="background-upload"
                                name="background"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="block w-full text-sm text-gray-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-red-50 file:text-[#E30613]
                                hover:file:bg-red-100
                                cursor-pointer border border-gray-300 rounded-lg p-1"
                            />
                        </div>
                    </div>

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
                                Simpan Background
                            </>
                        )}
                    </button>

                    {message && (
                        <div className={`mt-4 p-3 rounded-lg text-sm font-medium text-center ${
                            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        }`}>
                            {message.text}
                        </div>
                    )}
                </form>
            </div>
        </div>
    )
}
