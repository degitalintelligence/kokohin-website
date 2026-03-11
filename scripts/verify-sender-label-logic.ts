
import { getGroupSenderLabel } from '../src/app/admin/whatsapp/utils/message';
import { Message } from '../src/app/admin/whatsapp/components/web-client/types';

// Mock Contact type based on src/app/admin/whatsapp/components/web-client/types.ts
type Contact = {
    id: string;
    wa_id: string;
    name: string | null;
    avatar_url: string | null;
    last_message_at: string | null;
    unread_count?: number | null;
    erp_project_status?: string | null;
    erp_project_id?: string | null;
    phone?: string | null;
    isGroup?: boolean;
};

// Mock Message type
// We need to cast our mock object to Message because we don't want to implement all fields
const createMockMessage = (overrides: Partial<Message>): Message => {
    return {
        id: 'msg-1',
        external_message_id: 'ext-1',
        chat_id: '120363043962630221@g.us',
        body: 'Hello',
        type: 'text',
        direction: 'inbound',
        sender_type: 'customer',
        status: 'read',
        sent_at: new Date().toISOString(),
        ...overrides
    } as Message;
};

console.log('--- Testing getGroupSenderLabel Logic ---');

// Case 1: Contact exists with name
const msgWithContact = createMockMessage({
    sender_contact: {
        id: 'c1',
        wa_id: '6281234567890@c.us',
        name: 'Budi Santoso',
        avatar_url: null,
        last_message_at: null
    }
});
console.log(`Case 1 (Contact Name): ${getGroupSenderLabel(msgWithContact)}`); // Expected: "Budi Santoso"

// Case 2: No contact, but has notifyName and author
const msgWithNotifyName = createMockMessage({
    sender_contact: null,
    raw_payload: {
        author: '6281234567890@c.us',
        notifyName: 'Budi'
    }
});
console.log(`Case 2 (Phone + NotifyName): ${getGroupSenderLabel(msgWithNotifyName)}`); // Expected: "+62 812-3456-7890 ~Budi"

// Case 3: No contact, has author, no notifyName
const msgWithoutNotifyName = createMockMessage({
    sender_contact: null,
    raw_payload: {
        author: '6281234567890@c.us',
        notifyName: null
    }
});
console.log(`Case 3 (Phone Only): ${getGroupSenderLabel(msgWithoutNotifyName)}`); // Expected: "+62 812-3456-7890"

// Case 4: Nested _data structure (common in WAHA webhooks)
const msgNestedData = createMockMessage({
    sender_contact: null,
    raw_payload: {
        _data: {
            author: '6285678901234@c.us',
            notifyName: 'Siti'
        }
    }
});
console.log(`Case 4 (Nested Data): ${getGroupSenderLabel(msgNestedData)}`); // Expected: "+62 856-7890-1234 ~Siti" (formatting depends on length)

// Case 5: International number
const msgInternational = createMockMessage({
    sender_contact: null,
    raw_payload: {
        author: '15551234567@c.us',
        notifyName: 'John Doe'
    }
});
console.log(`Case 5 (International): ${getGroupSenderLabel(msgInternational)}`); // Expected: "+15551234567 ~John Doe"
