# Thiết kế Cơ sở Dữ liệu & ERD (docs/ERD.md)

Tài liệu này xác định chi tiết cấu trúc bảng, kiểu dữ liệu, khóa chính, khóa ngoại, ràng buộc tính duy nhất, mô hình sổ cái (Ledger), và ánh xạ quy tắc nghiệp vụ (BR) cho cơ sở dữ liệu PostgreSQL 16 của TroHub.

---

## 1. Quy ước kiểu dữ liệu và chuẩn thiết kế

1. **Khóa chính (PK)**: Mọi bảng sử dụng `id UUID DEFAULT gen_random_uuid() PRIMARY KEY`.
2. **Tiền tệ**: Mọi trường tiền tệ sử dụng kiểu `numeric(19,0)`, không có phần thập phân (VND), không âm trừ khi là trường `signed_amount` hoặc `delta_amount`. Tuyệt đối không dùng `float` hay `double` (BR-005, BR-007).
3. **Số lượng & Chỉ số**: Mọi trường chỉ số điện, nước, sản lượng sử dụng `numeric(18,3)` (BR-008).
4. **Thời gian**:
   - Ngày nghiệp vụ: `date` (`LocalDate` theo múi giờ `Asia/Ho_Chi_Minh`) (BR-009).
   - Thời điểm thực thi/audit: `timestamptz` (lưu UTC, hiển thị theo múi giờ địa phương) (BR-009).
5. **Khoảng ngày nghiệp vụ**: Nửa mở `[startDate, endDateExclusive)` — ngày kết thúc không tính tiền (BR-036, BR-045).
6. **Khóa lạc quan (Optimistic Locking)**: Các bảng có khả năng cập nhật trạng thái đồng thời đều có cột `version BIGINT NOT NULL DEFAULT 0`.
7. **Khóa ngoại (FK)**: Dùng `ON DELETE RESTRICT` để ngăn xóa cứng các bản ghi đã có lịch sử tham chiếu (BR-010).

---

## 2. Danh mục Bảng chi tiết

### 2.1. Module Identity & Authentication

#### Bảng `users` (Tài khoản người dùng)
| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả & Quy tắc BR |
|---|---|---|---|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Định danh người dùng |
| `login` | VARCHAR(50) | NOT NULL, UNIQUE | Tên đăng nhập (hoặc số điện thoại) |
| `password_hash`| VARCHAR(255) | NOT NULL | Mật khẩu băm BCrypt |
| `role` | VARCHAR(20) | NOT NULL | `OWNER`, `STAFF`, `TENANT` (BR-002) |
| `enabled` | BOOLEAN | NOT NULL DEFAULT true | Trạng thái kích hoạt (BR-025) |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT clock_timestamp() | Thời điểm tạo |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT clock_timestamp() | Thời điểm cập nhật |
| `version` | BIGINT | NOT NULL DEFAULT 0 | Khóa lạc quan |

#### Bảng `building_staff_assignments` (Phân công quản lý tòa nhà)
| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả & Quy tắc BR |
|---|---|---|---|
| `id` | UUID | PK | Định danh bản ghi phân công |
| `user_id` | UUID | NOT NULL, FK -> users(id) RESTRICT | Nhân viên được giao (role STAFF) |
| `building_id` | UUID | NOT NULL, FK -> buildings(id) RESTRICT| Tòa nhà được phân công (BR-013) |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT clock_timestamp() | Thời điểm phân công |
*Ràng buộc duy nhất*: `CONSTRAINT uq_staff_building UNIQUE (user_id, building_id)`

#### Bảng `invites` (Mã mời kích hoạt & Đặt lại mật khẩu)
| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả & Quy tắc BR |
|---|---|---|---|
| `id` | UUID | PK | Định danh lời mời |
| `user_id` | UUID | NOT NULL, FK -> users(id) RESTRICT | Tài khoản được mời |
| `code_hash` | VARCHAR(255) | NOT NULL | Hash của mã ngẫu nhiên (BR-016) |
| `purpose` | VARCHAR(30) | NOT NULL | `TENANT_INVITE`, `PASSWORD_RESET` |
| `expires_at` | TIMESTAMPTZ | NOT NULL | Hạn sử dụng (24 giờ) (BR-016) |
| `consumed_at`| TIMESTAMPTZ | NULL | Thời điểm đã kích hoạt |
| `created_by` | UUID | NOT NULL, FK -> users(id) RESTRICT | Quản lý tạo mã mời |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT clock_timestamp() | Thời điểm tạo |

#### Bảng `auth_sessions` (Phiên làm việc & Token Family)
| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả & Quy tắc BR |
|---|---|---|---|
| `id` | UUID | PK | Session ID |
| `user_id` | UUID | NOT NULL, FK -> users(id) RESTRICT | Chủ tài khoản |
| `family_id` | UUID | NOT NULL | Token Family ID (phát hiện tái sử dụng)|
| `expires_at` | TIMESTAMPTZ | NOT NULL | Thời hạn tuyệt đối (7 ngày) |
| `revoked_at` | TIMESTAMPTZ | NULL | Thời điểm thu hồi phiên |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT clock_timestamp() | Thời điểm bắt đầu phiên |

