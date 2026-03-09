# Spesifikasi Teknis WhatsApp CRM Terintegrasi

Dokumen ini menjadi acuan resmi pengembangan sistem WhatsApp CRM terintegrasi untuk Admin ERP Kokohin (Kontraktor) dengan standar best practice kelas WhatsApp Business API.

## 1. Tujuan dan Ruang Lingkup

- Menyediakan platform komunikasi WhatsApp untuk kebutuhan operasional kontraktor: akuisisi lead, follow up proyek, update progres, hingga maintenance.
- Menyatukan data percakapan dengan modul ERP (proyek, keuangan, inventory) agar setiap interaksi customer berbasis konteks bisnis aktual.
- Menjamin pengalaman pengguna mirip WhatsApp asli dengan target loading maksimal 2 detik untuk setiap aksi utama.

## 2. Prinsip Arsitektur

- Core engine WhatsApp menggunakan WAHA (WhatsApp HTTP API).
- Arsitektur modular, event-driven, dan terpisah antara jalur real-time, jalur API, dan jalur asynchronous worker.
- Semua operasi chat critical memiliki idempotency, retry policy, audit trail, dan observability.

## 3. Arsitektur Sistem End-to-End

### 3.1 Komponen Utama

- WAHA Gateway Service
  - Manajemen session WhatsApp.
  - Pengiriman pesan outbound.
  - Penerimaan event inbound melalui webhook.
- WhatsApp CRM API Service
  - RESTful API untuk chat, CRM, assignment, broadcast, automation.
  - Otorisasi RBAC.
  - Validasi business rules.
- Realtime Gateway (WebSocket)
  - Push event chat secara real-time ke UI admin.
  - Typing, presence, status delivery/read, assignment update.
- Queue + Worker Service
  - Broadcast scheduling.
  - Auto-reply keyword.
  - Retry pengiriman.
  - Sinkronisasi ERP-triggered notification.
- Data Layer
  - PostgreSQL (relasional utama).
  - Redis (cache, rate limit, pub/sub, ephemeral state).
  - Object storage (S3-compatible) untuk media.
- ERP Integration Service
  - Sinkronisasi customer/proyek dari ERP.
  - Trigger notifikasi milestone ke WhatsApp.
  - API integration untuk modul keuangan dan inventory.

### 3.2 Alur Data

- Inbound
  - Customer -> WhatsApp -> WAHA -> Webhook Ingestor -> Queue -> DB -> WebSocket -> Admin UI.
- Outbound
  - Admin UI -> CRM API -> Queue -> WAHA Send -> WAHA Callback Status -> DB Update -> WebSocket.
- ERP Trigger
  - ERP Event -> Integration Service -> Queue -> Message Composer -> WAHA Send.

### 3.3 Non-Functional SLA

- REST API p95 < 200ms untuk operasi chat non-upload.
- WebSocket event fanout p95 < 100ms.
- Time-to-interactive halaman chat < 2 detik.

## 4. Desain Database Relasional

### 4.1 Entitas Inti

- `wa_sessions`
  - id, session_name, status, qr_state, health_meta, last_connected_at, created_at, updated_at
- `wa_contacts`
  - id, wa_jid (unique), phone, display_name, avatar_url, region, timezone, last_message_at
- `wa_chats`
  - id, contact_id, type (individual/group), unread_count, pinned, archived, assigned_agent_id, last_message_at
- `wa_messages`
  - id (uuid), chat_id, external_message_id (unique), direction (inbound/outbound), sender_type, type, body, quoted_message_id, is_forwarded, is_deleted, sent_at, delivered_at, read_at, raw_payload (jsonb)
- `wa_message_media`
  - id, message_id, media_type, mime_type, size_bytes, storage_key, thumbnail_key, checksum_sha256
- `wa_message_status_log`
  - id, message_id, status (sent/delivered/read/failed), occurred_at, source

### 4.2 Entitas CRM

- `crm_customers`
  - id, contact_id, project_name, contract_value, project_status, erp_customer_id, erp_project_id
