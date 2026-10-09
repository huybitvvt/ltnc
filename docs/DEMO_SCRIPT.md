# Kịch bản Demo Hệ thống TroHub (Cross-Platform Demo Script)

Tài liệu này hướng dẫn chi tiết 14 bước chạy demo liên thông giữa **Backend Spring Boot**, **Web React** và **Mobile React Native** cho 3 vai trò: **OWNER (Chủ nhà)**, **STAFF (Nhân viên quản lý)**, và **TENANT (Khách thuê)** theo đúng tiêu chuẩn nghiệm thu tại `docs/TEST_ACCEPTANCE.md`.

---

## 1. Thông tin tài khoản Demo

| Vai trò | Tên đăng nhập | Mật khẩu | Phạm vi quyền | Giao diện khuyến nghị |
|---|---|---|---|---|
| **OWNER** | `owner` | `TroHubOwner@2026` | Toàn quyền hệ thống, xem mọi tòa nhà, doanh thu & dòng tiền | Web & Mobile |
| **STAFF_A** | `staff_a` | `TroHubStaff@2026` | Quản lý Tòa nhà A (phòng, hợp đồng, chỉ số, hóa đơn, sự cố) | Web & Mobile |
| **STAFF_B** | `staff_b` | `TroHubStaff@2026` | Quản lý Tòa nhà B | Web |
| **TENANT_A** | `tenant_a` | `TroHubTenant@2026` | Khách thuê phòng 101 Tòa A (xem hợp đồng, hóa đơn, tạo sự cố) | Mobile |
| **TENANT_B** | `tenant_b` | `TroHubTenant@2026` | Khách thuê phòng 201 Tòa B | Mobile |

---

## 2. Kịch bản 14 bước Demo chi tiết

### Bước 1: OWNER thiết lập phòng và phân công Nhân viên
- **Thao tác**: Đăng nhập tài khoản `owner` trên Mobile App hoặc Web.
- **Hành động**:
  1. Vào mục **Khu trọ & Phòng** -> Chọn **Tòa nhà A**.
  2. Tạo phòng mới `102` (Tầng 1, Giá thuê: 3.500.000đ, Cọc yêu cầu: 3.500.000đ).
  3. Phân công nhân viên `staff_a` phụ trách Tòa nhà A.
- **Kỳ vọng**: Web và Mobile cập nhật danh sách phòng ngay lập tức khi làm mới.

---

### Bước 2: STAFF_A tạo hợp đồng và cấp mã mời khách thuê
- **Thao tác**: Đăng nhập tài khoản `staff_a` trên Web (`http://localhost:5173`).
- **Hành động**:
  1. Vào menu **Hợp đồng** -> Nhấn **Lập hợp đồng mới**.
  2. Chọn phòng `101`, nhập thông tin khách thuê đại diện `Nguyễn Văn A` (SĐT: `0901234567`, CCCD: `079090001111`).
  3. Chọn kỳ hạn từ ngày `01/09/2026` đến `01/09/2027`, giá thuê 3.000.000đ/tháng, cọc 3.000.000đ.
  4. Nhấn **Kích hoạt** và tạo mã mời kích hoạt cho khách thuê.
- **Kỳ vọng**: Hợp đồng chuyển sang trạng thái `ACTIVE`, phòng 101 chuyển trạng thái `OCCUPIED`.

---

### Bước 3: TENANT kích hoạt tài khoản và xem thông tin hợp đồng
- **Thao tác**: Đăng nhập tài khoản `tenant_a` trên Mobile App.
- **Hành động**:
  1. Ứng dụng tự động tải thông tin hợp đồng phòng `101`.
  2. Khách thuê xem điều kiện cọc: 3.000.000đ, danh sách thành viên, ngày bắt đầu và ngày kết thúc.
- **Kỳ vọng**: Dữ liệu hiển thị chuẩn xác, không có số liệu giả lập.

---