#### Bảng `refresh_tokens` (Lịch sử xoay vòng Refresh Token)
| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả & Quy tắc BR |
|---|---|---|---|
| `id` | UUID | PK | Token record ID |
| `session_id` | UUID | NOT NULL, FK -> auth_sessions(id) RESTRICT | Phiên làm việc |
| `token_hash` | VARCHAR(255) | NOT NULL | Hash của refresh token opaque |
| `issued_at` | TIMESTAMPTZ | NOT NULL DEFAULT clock_timestamp() | Thời điểm cấp |
| `used_at` | TIMESTAMPTZ | NULL | Thời điểm đã xoay vòng |
| `replaced_by_id`| UUID | NULL, FK -> refresh_tokens(id) RESTRICT | Token thay thế |
| `expires_at` | TIMESTAMPTZ | NOT NULL | Hạn của token này |

---

### 2.2. Module Property & Billing Settings

#### Bảng `buildings` (Tòa nhà / Khu trọ)
| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả & Quy tắc BR |
|---|---|---|---|
| `id` | UUID | PK | Định danh tòa nhà |
| `name` | VARCHAR(100) | NOT NULL | Tên tòa nhà |
| `address` | VARCHAR(255) | NOT NULL | Địa chỉ tòa nhà |
| `active` | BOOLEAN | NOT NULL DEFAULT true | Trạng thái hoạt động (BR-010) |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT clock_timestamp() | Thời điểm tạo |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT clock_timestamp() | Thời điểm cập nhật |
| `version` | BIGINT | NOT NULL DEFAULT 0 | Khóa lạc quan |

#### Bảng `building_billing_settings` (Cấu hình hạn và ngưỡng cảnh báo tòa)
| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả & Quy tắc BR |
|---|---|---|---|
| `id` | UUID | PK | ID cấu hình |
| `building_id` | UUID | NOT NULL, UNIQUE, FK -> buildings(id) RESTRICT | Tòa nhà áp dụng |
| `due_days` | INT | NOT NULL DEFAULT 7 | Số ngày thanh toán (mặc định 7) (BR-086)|
| `water_absolute_threshold` | NUMERIC(18,3) | NOT NULL DEFAULT 10.000 | Ngưỡng vượt nước tuyệt đối (m³) (BR-142)|
| `electricity_absolute_threshold`| NUMERIC(18,3) | NOT NULL DEFAULT 100.000 | Ngưỡng vượt điện tuyệt đối (kWh) (BR-142)|
| `version` | BIGINT | NOT NULL DEFAULT 0 | Khóa lạc quan |

#### Bảng `floors` (Tầng)
| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả & Quy tắc BR |
|---|---|---|---|
| `id` | UUID | PK | Định danh tầng |
| `building_id` | UUID | NOT NULL, FK -> buildings(id) RESTRICT | Tòa nhà cha |
| `label` | VARCHAR(50) | NOT NULL | Tên tầng (Tầng 1, Tầng 2, ...) |
| `sort_order` | INT | NOT NULL DEFAULT 1 | Thứ tự hiển thị |
| `active` | BOOLEAN | NOT NULL DEFAULT true | Trạng thái hoạt động |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT clock_timestamp() | Thời điểm tạo |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT clock_timestamp() | Thời điểm cập nhật |
| `version` | BIGINT | NOT NULL DEFAULT 0 | Khóa lạc quan |
*Ràng buộc duy nhất*: `CONSTRAINT uq_floor_building_label UNIQUE (building_id, label)`

#### Bảng `rooms` (Phòng trọ)
| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả & Quy tắc BR |
|---|---|---|---|
| `id` | UUID | PK | Định danh phòng |
| `building_id` | UUID | NOT NULL, FK -> buildings(id) RESTRICT | Tòa nhà cha |
| `floor_id` | UUID | NOT NULL, FK -> floors(id) RESTRICT | Tầng |
| `code` | VARCHAR(50) | NOT NULL | Mã phòng (P101, P102) (BR-027) |
| `capacity` | INT | NOT NULL CHECK (capacity > 0) | Sức chứa người tối đa (BR-027) |
| `bookable` | BOOLEAN | NOT NULL DEFAULT true | Sẵn sàng cho thuê (BR-029) |
| `base_rent` | NUMERIC(19,0)| NOT NULL CHECK (base_rent >= 0) | Giá thuê niêm yết tham khảo (BR-056)|
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT clock_timestamp() | Thời điểm tạo |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT clock_timestamp() | Thời điểm cập nhật |
| `version` | BIGINT | NOT NULL DEFAULT 0 | Khóa lạc quan |
*Ràng buộc duy nhất*: `CONSTRAINT uq_room_building_code UNIQUE (building_id, code)`

---

### 2.3. Module Tenancy & Contracts

#### Bảng `tenant_profiles` (Hồ sơ cư dân)
| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả & Quy tắc BR |
|---|---|---|---|
| `id` | UUID | PK | Định danh hồ sơ |
| `user_id` | UUID | NULL, FK -> users(id) RESTRICT | Tài khoản đăng nhập (BR-017, BR-020)|
| `full_name` | VARCHAR(100) | NOT NULL | Họ và tên |
| `phone` | VARCHAR(20) | NOT NULL | Số điện thoại liên hệ |
| `citizen_id_masked`| VARCHAR(20) | NOT NULL | CCCD (đã che, không lưu lộ CCCD thật)|
| `email` | VARCHAR(100) | NULL | Email |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT clock_timestamp() | Thời điểm tạo |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT clock_timestamp() | Thời điểm cập nhật |
| `version` | BIGINT | NOT NULL DEFAULT 0 | Khóa lạc quan |