- `wa_labels`
  - id, code, name, color, is_system
- `wa_chat_labels`
  - id, chat_id, label_id, created_by, created_at
- `wa_quick_replies`
  - id, code, title, body_template, variables_json, is_active
- `wa_internal_notes`
  - id, chat_id, agent_id, note, created_at, updated_at
- `wa_broadcast_campaigns`
  - id, name, segment_filter_json, schedule_at, timezone, status, created_by
- `wa_broadcast_recipients`
  - id, campaign_id, chat_id, status, sent_at, delivered_at, read_at
- `wa_assignment_rules`
  - id, mode (round_robin/skill_based), config_json, is_active
- `wa_agent_skills`
  - id, agent_id, skill_code, score
- `audit_logs`
  - id, actor_id, action, entity_type, entity_id, before_json, after_json, ip_address, user_agent, created_at

### 4.3 Indexing dan Optimasi

- Index: `wa_messages(chat_id, sent_at desc)`.
- Unique: `wa_messages(external_message_id)`.
- Index: `wa_chats(last_message_at desc)`.
- Unique: `wa_contacts(wa_jid)`.
- GIN index: `wa_messages(raw_payload)`.
- Partitioning opsional untuk `wa_messages` per bulan saat volume > 10 juta record.

## 5. API Design (RESTful)

### 5.1 Standar API

- Format response:
  - `success`: boolean
  - `data`: payload
  - `error`: object nullable
  - `meta`: pagination/request metadata
  - `request_id`: correlation id
- Target p95 response:
  - Read/list: < 200ms
  - Write chat ack: < 300ms (processing berat via async job)

### 5.2 Endpoint Utama

- Chat
  - `GET /api/chats?cursor=&limit=50&label=&agent=&status=`
  - `GET /api/chats/{chatId}/messages?cursor=&limit=50`
  - `POST /api/messages/send-text`
  - `POST /api/messages/send-media`
  - `POST /api/messages/{messageId}/forward`
  - `POST /api/messages/{messageId}/delete-for-sender`
  - `POST /api/messages/{messageId}/quote-reply`
- Presence
  - `POST /api/chats/{chatId}/typing`
  - `GET /api/chats/{chatId}/presence`
- CRM
  - `GET /api/crm/customers/{id}`
  - `PATCH /api/crm/customers/{id}`
  - `POST /api/chats/{chatId}/labels`
  - `DELETE /api/chats/{chatId}/labels/{labelId}`
  - `POST /api/chats/{chatId}/internal-notes`
  - `GET /api/chats/{chatId}/internal-notes`
- Broadcast
  - `POST /api/broadcasts`
  - `POST /api/broadcasts/{id}/schedule`
  - `GET /api/broadcasts/{id}/progress`
- Export
  - `GET /api/chats/{chatId}/export?format=pdf|xlsx`

## 6. Realtime Messaging (WebSocket)

### 6.1 Namespace dan Event

- Namespace: `/ws/chat`
- Event inbound ke client:
  - `chat:new_message`
  - `chat:message_status`
  - `chat:typing`
  - `chat:presence`
  - `chat:assigned`
  - `chat:note_added`
  - `broadcast:progress`
- Event outbound dari client:
  - `typing:start`
  - `typing:stop`
  - `chat:seen`

### 6.2 Requirement Realtime

- Latency p95 < 100ms.
- Reconnect dengan resume menggunakan `last_event_id`.
- Delivery acknowledgement untuk event kritis.

## 7. Fitur Core Messaging

### 7.1 Dukungan Konten

- Teks.
- Gambar: JPEG, PNG, max 16MB.
- Dokumen: PDF, DOC, XLS, max 100MB.
- Voice note: OGG, max 16MB.
- Audio player built-in untuk voice note (play/pause, seek, duration).

### 7.2 Status Pesan

- `sent`, `delivered`, `read` (blue tick).
- Timestamp presisi milidetik:
  - `sent_at`
  - `delivered_at`
  - `read_at`

### 7.3 Advanced Message Behavior

