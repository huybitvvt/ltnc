# Schema thực tế TroHub

Sinh từ PostgreSQL sau Flyway V001–V017, ngày 11/10/2026. 34 bảng nghiệp vụ. Constraint database bên dưới là dữ liệu thực; quyền, giới hạn số dư và quy trình trạng thái còn được kiểm tra trong service.

Tiền: `numeric(19,0)`; chỉ số: `numeric(18,3)`; ngày nghiệp vụ: `date`; timestamp: UTC (`timestamp with time zone`).

Bút toán tài chính append-only được trigger bảo vệ. `operation_id` liên kết hai vế CREDIT_OUT/CREDIT_IN hoặc OFFSET_OUT/DEPOSIT_OFFSET. Bản ghi CREDIT_APPLIED cũ được giữ nguyên. `ref_entry_id` trỏ bản ghi gốc của correction. `(actor_id,idempotency_key)` duy nhất; `response_snapshot` lưu kết quả gửi lại.

V015 chặn một expense reference xuất hiện đồng thời ở one_off_charges.source_ref và deposit_ledger_entries.note. V017 giới hạn hồ sơ chưa gắn hợp đồng theo người tạo; hồ sơ gắn hợp đồng dùng phạm vi tòa được giao.

## audit_events

| Cột | Kiểu | NOT NULL |
|---|---|---|
| `id` | `uuid` | Có |
| `actor_id` | `uuid` | Có |
| `actor_role` | `character varying(20)` | Có |
| `action` | `character varying(50)` | Có |
| `resource_type` | `character varying(50)` | Có |
| `resource_id` | `uuid` | Có |
| `building_id` | `uuid` | Có |
| `reason` | `text` |  |
| `before_data` | `jsonb` |  |
| `after_data` | `jsonb` | Có |
| `source_ref` | `uuid` |  |
| `recorded_at` | `timestamp with time zone` | Có |

- `audit_events_action_not_null`: `NOT NULL action`
- `audit_events_actor_id_fkey`: `FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT`
- `audit_events_actor_id_not_null`: `NOT NULL actor_id`
- `audit_events_actor_role_not_null`: `NOT NULL actor_role`
- `audit_events_after_data_not_null`: `NOT NULL after_data`
- `audit_events_building_id_fkey`: `FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE RESTRICT`
- `audit_events_building_id_not_null`: `NOT NULL building_id`
- `audit_events_id_not_null`: `NOT NULL id`
- `audit_events_pkey`: `PRIMARY KEY (id)`
- `audit_events_recorded_at_not_null`: `NOT NULL recorded_at`
- `audit_events_resource_id_not_null`: `NOT NULL resource_id`
- `audit_events_resource_type_not_null`: `NOT NULL resource_type`

## auth_sessions

| Cột | Kiểu | NOT NULL |
|---|---|---|
| `id` | `uuid` | Có |
| `user_id` | `uuid` | Có |
| `family_id` | `uuid` | Có |
| `expires_at` | `timestamp with time zone` | Có |
| `revoked_at` | `timestamp with time zone` |  |
| `created_at` | `timestamp with time zone` | Có |

- `auth_sessions_created_at_not_null`: `NOT NULL created_at`
- `auth_sessions_expires_at_not_null`: `NOT NULL expires_at`
- `auth_sessions_family_id_not_null`: `NOT NULL family_id`
- `auth_sessions_id_not_null`: `NOT NULL id`
- `auth_sessions_pkey`: `PRIMARY KEY (id)`
- `auth_sessions_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT`
- `auth_sessions_user_id_not_null`: `NOT NULL user_id`

## building_billing_settings

| Cột | Kiểu | NOT NULL |
|---|---|---|
| `id` | `uuid` | Có |
| `building_id` | `uuid` | Có |
| `due_days` | `integer` | Có |
| `water_absolute_threshold` | `numeric(18,3)` | Có |
| `electricity_absolute_threshold` | `numeric(18,3)` | Có |
| `created_at` | `timestamp with time zone` | Có |
| `updated_at` | `timestamp with time zone` | Có |
| `version` | `bigint` | Có |

- `building_billing_settings_building_id_fkey`: `FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE RESTRICT`
- `building_billing_settings_building_id_key`: `UNIQUE (building_id)`
- `building_billing_settings_building_id_not_null`: `NOT NULL building_id`
- `building_billing_settings_created_at_not_null`: `NOT NULL created_at`
- `building_billing_settings_due_days_not_null`: `NOT NULL due_days`
- `building_billing_settings_electricity_absolute_thresho_not_null`: `NOT NULL electricity_absolute_threshold`
- `building_billing_settings_id_not_null`: `NOT NULL id`
- `building_billing_settings_pkey`: `PRIMARY KEY (id)`
- `building_billing_settings_updated_at_not_null`: `NOT NULL updated_at`
- `building_billing_settings_version_not_null`: `NOT NULL version`
- `building_billing_settings_water_absolute_threshold_not_null`: `NOT NULL water_absolute_threshold`

## building_staff_assignments

| Cột | Kiểu | NOT NULL |
|---|---|---|
| `id` | `uuid` | Có |
| `user_id` | `uuid` | Có |
| `building_id` | `uuid` | Có |
| `created_at` | `timestamp with time zone` | Có |

- `building_staff_assignments_building_id_fkey`: `FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE RESTRICT`
- `building_staff_assignments_building_id_not_null`: `NOT NULL building_id`
- `building_staff_assignments_created_at_not_null`: `NOT NULL created_at`
- `building_staff_assignments_id_not_null`: `NOT NULL id`
- `building_staff_assignments_pkey`: `PRIMARY KEY (id)`
- `building_staff_assignments_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT`
- `building_staff_assignments_user_id_not_null`: `NOT NULL user_id`
- `uq_staff_building`: `UNIQUE (user_id, building_id)`

## buildings

| Cột | Kiểu | NOT NULL |
|---|---|---|
| `id` | `uuid` | Có |
| `name` | `character varying(100)` | Có |
| `address` | `character varying(255)` | Có |
| `active` | `boolean` | Có |
| `created_at` | `timestamp with time zone` | Có |
| `updated_at` | `timestamp with time zone` | Có |
| `version` | `bigint` | Có |

