# Kiểm thử, nghiệm thu và bàn giao

## 1. Điều kiện ghi kết quả

- **PASS:** đã chạy đúng bài thử trên môi trường được ghi rõ và kết quả đạt.
- **FAIL:** đã chạy và không đạt; ghi lỗi, sửa rồi chạy lại.
- **BLOCKED:** thiếu công cụ, SDK, Docker, thông tin xác thực hoặc môi trường; không thay thành PASS.
- **NOT_RUN:** chưa chạy; không dùng làm bằng chứng hoàn thành.
- Mỗi kết quả phải có mã task, lệnh hoặc bước thao tác, ngày chạy, môi trường và đường dẫn bằng chứng.
- Bộ tài liệu này chưa chạy bất kỳ test hoặc build nào của ứng dụng.

## 2. Bộ test tài chính chuẩn

Các ví dụ EX-01…EX-25 trong `DOMAIN_RULES.md` là dữ liệu chuẩn để tạo test.
Dùng `Clock` cố định; không sửa ngày hệ thống để mở khóa nghiệp vụ.

| ID | Ca bổ sung | Kết quả mong đợi |
|---|---|---|
| T-01 | Tháng 02/2028 ở đủ 29 ngày; giá phòng 3.000.000đ/tháng | Tiền phòng 3.000.000đ |
| T-02 | Tháng 02/2027 ở đủ 28 ngày; giá phòng 3.000.000đ/tháng | Tiền phòng 3.000.000đ |
| T-03 | Khoảng ở `[01/09, 16/09)`; giá phòng 3.000.000đ/tháng | 15 ngày; tiền phòng 1.500.000đ |
| T-04 | Khoảng ở `[20/09, 10/10)`; giá phòng 3.000.000đ/tháng | Tháng 9: 1.100.000đ; tháng 10: 870.968đ |
| T-05 | Phí 60.000đ/người/tháng có 30 ngày; A ở 30 ngày, B ở 15 ngày | 90.000đ; không lấy số người hiện tại nhân phí cả tháng |
| T-06 | Chỉ số thập phân `120.500` → `150.750`; đơn giá 3.500đ/kWh | Tiêu thụ `30.250` kWh; thành tiền 105.875đ |
| T-07 | Hóa đơn 3.000.000đ; thu 1.000.000đ + 500.000đ | Thanh toán ròng 1.500.000đ; nợ 1.500.000đ; dư 0đ; `PARTIAL` |
| T-08 | Hóa đơn 3.000.000đ; đã thu 3.000.000đ; điều chỉnh giảm 200.000đ | Phải trả 2.800.000đ; nợ 0đ; dư 200.000đ; `CREDIT` |
| T-09 | Tiếp T-08, hoàn lại 200.000đ | Thanh toán ròng 2.800.000đ; dư 0đ; `PAID`; khoản hoàn 200.000đ |
| T-10 | Nhập thu 2.000.000đ nhưng thực thu 1.500.000đ; đính chính −500.000đ | Số thu sau đính chính 1.500.000đ; khoản hoàn 0đ |
| T-11 | Hóa đơn A dư 200.000đ, B nợ 500.000đ trong cùng hợp đồng; chuyển 150.000đ | A dư 50.000đ; B nợ 350.000đ; tiền mới thực thu 0đ |
| T-12 | Cọc 3.000.000đ; khấu trừ 500.000đ; hoàn 2.500.000đ | Cọc đang giữ 0đ; không cộng 3.000.000đ vào tiền thực thu từ hóa đơn |
| T-13 | Cọc 3.000.000đ; hóa đơn nợ 500.000đ; bù trừ 500.000đ | Cọc đang giữ 2.500.000đ; nợ 0đ; tiền mới thực thu 0đ |
| T-14 | Hợp đồng `ENDED` còn giữ cọc 1.000.000đ | KPI tiền cọc đang giữ vẫn ghi nhận 1.000.000đ |
| T-15 | Hóa đơn tháng 8/2026 được thu 1.000.000đ ngày 05/09 | Tiền thực thu tháng 9 tăng 1.000.000đ; nợ hóa đơn tháng 8 giảm 1.000.000đ |
| T-16 | Lịch sử 8, 9, 10 m³; kỳ mới 27 m³; các kỳ đầy đủ và so sánh được | Trung vị 9; chênh lệch 18; 27 > 18 nên phát cảnh báo |
| T-17 | Như T-16 nhưng kỳ chỉ có 15 ngày hoặc thay đổi thành viên | `NOT_COMPARABLE` |
| T-18 | Chỉ có 2 kỳ lịch sử | `INSUFFICIENT_DATA`; không kết luận “bình thường” |
| T-19 | Hóa đơn 0đ, không có khoản thanh toán | `PAID`; không tạo khoản thanh toán 0đ |
| T-20 | Hai yêu cầu hoàn 150.000đ đồng thời khi số dư là 200.000đ | Một yêu cầu thành công, một yêu cầu xung đột; còn dư 50.000đ |