#### Bảng `contracts` (Hợp đồng thuê phòng)
| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả & Quy tắc BR |
|---|---|---|---|
| `id` | UUID | PK | Định danh hợp đồng |
| `room_id` | UUID | NOT NULL, FK -> rooms(id) RESTRICT | Phòng thuê |
| `representative_tenant_id`| UUID | NOT NULL, FK -> tenant_profiles(id) RESTRICT | Người đại diện hợp đồng (BR-018) |
| `status` | VARCHAR(20) | NOT NULL | `DRAFT`, `ACTIVE`, `ENDED` (BR-032) |
| `actual_start_date`| DATE | NOT NULL | Ngày nhận phòng thực tế (BR-036) |
| `planned_end_exclusive`| DATE | NOT NULL | Ngày trả dự kiến (cận không gồm) (BR-038)|
| `actual_checkout_date`| DATE | NULL | Ngày trả phòng thực tế (BR-036, BR-043)|
| `rent` | NUMERIC(19,0)| NOT NULL CHECK (rent >= 0) | Giá thuê cố định của hợp đồng (BR-041)|
| `deposit_required`| NUMERIC(19,0)| NOT NULL CHECK (deposit_required >= 0) | Mức tiền cọc thỏa thuận (BR-109) |
| `deposit_settlement_at`| TIMESTAMPTZ | NULL | Thời điểm xác nhận quyết toán cọc (BR-120)|
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT clock_timestamp() | Thời điểm tạo |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT clock_timestamp() | Thời điểm cập nhật |
| `version` | BIGINT | NOT NULL DEFAULT 0 | Khóa lạc quan |
*Chỉ mục duy nhất bắt buộc (Partial Index)*:
```sql
CREATE UNIQUE INDEX uq_active_room_contract ON contracts(room_id) WHERE status = 'ACTIVE';
```
*(Đảm bảo một phòng chỉ có tối đa một hợp đồng ACTIVE tại một thời điểm — BR-035, EX-22)*.

#### Bảng `contract_members` (Thành viên cư trú trong hợp đồng)
| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả & Quy tắc BR |
|---|---|---|---|
| `id` | UUID | PK | Định danh bản ghi thành viên |
| `contract_id` | UUID | NOT NULL, FK -> contracts(id) RESTRICT | Hợp đồng cư trú |
| `tenant_id` | UUID | NOT NULL, FK -> tenant_profiles(id) RESTRICT | Hồ sơ người ở |
| `joined_on` | DATE | NOT NULL | Ngày vào ở `[joined_on, left_on)` (BR-045)|
| `left_on` | DATE | NULL | Ngày rời phòng (cận không bao gồm) |
| `is_representative`| BOOLEAN | NOT NULL DEFAULT false | Đánh dấu người đại diện (BR-018) |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT clock_timestamp() | Thời điểm tạo |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT clock_timestamp() | Thời điểm cập nhật |
| `version` | BIGINT | NOT NULL DEFAULT 0 | Khóa lạc quan |

#### Bảng `contract_events` (Nhật ký sự kiện hợp đồng)
| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả & Quy tắc BR |
|---|---|---|---|
| `id` | UUID | PK | Event ID |
| `contract_id` | UUID | NOT NULL, FK -> contracts(id) RESTRICT | Hợp đồng |
| `type` | VARCHAR(50) | NOT NULL | `ACTIVATION`, `EXTENSION`, `CHECKOUT` |
| `old_value` | TEXT | NULL | Giá trị cũ (JSON) |
| `new_value` | TEXT | NOT NULL | Giá trị mới (JSON) |
| `reason` | TEXT | NOT NULL | Lý do thực hiện |
| `actor_id` | UUID | NOT NULL, FK -> users(id) RESTRICT | Người thực hiện |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT clock_timestamp() | Thời điểm ghi |

---

### 2.4. Module Services, Meters & Pricing

#### Bảng `service_definitions` (Định nghĩa loại phí/dịch vụ)
| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả & Quy tắc BR |
|---|---|---|---|
| `id` | UUID | PK | Định danh dịch vụ |
| `name` | VARCHAR(100) | NOT NULL | Tên dịch vụ (Điện, Nước, Vệ sinh, Wifi)|
| `unit` | VARCHAR(20) | NOT NULL | Đơn vị tính (kWh, m³, phòng/tháng, người)|
| `calculation_type` | VARCHAR(30) | NOT NULL | `ROOM_MONTHLY`, `PERSON_MONTHLY`, `METERED`, `ONE_OFF` (BR-069..074)|
| `active` | BOOLEAN | NOT NULL DEFAULT true | Trạng thái kích hoạt |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT clock_timestamp() | Thời điểm tạo |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT clock_timestamp() | Thời điểm cập nhật |
| `version` | BIGINT | NOT NULL DEFAULT 0 | Khóa lạc quan |

#### Bảng `tariffs` (Bảng giá dịch vụ theo tòa và tháng hiệu lực)
| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả & Quy tắc BR |
|---|---|---|---|
| `id` | UUID | PK | Định danh mức giá |
| `building_id` | UUID | NOT NULL, FK -> buildings(id) RESTRICT | Tòa nhà áp dụng |
| `service_id` | UUID | NOT NULL, FK -> service_definitions(id) RESTRICT | Dịch vụ tính giá |
| `effective_month`| VARCHAR(7) | NOT NULL | Tháng bắt đầu hiệu lực (`YYYY-MM`) (BR-064)|
| `unit_price` | NUMERIC(19,0)| NOT NULL CHECK (unit_price >= 0) | Đơn giá áp dụng (BR-064) |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT clock_timestamp() | Thời điểm tạo |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT clock_timestamp() | Thời điểm cập nhật |
| `version` | BIGINT | NOT NULL DEFAULT 0 | Khóa lạc quan |
*Ràng buộc duy nhất*: `CONSTRAINT uq_building_service_month UNIQUE (building_id, service_id, effective_month)`