- `buildings_active_not_null`: `NOT NULL active`
- `buildings_address_not_null`: `NOT NULL address`
- `buildings_created_at_not_null`: `NOT NULL created_at`
- `buildings_id_not_null`: `NOT NULL id`
- `buildings_name_not_null`: `NOT NULL name`
- `buildings_pkey`: `PRIMARY KEY (id)`
- `buildings_updated_at_not_null`: `NOT NULL updated_at`
- `buildings_version_not_null`: `NOT NULL version`

## consumption_alerts

| Cột | Kiểu | NOT NULL |
|---|---|---|
| `id` | `uuid` | Có |
| `contract_id` | `uuid` | Có |
| `meter_type` | `character varying(20)` | Có |
| `billing_month` | `character varying(7)` | Có |
| `reading_version` | `bigint` | Có |
| `evaluation_status` | `character varying(30)` | Có |
| `comparison_snapshot` | `jsonb` | Có |
| `acknowledged_by` | `uuid` |  |
| `acknowledged_at` | `timestamp with time zone` |  |
| `reason` | `text` |  |
| `created_at` | `timestamp with time zone` | Có |

- `consumption_alerts_acknowledged_by_fkey`: `FOREIGN KEY (acknowledged_by) REFERENCES users(id) ON DELETE RESTRICT`
- `consumption_alerts_billing_month_not_null`: `NOT NULL billing_month`
- `consumption_alerts_comparison_snapshot_not_null`: `NOT NULL comparison_snapshot`
- `consumption_alerts_contract_id_fkey`: `FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE RESTRICT`
- `consumption_alerts_contract_id_not_null`: `NOT NULL contract_id`
- `consumption_alerts_created_at_not_null`: `NOT NULL created_at`
- `consumption_alerts_evaluation_status_not_null`: `NOT NULL evaluation_status`
- `consumption_alerts_id_not_null`: `NOT NULL id`
- `consumption_alerts_meter_type_not_null`: `NOT NULL meter_type`
- `consumption_alerts_pkey`: `PRIMARY KEY (id)`
- `consumption_alerts_reading_version_not_null`: `NOT NULL reading_version`

## contract_events

| Cột | Kiểu | NOT NULL |
|---|---|---|
| `id` | `uuid` | Có |
| `contract_id` | `uuid` | Có |
| `type` | `character varying(50)` | Có |
| `old_value` | `text` |  |
| `new_value` | `text` | Có |
| `reason` | `text` | Có |
| `actor_id` | `uuid` | Có |
| `created_at` | `timestamp with time zone` | Có |

- `contract_events_actor_id_fkey`: `FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT`
- `contract_events_actor_id_not_null`: `NOT NULL actor_id`
- `contract_events_contract_id_fkey`: `FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE RESTRICT`
- `contract_events_contract_id_not_null`: `NOT NULL contract_id`
- `contract_events_created_at_not_null`: `NOT NULL created_at`
- `contract_events_id_not_null`: `NOT NULL id`
- `contract_events_new_value_not_null`: `NOT NULL new_value`
- `contract_events_pkey`: `PRIMARY KEY (id)`
- `contract_events_reason_not_null`: `NOT NULL reason`
- `contract_events_type_not_null`: `NOT NULL type`

## contract_members

| Cột | Kiểu | NOT NULL |
|---|---|---|
| `id` | `uuid` | Có |
| `contract_id` | `uuid` | Có |
| `tenant_id` | `uuid` | Có |
| `joined_on` | `date` | Có |
| `left_on` | `date` |  |
| `is_representative` | `boolean` | Có |
| `created_at` | `timestamp with time zone` | Có |
| `updated_at` | `timestamp with time zone` | Có |
| `version` | `bigint` | Có |

- `contract_members_contract_id_fkey`: `FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE RESTRICT`
- `contract_members_contract_id_not_null`: `NOT NULL contract_id`
- `contract_members_created_at_not_null`: `NOT NULL created_at`
- `contract_members_id_not_null`: `NOT NULL id`
- `contract_members_is_representative_not_null`: `NOT NULL is_representative`
- `contract_members_joined_on_not_null`: `NOT NULL joined_on`
- `contract_members_pkey`: `PRIMARY KEY (id)`
- `contract_members_tenant_id_fkey`: `FOREIGN KEY (tenant_id) REFERENCES tenant_profiles(id) ON DELETE RESTRICT`
- `contract_members_tenant_id_not_null`: `NOT NULL tenant_id`
- `contract_members_updated_at_not_null`: `NOT NULL updated_at`
- `contract_members_version_not_null`: `NOT NULL version`

## contract_service_subscriptions

| Cột | Kiểu | NOT NULL |
|---|---|---|
| `id` | `uuid` | Có |
| `contract_id` | `uuid` | Có |
| `service_id` | `uuid` | Có |
| `start_month` | `character varying(7)` | Có |
| `end_month_exclusive` | `character varying(7)` |  |
| `created_at` | `timestamp with time zone` | Có |
| `version` | `bigint` | Có |

- `contract_service_subscriptions_contract_id_fkey`: `FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE RESTRICT`
- `contract_service_subscriptions_contract_id_not_null`: `NOT NULL contract_id`
- `contract_service_subscriptions_created_at_not_null`: `NOT NULL created_at`
- `contract_service_subscriptions_id_not_null`: `NOT NULL id`
- `contract_service_subscriptions_pkey`: `PRIMARY KEY (id)`
- `contract_service_subscriptions_service_id_fkey`: `FOREIGN KEY (service_id) REFERENCES service_definitions(id) ON DELETE RESTRICT`
- `contract_service_subscriptions_service_id_not_null`: `NOT NULL service_id`
- `contract_service_subscriptions_start_month_not_null`: `NOT NULL start_month`
- `contract_service_subscriptions_version_not_null`: `NOT NULL version`
- `uq_contract_service_period`: `UNIQUE (contract_id, service_id, start_month)`

## contracts

| Cột | Kiểu | NOT NULL |
|---|---|---|
| `id` | `uuid` | Có |
| `room_id` | `uuid` | Có |
| `representative_tenant_id` | `uuid` | Có |
| `status` | `character varying(20)` | Có |
| `actual_start_date` | `date` | Có |
| `planned_end_exclusive` | `date` | Có |
| `actual_checkout_date` | `date` |  |
| `rent` | `numeric(19,0)` | Có |
| `deposit_required` | `numeric(19,0)` | Có |
| `deposit_settlement_at` | `timestamp with time zone` |  |
| `created_at` | `timestamp with time zone` | Có |
| `updated_at` | `timestamp with time zone` | Có |
| `version` | `bigint` | Có |
| `deposit_status` | `character varying(20)` | Có |
| `deposit_settled_at` | `timestamp with time zone` |  |

