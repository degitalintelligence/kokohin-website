'use client'

import React, { useState, useRef, useCallback } from 'react'
import { Upload, X, CheckCircle, Loader2, Trash2 } from 'lucide-react'
import Image from 'next/image'

interface ImageUploadProps {
  name: string
  defaultValue?: string | null
  onImageChange?: (file: File | null) => void
  maxSizeMB?: number
  maxWidth?: number
}

export default function ImageUpload({
  name,
  defaultValue,
  onImageChange,
  maxSizeMB = 2,
  maxWidth = 1200
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(defaultValue || null)
  const [isDragging, setIsDragging] = useState(false)
  const [isCompressing, setIsCompressing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [fileInfo, setFileInfo] = useState<{ name: string; size: string } | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const compressImage = useCallback(async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (event) => {
        const img = new window.Image()
        img.src = event.target?.result as string
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height

          // Calculate new dimensions
          if (width > maxWidth) {
            height = (maxWidth / width) * height
            width = maxWidth
          }

          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext('2d')
          if (!ctx) return reject(new Error('Canvas context not available'))

          ctx.drawImage(img, 0, 0, width, height)

          // Export as blob with quality reduction
          canvas.toBlob(
            (blob) => {
              if (!blob) return reject(new Error('Canvas toBlob failed'))
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              })
              resolve(compressedFile)
            },
            'image/jpeg',
            0.8 // 80% quality
          )
        }
        img.onerror = reject
      }
      reader.onerror = reject
    })
  }, [maxWidth])

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Hanya file gambar yang diperbolehkan')
      return
    }

    setError(null)
    setIsCompressing(true)
    setUploadProgress(10) // Start progress

    try {
      let processedFile = file
      
      // Compress if larger than maxSizeMB
      if (file.size > maxSizeMB * 1024 * 1024) {
        setUploadProgress(30)
        processedFile = await compressImage(file)
      }

      setUploadProgress(70)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
        setFileInfo({
          name: processedFile.name,
          size: formatSize(processedFile.size)
        })
        setIsCompressing(false)
        setUploadProgress(100)
        if (onImageChange) onImageChange(processedFile)
        
        // Reset progress after success
        setTimeout(() => setUploadProgress(0), 1000)
      }
      reader.readAsDataURL(processedFile)
    } catch (err) {
      console.error('Image processing error:', err)
      setError('Gagal memproses gambar. Silakan coba lagi.')
      setIsCompressing(false)
      setUploadProgress(0)
    }
  }, [compressImage, maxSizeMB, onImageChange])

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const onDragLeave = () => {
    setIsDragging(false)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleFile(files[0])
    }
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFile(files[0])
    }
  }

  const removeImage = () => {
    setPreview(null)
    setFileInfo(null)
    if (onImageChange) onImageChange(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider mb-1">
        Gambar Katalog
      </label>
      
      <div
        className={`relative border-2 border-dashed rounded-xl transition-all duration-200 overflow-hidden ${
          isDragging 
            ? 'border-[#E30613] bg-red-50' 
            : preview 
              ? 'border-gray-200 bg-white' 
              : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
        }`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <input
          type="file"
          name={name}
          ref={fileInputRef}
          onChange={onFileChange}
          accept="image/*"
          className="hidden"
        />

        {preview ? (
          <div className="group relative aspect-video w-full overflow-hidden">
            <Image
              src={preview}
              alt="Preview"
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              unoptimized
            />
            
            {/* Overlay Actions */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-3 bg-white rounded-full text-gray-800 hover:bg-gray-100 transition-colors shadow-lg"
                title="Ganti Gambar"
              >
                <Upload className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={removeImage}
                className="p-3 bg-white rounded-full text-red-600 hover:bg-red-50 transition-colors shadow-lg"
                title="Hapus Gambar"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            {/* Success Badge */}
            <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm border border-gray-100">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-gray-900 leading-none">Siap Upload</span>
                {fileInfo && (
                  <span className="text-[9px] text-gray-500 leading-tight">{fileInfo.size}</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div 
            className="flex flex-col items-center justify-center py-10 px-6 cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-14 h-14 rounded-full bg-[#E30613]/10 flex items-center justify-center mb-4 text-[#E30613]">
              <Upload className="w-7 h-7" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-gray-900 mb-1">Klik untuk upload atau tarik gambar ke sini</p>
              <p className="text-xs text-gray-500">Mendukung JPG, PNG, WEBP (Maks. {maxSizeMB}MB)</p>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {(isCompressing || uploadProgress > 0) && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
            <Loader2 className="w-10 h-10 text-[#E30613] animate-spin mb-3" />
            <p className="text-sm font-bold text-gray-900">
              {uploadProgress < 100 ? 'Mengoptimalkan Gambar...' : 'Selesai!'}
            </p>
            <div className="w-48 h-1.5 bg-gray-200 rounded-full mt-4 overflow-hidden">
              <div 
                className="h-full bg-[#E30613] transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs font-bold text-red-600 flex items-center gap-1.5 mt-1 animate-in slide-in-from-top-1">
          <X className="w-3.5 h-3.5" />
          {error}
        </p>
      )}

      {defaultValue && !preview && (
        <input type="hidden" name="current_image_url" value="" />
      )}
      {defaultValue && preview === defaultValue && (
        <input type="hidden" name="current_image_url" value={defaultValue} />
      )}
    </div>
  )
}