#### Bảng `contract_service_subscriptions` (Đăng ký dịch vụ của hợp đồng)
| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả & Quy tắc BR |
|---|---|---|---|
| `id` | UUID | PK | Định danh đăng ký |
| `contract_id` | UUID | NOT NULL, FK -> contracts(id) RESTRICT | Hợp đồng |
| `service_id` | UUID | NOT NULL, FK -> service_definitions(id) RESTRICT| Dịch vụ đăng ký |
| `start_month` | VARCHAR(7) | NOT NULL | Tháng bắt đầu sử dụng (`YYYY-MM`) |
| `end_month_exclusive`| VARCHAR(7)| NULL | Tháng ngừng sử dụng |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT clock_timestamp() | Thời điểm tạo |

#### Bảng `room_meters` (Đồng hồ đo điện/nước phòng)
| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả & Quy tắc BR |
|---|---|---|---|
| `id` | UUID | PK | Định danh đồng hồ |
| `room_id` | UUID | NOT NULL, FK -> rooms(id) RESTRICT | Phòng lắp đặt |
| `type` | VARCHAR(20) | NOT NULL | `ELECTRICITY`, `WATER` |
| `serial` | VARCHAR(50) | NOT NULL | Số seri công tơ |
| `installed_on` | DATE | NOT NULL | Ngày lắp đặt |
| `initial_reading`| NUMERIC(18,3)| NOT NULL DEFAULT 0.000 | Chỉ số ban đầu |
| `active` | BOOLEAN | NOT NULL DEFAULT true | Đang hoạt động |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT clock_timestamp() | Thời điểm tạo |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT clock_timestamp() | Thời điểm cập nhật |
| `version` | BIGINT | NOT NULL DEFAULT 0 | Khóa lạc quan |

#### Bảng `meter_readings` (Bản ghi chỉ số công tơ)
| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả & Quy tắc BR |
|---|---|---|---|
| `id` | UUID | PK | Định danh bản ghi chỉ số |
| `meter_id` | UUID | NOT NULL, FK -> room_meters(id) RESTRICT | Đồng hồ đo |
| `reading_date` | DATE | NOT NULL | Ngày ghi chỉ số (BR-061) |
| `value` | NUMERIC(18,3)| NOT NULL CHECK (value >= 0) | Chỉ số đọc được (BR-008, BR-059) |
| `kind` | VARCHAR(20) | NOT NULL | `HANDOVER`, `PERIOD_END`, `CHECKOUT` |
| `file_id` | UUID | NULL, FK -> stored_files(id) RESTRICT | Ảnh công tơ đính kèm (BR-061) |
| `created_by` | UUID | NOT NULL, FK -> users(id) RESTRICT | Người nhập số |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT clock_timestamp() | Thời điểm ghi |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT clock_timestamp() | Thời điểm sửa nháp |
| `version` | BIGINT | NOT NULL DEFAULT 0 | Khóa lạc quan |

#### Bảng `consumption_alerts` (Cảnh báo tiêu thụ bất thường)
| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả & Quy tắc BR |
|---|---|---|---|
| `id` | UUID | PK | Định danh cảnh báo |
| `contract_id` | UUID | NOT NULL, FK -> contracts(id) RESTRICT | Hợp đồng liên quan |
| `meter_type` | VARCHAR(20) | NOT NULL | `ELECTRICITY`, `WATER` |
| `billing_month` | VARCHAR(7) | NOT NULL | Kỳ đánh giá (`YYYY-MM`) (BR-139) |
| `reading_version`| BIGINT | NOT NULL | Phiên bản chỉ số khi đánh giá (BR-146)|
| `evaluation_status`| VARCHAR(30)| NOT NULL | `NORMAL`, `WARNING`, `INSUFFICIENT_DATA`, `NOT_COMPARABLE` (BR-143)|
| `comparison_snapshot`| JSONB | NOT NULL | Snapshot 3 kỳ trước, trung vị, chênh lệch (BR-144)|
| `acknowledged_by`| UUID | NULL, FK -> users(id) RESTRICT | Quản lý xác nhận số đúng (BR-145) |
| `acknowledged_at`| TIMESTAMPTZ| NULL | Thời điểm xác nhận |
| `reason` | TEXT | NULL | Lý do giải trình của quản lý (BR-145) |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT clock_timestamp() | Thời điểm đánh giá |

#### Bảng `one_off_charges` (Khoản thu phát sinh bổ sung)
| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả & Quy tắc BR |
|---|---|---|---|
| `id` | UUID | PK | Định danh khoản thu |
| `contract_id` | UUID | NOT NULL, FK -> contracts(id) RESTRICT | Hợp đồng chịu phí |
| `billing_month` | VARCHAR(7) | NOT NULL | Tháng áp dụng (`YYYY-MM`) |
| `label` | VARCHAR(100) | NOT NULL | Tên khoản thu |
| `amount` | NUMERIC(19,0)| NOT NULL CHECK (amount >= 0) | Số tiền (BR-073) |
| `reason` | TEXT | NOT NULL | Lý do thu (BR-073) |
| `source_ref` | VARCHAR(100) | NULL | Mã liên kết sự cố/sửa chữa (BR-117) |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT clock_timestamp() | Thời điểm tạo |