Unit test phải kiểm tra chính xác từng số tiền, không chỉ kiểm tra HTTP 200.
Integration test tài chính dùng PostgreSQL với transaction thật; không mock cơ chế khóa dữ liệu.

## 3. Tính nhất quán và xử lý đồng thời

| ID | Ca kiểm thử | Điều kiện đạt |
|---|---|---|
| I-01 | Hai request kích hoạt hợp đồng cùng một phòng | Database chỉ có 1 hợp đồng `ACTIVE` |
| I-02 | Hai request phát hành cho cùng hợp đồng và tháng | Chỉ có 1 hóa đơn và 1 bộ dòng chi tiết |
| I-03 | Hai khoản thu có cùng idempotency key | Chỉ có 1 ledger entry; request lặp nhận cùng kết quả |
| I-04 | Cùng key nhưng payload khác | HTTP 409; không thêm giao dịch |
| I-05 | Server đã commit nhưng response bị mất | Retry cùng key không ghi nhận thu thêm |
| I-06 | Lỗi giữa hai vế chuyển tiền dư hoặc bù trừ cọc | Cả hai vế rollback; audit không ghi thành công |
| I-07 | Đính chính thanh toán làm số tiền nguồn hoặc `netApplied` âm | Bị chặn; dữ liệu cũ còn nguyên |
| I-08 | Đổi đơn giá sau khi hóa đơn đã phát hành | Snapshot và tổng tiền cũ không đổi |
| I-09 | Sửa chỉ số sau khi đã xác nhận cảnh báo | Phải đánh giá và xác nhận lại |
| I-10 | Hai request cập nhật cùng một version | Một request nhận HTTP 409; không ghi đè im lặng |
| I-11 | Trả phòng và lập hóa đơn cuối trong cùng tháng | Một hóa đơn đúng khoảng tính phí; không thu trùng |
| I-12 | Khấu trừ cọc cho chi phí đã được tính vào hóa đơn | Bị chặn bằng tham chiếu nguồn hoặc quy tắc nghiệp vụ |
| I-13 | Thu tiền vào hóa đơn nháp hoặc hóa đơn ngoài phạm vi quyền | Bị chặn |
| I-14 | Phiên hoặc tài khoản bị thu hồi sau request idempotent trước đó | Request lặp phải kiểm tra quyền hiện tại |

## 4. Kiểm thử quyền và phiên đăng nhập

Tạo OWNER, STAFF_A chỉ phụ trách tòa A, STAFF_B chỉ phụ trách tòa B, TENANT_A và TENANT_B.
Seed qua profile `test` hoặc `demo`; tất cả dữ liệu cá nhân đều giả lập.