- `contracts_actual_start_date_not_null`: `NOT NULL actual_start_date`
- `contracts_created_at_not_null`: `NOT NULL created_at`
- `contracts_deposit_required_check`: `CHECK ((deposit_required >= (0)::numeric))`
- `contracts_deposit_required_not_null`: `NOT NULL deposit_required`
- `contracts_deposit_status_not_null`: `NOT NULL deposit_status`
- `contracts_id_not_null`: `NOT NULL id`
- `contracts_pkey`: `PRIMARY KEY (id)`
- `contracts_planned_end_exclusive_not_null`: `NOT NULL planned_end_exclusive`
- `contracts_rent_check`: `CHECK ((rent >= (0)::numeric))`
- `contracts_rent_not_null`: `NOT NULL rent`
- `contracts_representative_tenant_id_fkey`: `FOREIGN KEY (representative_tenant_id) REFERENCES tenant_profiles(id) ON DELETE RESTRICT`
- `contracts_representative_tenant_id_not_null`: `NOT NULL representative_tenant_id`
- `contracts_room_id_fkey`: `FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT`
- `contracts_room_id_not_null`: `NOT NULL room_id`
- `contracts_status_not_null`: `NOT NULL status`
- `contracts_updated_at_not_null`: `NOT NULL updated_at`
- `contracts_version_not_null`: `NOT NULL version`

## deposit_ledger_entries

| Cột | Kiểu | NOT NULL |
|---|---|---|
| `id` | `uuid` | Có |
| `contract_id` | `uuid` | Có |
| `entry_type` | `character varying(30)` | Có |
| `amount` | `numeric(19,0)` | Có |
| `payment_method` | `character varying(30)` |  |
| `reference_code` | `character varying(100)` |  |
| `note` | `text` |  |
| `reason` | `text` |  |
| `ref_entry_id` | `uuid` |  |
| `invoice_id` | `uuid` |  |
| `operation_id` | `uuid` |  |
| `actor_id` | `uuid` |  |
| `recorded_at` | `timestamp with time zone` | Có |
| `effective_date` | `date` | Có |

- `chk_deposit_amount_nonzero`: `CHECK ((amount <> (0)::numeric))`
- `chk_deposit_entry_type`: `CHECK (((entry_type)::text = ANY ((ARRAY['RECEIPT'::character varying, 'RECEIPT_CORRECTION'::character varying, 'REFUND'::character varying, 'DEDUCTION'::character varying, 'OFFSET_OUT'::character varying])::text[])))`
- `deposit_ledger_entries_actor_id_fkey`: `FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL`
- `deposit_ledger_entries_amount_not_null`: `NOT NULL amount`
- `deposit_ledger_entries_contract_id_fkey`: `FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE RESTRICT`
- `deposit_ledger_entries_contract_id_not_null`: `NOT NULL contract_id`
- `deposit_ledger_entries_effective_date_not_null`: `NOT NULL effective_date`
- `deposit_ledger_entries_entry_type_not_null`: `NOT NULL entry_type`
- `deposit_ledger_entries_id_not_null`: `NOT NULL id`
- `deposit_ledger_entries_invoice_id_fkey`: `FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT`
- `deposit_ledger_entries_operation_id_fkey`: `FOREIGN KEY (operation_id) REFERENCES financial_operations(id) ON DELETE SET NULL`
- `deposit_ledger_entries_pkey`: `PRIMARY KEY (id)`
- `deposit_ledger_entries_recorded_at_not_null`: `NOT NULL recorded_at`
- `deposit_ledger_entries_ref_entry_id_fkey`: `FOREIGN KEY (ref_entry_id) REFERENCES deposit_ledger_entries(id) ON DELETE RESTRICT`

## financial_operations

| Cột | Kiểu | NOT NULL |
|---|---|---|
| `id` | `uuid` | Có |
| `idempotency_key` | `character varying(100)` | Có |
| `actor_id` | `uuid` | Có |
| `action` | `character varying(50)` | Có |
| `request_hash` | `character varying(64)` | Có |
| `status` | `character varying(20)` | Có |
| `response_snapshot` | `text` | Có |
| `created_at` | `timestamp with time zone` | Có |

- `financial_operations_action_not_null`: `NOT NULL action`
- `financial_operations_actor_id_fkey`: `FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT`
- `financial_operations_actor_id_not_null`: `NOT NULL actor_id`
- `financial_operations_created_at_not_null`: `NOT NULL created_at`
- `financial_operations_id_not_null`: `NOT NULL id`
- `financial_operations_idempotency_key_not_null`: `NOT NULL idempotency_key`
- `financial_operations_pkey`: `PRIMARY KEY (id)`
- `financial_operations_request_hash_not_null`: `NOT NULL request_hash`
- `financial_operations_response_snapshot_not_null`: `NOT NULL response_snapshot`
- `financial_operations_status_not_null`: `NOT NULL status`
- `uq_financial_actor_key`: `UNIQUE (actor_id, idempotency_key)`

## floors

| Cột | Kiểu | NOT NULL |
|---|---|---|
| `id` | `uuid` | Có |
| `building_id` | `uuid` | Có |
| `name` | `character varying(50)` | Có |
| `floor_order` | `integer` | Có |
| `created_at` | `timestamp with time zone` | Có |
| `updated_at` | `timestamp with time zone` | Có |
| `version` | `bigint` | Có |

- `floors_building_id_fkey`: `FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE RESTRICT`
- `floors_building_id_not_null`: `NOT NULL building_id`
- `floors_created_at_not_null`: `NOT NULL created_at`
- `floors_floor_order_not_null`: `NOT NULL floor_order`
- `floors_id_not_null`: `NOT NULL id`
- `floors_name_not_null`: `NOT NULL name`
- `floors_pkey`: `PRIMARY KEY (id)`
- `floors_updated_at_not_null`: `NOT NULL updated_at`
- `floors_version_not_null`: `NOT NULL version`
- `uq_building_floor_order`: `UNIQUE (building_id, floor_order)`

## invites