---

### 2.5. Module Billing & Invoices

#### Bảng `invoices` (Hóa đơn kỳ)
| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả & Quy tắc BR |
|---|---|---|---|
| `id` | UUID | PK | Định danh hóa đơn |
| `contract_id` | UUID | NOT NULL, FK -> contracts(id) RESTRICT | Hợp đồng (BR-049) |
| `billing_month` | VARCHAR(7) | NOT NULL | Tháng tính tiền (`YYYY-MM`) (BR-049) |
| `status` | VARCHAR(20) | NOT NULL | `DRAFT`, `ISSUED` (BR-075) |
| `period_start` | DATE | NOT NULL | Bắt đầu khoảng tính `[start, end)` (BR-050)|
| `period_end_exclusive`| DATE | NOT NULL | Kết thúc khoảng tính (không bao gồm) |
| `due_date` | DATE | NOT NULL | Ngày đến hạn nợ (BR-086) |
| `issued_at` | TIMESTAMPTZ | NULL | Thời điểm phát hành chính thức (BR-078)|
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT clock_timestamp() | Thời điểm lập nháp |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT clock_timestamp() | Thời điểm cập nhật |
| `version` | BIGINT | NOT NULL DEFAULT 0 | Khóa lạc quan |
*Ràng buộc duy nhất*: `CONSTRAINT uq_invoice_contract_month UNIQUE (contract_id, billing_month)`
*(Đảm bảo mỗi hợp đồng chỉ có đúng một hóa đơn cho một tháng lịch — BR-049, EX-23)*.

#### Bảng `invoice_items` (Chi tiết dòng hóa đơn snapshot)
| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả & Quy tắc BR |
|---|---|---|---|
| `id` | UUID | PK | Định danh dòng |
| `invoice_id` | UUID | NOT NULL, FK -> invoices(id) RESTRICT | Hóa đơn cha (BR-078) |
| `type` | VARCHAR(30) | NOT NULL | `RENT`, `ELECTRICITY`, `WATER`, `SERVICE`, `ONE_OFF` |
| `label` | VARCHAR(100) | NOT NULL | Tên dòng hiển thị (BR-068) |
| `quantity` | NUMERIC(18,3)| NOT NULL | Số ngày, số kWh, số m³, người-ngày (BR-068)|
| `unit_price` | NUMERIC(19,0)| NOT NULL | Đơn giá được snapshot (BR-068) |
| `amount` | NUMERIC(19,0)| NOT NULL | Thành tiền làm tròn HALF_UP đến đồng (BR-006)|
| `calculation_snapshot`| JSONB | NOT NULL | Công thức và tham số chi tiết (BR-068) |
| `reading_refs` | JSONB | NULL | Chỉ số đầu/cuối và ID reading (BR-058) |
| `tariff_ref` | UUID | NULL | ID của Tariff đã snapshot |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT clock_timestamp() | Thời điểm tạo |

#### Bảng `invoice_adjustments` (Điều chỉnh giá trị hóa đơn đã phát hành)
| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả & Quy tắc BR |
|---|---|---|---|
| `id` | UUID | PK | Định danh điều chỉnh |
| `invoice_id` | UUID | NOT NULL, FK -> invoices(id) RESTRICT | Hóa đơn được điều chỉnh (BR-080) |
| `delta_amount` | NUMERIC(19,0)| NOT NULL CHECK (delta_amount <> 0) | Chênh lệch có dấu (+ hoặc -) (BR-081) |
| `reason` | TEXT | NOT NULL | Lý do điều chỉnh (BR-080) |
| `old_snapshot` | JSONB | NOT NULL | Snapshot dữ liệu trước điều chỉnh |
| `new_snapshot` | JSONB | NOT NULL | Snapshot dữ liệu sau điều chỉnh |
| `effective_date`| DATE | NOT NULL | Ngày có hiệu lực nghiệp vụ (BR-080) |
| `recorded_at` | TIMESTAMPTZ | NOT NULL DEFAULT clock_timestamp() | Thời điểm ghi hệ thống |
| `created_by` | UUID | NOT NULL, FK -> users(id) RESTRICT | Quản lý thực hiện |
| `operation_id` | UUID | NOT NULL, FK -> financial_operations(id) RESTRICT| Giao dịch idempotent bảo vệ |

#### Bảng `invoice_notes` (Ghi chú đính chính mô tả phi tài chính)
| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả & Quy tắc BR |
|---|---|---|---|
| `id` | UUID | PK | ID ghi chú |
| `invoice_id` | UUID | NOT NULL, FK -> invoices(id) RESTRICT | Hóa đơn |
| `content` | TEXT | NOT NULL | Nội dung đính chính (BR-083) |
| `reason` | TEXT | NOT NULL | Lý do ghi chú |
| `created_by` | UUID | NOT NULL, FK -> users(id) RESTRICT | Người ghi |
| `recorded_at` | TIMESTAMPTZ | NOT NULL DEFAULT clock_timestamp() | Thời điểm ghi |

---

### 2.6. Module Finance & Ledgers

