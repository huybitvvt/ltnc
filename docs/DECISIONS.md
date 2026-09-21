# Quyết định triển khai

Ngày tạo: 21/09/2026. Các DEFAULT dưới đây là lựa chọn đề xuất để có đặc tả
triển khai được; không phải khẳng định người dùng đã quyết định từng chi tiết.
Gemini được áp dụng ngay. Thay đổi phải nêu lý do, test và tác động các client.

| ID | Loại | Quyết định |
|---|---|---|
| D-01 | USER | Java/Spring backend, PostgreSQL, React web và React Native mobile |
| D-02 | USER | Cả ba vai trò có chức năng tương ứng trên cả web lẫn app |
| D-03 | USER | Người đại diện bắt buộc có tài khoản; thành viên chỉ lưu hồ sơ cư trú |
| D-04 | USER | Hóa đơn minh bạch, cảnh báo đơn giản, lưu lịch sử, thu thủ công, cọc riêng |
| D-05 | DEFAULT | Một tổ chức, một OWNER khởi tạo; STAFF scope theo khu nhà, không SaaS |
| D-06 | DEFAULT | Java17/Boot3.5 stable patch; PostgreSQL16; versions khóa ở A0/B1 |
| D-07 | DEFAULT | Expo+ExpoRouter+RN Paper; React/Vite/MUI; không bare RN mặc định |
| D-08 | DEFAULT | Android APK là đầu ra kiểm chứng đầu tiên; iOS chưa xác minh |
| D-09 | DEFAULT | Ngày thuê [nhận,trả), nhận tính trả không tính; làm tròn HALF_UP từng dòng |
| D-10 | DEFAULT | Hóa đơn cuối khoảng; mỗi hợp đồng/tháng một invoice; không thu tiền điện dự tính |
| D-11 | DEFAULT | DRAFT/ISSUED tách trạng thái thanh toán tính từ ledger |
| D-12 | DEFAULT | Net applied theo invoice; dư riêng; chuyển dư cùng hợp đồng, không ví đa hợp đồng |
| D-13 | DEFAULT | Tenant xem lịch sử hợp đồng cũ của mình; không tự chuyển quyền theo số phòng |
| D-14 | DEFAULT | Không booking; DRAFT không giữ phòng; ACTIVE chưa trả vẫn chiếm phòng khi quá hạn |
| D-15 | DEFAULT | Đổi giá từ kỳ chưa chốt tiếp theo; đổi người đại diện, rollover và rebuild kỳ cũ ngoài scope |
| D-16 | DEFAULT | JWT access15m+session revocation; refresh7d opaque rotation; web cookie/mobile SecureStore |
| D-17 | DEFAULT | Mã mời/reset single-use chuyển thủ công; không bắt buộc SMTP/SMS |
| D-18 | DEFAULT | Cảnh báo 3 kỳ đầy đủ so sánh được, 2x median + mức tăng tối thiểu |
| D-19 | DEFAULT | Không KPI “doanh thu thực tế” mơ hồ; tách billed, cash, debt, credit, deposit |
| D-20 | DEFAULT | Một ledger entry gắn một invoice, không dựng allocation engine tổng quát |
| D-21 | DEFAULT | Online mutation, refetch trên focus/pull; không offline ghi tiền/realtime bắt buộc |
| D-22 | DEFAULT | Root hiện tại dùng thẳng; npm lock riêng web/mobile, không monorepo framework |

## Mẫu thêm quyết định

### D-XX: Tên quyết định
- Ngày:
- Context:
- Chọn:
- Lý do:
- Khác mặc định nào:
- Tác động DB/API/Web/Mobile:
- Test phải cập nhật:
- Trạng thái: DEFAULT / IMPLEMENTED / SUPERSEDED.

Không thay đổi quyết định USER một cách âm thầm.

