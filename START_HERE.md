# BẮT ĐẦU TRIỂN KHAI VỚI GEMINI

## 1. Giao tài liệu

Đặt cả bộ Markdown trong cùng thư mục dự án, giữ nguyên cấu trúc docs/.
Đọc [kế hoạch chính](GEMINI_IMPLEMENTATION_PLAN.md) để xem kiến trúc và phạm vi.

- Gemini có quyền đọc/sửa repository: mở đúng thư mục này, dán prompt khởi động bên dưới.
- Gemini chỉ chạy trong chat: đính kèm các file cần cho task; nó chưa thể tự chạy lệnh trên máy bạn. Yêu cầu cung cấp patch và lệnh, sau đó gửi lại output thật. Không coi một câu trả lời chứa mã là phần mềm đã nghiệm thu.
- Nếu dùng Gemini CLI, file GEMINI.md cung cấp context dự án. Kiểm tra context thực tế đã nạp bằng chức năng quản lý memory/context của phiên bản CLI đang dùng.
- Không cần bảo Gemini đọc Word gốc mỗi phiên; những thay đổi đã được hợp nhất vào bộ Markdown này.

Repository hiện có source `backend/`, `web/`, `mobile/` và Flyway migrations. Đọc [STATUS](docs/STATUS.md) để biết kết quả kiểm tra thực tế, rồi [IMPLEMENTATION_REVIEW](docs/IMPLEMENTATION_REVIEW.md) để đối chiếu phần chưa đạt. APK Android đang được hoãn theo yêu cầu; không coi Hermes bundle là APK.

## 2. Prompt khởi động — sao chép nguyên khối

```text
Hãy triển khai dự án trong thư mục hiện tại cho đến khi đạt Definition of Done.

Đọc GEMINI.md, GEMINI_IMPLEMENTATION_PLAN.md và docs/STATUS.md.
Sau đó đọc docs/DOMAIN_RULES.md, docs/BACKEND_DESIGN.md,
docs/FRONTEND_DESIGN.md, docs/IMPLEMENTATION_TASKS.md,
docs/TEST_ACCEPTANCE.md và docs/DECISIONS.md.

Đây là dự án Spring Boot + PostgreSQL + React web + React Native/Expo.
CẢ OWNER, STAFF, TENANT đều phải dùng được trên cả web lẫn mobile,
theo cùng API và cùng quy tắc phân quyền. Không thu gọn app chỉ còn người thuê.

Hãy kiểm tra thư mục và công cụ thực tế. Giữ nguyên các tài liệu nguồn.
Thực hiện task chưa hoàn thành đầu tiên theo thứ tự phụ thuộc.
Mỗi task gồm API/database, UI web, UI mobile, tests và cập nhật docs cần thiết.

Các quyết định mặc định đã có trong tài liệu: áp dụng và tiếp tục,
không hỏi lại về deadline, phân công hoặc từng bước đã được chỉ dẫn.
Với lựa chọn triển khai nhỏ, chọn cách đơn giản tương thích rồi ghi DECISIONS.
Chỉ hỏi khi thiếu credential, môi trường/quyền công cụ hoặc yêu cầu mới
mâu thuẫn làm không thể tiếp tục đúng.

Sau mỗi task: chạy kiểm tra thật, sửa lỗi, ghi lệnh/kết quả trong STATUS
và tự tiếp tục task tiếp theo. Không chỉ đưa kế hoạch rồi dừng.
Không tự đánh dấu DONE dựa trên code đã viết, mock hoặc test chưa chạy.
Không tự thêm ngân hàng/AI/IoT/push notification/microservices.

Trước khi kết thúc một phiên, lưu checkpoint đầy đủ:
task hiện tại, file đang sửa, lệnh đã chạy, kết quả, lỗi còn lại,
việc cụ thể tiếp theo. Nếu một kiểm tra bị thiếu môi trường, ghi BLOCKED
cho kiểm tra đó và làm các việc độc lập còn lại; không báo toàn dự án xong.

Bắt đầu bằng kiểm tra hiện trạng và task còn dở trong STATUS; không làm lại scaffold đã có.
```

## 3. Prompt tiếp tục sau khi hết phiên

```text
Tiếp tục dự án từ checkpoint, không bắt đầu lại.
Đọc GEMINI.md, docs/STATUS.md và git status/diff nếu có repository.
Đối chiếu docs/IMPLEMENTATION_TASKS.md, đọc spec liên quan task đang dở.
Kiểm tra kết quả trước đó còn hợp lệ, hoàn thành việc dở rồi tự làm task
kế tiếp cho đến Definition of Done. Cập nhật STATUS trước khi kết thúc phiên.
```

## 4. Prompt nghiệm thu cuối

```text
Thực hiện H1 và H2 theo docs/TEST_ACCEPTANCE.md.
Kiểm tra từng feature trên API, web và Android cho đủ ba vai trò.
Chạy tests, builds và luồng demo thật. Cài APK rồi tắt Metro để thử.
Đối chiếu hóa đơn, ledger, công nợ, tiền dư và cọc bằng fixture chuẩn.
Không sửa tiêu chí để hợp thức hóa lỗi; sửa implementation và test lại.
Báo cáo PASS/FAIL/BLOCKED với command, output và đường dẫn bằng chứng.
Chỉ tuyên bố hoàn thành khi mọi tiêu chí bắt buộc đạt.
```

## 5. Kết quả anh cần nhận

- backend chạy với PostgreSQL, migration/seed, tài liệu API;
- web React production build;
- app Android APK độc lập cho cả ba role;
- README cài/chạy, env mẫu, checklist kiểm thử, dữ liệu demo;
- STATUS rõ những gì đã thử và giới hạn còn lại.

Một prompt không loại bỏ giới hạn quota/ngữ cảnh/quyền của công cụ. Khi phiên ngắt,
dùng prompt tiếp tục; STATUS giúp agent tiếp nối công việc.