#### Bảng `financial_operations` (Quản lý giao dịch tài chính Idempotent)
| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả & Quy tắc BR |
|---|---|---|---|
| `id` | UUID | PK | ID thao tác tài chính |
| `idempotency_key`| VARCHAR(100) | NOT NULL, UNIQUE | Khóa chống trùng do client gửi (BR-103)|
| `actor_id` | UUID | NOT NULL, FK -> users(id) RESTRICT | Người thực hiện |
| `action` | VARCHAR(50) | NOT NULL | `PAYMENT`, `CORRECTION`, `REFUND`, `CREDIT_TRANSFER`, `DEPOSIT_RECEIPT`, `DEPOSIT_OFFSET`, `DEPOSIT_DEDUCTION` |
| `request_hash` | VARCHAR(64) | NOT NULL | SHA-256 hash của request payload (BR-103)|
| `status` | VARCHAR(20) | NOT NULL | `SUCCESS`, `FAILED` |
| `response_snapshot`| TEXT | NOT NULL | Kết quả lưu lại để trả cho request retry|
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT clock_timestamp() | Thời điểm thực thi |

#### Bảng `invoice_ledger_entries` (Sổ cái thanh toán hóa đơn — Append-only)
| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả & Quy tắc BR |
|---|---|---|---|
| `id` | UUID | PK | Định danh dòng sổ cái |
| `invoice_id` | UUID | NOT NULL, FK -> invoices(id) RESTRICT | Hóa đơn áp dụng (BR-111) |
| `type` | VARCHAR(30) | NOT NULL | `PAYMENT`, `PAYMENT_CORRECTION`, `REFUND`, `CREDIT_OUT`, `CREDIT_IN`, `DEPOSIT_OFFSET_IN` (Mục 6 BR)|
| `signed_amount` | NUMERIC(19,0)| NOT NULL CHECK (signed_amount <> 0) | Số tiền có dấu áp dụng cho hóa đơn |
| `original_entry_id`| UUID | NULL, FK -> invoice_ledger_entries(id) RESTRICT| Tham chiếu bút toán gốc khi sửa sai |
| `operation_id` | UUID | NOT NULL, FK -> financial_operations(id) RESTRICT| Giao dịch idempotent sinh bút toán |
| `transfer_id` | UUID | NULL | Cặp chuyển dư giữa 2 hóa đơn (BR-101)|
| `effective_date`| DATE | NOT NULL | Ngày ghi nhận nghiệp vụ (BR-148) |
| `recorded_at` | TIMESTAMPTZ | NOT NULL DEFAULT clock_timestamp() | Thời điểm ghi hệ thống |
| `created_by` | UUID | NOT NULL, FK -> users(id) RESTRICT | Người thu / thực hiện |
| `reason` | TEXT | NULL | Lý do (bắt buộc khi sửa sai/hoàn/chuyển dư)|
| `payment_method`| VARCHAR(50) | NULL | `CASH`, `BANK_TRANSFER_MANUAL` (BR-092) |
| `reference_code`| VARCHAR(100) | NULL | Mã giao dịch tham chiếu tùy chọn |

#### Bảng `deposit_ledger_entries` (Sổ cái tiền cọc — Append-only)
| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả & Quy tắc BR |
|---|---|---|---|
| `id` | UUID | PK | Định danh dòng sổ cọc |
| `contract_id` | UUID | NOT NULL, FK -> contracts(id) RESTRICT | Hợp đồng sở hữu cọc (BR-109) |
| `type` | VARCHAR(30) | NOT NULL | `RECEIPT`, `RECEIPT_CORRECTION`, `REFUND`, `DEDUCTION`, `OFFSET_OUT` (BR-110)|
| `signed_amount` | NUMERIC(19,0)| NOT NULL CHECK (signed_amount <> 0) | Số tiền có dấu áp dụng cho cọc |
| `original_entry_id`| UUID | NULL, FK -> deposit_ledger_entries(id) RESTRICT| Tham chiếu phiếu nhận cọc gốc khi sửa |
| `operation_id` | UUID | NOT NULL, FK -> financial_operations(id) RESTRICT| Giao dịch idempotent sinh bút toán |
| `transfer_id` | UUID | NULL | Mã liên kết khi bù trừ sang hóa đơn (BR-114)|
| `effective_date`| DATE | NOT NULL | Ngày nghiệp vụ (BR-148) |
| `recorded_at` | TIMESTAMPTZ | NOT NULL DEFAULT clock_timestamp() | Thời điểm ghi hệ thống |
| `created_by` | UUID | NOT NULL, FK -> users(id) RESTRICT | Người thực hiện |
| `reason` | TEXT | NOT NULL | Lý do (bắt buộc khi hoàn, khấu trừ, bù)|
| `source_ref` | VARCHAR(100) | NULL | Mã liên kết sự cố/chi phí (BR-117) |

---

### 2.7. Module Operations, Feedback & Notifications

#### Bảng `maintenance_issues` (Yêu cầu sự cố & sửa chữa)
| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả & Quy tắc BR |
|---|---|---|---|
| `id` | UUID | PK | Định danh yêu cầu sự cố |
| `contract_id` | UUID | NOT NULL, FK -> contracts(id) RESTRICT | Hợp đồng của người báo (BR-125) |
| `room_id` | UUID | NOT NULL, FK -> rooms(id) RESTRICT | Phòng xảy ra sự cố |
| `title` | VARCHAR(150) | NOT NULL | Tiêu đề sự cố |
| `description` | TEXT | NOT NULL | Mô tả chi tiết |
| `status` | VARCHAR(20) | NOT NULL | `OPEN`, `ACCEPTED`, `IN_PROGRESS`, `RESOLVED`, `CLOSED` (BR-126)|
| `assignee_id` | UUID | NULL, FK -> users(id) RESTRICT | Nhân viên được phân công xử lý |
| `created_by` | UUID | NOT NULL, FK -> users(id) RESTRICT | Người báo (Tenant hoặc Quản lý) |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT clock_timestamp() | Thời điểm tạo |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT clock_timestamp() | Thời điểm cập nhật |
| `version` | BIGINT | NOT NULL DEFAULT 0 | Khóa lạc quan |