- Quote/reply dengan relasi `quoted_message_id`.
- Forward message dengan badge `forwarded`.
- Delete message for sender dengan placeholder `message deleted`.
- Typing indicator dan online/presence.

## 8. Fitur CRM Kontraktor

- Customer profile:
  - Nama proyek
  - Nilai kontrak
  - Status proyek
- Label default:
  - Hot Prospect
  - Follow Up
  - Deal
  - Maintenance
- Quick reply template:
  - Penawaran
  - Kontrak
  - Progress update
- Broadcast segmentasi:
  - Per proyek
  - Per wilayah
  - Per status
- Schedule broadcast:
  - Timezone support (IANA timezone).
- Auto reply keyword:
  - `harga`
  - `proyek`
  - `kontak`
- Export history:
  - PDF
  - Excel

## 9. Antarmuka Admin ERP

- Dashboard metrik:
  - Total chat
  - Response rate
  - Conversion rate
- Chat UI:
  - Mirip WhatsApp Web
  - Search, filter, sort
- Multi-agent:
  - Assignment rule round-robin
  - Assignment rule skill-based
- Internal notes:
  - Tidak terlihat oleh customer
- File sharing:
  - Drag-drop upload
  - Progress bar
- Theme:
  - Dark mode
  - Light mode
- Responsiveness:
  - Tablet-ready layout

## 10. Performansi dan Keamanan

### 10.1 Performansi

- Pagination chat list: 50 chats/load.
- Lazy loading media.
- Redis caching untuk frequent access data.
- Target UI action <= 2 detik.

### 10.2 Keamanan

- Rate limiting:
  - 60 request/menit/user.
- Encryption in transit:
  - TLS 1.2+.
- Encryption at rest:
  - AES-256.
- Field-level encryption untuk data sensitif.
- RBAC role:
  - super_admin
  - admin_sales
  - admin_proyek
  - agent
- Audit log untuk semua aksi sensitif.
- Backup harian otomatis ke cloud storage.

## 11. Integrasi ERP

- Sinkronisasi customer dari modul project ERP.
- Update status proyek otomatis ke customer via WhatsApp.
- Trigger notifikasi milestone proyek.
- API endpoint integrasi:
  - Keuangan (invoice/payment update).
  - Inventory (material delivery/update).
- Pattern integrasi:
  - Outbox + queue untuk reliability.
  - Idempotency key untuk cegah duplicate dispatch.

## 12. Testing dan Quality Gate

- Unit test coverage minimal 80% untuk core functions.
- Integration test:
  - webhook
  - message status
  - assignment
  - broadcast scheduler
- E2E test:
  - alur agent dari login hingga kirim pesan.
- Load test:
  - 1000 concurrent users.
- Performance test:
  - p95 API dan p95 WebSocket latency.

## 13. Deployment dan Operasional

- Environment:
  - Dev
  - Staging (identik production)
  - Production
- CI/CD pipeline:
  - lint
  - typecheck
  - test
  - security scan
  - migration check
- Monitoring:
  - Uptime WAHA
  - API latency
  - Queue depth
  - Delivery success rate
- Alerting:
  - Downtime > 30 detik harus trigger alert.

## 14. Dokumentasi Wajib

- API documentation:
  - Swagger/OpenAPI 3.1.
- User manual:
  - Bahasa Indonesia
  - Screenshot langkah operasional.
- Deployment guide:
  - On-premise.
  - Cloud.
- Troubleshooting guide:
  - Error WA session
  - Webhook delay
  - Media upload gagal
  - Status delivery mismatch

## 15. Backlog Implementasi (Roadmap 8 Minggu)

### Sprint 1-2: Fondasi Platform

- Setup service WAHA + session manager.
- Implement skema DB inti (`wa_contacts`, `wa_chats`, `wa_messages`, `wa_message_media`).
- Build endpoint chat read/send text.
- Build WebSocket basic event `chat:new_message`.

### Sprint 3-4: Core Messaging Lengkap

- Media upload/download + validation file.
- Delivery/read status pipeline.
- Quote/reply, forward, delete-for-sender.
- Typing indicator + presence.

