'use client'

import { useActionState, useEffect, useMemo, useRef, useState } from 'react'
import { submitLead, type LeadFormState } from '@/app/actions/leads'
import { AlertTriangle, Loader2, Send } from 'lucide-react'
import { toast } from '@/components/ui/toaster'

const initialState: LeadFormState = { success: false }

type ContactService = {
    id: string
    name: string
}

type ContactFormProps = {
    services?: ContactService[]
}

export default function ContactForm({ services = [] }: ContactFormProps) {
    const [state, formAction, isPending] = useActionState(submitLead, initialState)
    const formRef = useRef<HTMLFormElement>(null)
    const widgetRef = useRef<HTMLDivElement>(null)
    const [cfToken, setCfToken] = useState<string>('')
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null
    const serviceOptions = useMemo(() => {
        return [{ id: '', name: '-- Pilih Jenis Kanopi --' }, ...services]
    }, [services])

    useEffect(() => {
        if (state.success) formRef.current?.reset()
    }, [state.success])

    useEffect(() => {
        if (state.success) {
            toast.success('Permintaan penawaran berhasil dikirim!', state.message)
        }
        if (state.error) {
            toast.error('Gagal mengirim permintaan', state.error)
        }
    }, [state.success, state.error, state.message])

    useEffect(() => {
        const key = siteKey
        if (!key) return
        type TurnstileApi = { render: (el: HTMLElement, opts: { sitekey: string; callback?: (token: string) => void }) => void }
        const w = window as unknown as { turnstile?: TurnstileApi }
        const render = () => {
            if (!widgetRef.current || !w.turnstile) return
            w.turnstile.render(widgetRef.current, {
                sitekey: key,
                callback: (token: string) => setCfToken(token),
            })
        }
        if (w.turnstile) {
            render()
            return
        }
        const s = document.createElement('script')
        s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
        s.async = true
        s.defer = true
        s.onload = render
        document.head.appendChild(s)
        return () => {
            try { document.head.removeChild(s) } catch {}
        }
    }, [siteKey])

    return (
        <form ref={formRef} action={formAction} className="flex flex-col gap-5 animate-fade-in-up">
            {state.error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> {state.error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="mb-4">
                    <label className="label" htmlFor="name">Nama Lengkap *</label>
                    <input id="name" name="name" type="text" className="input" placeholder="Budi Santoso" required />
                </div>
                <div className="mb-4">
                    <label className="label" htmlFor="phone">Nomor HP / WA *</label>
                    <input id="phone" name="phone" type="tel" className="input" placeholder="08123456789" required />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="mb-4">
                    <label className="label" htmlFor="email">Email (opsional)</label>
                    <input id="email" name="email" type="email" className="input" placeholder="budi@email.com" />
                </div>
                <div className="mb-4">
                    <label className="label" htmlFor="location">Lokasi Pemasangan *</label>
                    <input id="location" name="location" type="text" className="input" placeholder="Jakarta Selatan" required />
                </div>
            </div>

            <div className="mb-4">
                <label className="label" htmlFor="service">Jenis Kanopi</label>
                <select id="service" name="service" className="input">
                    {serviceOptions.map(s => (
                        <option key={s.id || 'default'} value={s.id}>{s.name}</option>
                    ))}
                </select>
            </div>

            <div className="mb-4">
                <label className="label" htmlFor="message">Ceritakan Kebutuhan Anda</label>
                <textarea
                    id="message"
                    name="message"
                    className="input h-32 resize-y"
                    placeholder="Ukuran area, preferensi material, target anggaran, dll..."
                    rows={4}
                />
            </div>

            <input type="text" name="website" className="hidden" tabIndex={-1} aria-hidden="true" autoComplete="off" />
            {siteKey && (
                <div className="mb-2">
                    <div ref={widgetRef} />
                    <input type="hidden" name="cf-turnstile-response" value={cfToken} />
                </div>
            )}

            <button type="submit" className="btn btn-primary w-full py-3.5 text-base" disabled={isPending || (!!siteKey && !cfToken)}>
                {isPending ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" /> Mengirim...
                    </>
                ) : (
                    <>
                        <Send className="w-5 h-5" /> Kirim Permintaan Penawaran
                    </>
                )}
            </button>

            <p className="text-xs text-gray-500 text-center mt-2">
                * Dengan mengirim form ini, kami akan menghubungi Anda dalam 1×24 jam hari kerja.
            </p>
        </form>
    )
}