#### Bảng `issue_status_history` (Lịch sử chuyển trạng thái sự cố)
| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả & Quy tắc BR |
|---|---|---|---|
| `id` | UUID | PK | ID lịch sử |
| `issue_id` | UUID | NOT NULL, FK -> maintenance_issues(id) RESTRICT| Sự cố cha |
| `old_status` | VARCHAR(20) | NOT NULL | Trạng thái trước |
| `new_status` | VARCHAR(20) | NOT NULL | Trạng thái mới |
| `comment` | TEXT | NULL | Ghi chú / lý do mở lại (BR-127, BR-128)|
| `actor_id` | UUID | NOT NULL, FK -> users(id) RESTRICT | Người thực hiện |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT clock_timestamp() | Thời điểm chuyển |

#### Bảng `invoice_feedbacks` (Phản hồi thắc mắc hóa đơn)
| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả & Quy tắc BR |
|---|---|---|---|
| `id` | UUID | PK | ID phản hồi |
| `invoice_id` | UUID | NOT NULL, FK -> invoices(id) RESTRICT | Hóa đơn liên quan (BR-123) |
| `created_by` | UUID | NOT NULL, FK -> users(id) RESTRICT | Người gửi phản hồi (Tenant) |
| `message` | TEXT | NOT NULL | Nội dung thắc mắc ban đầu |
| `status` | VARCHAR(20) | NOT NULL | `OPEN`, `IN_REVIEW`, `RESOLVED` (BR-124)|
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT clock_timestamp() | Thời điểm gửi |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT clock_timestamp() | Thời điểm cập nhật |

#### Bảng `invoice_feedback_replies` (Trao đổi phản hồi hóa đơn)
| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả & Quy tắc BR |
|---|---|---|---|
| `id` | UUID | PK | ID câu trả lời |
| `feedback_id` | UUID | NOT NULL, FK -> invoice_feedbacks(id) RESTRICT| Phản hồi cha |
| `actor_id` | UUID | NOT NULL, FK -> users(id) RESTRICT | Người trả lời (Staff/Owner/Tenant)|
| `message` | TEXT | NOT NULL | Nội dung phản hồi |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT clock_timestamp() | Thời điểm gửi |

#### Bảng `notifications` (Thông báo nội bộ trong ứng dụng)
| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả & Quy tắc BR |
|---|---|---|---|
| `id` | UUID | PK | ID thông báo |
| `user_id` | UUID | NOT NULL, FK -> users(id) RESTRICT | Người nhận cụ thể (BR-134) |
| `event_key` | VARCHAR(100) | NOT NULL | Khóa chống trùng thông báo (BR-136) |
| `type` | VARCHAR(50) | NOT NULL | `INVOICE_ISSUED`, `INVOICE_ADJUSTED`, `ISSUE_UPDATED`, `ANNOUNCEMENT`|
| `title` | VARCHAR(150) | NOT NULL | Tiêu đề thông báo |
| `message` | TEXT | NOT NULL | Nội dung thông báo |
| `resource_type` | VARCHAR(50) | NULL | `INVOICE`, `ISSUE`, `CONTRACT` |
| `resource_id` | UUID | NULL | ID đối tượng liên kết |
| `read_at` | TIMESTAMPTZ | NULL | Thời điểm đã đọc (BR-134) |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT clock_timestamp() | Thời điểm tạo |
*Ràng buộc duy nhất*: `CONSTRAINT uq_notification_user_event UNIQUE (user_id, event_key)`

#### Bảng `stored_files` (Tệp đính kèm & Ảnh riêng tư)
| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả & Quy tắc BR |
|---|---|---|---|
| `id` | UUID | PK | ID file |
| `storage_key` | VARCHAR(255) | NOT NULL, UNIQUE | Đường dẫn tệp trong private storage (BR-130)|
| `original_name`| VARCHAR(255) | NOT NULL | Tên tệp gốc khi tải lên |
| `mime_type` | VARCHAR(100) | NOT NULL | `image/jpeg`, `image/png`, `image/webp` (BR-131)|
| `size` | BIGINT | NOT NULL CHECK (size <= 5242880) | Kích thước bytes (tối đa 5MB) (BR-131)|
| `uploaded_by` | UUID | NOT NULL, FK -> users(id) RESTRICT | Người tải lên |
| `parent_type` | VARCHAR(50) | NOT NULL | `METER_READING`, `MAINTENANCE_ISSUE`, `INVOICE_FEEDBACK`|
| `parent_id` | UUID | NOT NULL | ID bản ghi cha |
| `status` | VARCHAR(20) | NOT NULL | `TEMPORARY`, `ATTACHED` (BR-132) |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT clock_timestamp() | Thời điểm tải lên |

---

## 3. Công thức Số dư và Quy tắc Sổ cái (Ledger Rules)

### 3.1. Hóa đơn (Invoice Ledger)
- **Nợ hiệu lực (`effectiveDue`)**:
  $$\text{effectiveDue} = \sum \text{invoice\_items.amount} + \sum \text{invoice\_adjustments.delta\_amount} \ge 0 \quad (\text{BR-087, BR-081})$$
