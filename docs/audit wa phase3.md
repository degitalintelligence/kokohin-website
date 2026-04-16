Phase 3: UI/UX Critical Fixes & Real-time Synchronization

Target Audience: Frontend / Fullstack Developer
Objective: Resolve "Dead UI" issues where Real-time sync, Media rendering, Search, and Emoji functions fail to respond.

🚨 1. Real-time Chat & List Nggak Sinkron (Chat Baru Nggak Naik ke Atas)

Penyebab: Di WhatsAppWebClient.tsx, listener Supabase lo mungkin berhasil nangkep pesan baru, tapi lo cuma nge-push pesannya ke dalam ruang chat yang sedang aktif. Lo lupa bikin logic buat memanipulasi array contacts/chatList di Sidebar (ngubah last_message_at, nambah unread_count, dan nge-sort ulang list supaya chat terbaru naik ke posisi #1).

Action (Full Function - Copas ke Realtime Hook/Effect lo):
Implementasikan fungsi ini di dalam handler Supabase Realtime lo.

// Fungsi ini dieksekusi saat Supabase Realtime menerima payload INSERT di 'wa_messages'
const handleNewMessageRealtime = (payload: any) => {
    const newMessage = payload.new;

    // 1. Update ruang chat jika sedang dibuka
    if (activeChatId === newMessage.chat_id) {
        setMessages((prev) => [...prev, newMessage]);
        // Opsional: Langsung panggil fungsi markAsRead() ke backend di sini
    }

    // 2. Manipulasi list kontak di Sidebar (KUNCI AGAR CHAT NAIK KE ATAS)
    setContacts((prevContacts) => {
        const chatExists = prevContacts.find(c => c.id === newMessage.chat_id);
        
        // Buat list baru dengan mengupdate kontak yang menerima pesan
        const updatedContacts = prevContacts.map(contact => {
            if (contact.id === newMessage.chat_id) {
                return {
                    ...contact,
                    last_message_at: newMessage.sent_at,
                    unread_count: activeChatId === newMessage.chat_id 
                        ? contact.unread_count // Jika sedang dibuka, unread tidak nambah
                        : (contact.unread_count || 0) + 1,
                    last_message_preview: newMessage.body || '📷 Media'
                };
            }
            return contact;
        });

        // Sort ulang: Yang last_message_at nya paling baru naik ke posisi 0
        return updatedContacts.sort((a, b) => 
            new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime()
        );
    });
};


🖼️ 2. Gambar, File & Media Nggak Tampil

Penyebab:
Di komponen MessageBubble.tsx, rendering logic-nya pasti naif (cuma ada <div>{message.body}</div>). Komponen nggak ngecek message.type (image/audio/document).

Action (Full Function - Replace komponen MessageBubble lo):

export default function MessageBubble({ message, isOwn }: { message: any, isOwn: boolean }) {
    // Fungsi bantuan untuk render media berdasarkan tipe
    const renderMedia = () => {
        if (!message.media_url) return null; // Fallback jika tidak ada media
        
        switch (message.type) {
            case 'image':
                return (
                    <div className="mb-2 relative w-full max-w-[250px] rounded-lg overflow-hidden">
                        {/* Wajib pakai tag img standar untuk menghindari error Next.js Config Domain */}
                        <img 
                            src={message.media_url} 
                            alt="Media" 
                            className="w-full h-auto object-cover"
                            onError={(e) => (e.currentTarget.src = '/placeholder-image.png')}
                        />
                    </div>
                );
            case 'video':
                return (
                    <video controls className="mb-2 w-full max-w-[250px] rounded-lg">
                        <source src={message.media_url} type="video/mp4" />
                    </video>
                );
            case 'audio':
            case 'ptt': // Voice note
                return (
                    <audio controls className="mb-2 max-w-[250px]">
                        <source src={message.media_url} type="audio/mpeg" />
                    </audio>
                );
            case 'document':
                return (
                    <a 
                        href={message.media_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="mb-2 flex items-center p-3 bg-black/10 rounded-lg text-sm hover:bg-black/20 transition"
                    >
                        📄 Download File / Dokumen
                    </a>
                );
            default:
                return null; // Jika text murni
        }
    };

    return (
        <div className={`flex flex-col w-full mb-4 ${isOwn ? 'items-end' : 'items-start'}`}>
            <div className={`relative px-4 py-2 max-w-[75%] rounded-2xl shadow-sm ${
                isOwn ? 'bg-green-100 text-slate-800 rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
            }`}>
                {renderMedia()}
                <span className="whitespace-pre-wrap break-words text-[15px]">
                    {message.body}
                </span>
                <div className="text-[10px] text-slate-400 text-right mt-1 min-w-[50px]">
                    {new Date(message.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>
        </div>
    );
}


👤 3. Profile Photo (Avatar) Nggak Muncul

Penyebab:
Ada dua kemungkinan: (1) Lo pakai <Image> dari Next.js tapi lupa masukin URL WhatsApp (pps.whatsapp.net) ke next.config.js. (2) Link fotonya rusak/null tapi lo nggak ngasih onError fallback.

Action (Code Replacement di komponen Sidebar/ContactList):
Jangan pakai komponen <Image> Next.js untuk foto profil dinamis dari eksternal, gunakan <img /> biasa dengan fallback UI.

// GANTI CARA LO NGERENDER AVATAR MENJADI SEPERTI INI (Full Function/Component Item):
export function ContactListItem({ contact, isActive, onClick }: any) {
    return (
        <div 
            onClick={() => onClick(contact.id)}
            className={`flex items-center p-3 cursor-pointer border-b border-slate-50 transition-colors ${isActive ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
        >
            <div className="relative flex-shrink-0 w-12 h-12 rounded-full overflow-hidden bg-slate-200 border border-slate-300">
                <img 
                    src={contact.avatar_url || '[https://ui-avatars.com/api/?name=](https://ui-avatars.com/api/?name=)' + encodeURIComponent(contact.name || 'User') + '&background=e2e8f0&color=475569'} 
                    alt={contact.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        // Fallback aman kalau gambar dari WA gagal di-load
                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name || 'U')}&background=e2e8f0&color=475569`;
                    }}
                />
                {contact.unread_count > 0 && (
                    <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>
                )}
            </div>
            
            <div className="ml-4 flex-1 overflow-hidden">
                <div className="flex justify-between items-center mb-1">
                    <h4 className="text-sm font-semibold text-slate-800 truncate">{contact.name || contact.phone}</h4>
                    <span className="text-xs text-slate-400">
                        {contact.last_message_at ? new Date(contact.last_message_at).toLocaleDateString() : ''}
                    </span>
                </div>
                <p className="text-xs text-slate-500 truncate">{contact.last_message_preview || 'Mulai percakapan'}</p>
            </div>
        </div>
    );
}


🔍 4. Filter, Search & Emoji Mati

Penyebab (Search): Lo punya state search, tapi waktu nge-render .map() kontak, lo pake array contacts mentahan aslinya, bukan array yang udah difilter.
Penyebab (Emoji): Di komponen ChatInput.tsx, event onClick dari Emoji Picker ketutup z-index, atau nggak digabungin ke string sebelumnya.

Action (Full Function - Cara render derived state untuk Search):
Posisikan blok kode ini TEPAT SEBELUM return pada komponen Sidebar lo:

// Di dalam komponen ContactList/Sidebar lo:

// 1. Buat derived state (jangan ubah array asli)
const filteredContacts = contacts.filter((contact) => {
    if (!searchQuery) return true;
    const lowerQuery = searchQuery.toLowerCase();
    return (
        (contact.name && contact.name.toLowerCase().includes(lowerQuery)) ||
        (contact.phone && contact.phone.toLowerCase().includes(lowerQuery))
    );
});

// 2. Di dalam return JSX, render FILTERED CONTACTS, bukan contacts asli:
// {filteredContacts.map(contact => ( ... ))}


Action (Full Function - Logic Input & Emoji di ChatInput.tsx):

export default function ChatInput({ onSendMessage }: { onSendMessage: (msg: string) => void }) {
    const [message, setMessage] = useState('');
    const [showEmoji, setShowEmoji] = useState(false);

    // FIX: Fungsi ini yang sering typo/hilang saat append emoji
    const handleEmojiSelect = (emojiData: any) => {
        setMessage((prev) => prev + emojiData.native); // Tambahkan emoji ke string terakhir
    };

    const handleSend = () => {
        if (!message.trim()) return;
        onSendMessage(message.trim());
        setMessage('');
        setShowEmoji(false); // Tutup picker setelah kirim
    };

    return (
        <div className="relative p-4 bg-slate-50 border-t border-slate-200 flex items-end gap-2">
            {/* FIX: Z-Index harus tinggi dan absolute */}
            {showEmoji && (
                <div className="absolute bottom-20 left-4 z-50 shadow-xl rounded-xl">
                    {/* Taruh komponen EmojiPicker library lo di sini */}
                    <Picker onEmojiSelect={handleEmojiSelect} theme="light" />
                </div>
            )}

            <button 
                type="button"
                onClick={() => setShowEmoji(!showEmoji)}
                className="p-3 text-slate-400 hover:text-slate-600 transition"
            >
                😀
            </button>

            <textarea 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                    }
                }}
                placeholder="Ketik pesan (Shift+Enter untuk baris baru)..."
                className="flex-1 max-h-32 min-h-[44px] p-3 rounded-xl border border-slate-300 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 resize-none"
                rows={1}
            />

            <button 
                onClick={handleSend}
                disabled={!message.trim()}
                className="p-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 transition"
            >
                Kirim
            </button>
        </div>
    );
}
