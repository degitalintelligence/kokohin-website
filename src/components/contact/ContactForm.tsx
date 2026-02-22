'use client'

import { useActionState, useEffect, useMemo, useRef } from 'react'
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

            <button type="submit" className="btn btn-primary w-full py-3.5 text-base" disabled={isPending}>
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