| Cột | Kiểu | NOT NULL |
|---|---|---|
| `id` | `uuid` | Có |
| `user_id` | `uuid` | Có |
| `code_hash` | `character varying(255)` | Có |
| `purpose` | `character varying(30)` | Có |
| `expires_at` | `timestamp with time zone` | Có |
| `consumed_at` | `timestamp with time zone` |  |
| `created_by` | `uuid` | Có |
| `created_at` | `timestamp with time zone` | Có |

- `invites_code_hash_not_null`: `NOT NULL code_hash`
- `invites_created_at_not_null`: `NOT NULL created_at`
- `invites_created_by_fkey`: `FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT`
- `invites_created_by_not_null`: `NOT NULL created_by`
- `invites_expires_at_not_null`: `NOT NULL expires_at`
- `invites_id_not_null`: `NOT NULL id`
- `invites_pkey`: `PRIMARY KEY (id)`
- `invites_purpose_check`: `CHECK (((purpose)::text = ANY ((ARRAY['TENANT_INVITE'::character varying, 'PASSWORD_RESET'::character varying])::text[])))`
- `invites_purpose_not_null`: `NOT NULL purpose`
- `invites_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT`
- `invites_user_id_not_null`: `NOT NULL user_id`

## invoice_adjustments

| Cột | Kiểu | NOT NULL |
|---|---|---|
| `id` | `uuid` | Có |
| `invoice_id` | `uuid` | Có |
| `delta_amount` | `numeric(19,0)` | Có |
| `reason` | `text` | Có |
| `old_snapshot` | `jsonb` | Có |
| `new_snapshot` | `jsonb` | Có |
| `effective_date` | `date` | Có |
| `recorded_at` | `timestamp with time zone` | Có |
| `created_by` | `uuid` | Có |
| `operation_id` | `uuid` | Có |

- `invoice_adjustments_created_by_fkey`: `FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT`
- `invoice_adjustments_created_by_not_null`: `NOT NULL created_by`
- `invoice_adjustments_delta_amount_check`: `CHECK ((delta_amount <> (0)::numeric))`
- `invoice_adjustments_delta_amount_not_null`: `NOT NULL delta_amount`
- `invoice_adjustments_effective_date_not_null`: `NOT NULL effective_date`
- `invoice_adjustments_id_not_null`: `NOT NULL id`
- `invoice_adjustments_invoice_id_fkey`: `FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT`
- `invoice_adjustments_invoice_id_not_null`: `NOT NULL invoice_id`
- `invoice_adjustments_new_snapshot_not_null`: `NOT NULL new_snapshot`
- `invoice_adjustments_old_snapshot_not_null`: `NOT NULL old_snapshot`
- `invoice_adjustments_operation_id_fkey`: `FOREIGN KEY (operation_id) REFERENCES financial_operations(id) ON DELETE RESTRICT`
- `invoice_adjustments_operation_id_not_null`: `NOT NULL operation_id`
- `invoice_adjustments_pkey`: `PRIMARY KEY (id)`
- `invoice_adjustments_reason_not_null`: `NOT NULL reason`
- `invoice_adjustments_recorded_at_not_null`: `NOT NULL recorded_at`

## invoice_feedback_replies

| Cột | Kiểu | NOT NULL |
|---|---|---|
| `id` | `uuid` | Có |
| `feedback_id` | `uuid` | Có |
| `actor_id` | `uuid` | Có |
| `message` | `text` | Có |
| `created_at` | `timestamp with time zone` | Có |

- `invoice_feedback_replies_actor_id_fkey`: `FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT`
- `invoice_feedback_replies_actor_id_not_null`: `NOT NULL actor_id`
- `invoice_feedback_replies_created_at_not_null`: `NOT NULL created_at`
- `invoice_feedback_replies_feedback_id_fkey`: `FOREIGN KEY (feedback_id) REFERENCES invoice_feedbacks(id) ON DELETE CASCADE`
- `invoice_feedback_replies_feedback_id_not_null`: `NOT NULL feedback_id`
- `invoice_feedback_replies_id_not_null`: `NOT NULL id`
- `invoice_feedback_replies_message_not_null`: `NOT NULL message`
- `invoice_feedback_replies_pkey`: `PRIMARY KEY (id)`

## invoice_feedbacks

| Cột | Kiểu | NOT NULL |
|---|---|---|
| `id` | `uuid` | Có |
| `invoice_id` | `uuid` | Có |
| `created_by` | `uuid` | Có |
| `message` | `text` | Có |
| `status` | `character varying(20)` | Có |
| `created_at` | `timestamp with time zone` | Có |
| `updated_at` | `timestamp with time zone` | Có |

- `chk_feedback_status`: `CHECK (((status)::text = ANY ((ARRAY['OPEN'::character varying, 'IN_REVIEW'::character varying, 'RESOLVED'::character varying])::text[])))`
- `invoice_feedbacks_created_at_not_null`: `NOT NULL created_at`
- `invoice_feedbacks_created_by_fkey`: `FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT`
- `invoice_feedbacks_created_by_not_null`: `NOT NULL created_by`
- `invoice_feedbacks_id_not_null`: `NOT NULL id`
- `invoice_feedbacks_invoice_id_fkey`: `FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT`
- `invoice_feedbacks_invoice_id_not_null`: `NOT NULL invoice_id`
- `invoice_feedbacks_message_not_null`: `NOT NULL message`
- `invoice_feedbacks_pkey`: `PRIMARY KEY (id)`
- `invoice_feedbacks_status_not_null`: `NOT NULL status`
- `invoice_feedbacks_updated_at_not_null`: `NOT NULL updated_at`

## invoice_items

| Cột | Kiểu | NOT NULL |
|---|---|---|
| `id` | `uuid` | Có |
| `invoice_id` | `uuid` | Có |
| `type` | `character varying(30)` | Có |
| `label` | `character varying(100)` | Có |
| `quantity` | `numeric(18,3)` | Có |
| `unit_price` | `numeric(19,0)` | Có |
| `amount` | `numeric(19,0)` | Có |
| `calculation_snapshot` | `jsonb` | Có |
| `reading_refs` | `jsonb` |  |
| `tariff_ref` | `uuid` |  |
| `created_at` | `timestamp with time zone` | Có |