- Đổi UUID trên URL hoặc body để STAFF_A thử đọc/sửa dữ liệu tòa B và TENANT_A thử đọc/sửa dữ liệu TENANT_B.
- Thử tương tự với ảnh, phản hồi, ledger, báo cáo, thông báo và request idempotent lặp lại.
- Chưa đăng nhập: HTTP 401; không có quyền thực hiện hành động: HTTP 403; đối tượng ngoài phạm vi: HTTP 404 theo API contract.
- Chỉ giấu nút ở client chưa đủ: request trực tiếp tới backend vẫn phải bị chặn.
- Gỡ phân công khu nhà rồi dùng access token cũ: quyền mới phải có hiệu lực.
- Đăng xuất, đặt lại mật khẩu hoặc khóa tài khoản phải làm phiên mất hiệu lực; cookie bị xóa đúng path.
- Khi access token hết hạn, chỉ có một refresh đang chạy; các request chờ đúng và không lặp HTTP 401 vô hạn.
- Việc dùng lại refresh token phải được xử lý; nhiều tab web không làm mất phiên do xung đột thông thường.
- Đăng nhập/refresh web dùng cookie phải tuân thủ CSRF và kiểm tra Origin; không bật wildcard CORS khi gửi credentials.
- Mobile không lưu token trong AsyncStorage; web không lưu token trong localStorage.
- Đổi tài khoản không được thấy query cache hoặc ảnh của tài khoản trước.
- Người thuê cũ xem được lịch sử hợp đồng của mình, không xem hóa đơn người thuê mới cùng phòng.
- Token mời hoặc đặt lại mật khẩu chỉ dùng một lần, hết 24 giờ phải bị chặn và không xuất hiện trong log.

## 5. Web và mobile

### Các kiểm tra bắt buộc

- Toàn bộ ma trận chức năng của ba vai trò đều có luồng chạy thật trên cả hai client.
- Danh sách: tìm kiếm, lọc và phân trang từ API; trạng thái rỗng hoặc lỗi tải không dùng số liệu giả.
- Biểu mẫu: kiểm tra lỗi từng trường, chỉ đọc theo quyền, xác nhận hành động tài chính và nhập lý do khi cần.
- Hóa đơn: trình bày rõ kỳ, khoảng ngày, đơn giá snapshot, lượng dùng, phép tính, điều chỉnh và ledger.
- Ngày `YYYY-MM-DD` không lệch một ngày do chuyển đổi UTC.
- Số tiền dạng chuỗi lớn không bị mất độ chính xác khi hiển thị; không dùng `parseFloat` để cộng tiền.
- Khi timeout hoặc mất mạng, không báo thành công giả; giữ biểu mẫu đang nhập và không tự gửi giao dịch tài chính offline.
- Có cách xử lý khi camera bị từ chối quyền, người dùng hủy, ảnh không hợp lệ hoặc upload thất bại.
- Mobile: kiểm tra bàn phím, nút quay lại, safe area và cỡ chữ. Web: kiểm tra tab, focus và label. Trạng thái phải có chữ.
- Khi ứng dụng trở lại foreground, kéo làm mới hoặc focus màn hình, client phải đọc lại dữ liệu chung.
- APK chạy khi Metro đã tắt; backend truy cập được qua cấu hình mạng đã chọn.

### Bằng chứng

Web có báo cáo hoặc ảnh chụp Playwright với API test thật. Mobile ghi checksum APK, package/version,
thiết bị/API level, vai trò, từng bước và kết quả; kèm ảnh/video nếu có.
Chỉ typecheck, Expo Go hoặc JavaScript export không thay thế APK nghiệm thu.

## 6. Seed và kịch bản bảo vệ

### Seed

- Có 2 tòa A/B, mỗi tòa 2 tầng, tổng cộng tối thiểu 6 phòng.
- Có OWNER, STAFF_A/B, 2 người đại diện TENANT và thành viên không có tài khoản.
- Có 1 phòng trống, 1 phòng bị chặn cho thuê, 1 hợp đồng `ACTIVE` quá ngày kết thúc dự kiến và 1 hợp đồng `ENDED` còn cọc.
- Hợp đồng bắt đầu đủ sớm để có 3 kỳ dùng nước lần lượt 8/9/10 m³ và kỳ mới 27 m³.
- Đơn giá điện kỳ trước 3.500đ/kWh, kỳ sau 3.800đ/kWh; đơn giá nước 20.000đ/m³ là dữ liệu demo giả lập.
- Có hóa đơn nháp, thanh toán một phần, đã thanh toán, dư tiền; khoản đính chính thanh toán, khoản nhận cọc và sự cố kèm ảnh giả lập.
- Script seed phải idempotent; không tự động reset database hoặc in mật khẩu thật.

### Demo xuyên nền tảng

