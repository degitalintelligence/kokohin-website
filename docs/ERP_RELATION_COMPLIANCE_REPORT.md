# ERP Relation Compliance Report

Audit time: 2026-03-04T06:16:40.996Z

## Ringkasan

- FK erp_customer_profiles.lead_id: erp_customer_profiles_lead_id_fkey (ON DELETE SET NULL)
- Unique lead profile: erp_customer_profiles_lead_id_unique
- Trigger leads: trg_sync_lead_customer
- Function sinkronisasi: sync_lead_to_customer_profile
- FK erp_quotations.lead_id: erp_quotations_lead_id_fkey (ON DELETE SET NULL)

## Detail JSON

- Lihat file JSON: docs/erp-relation-audit-report.json