- `invoice_items_amount_not_null`: `NOT NULL amount`
- `invoice_items_calculation_snapshot_not_null`: `NOT NULL calculation_snapshot`
- `invoice_items_created_at_not_null`: `NOT NULL created_at`
- `invoice_items_id_not_null`: `NOT NULL id`
- `invoice_items_invoice_id_fkey`: `FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT`
- `invoice_items_invoice_id_not_null`: `NOT NULL invoice_id`
- `invoice_items_label_not_null`: `NOT NULL label`
- `invoice_items_pkey`: `PRIMARY KEY (id)`
- `invoice_items_quantity_not_null`: `NOT NULL quantity`
- `invoice_items_tariff_ref_fkey`: `FOREIGN KEY (tariff_ref) REFERENCES tariffs(id) ON DELETE RESTRICT`
- `invoice_items_type_not_null`: `NOT NULL type`
- `invoice_items_unit_price_not_null`: `NOT NULL unit_price`

## invoice_ledger_entries

| Cột | Kiểu | NOT NULL |
|---|---|---|
| `id` | `uuid` | Có |
| `invoice_id` | `uuid` | Có |
| `contract_id` | `uuid` | Có |
| `entry_type` | `character varying(32)` | Có |
| `amount` | `numeric(19,0)` | Có |
| `payment_method` | `character varying(32)` | Có |
| `reference_code` | `character varying(128)` |  |
| `note` | `text` |  |
| `ref_entry_id` | `uuid` |  |
| `operation_id` | `uuid` |  |
| `actor_id` | `uuid` | Có |
| `recorded_at` | `timestamp with time zone` | Có |
| `effective_date` | `date` | Có |

- `chk_credit_transfer_direction`: `CHECK (((((entry_type)::text <> 'CREDIT_OUT'::text) OR (amount < (0)::numeric)) AND (((entry_type)::text <> 'CREDIT_IN'::text) OR (amount > (0)::numeric))))`
- `chk_inv_ledger_amount_not_zero`: `CHECK ((amount <> (0)::numeric))`
- `chk_inv_ledger_entry_type`: `CHECK (((entry_type)::text = ANY ((ARRAY['PAYMENT'::character varying, 'PAYMENT_CORRECTION'::character varying, 'REFUND'::character varying, 'CREDIT_APPLIED'::character varying, 'CREDIT_OUT'::character varying, 'CREDIT_IN'::character varying, 'DEPOSIT_OFFSET'::character varying])::text[])))`
- `chk_inv_ledger_payment_method`: `CHECK (((payment_method)::text = ANY ((ARRAY['CASH'::character varying, 'BANK_TRANSFER'::character varying, 'MOMO'::character varying, 'VNPAY'::character varying, 'INTERNAL_TRANSFER'::character varying])::text[])))`
- `invoice_ledger_entries_actor_id_fkey`: `FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT`
- `invoice_ledger_entries_actor_id_not_null`: `NOT NULL actor_id`
- `invoice_ledger_entries_amount_not_null`: `NOT NULL amount`
- `invoice_ledger_entries_contract_id_fkey`: `FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE RESTRICT`
- `invoice_ledger_entries_contract_id_not_null`: `NOT NULL contract_id`
- `invoice_ledger_entries_effective_date_not_null`: `NOT NULL effective_date`
- `invoice_ledger_entries_entry_type_not_null`: `NOT NULL entry_type`
- `invoice_ledger_entries_id_not_null`: `NOT NULL id`
- `invoice_ledger_entries_invoice_id_fkey`: `FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT`
- `invoice_ledger_entries_invoice_id_not_null`: `NOT NULL invoice_id`
- `invoice_ledger_entries_operation_id_fkey`: `FOREIGN KEY (operation_id) REFERENCES financial_operations(id) ON DELETE RESTRICT`
- `invoice_ledger_entries_payment_method_not_null`: `NOT NULL payment_method`
- `invoice_ledger_entries_pkey`: `PRIMARY KEY (id)`
- `invoice_ledger_entries_recorded_at_not_null`: `NOT NULL recorded_at`
- `invoice_ledger_entries_ref_entry_id_fkey`: `FOREIGN KEY (ref_entry_id) REFERENCES invoice_ledger_entries(id) ON DELETE RESTRICT`

## invoice_notes

| Cột | Kiểu | NOT NULL |
|---|---|---|
| `id` | `uuid` | Có |
| `invoice_id` | `uuid` | Có |
| `content` | `text` | Có |
| `reason` | `text` | Có |
| `created_by` | `uuid` | Có |
| `recorded_at` | `timestamp with time zone` | Có |

- `invoice_notes_content_not_null`: `NOT NULL content`
- `invoice_notes_created_by_fkey`: `FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT`
- `invoice_notes_created_by_not_null`: `NOT NULL created_by`
- `invoice_notes_id_not_null`: `NOT NULL id`
- `invoice_notes_invoice_id_fkey`: `FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT`
- `invoice_notes_invoice_id_not_null`: `NOT NULL invoice_id`
- `invoice_notes_pkey`: `PRIMARY KEY (id)`
- `invoice_notes_reason_not_null`: `NOT NULL reason`
- `invoice_notes_recorded_at_not_null`: `NOT NULL recorded_at`

## invoices

| Cột | Kiểu | NOT NULL |
|---|---|---|
| `id` | `uuid` | Có |
| `contract_id` | `uuid` | Có |
| `billing_month` | `character varying(7)` | Có |
| `status` | `character varying(20)` | Có |
| `period_start` | `date` | Có |
| `period_end_exclusive` | `date` | Có |
| `due_date` | `date` | Có |
| `issued_at` | `timestamp with time zone` |  |
| `created_at` | `timestamp with time zone` | Có |
| `updated_at` | `timestamp with time zone` | Có |
| `version` | `bigint` | Có |

- `invoices_billing_month_not_null`: `NOT NULL billing_month`
- `invoices_contract_id_fkey`: `FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE RESTRICT`
- `invoices_contract_id_not_null`: `NOT NULL contract_id`
- `invoices_created_at_not_null`: `NOT NULL created_at`
- `invoices_due_date_not_null`: `NOT NULL due_date`
- `invoices_id_not_null`: `NOT NULL id`
- `invoices_period_end_exclusive_not_null`: `NOT NULL period_end_exclusive`
- `invoices_period_start_not_null`: `NOT NULL period_start`
- `invoices_pkey`: `PRIMARY KEY (id)`
- `invoices_status_not_null`: `NOT NULL status`
- `invoices_updated_at_not_null`: `NOT NULL updated_at`
- `invoices_version_not_null`: `NOT NULL version`
- `uq_invoice_contract_month`: `UNIQUE (contract_id, billing_month)`