1. OWNER dùng app tạo phòng và phân công STAFF; web thấy thay đổi sau khi làm mới.
2. STAFF_A dùng web tạo người thuê/hợp đồng, cấp mã mời và nhận phòng có chỉ số bàn giao.
3. TENANT kích hoạt trên app, xem hợp đồng, thành viên và điều kiện tiền cọc.
4. STAFF nhập dữ liệu cuối kỳ có mức tiêu thụ 27 m³; hệ thống nêu trung vị 9 và cảnh báo.
5. Sửa số nhập nhầm hoặc xác nhận số đúng; phát hành hóa đơn khi kỳ đã đóng.
6. TENANT xem cùng từng khoản trên web/app; thử tài khoản khác phải bị chặn.
7. STAFF thu một phần; app cập nhật công nợ đúng sau khi tải lại dữ liệu.
8. Thu đủ rồi điều chỉnh giảm hóa đơn 200.000đ; app hiện số dư 200.000đ.
9. Ghi nhận hoàn 200.000đ; chứng từ gốc không đổi, số dư về 0đ và audit rõ ràng.
10. Tạo sự cố kèm ảnh trên app → xử lý trên web → xác nhận trên app.
11. Trả phòng cuối kỳ, xem hóa đơn cuối, bù trừ cọc và hoàn phần còn lại.
12. Đối chiếu dashboard với từng hóa đơn/ledger; không cộng cọc vào tiền thực thu từ hóa đơn.
13. Thử request trùng và request ngoài phạm vi tòa B; chỉ dữ liệu được phép mới thay đổi.
14. Tắt Metro rồi mở lại APK; các luồng vẫn chạy.

Dùng `Clock` test cho thời điểm giả lập; seed phải có dữ liệu lịch sử hợp lệ để demo.
Không tắt điều kiện đóng kỳ chỉ để demo thuận tiện.

## 7. Định nghĩa hoàn thành

- [ ] Các task A0…H2 đạt điều kiện nghiệm thu và có bằng chứng; không còn task bắt buộc ở trạng thái BLOCKED hoặc NOT_RUN.
- [ ] OpenAPI, schema và client types đồng bộ; migration chạy thành công từ database rỗng.
- [ ] Backend unit test và integration test với PostgreSQL đạt; không bỏ qua test.
- [ ] Web đạt lint, typecheck, test, production build và E2E.
- [ ] Mobile đạt lint, typecheck, test, native build và kiểm tra chạy thực tế trên Android.
- [ ] APK Android có JavaScript bundle, cài được và chạy không cần Metro.
- [ ] Cả 3 vai trò có đủ chức năng trên web/mobile; kiểm thử phạm vi quyền chặn được truy cập sai qua ID, file và báo cáo.
- [ ] Đã đối chiếu EX-01…EX-25 và các dữ liệu thử tài chính/xử lý đồng thời.
- [ ] Bản cuối không dùng mock thay API thật, không có nút không tác dụng và không còn TODO bắt buộc.
- [ ] Seed/demo giữ cùng quy tắc với production; secret và dữ liệu thật không nằm trong Git.
- [ ] README ghi lệnh thực tế; dependency được khóa phiên bản; có env mẫu, database và thư mục upload lưu bền vững.
- [ ] Các artifact tồn tại và có checksum; iOS chỉ ghi kết quả đã kiểm chứng thực tế.
- [ ] Dựng lại được trên một môi trường sạch; không xóa dữ liệu người dùng.
- [ ] Ghi rõ hạn chế đã biết và phần ngoài phạm vi; không tự kết luận “production-ready”.

## 8. Báo cáo nghiệm thu cuối

| Thành phần | Trạng thái | Lệnh/bước thao tác | Bằng chứng | Hạn chế |
|---|---|---|---|---|
| Database/Flyway | NOT_RUN | — | — | Chưa triển khai |
| Backend | NOT_RUN | — | — | Chưa triển khai |
| Web | NOT_RUN | — | — | Chưa triển khai |
| Android | NOT_RUN | — | — | Chưa triển khai |
| iOS | NOT_VERIFIED | — | — | Không thuộc điều kiện nghiệm thu mặc định |
| Dữ liệu thử tài chính | NOT_RUN | — | — | Chưa triển khai |
| Bảo mật/phạm vi quyền | NOT_RUN | — | — | Chưa triển khai |

Gemini thay bảng bằng kết quả thực khi triển khai; bảng hiện tại không phải kết quả kiểm thử.
