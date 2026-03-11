import { Message } from '../components/web-client/types';

const formatPhoneNumber = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('62')) {
        // Format: +62 812-3456-7890
        // Takes 62, then next 3-4 digits, then next 4, then rest
        const part1 = digits.slice(2, 5); // 812
        const part2 = digits.slice(5, 9); // 3456
        const part3 = digits.slice(9);    // 7890
        return `+62 ${part1}-${part2}-${part3}`;
    }
    return `+${digits}`;
};

export const getGroupSenderLabel = (msg: Message) => {
    const raw = (msg as unknown as { raw_payload?: unknown }).raw_payload;
    const payload = raw as Record<string, unknown> || {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (payload._data as Record<string, any>) || {};

    const notifyName = typeof payload.notifyName === 'string' ? payload.notifyName : 
                       (typeof data.notifyName === 'string' ? data.notifyName : null);

    // 1. Check if sender contact is available (enriched from backend)
    if (msg.sender_contact) {
        if (msg.sender_contact.name) {
            return msg.sender_contact.name;
        }
        // If we have a phone number in the contact record (even if it's an LID JID, we might have patched the phone field)
        if (msg.sender_contact.phone) {
             const formattedPhone = formatPhoneNumber(msg.sender_contact.phone);
             if (notifyName && notifyName.trim()) {
                return `${formattedPhone} ~${notifyName.trim()}`;
             }
             return formattedPhone;
        }
    }

    // Prioritize author/participant for JID source in groups
    const author = typeof payload.author === 'string' ? payload.author : 
                   (typeof data.author === 'string' ? (data.author as string) : 
                   (typeof payload.participant === 'string' ? payload.participant : null));
                   
    const jidSource = author || null;

    if (jidSource) {
        // If we failed to match a contact but have a JID
        const localPart = String(jidSource).split('@')[0];
        
        // If it's an LID (starts with 2 and is long), we should try to avoid showing it if possible
        // But if we have no other info, we show it. 
        // Ideally the backend should have provided the contact with the real phone.
        const formattedPhone = formatPhoneNumber(localPart);
        
        if (notifyName && notifyName.trim()) {
            return `${formattedPhone} ~${notifyName.trim()}`;
        }
        return formattedPhone;
    }

    // Fallback if no JID found (should not happen for valid group messages)
    return notifyName || null;
};