## issue_status_history

| Cột | Kiểu | NOT NULL |
|---|---|---|
| `id` | `uuid` | Có |
| `issue_id` | `uuid` | Có |
| `old_status` | `character varying(20)` | Có |
| `new_status` | `character varying(20)` | Có |
| `comment` | `text` |  |
| `actor_id` | `uuid` | Có |
| `created_at` | `timestamp with time zone` | Có |

- `issue_status_history_actor_id_fkey`: `FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT`
- `issue_status_history_actor_id_not_null`: `NOT NULL actor_id`
- `issue_status_history_created_at_not_null`: `NOT NULL created_at`
- `issue_status_history_id_not_null`: `NOT NULL id`
- `issue_status_history_issue_id_fkey`: `FOREIGN KEY (issue_id) REFERENCES maintenance_issues(id) ON DELETE CASCADE`
- `issue_status_history_issue_id_not_null`: `NOT NULL issue_id`
- `issue_status_history_new_status_not_null`: `NOT NULL new_status`
- `issue_status_history_old_status_not_null`: `NOT NULL old_status`
- `issue_status_history_pkey`: `PRIMARY KEY (id)`

## maintenance_issues

| Cột | Kiểu | NOT NULL |
|---|---|---|
| `id` | `uuid` | Có |
| `contract_id` | `uuid` | Có |
| `room_id` | `uuid` | Có |
| `title` | `character varying(150)` | Có |
| `description` | `text` | Có |
| `status` | `character varying(20)` | Có |
| `assignee_id` | `uuid` |  |
| `created_by` | `uuid` | Có |
| `created_at` | `timestamp with time zone` | Có |
| `updated_at` | `timestamp with time zone` | Có |
| `version` | `bigint` | Có |

- `chk_issue_status`: `CHECK (((status)::text = ANY ((ARRAY['OPEN'::character varying, 'ACCEPTED'::character varying, 'IN_PROGRESS'::character varying, 'RESOLVED'::character varying, 'CLOSED'::character varying])::text[])))`
- `maintenance_issues_assignee_id_fkey`: `FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL`
- `maintenance_issues_contract_id_fkey`: `FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE RESTRICT`
- `maintenance_issues_contract_id_not_null`: `NOT NULL contract_id`
- `maintenance_issues_created_at_not_null`: `NOT NULL created_at`
- `maintenance_issues_created_by_fkey`: `FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT`
- `maintenance_issues_created_by_not_null`: `NOT NULL created_by`
- `maintenance_issues_description_not_null`: `NOT NULL description`
- `maintenance_issues_id_not_null`: `NOT NULL id`
- `maintenance_issues_pkey`: `PRIMARY KEY (id)`
- `maintenance_issues_room_id_fkey`: `FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT`
- `maintenance_issues_room_id_not_null`: `NOT NULL room_id`
- `maintenance_issues_status_not_null`: `NOT NULL status`
- `maintenance_issues_title_not_null`: `NOT NULL title`
- `maintenance_issues_updated_at_not_null`: `NOT NULL updated_at`
- `maintenance_issues_version_not_null`: `NOT NULL version`

## meter_readings

| Cột | Kiểu | NOT NULL |
|---|---|---|
| `id` | `uuid` | Có |
| `meter_id` | `uuid` | Có |
| `reading_date` | `date` | Có |
| `value` | `numeric(18,3)` | Có |
| `kind` | `character varying(20)` | Có |
| `file_id` | `uuid` |  |
| `created_by` | `uuid` | Có |
| `created_at` | `timestamp with time zone` | Có |
| `updated_at` | `timestamp with time zone` | Có |
| `version` | `bigint` | Có |

- `meter_readings_created_at_not_null`: `NOT NULL created_at`
- `meter_readings_created_by_fkey`: `FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT`
- `meter_readings_created_by_not_null`: `NOT NULL created_by`
- `meter_readings_id_not_null`: `NOT NULL id`
- `meter_readings_kind_not_null`: `NOT NULL kind`
- `meter_readings_meter_id_fkey`: `FOREIGN KEY (meter_id) REFERENCES room_meters(id) ON DELETE RESTRICT`
- `meter_readings_meter_id_not_null`: `NOT NULL meter_id`
- `meter_readings_pkey`: `PRIMARY KEY (id)`
- `meter_readings_reading_date_not_null`: `NOT NULL reading_date`
- `meter_readings_updated_at_not_null`: `NOT NULL updated_at`
- `meter_readings_value_check`: `CHECK ((value >= (0)::numeric))`
- `meter_readings_value_not_null`: `NOT NULL value`
- `meter_readings_version_not_null`: `NOT NULL version`

## notifications

| Cột | Kiểu | NOT NULL |
|---|---|---|
| `id` | `uuid` | Có |
| `user_id` | `uuid` | Có |
| `event_key` | `character varying(100)` | Có |
| `type` | `character varying(50)` | Có |
| `title` | `character varying(150)` | Có |
| `message` | `text` | Có |
| `resource_type` | `character varying(50)` |  |
| `resource_id` | `uuid` |  |
| `read_at` | `timestamp with time zone` |  |
| `created_at` | `timestamp with time zone` | Có |

- `notifications_created_at_not_null`: `NOT NULL created_at`
- `notifications_event_key_not_null`: `NOT NULL event_key`
- `notifications_id_not_null`: `NOT NULL id`
- `notifications_message_not_null`: `NOT NULL message`
- `notifications_pkey`: `PRIMARY KEY (id)`
- `notifications_title_not_null`: `NOT NULL title`
- `notifications_type_not_null`: `NOT NULL type`
- `notifications_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`
- `notifications_user_id_not_null`: `NOT NULL user_id`
- `uq_notification_user_event`: `UNIQUE (user_id, event_key)`

## one_off_charges

| Cột | Kiểu | NOT NULL |
|---|---|---|
| `id` | `uuid` | Có |
| `contract_id` | `uuid` | Có |
| `billing_month` | `character varying(7)` | Có |
| `label` | `character varying(100)` | Có |
| `amount` | `numeric(19,0)` | Có |
| `reason` | `text` | Có |
| `source_ref` | `character varying(100)` |  |
| `created_at` | `timestamp with time zone` | Có |