### Sprint 5-6: CRM + Assignment + Broadcast

- Customer profile proyek-kontrak-status.
- Labeling, internal notes, quick replies.
- Assignment engine round-robin dan skill-based.
- Broadcast segmentasi + scheduler timezone.

### Sprint 7: Integrasi ERP dan Automasi

- ERP event integration.
- Milestone notification automation.
- Auto reply keyword rule engine.

### Sprint 8: Hardening Production

- Load test 1000 concurrent users.
- Security hardening + audit compliance.
- Observability, alerting, backup DR drill.
- Finalisasi dokumentasi user dan operasional.

## 16. Acceptance Criteria

- Semua fitur core berjalan dengan UX mirip WhatsApp asli.
- Waktu muat dan respons visual aksi utama <= 2 detik.
- API chat p95 < 200ms, realtime p95 < 100ms.
- Test coverage core >= 80%.
- Monitoring dan alerting aktif untuk downtime > 30 detik.

## 17. Catatan Implementasi untuk Tim Kokohin

- Seluruh perubahan skema data wajib melalui migration versioned.
- Semua endpoint chat write wajib memakai idempotency key.
- Semua perubahan status pesan harus tercatat di status log.
- Semua integrasi ERP wajib event-driven, hindari coupling sinkron yang rapuh.
- Semua fitur baru harus lolos lint, typecheck, test, dan observability checklist sebelum release.

## 18. API Integration Reference (Operasional)

- Endpoint WAHA untuk list chat harus kompatibel lintas versi:
  - `GET /api/{sessionId}/chats`
  - `GET /api/chats?session={sessionId}`
  - `GET /api/sessions/{sessionId}/chats`
- Endpoint WAHA untuk list pesan harus kompatibel lintas versi:
  - `GET /api/messages?session={sessionId}&chatId={chatId}&limit={limit}`
  - `GET /api/{sessionId}/messages?chatId={chatId}&limit={limit}`
  - `GET /api/chats/{chatId}/messages?session={sessionId}&limit={limit}`
- Endpoint WAHA untuk kirim pesan text:
  - `POST /api/sendText`
  - `POST /api/messages/send-text`
  - `POST /api/messages/text`
- Endpoint WAHA untuk kirim media:
  - `POST /api/sendFile`
  - `POST /api/messages/send-media`
  - `POST /api/messages/media`
- Header autentikasi WAHA yang diterima:
  - `X-Api-Key: <WAHA_API_KEY>`
  - `Authorization: Bearer <WAHA_API_KEY>`
- Header webhook inbound yang diterima:
  - `X-Webhook-Secret: <WAHA_WEBHOOK_SECRET>`
  - `Authorization: Bearer <WAHA_WEBHOOK_SECRET>`

## 19. Troubleshooting Playbook (Chat Tidak Muncul)

- Langkah 1: verifikasi sesi WAHA
  - `getSessionStatus` harus `WORKING` sebelum sinkronisasi chat.
- Langkah 2: verifikasi webhook request
  - Pastikan endpoint menerima bentuk payload `event/payload`, `event/data`, dan nested `payload.payload`.
  - Pastikan `event_name` dan `external_event_id` tercatat di `wa_webhook_events`.
- Langkah 3: verifikasi data masuk DB
  - Inbound/outbound harus membuat/menyentuh tabel: `wa_contacts`, `wa_chats`, `wa_messages`, `wa_message_status_log`.
  - Event media harus mengisi `wa_message_media`.
- Langkah 4: verifikasi fallback sinkronisasi
  - Saat `wa_chats` kosong, server action harus bootstrap dari WAHA kemudian retry query.
- Langkah 5: verifikasi status pesan
  - Event `message.ack` harus memperbarui `wa_messages.status`, `delivered_at`, `read_at`.
- Langkah 6: verifikasi gejala UI
  - Jika state kosong muncul, cek error DB/RLS dulu.
  - Jika tidak ada error tapi data kosong, cek webhook ingestion atau jalankan bootstrap chat dari WAHA.
