'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { toast } from '@/components/ui/toaster'
import { cn } from '@/lib/utils'

interface LoginFormProps {
    backgroundUrl: string | null
    logoUrl: string | null
}

export default function LoginForm({ backgroundUrl, logoUrl }: LoginFormProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [connectionTested, setConnectionTested] = useState(false)
    const [supabaseAvailable, setSupabaseAvailable] = useState(true)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        // Tampilkan error dari URL param (misal dari auth/callback)
        const urlError = searchParams?.get('error')
        if (urlError === 'auth_callback_failed') {
            setError('Autentikasi via callback gagal. Coba login manual.')
        }
    }, [searchParams])

    useEffect(() => {
        if (error) {
            toast.error('Gagal masuk', error)
        }
    }, [error])

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        const checkSupabaseConnection = async () => {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
            if (!supabaseUrl) {
                setSupabaseAvailable(false)
                setConnectionTested(true)
                return
            }

            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 5000)

            try {
                // Try to fetch Supabase Auth health endpoint (critical for login)
                const authResponse = await fetch(`${supabaseUrl}/auth/v1/health`, {
                    method: 'GET',
                    headers: {
                        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
                    },
                    signal: controller.signal
                })

                const status = authResponse.status
                // Jika status < 500 (termasuk 401 Unauthorized), anggap service berjalan
                // 404 = endpoint tidak ditemukan (service mungkin tidak berjalan)
                // 0, 5xx = network error atau server error
                if (status >= 200 && status < 500) {
                    setSupabaseAvailable(true)
                } else {
                    setSupabaseAvailable(false)
                }
            } catch {
                // Log removed for performance
                setSupabaseAvailable(false)
            } finally {
                clearTimeout(timeoutId)
                setConnectionTested(true)
            }
        }
        checkSupabaseConnection()
    }, [])


    async function handleLogin(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError('')

        const normalizedEmail = email.trim().toLowerCase()
        const normalizedPassword = password.trim()

        if (!normalizedEmail || !normalizedPassword) {
            setError('Email dan password wajib diisi.')
            setLoading(false)
            return
        }


        const supabase = createClient()
        const { error: authErr } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password: normalizedPassword,
        })

        if (authErr) {
            const rawMessage = authErr.message.toLowerCase()
            if (rawMessage.includes('invalid login credentials') || rawMessage.includes('invalid authentication credentials')) {
                setError('Email atau password salah.')
            } else if (rawMessage.includes('email not confirmed')) {
                setError('Email belum terkonfirmasi. Konfirmasi di Supabase Auth atau aktifkan SMTP.')
            } else if (rawMessage.includes('invalid email')) {
                setError('Format email tidak valid.')
            } else if (rawMessage.includes('user not found')) {
                setError('User tidak ditemukan.')
            } else if (rawMessage.includes('fetch') || rawMessage.includes('network') || rawMessage.includes('failed')) {
                setError('Koneksi ke Supabase gagal. Periksa: 1) Koneksi internet, 2) URL Supabase di .env.local, 3) Supabase service sedang berjalan.')
                setSupabaseAvailable(false)
            } else {
                setError(`Gagal login: ${authErr.message}`)
            }
            setLoading(false)
            return
        }

        router.replace('/admin')
        router.refresh()
    }

    // Determine background style
    const containerClasses = backgroundUrl 
        ? "relative overflow-hidden min-h-[100svh] flex items-center justify-center p-6 bg-gray-900"
        : "relative overflow-hidden min-h-[100svh] flex items-center justify-center p-6 bg-gradient-to-br from-[#1D1D1B] to-[#E30613]"

    return (
        <div className={cn(containerClasses, mounted && "animate-slide-in-right")} >
            {backgroundUrl && (
                <div className="absolute inset-0 z-0">
                    <Image 
                        src={backgroundUrl}
                        alt="Background"
                        fill
                        className="object-cover"
                        sizes="100vw"
                        quality={60}
                        priority
                    />
                    <div className="absolute inset-0 bg-black/40" />
                </div>
            )}

            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 md:p-10 z-10 relative">
                <div className="flex justify-center mb-6">
                    {logoUrl ? (
                        <div className="relative w-32 h-16">
                            <Image
                                src={logoUrl}
                                alt="Kokohin Logo"
                                fill
                                className="object-contain"
                                quality={75}
                                priority
                            />
                        </div>
                    ) : (
                        <div className="text-5xl text-[#E30613] font-bold font-['Montserrat']">K</div>
                    )}
                </div>
                <h1 className="text-2xl font-bold text-center mb-2 text-[#1D1D1B] font-['Montserrat']">Login</h1>
                <p className="text-gray-500 text-center mb-8 text-sm">Masuk ke dashboard admin</p>

                {!supabaseAvailable && connectionTested && (
                    <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-yellow-800 text-sm font-medium">Supabase tidak dapat dijangkau</p>
                        <p className="text-yellow-700 text-xs mt-1">Periksa koneksi internet, URL di .env.local, atau pastikan Supabase service berjalan.</p>
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-red-700 text-sm">{error}</p>
                        </div>
                    )}

                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E30613] focus:border-transparent outline-none transition"
                            placeholder="admin@kokohin.com"
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E30613] focus:border-transparent outline-none transition"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 px-4 bg-[#E30613] text-white font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E30613] disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center"
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Memproses...
                            </>
                        ) : (
                            'Masuk →'
                        )}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-gray-200 text-center">
                    <p className="text-xs text-gray-500">
                        &copy; {new Date().getFullYear()} Kokohin. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    )
}