- `one_off_charges_amount_check`: `CHECK ((amount >= (0)::numeric))`
- `one_off_charges_amount_not_null`: `NOT NULL amount`
- `one_off_charges_billing_month_not_null`: `NOT NULL billing_month`
- `one_off_charges_contract_id_fkey`: `FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE RESTRICT`
- `one_off_charges_contract_id_not_null`: `NOT NULL contract_id`
- `one_off_charges_created_at_not_null`: `NOT NULL created_at`
- `one_off_charges_id_not_null`: `NOT NULL id`
- `one_off_charges_label_not_null`: `NOT NULL label`
- `one_off_charges_pkey`: `PRIMARY KEY (id)`
- `one_off_charges_reason_not_null`: `NOT NULL reason`

## refresh_tokens

| Cột | Kiểu | NOT NULL |
|---|---|---|
| `id` | `uuid` | Có |
| `session_id` | `uuid` | Có |
| `token_hash` | `character varying(255)` | Có |
| `issued_at` | `timestamp with time zone` | Có |
| `used_at` | `timestamp with time zone` |  |
| `replaced_by_id` | `uuid` |  |
| `expires_at` | `timestamp with time zone` | Có |

- `refresh_tokens_expires_at_not_null`: `NOT NULL expires_at`
- `refresh_tokens_id_not_null`: `NOT NULL id`
- `refresh_tokens_issued_at_not_null`: `NOT NULL issued_at`
- `refresh_tokens_pkey`: `PRIMARY KEY (id)`
- `refresh_tokens_replaced_by_id_fkey`: `FOREIGN KEY (replaced_by_id) REFERENCES refresh_tokens(id) ON DELETE RESTRICT`
- `refresh_tokens_session_id_fkey`: `FOREIGN KEY (session_id) REFERENCES auth_sessions(id) ON DELETE RESTRICT`
- `refresh_tokens_session_id_not_null`: `NOT NULL session_id`
- `refresh_tokens_token_hash_not_null`: `NOT NULL token_hash`

## room_meters

| Cột | Kiểu | NOT NULL |
|---|---|---|
| `id` | `uuid` | Có |
| `room_id` | `uuid` | Có |
| `type` | `character varying(20)` | Có |
| `serial` | `character varying(50)` | Có |
| `installed_on` | `date` | Có |
| `initial_reading` | `numeric(18,3)` | Có |
| `active` | `boolean` | Có |
| `created_at` | `timestamp with time zone` | Có |
| `updated_at` | `timestamp with time zone` | Có |
| `version` | `bigint` | Có |

- `room_meters_active_not_null`: `NOT NULL active`
- `room_meters_created_at_not_null`: `NOT NULL created_at`
- `room_meters_id_not_null`: `NOT NULL id`
- `room_meters_initial_reading_not_null`: `NOT NULL initial_reading`
- `room_meters_installed_on_not_null`: `NOT NULL installed_on`
- `room_meters_pkey`: `PRIMARY KEY (id)`
- `room_meters_room_id_fkey`: `FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT`
- `room_meters_room_id_not_null`: `NOT NULL room_id`
- `room_meters_serial_not_null`: `NOT NULL serial`
- `room_meters_type_not_null`: `NOT NULL type`
- `room_meters_updated_at_not_null`: `NOT NULL updated_at`
- `room_meters_version_not_null`: `NOT NULL version`
- `uq_room_meter_type`: `UNIQUE (room_id, type)`

## rooms

| Cột | Kiểu | NOT NULL |
|---|---|---|
| `id` | `uuid` | Có |
| `building_id` | `uuid` | Có |
| `floor_id` | `uuid` |  |
| `room_number` | `character varying(50)` | Có |
| `base_price` | `numeric(19,0)` | Có |
| `deposit_amount` | `numeric(19,0)` | Có |
| `area` | `numeric(8,2)` |  |
| `max_tenants` | `integer` | Có |
| `bookable` | `boolean` | Có |
| `status` | `character varying(30)` | Có |
| `created_at` | `timestamp with time zone` | Có |
| `updated_at` | `timestamp with time zone` | Có |
| `version` | `bigint` | Có |

- `chk_room_status`: `CHECK (((status)::text = ANY ((ARRAY['VACANT'::character varying, 'RENTED'::character varying, 'DEPOSIT_RESERVED'::character varying, 'MAINTENANCE'::character varying])::text[])))`
- `rooms_base_price_not_null`: `NOT NULL base_price`
- `rooms_bookable_not_null`: `NOT NULL bookable`
- `rooms_building_id_fkey`: `FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE RESTRICT`
- `rooms_building_id_not_null`: `NOT NULL building_id`
- `rooms_created_at_not_null`: `NOT NULL created_at`
- `rooms_deposit_amount_not_null`: `NOT NULL deposit_amount`
- `rooms_floor_id_fkey`: `FOREIGN KEY (floor_id) REFERENCES floors(id) ON DELETE RESTRICT`
- `rooms_id_not_null`: `NOT NULL id`
- `rooms_max_tenants_not_null`: `NOT NULL max_tenants`
- `rooms_pkey`: `PRIMARY KEY (id)`
- `rooms_room_number_not_null`: `NOT NULL room_number`
- `rooms_status_not_null`: `NOT NULL status`
- `rooms_updated_at_not_null`: `NOT NULL updated_at`
- `rooms_version_not_null`: `NOT NULL version`
- `uq_building_room_number`: `UNIQUE (building_id, room_number)`

## service_definitions

| Cột | Kiểu | NOT NULL |
|---|---|---|
| `id` | `uuid` | Có |
| `name` | `character varying(100)` | Có |
| `unit` | `character varying(20)` | Có |
| `calculation_type` | `character varying(30)` | Có |
| `active` | `boolean` | Có |
| `created_at` | `timestamp with time zone` | Có |
| `updated_at` | `timestamp with time zone` | Có |
| `version` | `bigint` | Có |

