'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Contact } from './OptimizedWhatsAppClient';
import { X, Plus, Tag, StickyNote, User, Phone, MapPin, Briefcase } from 'lucide-react';
import { 
    addInternalNoteAction, 
    getInternalNotesAction, 
    getLabelsAction, 
    getChatLabelsAction, 
    assignLabelAction, 
    removeLabelAction 
} from '@/app/actions/whatsapp';
import { format } from 'date-fns';

interface ContactInfoProps {
    contact: Contact;
    onClose: () => void;
}

type Note = {
    id: string;
    note: string;
    created_at: string;
    agent_id: string;
};

type Label = {
    id: string;
    name: string;
    color: string;
    code: string;
};

type ChatLabel = {
    id: string;
    label_id: string;
    label: Label;
};

export default function ContactInfo({ contact, onClose }: ContactInfoProps) {
    const [activeTab, setActiveTab] = useState<'details' | 'notes'>('details');
    const [notes, setNotes] = useState<Note[]>([]);
    const [newNote, setNewNote] = useState('');
    const [loadingNotes, setLoadingNotes] = useState(false);
    const [labels, setLabels] = useState<Label[]>([]);
    const [chatLabels, setChatLabels] = useState<ChatLabel[]>([]);
    const [showLabelPicker, setShowLabelPicker] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const timeoutId = setTimeout(() => {
            (async () => {
                setLoadingNotes(true);

                const [notesRes, allLabelsRes, chatLabelsRes] = await Promise.all([
                    getInternalNotesAction(contact.id),
                    getLabelsAction(),
                    getChatLabelsAction(contact.id)
                ]);

                if (cancelled) {
                    return;
                }

                if (notesRes.success && notesRes.notes) {
                    setNotes(notesRes.notes);
                }
                setLoadingNotes(false);

                if (allLabelsRes.success && allLabelsRes.labels) {
                    setLabels(allLabelsRes.labels);
                }
                if (chatLabelsRes.success && chatLabelsRes.chatLabels) {
                    setChatLabels(chatLabelsRes.chatLabels);
                }
            })();
        }, 0);

        return () => {
            cancelled = true;
            clearTimeout(timeoutId);
        };
    }, [contact.id]);

    const handleAddNote = async () => {
        if (!newNote.trim()) return;
        
        const tempId = crypto.randomUUID();
        const optimisticNote: Note = {
            id: tempId,
            note: newNote,
            created_at: new Date().toISOString(),
            agent_id: 'current-user' 
        };
        setNotes([optimisticNote, ...notes]);
        setNewNote('');

        const result = await addInternalNoteAction(contact.id, optimisticNote.note);
        if (!result.success) {
            setNotes(prev => prev.filter(n => n.id !== tempId));
            alert('Gagal menyimpan catatan');
        } else {
            const refreshed = await getInternalNotesAction(contact.id);
            if (refreshed.success && refreshed.notes) {
                setNotes(refreshed.notes);
            }
        }
    };

    const handleToggleLabel = async (label: Label) => {
        const isAssigned = chatLabels.some(cl => cl.label_id === label.id);
        
        if (isAssigned) {
            setChatLabels(prev => prev.filter(cl => cl.label_id !== label.id));
            await removeLabelAction(contact.id, label.id);
        } else {
            const newChatLabel: ChatLabel = {
                id: crypto.randomUUID(),
                label_id: label.id,
                label: label
            };
            setChatLabels(prev => [...prev, newChatLabel]);
            await assignLabelAction(contact.id, label.id);
        }
    };

    return (
        <div className="w-full h-full bg-white flex flex-col font-sans antialiased overflow-hidden">
            {/* Header */}
            <div className="h-16 px-6 flex items-center justify-between border-b border-gray-100 shrink-0 bg-white/80 backdrop-blur-md sticky top-0 z-10">
                <h2 className="text-[#1D1D1B] font-black text-lg tracking-tight">Info Kontak</h2>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-[#E30613] transition-all">
                    <X size={20} strokeWidth={2.5} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {/* Profile Hero Section */}
                <div className="p-8 flex flex-col items-center bg-gradient-to-b from-gray-50/50 to-white border-b border-gray-100">
                    <div className="w-32 h-32 rounded-[2.5rem] overflow-hidden bg-gray-100 mb-6 border-4 border-white shadow-2xl transform hover:scale-105 transition-transform duration-500 relative">
                        {contact.avatar_url ? (
                            <Image
                                src={contact.avatar_url}
                                alt=""
                                fill
                                className="object-cover"
                                sizes="128px"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-200">
                                <User size={64} strokeWidth={1} />
                            </div>
                        )}
                    </div>
                    <h3 className="text-2xl font-black text-[#1D1D1B] text-center mb-1 tracking-tight">{contact.name || contact.wa_id.split('@')[0]}</h3>
                    <div className="flex items-center gap-2 text-gray-400 font-bold text-xs uppercase tracking-[0.1em] mb-6">
                        <Phone size={12} strokeWidth={3} />
                        {contact.wa_id.split('@')[0]}
                    </div>
                    
                    <div className="flex gap-8 w-full justify-center">
                         <div className="text-center group cursor-pointer">
                             <p className="text-[#E30613] font-black text-2xl group-hover:scale-110 transition-transform">{notes.length}</p>
                             <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Catatan</p>
                         </div>
                         <div className="text-center group cursor-pointer">
                             <p className="text-[#E30613] font-black text-2xl group-hover:scale-110 transition-transform">{chatLabels.length}</p>
                             <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Label</p>
                         </div>
                    </div>
                </div>

                {/* ERP / CRM Data Section */}
                <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-red-50 rounded-lg text-[#E30613]">
                            <Briefcase size={16} strokeWidth={2.5} />
                        </div>
                        <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Data Proyek ERP</h4>
                    </div>
                    
                    {contact.erp_project_id ? (
                        <div className="space-y-4">
                            <div className="bg-gray-50/50 p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status Proyek</p>
                                        <span className={`inline-flex px-3 py-1.5 rounded-xl text-xs font-black tracking-tight uppercase
                                            ${contact.erp_project_status === 'deal' ? 'bg-green-100 text-green-700' : 
                                              contact.erp_project_status === 'follow_up' ? 'bg-amber-100 text-amber-700' :
                                              'bg-gray-100 text-gray-700'}`}>
                                            {contact.erp_project_status || 'Dalam Proses'}
                                        </span>
                                    </div>
                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#E30613] shadow-sm">
                                        <Briefcase size={20} />
                                    </div>
                                </div>
                                <button className="w-full py-3 bg-white text-[11px] font-black text-[#E30613] border-2 border-[#E30613]/10 rounded-2xl hover:bg-[#E30613] hover:text-white transition-all duration-300 shadow-sm active:scale-95 uppercase tracking-widest">
                                    Buka Detail Proyek
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-50/50 rounded-3xl border border-dashed border-gray-200 p-8 text-center">
                            <p className="text-sm text-gray-400 font-bold mb-1">Belum Terintegrasi</p>
                            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Hubungkan dengan data ERP Kokohin</p>
                        </div>
                    )}
                </div>

                {/* Labels Section */}
                <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-amber-50 rounded-lg text-amber-500">
                                <Tag size={16} strokeWidth={2.5} />
                            </div>
                            <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Label Chat</h4>
                        </div>
                        <button 
                            onClick={() => setShowLabelPicker(!showLabelPicker)}
                            className={`p-2 rounded-xl transition-all ${showLabelPicker ? 'bg-[#E30613] text-white shadow-lg' : 'text-[#E30613] hover:bg-red-50'}`}
                        >
                            <Plus size={18} strokeWidth={3} />
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-2.5 mb-4">
                        {chatLabels.map(cl => (
                            <span 
                                key={cl.id} 
                                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black tracking-tight border shadow-sm animate-in zoom-in duration-300"
                                style={{ 
                                    backgroundColor: `${cl.label.color}10`, 
                                    color: cl.label.color,
                                    borderColor: `${cl.label.color}20` 
                                }}
                            >
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cl.label.color }} />
                                {cl.label.name}
                                <button 
                                    onClick={() => handleToggleLabel(cl.label)}
                                    className="hover:bg-black/10 rounded-lg p-0.5 transition-colors"
                                >
                                    <X size={12} strokeWidth={3} />
                                </button>
                            </span>
                        ))}
                        {chatLabels.length === 0 && !showLabelPicker && (
                            <div className="w-full py-4 text-center border-2 border-dashed border-gray-100 rounded-3xl">
                                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Belum ada label</p>
                            </div>
                        )}
                    </div>

                    {showLabelPicker && (
                        <div className="bg-gray-50/80 rounded-[2rem] border border-gray-100 p-4 animate-in fade-in slide-in-from-top-4 duration-500 overflow-hidden shadow-inner">
                            <div className="space-y-1.5 max-h-52 overflow-y-auto custom-scrollbar pr-1">
                                {labels.map(label => {
                                    const isSelected = chatLabels.some(cl => cl.label_id === label.id);
                                    return (
                                        <button
                                            key={label.id}
                                            onClick={() => handleToggleLabel(label)}
                                            className={`w-full text-left px-4 py-3 rounded-2xl text-sm flex items-center justify-between group transition-all duration-300
                                                ${isSelected ? 'bg-white shadow-md border border-gray-100 scale-[1.02]' : 'hover:bg-white/60 hover:shadow-sm border border-transparent'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-3.5 h-3.5 rounded-lg shadow-sm" style={{ backgroundColor: label.color }} />
                                                <span className={`font-bold tracking-tight ${isSelected ? 'text-[#1D1D1B]' : 'text-gray-500'}`}>
                                                    {label.name}
                                                </span>
                                            </div>
                                            {isSelected && <X size={14} strokeWidth={3} className="text-[#E30613]" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Internal Notes Section */}
                <div className="p-6 pb-20">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-500">
                            <StickyNote size={16} strokeWidth={2.5} />
                        </div>
                        <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Catatan Internal</h4>
                    </div>
                    
                    <div className="bg-gray-50/50 p-4 rounded-3xl border border-gray-100 mb-6 focus-within:ring-4 focus-within:ring-[#E30613]/5 focus-within:border-[#E30613]/30 focus-within:bg-white transition-all duration-500 shadow-inner group">
                        <textarea
                            placeholder="Tambahkan catatan khusus untuk kontak ini..."
                            className="w-full bg-transparent text-[14px] font-medium outline-none text-[#1D1D1B] min-h-[100px] resize-none placeholder-gray-300 leading-relaxed"
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                        />
                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                            <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest group-focus-within:text-gray-400 transition-colors">Internal Only</span>
                            <button 
                                onClick={handleAddNote}
                                disabled={!newNote.trim()}
                                className="px-5 py-2 bg-[#E30613] text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-[#c0000f] disabled:opacity-30 disabled:grayscale transition-all shadow-[0_4px_10px_rgba(227,6,19,0.2)] active:scale-95"
                            >
                                Simpan
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {loadingNotes ? (
                            <div className="flex flex-col items-center py-8 gap-3">
                                <div className="w-5 h-5 border-2 border-[#E30613] border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Memuat...</span>
                            </div>
                        ) : notes.length > 0 ? (
                            notes.map(note => (
                                <div key={note.id} className="bg-[#fdfdfd] p-5 rounded-3xl border border-gray-100 relative group hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4">
                                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <StickyNote size={14} className="text-gray-200" />
                                    </div>
                                    <p className="text-[14px] text-[#1D1D1B] font-medium whitespace-pre-wrap leading-relaxed mb-3 pr-4">{note.note}</p>
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-lg bg-gray-100 flex items-center justify-center">
                                            <User size={10} className="text-gray-400" />
                                        </div>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                            {format(new Date(note.created_at), 'dd MMM yyyy • HH:mm')}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12 border-2 border-dashed border-gray-50 rounded-[3rem]">
                                <StickyNote size={32} className="text-gray-100 mx-auto mb-3" strokeWidth={1} />
                                <p className="text-[11px] font-black text-gray-300 uppercase tracking-[0.2em]">Belum ada catatan</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
