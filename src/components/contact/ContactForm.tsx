'use client'

import { useActionState, useEffect, useRef } from 'react'
import { submitLead, type LeadFormState } from '@/app/actions/leads'
import styles from './ContactForm.module.css'

const SERVICES = [
    { id: '', label: '-- Pilih Jenis Kanopi --' },
    { id: 'baja-ringan', label: 'Kanopi Baja Ringan' },
    { id: 'polycarbonate', label: 'Kanopi Polycarbonate' },
    { id: 'kaca', label: 'Kanopi Kaca' },
    { id: 'spandek', label: 'Kanopi Spandek' },
    { id: 'membrane', label: 'Kanopi Membrane' },
    { id: 'pergola', label: 'Pergola & Carport' },
]

const initialState: LeadFormState = { success: false }

export default function ContactForm() {
    const [state, formAction, isPending] = useActionState(submitLead, initialState)
    const formRef = useRef<HTMLFormElement>(null)

    useEffect(() => {
        if (state.success) formRef.current?.reset()
    }, [state.success])

    return (
        <form ref={formRef} action={formAction} className={styles.form}>
            {state.error && (
                <div className={styles.alertError}>⚠️ {state.error}</div>
            )}
            {state.success && (
                <div className={styles.alertSuccess}>✅ {state.message}</div>
            )}

            <div className={styles.row}>
                <div className="form-group">
                    <label className="form-label" htmlFor="name">Nama Lengkap *</label>
                    <input id="name" name="name" type="text" className="form-input" placeholder="Budi Santoso" required />
                </div>
                <div className="form-group">
                    <label className="form-label" htmlFor="phone">Nomor HP / WA *</label>
                    <input id="phone" name="phone" type="tel" className="form-input" placeholder="08123456789" required />
                </div>
            </div>

            <div className={styles.row}>
                <div className="form-group">
                    <label className="form-label" htmlFor="email">Email (opsional)</label>
                    <input id="email" name="email" type="email" className="form-input" placeholder="budi@email.com" />
                </div>
                <div className="form-group">
                    <label className="form-label" htmlFor="location">Lokasi Pemasangan *</label>
                    <input id="location" name="location" type="text" className="form-input" placeholder="Jakarta Selatan" required />
                </div>
            </div>

            <div className="form-group">
                <label className="form-label" htmlFor="service">Jenis Kanopi</label>
                <select id="service" name="service" className="form-select">
                    {SERVICES.map(s => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                </select>
            </div>

            <div className="form-group">
                <label className="form-label" htmlFor="message">Ceritakan Kebutuhan Anda</label>
                <textarea
                    id="message"
                    name="message"
                    className="form-textarea"
                    placeholder="Ukuran area, preferensi material, target anggaran, dll..."
                    rows={4}
                />
            </div>

            <button type="submit" className={`btn btn-primary ${styles.submitBtn}`} disabled={isPending}>
                {isPending ? '⏳ Mengirim...' : '🚀 Kirim Permintaan Penawaran'}
            </button>

            <p className={styles.note}>
                * Dengan mengirim form ini, kami akan menghubungi Anda dalam 1×24 jam hari kerja.
            </p>
        </form>
    )
}