### Bước 4: STAFF_A nhập chỉ số điện nước & Hệ thống phát hiện cảnh báo
- **Thao tác**: Đăng nhập `staff_a` trên Web hoặc Mobile -> Vào mục **Điện nước**.
- **Hành động**:
  1. Chọn phòng `101`, kỳ `2026-09`.
  2. Chỉ số điện: `120.500` -> `150.750` (tiêu thụ `30.250` kWh).
  3. Chỉ số nước: Nhập mức tiêu thụ `27 m³` (lịch sử 3 kỳ trước là `8, 9, 10 m³`, trung vị = 9 m³).
  4. Hệ thống hiển thị hộp thoại cảnh báo: **"CẢNH BÁO BẤT THƯỜNG: Mức tiêu thụ 27 m³ vượt ngưỡng trung vị 9 m³"**.
- **Kỳ vọng**: Hệ thống không âm thầm lưu mà yêu cầu Quản lý xác nhận số liệu.

---

### Bước 5: STAFF_A xác nhận chỉ số và Phát hành hóa đơn
- **Thao tác**: Xác nhận chỉ số nước 27 m³ là chính xác do khách kinh doanh giặt ủi.
- **Hành động**:
  1. Lưu chỉ số với trạng thái `CONFIRMED`.
  2. Vào mục **Hóa đơn** -> Chọn kỳ `2026-09` của phòng `101` -> Nhấn **Phát hành hóa đơn**.
  3. Hóa đơn gồm:
     - Tiền phòng: 3.000.000đ.
     - Tiền điện: 30.250 kWh * 3.500đ = 105.875đ.
     - Tiền nước: 27 m³ * 20.000đ = 540.000đ.
     - **Tổng cộng**: 3.645.875đ.
- **Kỳ vọng**: Hóa đơn chuyển trạng thái `ISSUED`, sinh snapshot đơn giá bất biến.

---

### Bước 6: TENANT xem chi tiết hóa đơn trên App
- **Thao tác**: Khách thuê `tenant_a` mở Mobile App -> Tab **Hóa đơn**.
- **Hành động**: Xem hóa đơn kỳ `2026-09`:
  - Trạng thái: `UNPAID` (Chưa thanh toán).
  - Phải trả: 3.645.875đ | Còn nợ: 3.645.875đ | Dư: 0đ.
- **Kỳ vọng**: Số tiền dạng chuỗi đầy đủ, không làm tròn sai số.

---

### Bước 7: STAFF_A thu tiền đợt 1 (PARTIAL)
- **Thao tác**: `staff_a` trên Web vào hóa đơn phòng `101` -> Nhấn **Ghi nhận thu tiền**.
- **Hành động**:
  1. Nhập số tiền: 1.000.000đ, phương thức: Chuyển khoản, mã GD: `TXN-DEMO-01`.
  2. Lưu giao dịch.
- **Kỳ vọng**:
  - Hóa đơn chuyển trạng thái `PARTIAL`.
  - Thực thu áp dụng: 1.000.000đ | Còn nợ: 2.645.875đ | Dư: 0đ.
  - Mobile của `tenant_a` làm mới hiển thị ngay còn nợ 2.645.875đ.

---

### Bước 8: Thu đủ và Điều chỉnh giảm hóa đơn (CREDIT)
- **Thao tác**:
  1. `staff_a` thu nốt đợt 2: 2.645.875đ -> Hóa đơn chuyển sang `PAID` (đã thanh toán đủ).
  2. Phát hiện chủ nhà đồng ý giảm 200.000đ tiền nước hỗ trợ dịch -> `staff_a` nhấn **Điều chỉnh hóa đơn**.
  3. Nhập delta: `-200.000đ`, lý do: `Hỗ trợ giảm giá tiền nước`.
- **Kỳ vọng**:
  - Phải trả hiệu lực giảm còn: 3.445.875đ.
  - Thực thu áp dụng: 3.645.875đ.
  - Hóa đơn chuyển sang trạng thái `CREDIT` (Dư tiền: 200.000đ).

---

### Bước 9: Hoàn tiền mặt khoản dư 200.000đ
- **Thao tác**: `staff_a` nhấn **Hoàn tiền thừa (Refund)**.
- **Hành động**: Nhập số tiền hoàn: 200.000đ, phương thức: Tiền mặt, lý do: `Hoàn tiền thừa do giảm giá`.
- **Kỳ vọng**:
  - Bút toán `REFUND` mang giá trị âm `-200.000đ` được ghi vào sổ cái.
  - Thực thu ròng sau hoàn: 3.445.875đ.
  - Còn nợ: 0đ | Dư: 0đ | Trạng thái: `PAID`.
  - Chứng từ hóa đơn gốc và lịch sử không bị xóa sửa (Audit bất biến).