- `service_definitions_active_not_null`: `NOT NULL active`
- `service_definitions_calculation_type_not_null`: `NOT NULL calculation_type`
- `service_definitions_created_at_not_null`: `NOT NULL created_at`
- `service_definitions_id_not_null`: `NOT NULL id`
- `service_definitions_name_not_null`: `NOT NULL name`
- `service_definitions_pkey`: `PRIMARY KEY (id)`
- `service_definitions_unit_not_null`: `NOT NULL unit`
- `service_definitions_updated_at_not_null`: `NOT NULL updated_at`
- `service_definitions_version_not_null`: `NOT NULL version`

## stored_files

| Cột | Kiểu | NOT NULL |
|---|---|---|
| `id` | `uuid` | Có |
| `storage_key` | `character varying(255)` | Có |
| `original_name` | `character varying(255)` | Có |
| `mime_type` | `character varying(100)` | Có |
| `size` | `bigint` | Có |
| `uploaded_by` | `uuid` | Có |
| `parent_type` | `character varying(50)` | Có |
| `parent_id` | `uuid` |  |
| `status` | `character varying(20)` | Có |
| `created_at` | `timestamp with time zone` | Có |

- `chk_stored_file_mime`: `CHECK (((mime_type)::text = ANY ((ARRAY['image/jpeg'::character varying, 'image/png'::character varying, 'image/webp'::character varying])::text[])))`
- `chk_stored_file_parent_type`: `CHECK (((parent_type)::text = ANY ((ARRAY['METER_READING'::character varying, 'MAINTENANCE_ISSUE'::character varying, 'INVOICE_FEEDBACK'::character varying])::text[])))`
- `chk_stored_file_size`: `CHECK (((size > 0) AND (size <= 5242880)))`
- `stored_files_created_at_not_null`: `NOT NULL created_at`
- `stored_files_id_not_null`: `NOT NULL id`
- `stored_files_mime_type_not_null`: `NOT NULL mime_type`
- `stored_files_original_name_not_null`: `NOT NULL original_name`
- `stored_files_parent_type_not_null`: `NOT NULL parent_type`
- `stored_files_pkey`: `PRIMARY KEY (id)`
- `stored_files_size_not_null`: `NOT NULL size`
- `stored_files_status_not_null`: `NOT NULL status`
- `stored_files_storage_key_key`: `UNIQUE (storage_key)`
- `stored_files_storage_key_not_null`: `NOT NULL storage_key`
- `stored_files_uploaded_by_fkey`: `FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT`
- `stored_files_uploaded_by_not_null`: `NOT NULL uploaded_by`

## tariffs

| Cột | Kiểu | NOT NULL |
|---|---|---|
| `id` | `uuid` | Có |
| `building_id` | `uuid` | Có |
| `service_id` | `uuid` | Có |
| `effective_month` | `character varying(7)` | Có |
| `unit_price` | `numeric(19,0)` | Có |
| `created_at` | `timestamp with time zone` | Có |
| `updated_at` | `timestamp with time zone` | Có |
| `version` | `bigint` | Có |

- `tariffs_building_id_fkey`: `FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE RESTRICT`
- `tariffs_building_id_not_null`: `NOT NULL building_id`
- `tariffs_created_at_not_null`: `NOT NULL created_at`
- `tariffs_effective_month_not_null`: `NOT NULL effective_month`
- `tariffs_id_not_null`: `NOT NULL id`
- `tariffs_pkey`: `PRIMARY KEY (id)`
- `tariffs_service_id_fkey`: `FOREIGN KEY (service_id) REFERENCES service_definitions(id) ON DELETE RESTRICT`
- `tariffs_service_id_not_null`: `NOT NULL service_id`
- `tariffs_unit_price_check`: `CHECK ((unit_price >= (0)::numeric))`
- `tariffs_unit_price_not_null`: `NOT NULL unit_price`
- `tariffs_updated_at_not_null`: `NOT NULL updated_at`
- `tariffs_version_not_null`: `NOT NULL version`
- `uq_building_service_month`: `UNIQUE (building_id, service_id, effective_month)`

## tenant_profiles

| Cột | Kiểu | NOT NULL |
|---|---|---|
| `id` | `uuid` | Có |
| `user_id` | `uuid` |  |
| `full_name` | `character varying(100)` | Có |
| `phone` | `character varying(20)` | Có |
| `citizen_id_masked` | `character varying(20)` | Có |
| `email` | `character varying(100)` |  |
| `created_at` | `timestamp with time zone` | Có |
| `updated_at` | `timestamp with time zone` | Có |
| `version` | `bigint` | Có |
| `created_by` | `uuid` |  |

- `tenant_profiles_citizen_id_masked_not_null`: `NOT NULL citizen_id_masked`
- `tenant_profiles_created_at_not_null`: `NOT NULL created_at`
- `tenant_profiles_created_by_fkey`: `FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT`
- `tenant_profiles_full_name_not_null`: `NOT NULL full_name`
- `tenant_profiles_id_not_null`: `NOT NULL id`
- `tenant_profiles_phone_not_null`: `NOT NULL phone`
- `tenant_profiles_pkey`: `PRIMARY KEY (id)`
- `tenant_profiles_updated_at_not_null`: `NOT NULL updated_at`
- `tenant_profiles_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT`
- `tenant_profiles_version_not_null`: `NOT NULL version`

## users

| Cột | Kiểu | NOT NULL |
|---|---|---|
| `id` | `uuid` | Có |
| `login` | `character varying(50)` | Có |
| `password_hash` | `character varying(255)` | Có |
| `role` | `character varying(20)` | Có |
| `enabled` | `boolean` | Có |
| `created_at` | `timestamp with time zone` | Có |
| `updated_at` | `timestamp with time zone` | Có |
| `version` | `bigint` | Có |

- `users_created_at_not_null`: `NOT NULL created_at`
- `users_enabled_not_null`: `NOT NULL enabled`
- `users_id_not_null`: `NOT NULL id`
- `users_login_key`: `UNIQUE (login)`
- `users_login_not_null`: `NOT NULL login`
- `users_password_hash_not_null`: `NOT NULL password_hash`
- `users_pkey`: `PRIMARY KEY (id)`
- `users_role_check`: `CHECK (((role)::text = ANY ((ARRAY['OWNER'::character varying, 'STAFF'::character varying, 'TENANT'::character varying])::text[])))`
- `users_role_not_null`: `NOT NULL role`
- `users_updated_at_not_null`: `NOT NULL updated_at`
- `users_version_not_null`: `NOT NULL version`