- **Thanh toán ròng đã áp dụng (`netApplied`)**:
  $$\text{netApplied} = \sum \text{invoice\_ledger\_entries.signed\_amount} \ge 0 \quad (\text{BR-088, BR-096})$$
- **Công nợ còn lại (`debt`)**:
  $$\text{debt} = \max(\text{effectiveDue} - \text{netApplied}, 0) \quad (\text{BR-089})$$
- **Khoản tiền dư (`credit`)**:
  $$\text{credit} = \max(\text{netApplied} - \text{effectiveDue}, 0) \quad (\text{BR-089})$$
- **Trạng thái thanh toán suy ra**:
  - `CREDIT`: nếu $\text{credit} > 0$.
  - `PAID`: nếu $\text{debt} = 0$ và $\text{credit} = 0$ (kể cả hóa đơn 0đ không có thanh toán — BR-091).
  - `PARTIAL`: nếu $\text{debt} > 0$ và $\text{netApplied} > 0$.
  - `UNPAID`: nếu $\text{netApplied} = 0$ và $\text{debt} > 0$.

### 3.2. Tiền cọc (Deposit Ledger)
- **Tiền cọc đang giữ (`depositHeld`)**:
  $$\text{depositHeld} = \sum \text{deposit\_ledger\_entries.signed\_amount} \ge 0 \quad (\text{BR-111})$$
- **Trạng thái cọc suy ra**:
  - `NOT_RECEIVED`: khi chưa có bản ghi `RECEIPT` nào.
  - `HOLDING`: khi $\text{depositHeld} > 0$ trên hợp đồng `ACTIVE` hoặc `DRAFT`.
  - `SETTLING`: khi hợp đồng đã `ENDED` nhưng chưa xác nhận quyết toán (`deposit_settlement_at IS NULL`) (BR-120).
  - `SETTLED`: khi hợp đồng `ENDED`, $\text{depositHeld} = 0$ và đã ghi nhận `deposit_settlement_at` (BR-120).

---

## 4. Ma trận ánh xạ Quy tắc nghiệp vụ (BR Mapping)

| Quy tắc BR | Bảng / Cột / Ràng buộc bảo đảm |
|---|---|
| **BR-005, BR-007** | `numeric(19,0)` cho mọi trường tiền; không dùng float |
| **BR-006** | `invoice_items.amount` làm tròn HALF_UP đến đồng |
| **BR-008** | `numeric(18,3)` cho `meter_readings.value`, `consumption_alerts`, `tariffs` |
| **BR-010** | Mọi FK dùng `ON DELETE RESTRICT`, bảng `active BOOLEAN` |
| **BR-013** | Bảng `building_staff_assignments(user_id, building_id)` |
| **BR-016** | Bảng `invites(code_hash, expires_at, consumed_at)` thời hạn 24h |
| **BR-025** | Cột `users.enabled` |
| **BR-027** | `rooms.capacity > 0`, `uq_room_building_code` |
| **BR-029** | `rooms.bookable` quản lý riêng tình trạng cho thuê |
| **BR-032** | `contracts.status IN ('DRAFT', 'ACTIVE', 'ENDED')` |
| **BR-035** | `uq_active_room_contract` partial index `WHERE status = 'ACTIVE'` |
| **BR-036, BR-037** | `contracts`: `actual_checkout_date > actual_start_date` (tối thiểu 1 ngày) |
| **BR-049** | `invoices`: `uq_invoice_contract_month` trên `(contract_id, billing_month)` |
| **BR-059** | `meter_readings.value`: Chỉ số cuối kỳ $\ge$ đầu kỳ, kiểm tra tầng application & check constraint |
| **BR-064, BR-066** | `tariffs`: `uq_building_service_month` trên `(building_id, service_id, effective_month)` |
| **BR-068** | `invoice_items`: snapshot `quantity`, `unit_price`, `calculation_snapshot`, `reading_refs` |
| **BR-075, BR-079** | `invoices.status IN ('DRAFT', 'ISSUED')`; `ISSUED` không sửa trực tiếp |
| **BR-080, BR-081** | Bảng `invoice_adjustments`: `delta_amount <> 0`, lưu `effective_date`, `recorded_at` |
| **BR-087..BR-090** | Bảng `invoice_ledger_entries`: signed amount, không lưu cached balance |
| **BR-095..BR-097** | `invoice_ledger_entries.original_entry_id` khi đính chính |
| **BR-101** | `invoice_ledger_entries.transfer_id` cặp `CREDIT_OUT` / `CREDIT_IN` |
| **BR-103** | Bảng `financial_operations(idempotency_key, request_hash)` |
| **BR-109..BR-111** | Bảng `deposit_ledger_entries`: signed amount, hạch toán cọc độc lập |
| **BR-114** | `deposit_ledger_entries.transfer_id` cặp với `invoice_ledger_entries.transfer_id` (`OFFSET_OUT` / `DEPOSIT_OFFSET_IN`) |
| **BR-120** | `contracts.deposit_settlement_at`: chỉ kích hoạt khi `status = 'ENDED'` và `depositHeld = 0` |
| **BR-126** | `maintenance_issues.status IN ('OPEN', 'ACCEPTED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')` |
| **BR-130, BR-131** | `stored_files`: `mime_type`, `size <= 5242880`, `storage_key` trong private storage |
| **BR-136** | `notifications`: `uq_notification_user_event` trên `(user_id, event_key)` |
| **BR-138..BR-147**| Bảng `consumption_alerts`: lưu snapshot 3 kỳ, trung vị, version chỉ số |