---

### Bước 10: Quy trình xử lý sự cố (Incident Workflow)
- **Thao tác**:
  1. `tenant_a` trên Mobile vào mục **Sự cố** -> Nhấn **Báo sự cố** -> Tiêu đề: "Vòi nước bồn rửa chén bị rò rỉ", tải ảnh minh họa.
  2. `staff_a` trên Web nhận thông báo -> Mở danh sách sự cố -> Chuyển trạng thái sang `IN_PROGRESS` (Đang sửa chữa).
  3. Sau khi sửa xong, `staff_a` cập nhật trạng thái sang `RESOLVED`.
- **Kỳ vọng**: Cả hai bên đều theo dõi được tiến độ thời gian thực.

---

### Bước 11: Trả phòng (Checkout) và Quyết toán cọc
- **Thao tác**: Hết hạn hợp đồng, `staff_a` thực hiện thủ tục **Trả phòng**.
- **Hành động**:
  1. Chốt chỉ số bàn giao kết thúc hợp đồng.
  2. Khấu trừ 500.000đ từ cọc do làm vỡ kính cửa sổ (`DEDUCTION`).
  3. Bù trừ 500.000đ cọc vào hóa đơn còn nợ nếu có (`OFFSET_OUT`).
  4. Quyết toán hoàn nốt tiền cọc còn lại cho khách (`SETTLED`).
- **Kỳ vọng**:
  - Hợp đồng chuyển trạng thái `ENDED`.
  - Trạng thái cọc chuyển `SETTLED`, tiền cọc đang giữ về 0đ.
  - Phòng `101` chuyển về trạng thái `VACANT` (sẵn sàng đón khách mới).

---

### Bước 12: OWNER đối chiếu dòng tiền trên Dashboard Báo cáo
- **Thao tác**: Đăng nhập `owner` vào menu **Báo cáo tài chính** (Dashboard).
- **Hành động**: Kiểm tra các chỉ số:
  - `billedAmount`: Tổng tiền các hóa đơn phát hành.
  - `cashCollected`: Tổng tiền mặt và chuyển khoản thu thực tế.
  - `cashRefunded`: Tổng tiền đã hoàn lại.
  - `netCash = cashCollected - cashRefunded`.
  - `totalDepositHeld`: Tổng tiền cọc đang nắm giữ của tất cả các hợp đồng.
- **Kỳ vọng kiểm toán**:
  - Tiền bù trừ cọc (`OFFSET_OUT`) và chuyển dư (`CREDIT_TRANSFER`) **TUYỆT ĐỐI KHÔNG** bị cộng vào `cashCollected` (tránh phóng đại doanh thu).

---

### Bước 13: Thử nghiệm kiểm tra an ninh phân quyền (RBAC Isolation)
- **Thao tác**:
  1. Đăng nhập `staff_a` (chỉ phụ trách Tòa A) -> Thử truy cập API hoặc ID phòng thuộc **Tòa B**.
     -> **Kết quả**: Bị chặn với lỗi `403 Forbidden` ("Bạn không có quyền quản lý tòa nhà này").
  2. Đăng nhập `tenant_a` -> Thử gửi request xem hóa đơn của `tenant_b`.
     -> **Kết quả**: Bị từ chối `AccessDeniedException`.
- **Kỳ vọng**: Không thể leo thang quyền hạn hoặc truy cập chéo dữ liệu.

---

### Bước 14: Kiểm chứng Mobile chạy độc lập khi Tắt Metro
- **Thao tác**:
  1. Tắt hoàn toàn Metro Bundler terminal (`Ctrl + C`).
  2. Mở file bundle độc lập đã export tại `mobile/dist/_expo/static/js/android/entry-*.hbc` (Hermes bytecode).
- **Kỳ vọng**: Ứng dụng load trực tiếp từ offline bundle tĩnh và kết nối với Backend API mà không cần tiến trình Metro chạy nền.
