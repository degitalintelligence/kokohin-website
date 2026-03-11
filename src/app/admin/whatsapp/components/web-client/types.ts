export type Contact = {
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

export type Message = {
    id: string;
    external_message_id: string;
    chat_id: string;
    body: string | null;
    type: string;
    direction: 'inbound' | 'outbound';
    sender_type: 'customer' | 'agent' | 'system';
    status: string;
    sent_at: string;
    quoted_message_id?: string | null;
    is_forwarded?: boolean | null;
    is_deleted?: boolean | null;
    mediaUrl?: string | null;
    mediaCaption?: string | null;
    raw_payload?: unknown;
    sender_contact?: Contact | null;
};

export type QuickReply = {
    id: string;
    title: string;
    body_template: string;
};

export type UploadingMedia = {
    id: string;
    fileName: string;
    mediaType: 'image' | 'document' | 'voice';
    status: 'uploading' | 'failed';
    previewUrl?: string;
    file?: File;
};
