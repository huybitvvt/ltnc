# Context triển khai TroHub

## Nguồn cần đọc

1. GEMINI_IMPLEMENTATION_PLAN.md — phạm vi/kiến trúc.
2. docs/STATUS.md — checkpoint hiện tại.
3. docs/IMPLEMENTATION_TASKS.md — task kế tiếp.
4. docs/DOMAIN_RULES.md — nguồn sự thật của nghiệp vụ.
5. docs/BACKEND_DESIGN.md, docs/FRONTEND_DESIGN.md, docs/TEST_ACCEPTANCE.md.
6. docs/DECISIONS.md — quyết định mặc định và thay đổi.

Chỉ dẫn mới của người dùng được ưu tiên. File Word ban đầu là tham khảo;
không lấy mô tả “mobile sau này” trong đó để ghi đè phạm vi mới.

## Phạm vi bắt buộc

- Java 17/Spring Boot 3.5.x/PostgreSQL, React web, React Native/Expo mobile.
- Cả OWNER, STAFF, TENANT dùng được trên cả web và app.
- Modular monolith, feature-first, một tổ chức; không microservices.
- Hoàn thành theo acceptance gate, không theo deadline/phân công.
- Backend giữ quyền, tiền và trạng thái; client hiển thị và gửi command.
- Money BigDecimal/numeric; API money là chuỗi VND, không dùng float để tính.
- Hóa đơn phát hành bất biến; correction, refund, credit và deposit tách nghĩa.
- Đọc DOMAIN_RULES trước khi thay logic tính tiền, ngày hoặc chuyển trạng thái.

## Cách làm

- Kiểm tra repository trước sửa; không đè/xóa file của người dùng hoặc agent khác.
- Nếu chưa có Git, có thể init local; không push/publish/triển khai dịch vụ trả phí.
- Thực hiện task theo phụ thuộc, tự tiếp tục khi nghiệm thu pass.
- Không yêu cầu người dùng xác nhận từng phase đã được giao.
- Nêu ngắn mục tiêu, sửa theo từng phần có thể kiểm tra.
- Mỗi nghiệp vụ phải đi xuyên API + web + mobile; G1 là kiểm tra parity cuối.
- Không tạo model/interface/framework trừu tượng khi chưa có nhu cầu thực.
- Schema dùng Flyway; không sửa migration đã được áp dụng; không ddl-auto=update.
- API thay đổi phải cập nhật docs/openapi.yaml và type client.
- Tạo chức năng thật với dữ liệu thật từ backend; mock chỉ trong test/story.
- Không thay đổi yêu cầu/ngưỡng test, xóa test hoặc tắt security để “pass”.
- Chạy kiểm tra phù hợp, ghi output thật; không suy đoán test/build đã thành công.
- Không log token/password, mời/reset code hoặc CCCD đầy đủ.
- Không đưa credential vào mã, git hoặc tài liệu; env mẫu dùng placeholder.
- Không cài phần mềm hệ thống hoặc reset database có dữ liệu mà không xét quyền và tác động.
- Khi môi trường thiếu: ghi BLOCKED rõ, làm phần độc lập tiếp; không giả kết quả.
- Kết thúc mỗi task/phiên cập nhật docs/STATUS.md và docs/FEATURE_MATRIX.md.
- File/đường dẫn sẽ tạo trong tương lai không được ghi là đã tồn tại.
- Không gửi Telegram/email/Slack hay thông báo ra ngoài nếu người dùng chưa yêu cầu.

## Checkpoint tối thiểu

Task hiện tại; status; file thay đổi; migration/API ảnh hưởng;
lệnh đã chạy và kết quả; đường dẫn bằng chứng; lỗi còn lại;
bước tiếp theo đủ cụ thể để phiên mới thực hiện được.

## Hoàn thành

Đủ acceptance trong TEST_ACCEPTANCE; API/web/app thật chạy;
APK hoạt động khi tắt Metro; seed/migration từ môi trường sạch;
quyền và số liệu đúng; README đúng thực tế. Nếu mobile runtime chưa thử,
báo NOT_VERIFIED/BLOCKED tương ứng, không gọi toàn dự án DONE.

