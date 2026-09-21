# Thiết kế và cách triển khai frontend web + mobile

Tài liệu triển khai cho Gemini; đọc cùng `GEMINI_IMPLEMENTATION_PLAN.md`, đặc tả backend và `docs/openapi.yaml` khi API contract được tạo.
Đây là kế hoạch, không phải xác nhận hệ thống đã được viết, build hay kiểm thử.

## 1. Nguyên tắc bắt buộc

- Cả website và ứng dụng Android đều hỗ trợ OWNER, STAFF, TENANT theo cùng ma trận quyền.
- Một nghiệp vụ bắt buộc phải hoàn thành được trên cả hai nền tảng; không chỉ có màn hình xem ở mobile.
- Backend quyết định quyền, trạng thái, tiền phải trả và kết quả giao dịch; frontend chỉ trình bày, nhập liệu và gọi API.
- STAFF chỉ thấy khu nhà được giao; TENANT chỉ thấy dữ liệu thuộc hợp đồng mình đại diện.
- Hợp đồng cũ của TENANT được xem lịch sử theo quyền backend; không được xem dữ liệu của người thuê mới cùng phòng.
- Không tạo backend riêng cho app; hai client cùng dùng REST API và một nguồn dữ liệu.
- Không yêu cầu giao diện web/mobile giống nhau về bố cục, số màn hình hay cách điều hướng.
- Không thêm ngân hàng thật, push notification, IoT, AI hoặc đồng bộ giao dịch offline trong phạm vi bắt buộc.

## 2. Stack và ranh giới dự án

| Phần | Lựa chọn |
|---|---|
| Web | React + TypeScript + Vite + React Router + Material UI |
| Mobile | Expo + React Native + TypeScript + Expo Router + React Native Paper |
| Dữ liệu API | TanStack Query; một HTTP client được kiểm soát trong mỗi app |
| Biểu mẫu | React Hook Form + Zod, schema bám API contract |
| Mobile native | Expo SecureStore, Expo ImagePicker; cài phiên bản tương thích SDK bằng Expo CLI |
| Kiểm thử web | Vitest + React Testing Library; Playwright cho luồng xuyên suốt |
| Kiểm thử mobile | Jest theo cấu hình Expo + React Native Testing Library; kiểm tra thực tế trên Android |
| Nghiệm thu native | APK cài và chạy trên Android thật hoặc emulator; Expo Go chỉ phục vụ phát triển |

- Chọn một bộ phiên bản ổn định tương thích ở bước khởi tạo, ghi phiên bản và khóa dependency; không tự cập nhật major giữa chừng.
- `web/` và `mobile/` có `package.json`, `package-lock.json`, scripts, env mẫu và README riêng; dùng `npm ci` sau khi đã có lockfile.
- Không cần Nx, Turborepo, npm workspaces hay package UI dùng chung; React DOM và React Native có component riêng.
- Khi `docs/openapi.yaml` được tạo, sinh TypeScript API types vào từng app bằng một quy trình có thể chạy lại.
- Chưa có OpenAPI thì phải hoàn thiện contract trước khi nối feature; không tự giả định endpoint tồn tại.
- Sinh lại types khi contract thay đổi; không sửa thủ công file generated và không dùng `any` để che mismatch.
- iOS là hướng có thể mở rộng; chỉ báo hỗ trợ đã kiểm chứng nếu đã build và chạy thật qua macOS hoặc dịch vụ build phù hợp.

## 3. Cấu trúc thư mục

```text
web/
  package.json, package-lock.json, .env.example, README.md
  src/
    app/                    # providers, router, route guards, layouts
      providers/
      routes/
    features/
      auth/ properties/ rooms/ residents/ contracts/
      tariffs/ meters/ invoices/ payments/ deposits/
      issues/ feedback/ notifications/ dashboard/ audit/ users/
    shared/
      api/                  # HTTP client, refresh, errors, generated types
      ui/                   # form controls, status, empty/error/loading
      lib/                  # định dạng tiền/ngày; không tính nghiệp vụ tài chính
      theme/
    test/
  e2e/
mobile/
  package.json, package-lock.json, app.config.ts, .env.example, README.md
  src/
    app/                    # CHỈ route files Expo Router và _layout
      _layout.tsx
      (auth)/
      (protected)/
    features/               # cùng danh sách nghiệp vụ web, component native riêng
    shared/
      api/ storage/ ui/ lib/ theme/
    providers/              # auth, query, theme, lifecycle
    test/
```

- Mỗi feature có `api.ts`, `queries.ts`, `schemas.ts`, `components/`, `screens/` khi thực sự cần; không tạo file rỗng cho đủ mẫu.
- File route mobile chỉ lấy params, cấu hình điều hướng và render screen từ `features`; không đặt helper trong `src/app`.
- `shared/api/generated/` chứa types được sinh; API adapter và mapping lỗi viết tay nằm ngoài thư mục generated.
- Dùng đường dẫn import alias thống nhất trong từng app; không import source trực tiếp từ app còn lại.
- Component gọi hook của feature; hook gọi HTTP client; không rải `fetch` và logic refresh khắp màn hình.
- Bộ lọc, trang hiện tại và khu nhà được chọn nằm trong query key; web lưu bộ lọc cần chia sẻ vào URL.

## 4. Ma trận chức năng trên CẢ web và mobile

Ký hiệu: “phạm vi” là khu nhà được giao cho STAFF; OWNER làm trong hệ thống mình quản lý; không phải quyền toàn hệ thống đa chủ.

| Chức năng | OWNER | STAFF | TENANT |
|---|---|---|---|
| Tòa nhà/tầng, tài khoản nhân viên, gán khu nhà | Quản lý | Xem khu/tầng được giao, không tạo/sửa tầng hoặc gán quyền | Không |
| Phòng, người cư trú | Quản lý | Quản lý trong phạm vi | Xem phòng và thành viên hợp đồng của mình |
| Mời/kích hoạt người đại diện | Tạo lời mời | Tạo lời mời trong phạm vi | Kích hoạt tài khoản của mình |
| Hợp đồng, nhận/trả phòng, gia hạn | Quản lý | Quản lý trong phạm vi | Xem hiện tại và lịch sử của mình |
| Đơn giá, dịch vụ | Quản lý | Quản lý trong phạm vi theo policy backend | Xem đơn giá được chụp trong hóa đơn mình |
| Chỉ số, ảnh đồng hồ, cảnh báo | Nhập, kiểm tra | Nhập, kiểm tra trong phạm vi | Xem bằng chứng gắn hóa đơn mình |
| Hóa đơn nháp/phát hành/điều chỉnh | Thực hiện | Thực hiện trong phạm vi | Xem và gửi phản hồi |
| Thu tiền, sửa ghi nhận, hoàn, bù trừ | Thực hiện | Thực hiện trong phạm vi | Xem khoản liên quan của mình |
| Tiền cọc, khấu trừ, quyết toán | Thực hiện | Thực hiện trong phạm vi | Xem lịch sử cọc của mình |
| Sự cố, ảnh, tiến độ | Tạo và xử lý | Tạo và xử lý trong phạm vi | Tạo/theo dõi yêu cầu hợp lệ của mình |
| Phản hồi hóa đơn | Đọc và trả lời | Đọc và trả lời trong phạm vi | Gửi, đọc phản hồi của mình |
| Thông báo | Soạn và xem | Soạn trong phạm vi, xem được gửi | Xem thông báo mình là người nhận |
| Dashboard vận hành | Toàn phạm vi quản lý | Khu được giao | Tổng quan cá nhân, không số liệu cả nhà |
| Audit | Xem trong phạm vi quản lý | Xem trong phạm vi được phép | Không |

- Quyền UI theo phiên đăng nhập và dữ liệu API; không coi ẩn nút là biện pháp bảo vệ dữ liệu.
- Nút xuất hiện nhưng thao tác bị backend từ chối phải hiển thị lỗi rõ ràng, làm mới quyền/dữ liệu nếu cần.
- Không cung cấp cho TENANT nút sửa hợp đồng, chỉ số, hóa đơn, thanh toán hay cọc.
- OWNER/STAFF có thể bù trừ tiền dư giữa các hóa đơn của cùng hợp đồng; không tự chuyển sang hợp đồng khác.
- Chỉnh số ghi nhận sai, hoàn tiền thật và bù trừ là ba hành động khác nhau, có màn hình giải thích khác nhau.

## 5. Danh mục route và màn hình

Các đường dẫn sau là route giao diện; endpoint thật phải theo OpenAPI. Cả web/mobile cung cấp các thao tác trong cột chi tiết.

| Nhóm route | Màn hình và thao tác |
|---|---|
| `/login`, `/activate` | Đăng nhập; kích hoạt lời mời; lỗi token hết hạn/đã dùng; đổi mật khẩu sau đăng nhập |
| `/dashboard`, `/profile` | Tổng quan theo vai trò; khu nhà/hợp đồng đang chọn; hồ sơ và đăng xuất |
| `/properties` | Danh sách, chi tiết, tạo/sửa tòa nhà/tầng, ngừng hoạt động theo ràng buộc; OWNER có quyền thay đổi |
| `/users`, `/assignments` | Danh sách nhân viên, tạo/sửa trạng thái, cấp/gỡ khu nhà; OWNER |
| `/rooms` | Danh sách lọc tòa/tầng/tình trạng; chi tiết; tạo/sửa; riêng trạng thái cư trú và khả năng cho thuê |
| `/residents` | Danh sách, chi tiết, tạo/sửa hồ sơ; lời mời người đại diện; không public link giấy tờ |
| `/contracts` | Danh sách, chi tiết, tạo/sửa nháp, kích hoạt, nhận phòng, gia hạn, kết thúc, bàn giao |
| `/tariffs` | Danh sách dịch vụ và phiên bản giá; chi tiết; tạo giá cho kỳ có hiệu lực; không ghi đè lịch sử |
| `/meters` | Danh sách theo kỳ/phòng; nhập/sửa nháp; chỉ số bàn giao; ảnh; xử lý cảnh báo có lý do |
| `/invoices` | Danh sách; tạo/tính lại nháp; xem trước; phát hành; chi tiết giải thích; điều chỉnh; lịch sử |
| `/payments` | Danh sách, chi tiết, ghi nhận thu; sửa sai có liên kết; hoàn tiền; bù trừ dư cùng hợp đồng |
| `/deposits` | Danh sách hợp đồng và số dư; nhận cọc; hoàn/khấu trừ; bù trừ hóa đơn; quyết toán và lịch sử |
| `/issues` | Danh sách, tạo kèm ảnh, chi tiết, giao xử lý, đổi trạng thái, phản hồi/xác nhận theo state machine |
| `/feedback` | Danh sách, gửi phản hồi gắn hóa đơn, chi tiết hội thoại, trả lời/đóng theo quyền |
| `/notifications` | Danh sách đã/chưa đọc, chi tiết, đánh dấu đọc; quản lý soạn và chọn đối tượng nhận |
| `/audit` | Bộ lọc thời gian/người/thao tác/đối tượng; chi tiết thay đổi đã được backend lọc dữ liệu nhạy cảm |

- List/detail/form là route riêng khi cần deep link; ví dụ `/invoices/:id`, `/rooms/new`, `/rooms/:id/edit`.
- Mobile dùng route file như `invoices/[id].tsx`; group `(auth)` và `(protected)` tổ chức layout, không thay đổi quyền backend.
- TENANT điều hướng đến dữ liệu của mình qua danh sách hợp đồng, không qua danh sách toàn tòa; dùng route khác nếu giảm nhầm lẫn.
- Hợp đồng TENANT đã kết thúc ở chế độ lịch sử chỉ đọc; không tạo yêu cầu mới từ hợp đồng cũ khi nghiệp vụ không cho phép.
- Mỗi route cần loading, empty, error, forbidden/not-found phù hợp; màn hình đọc dữ liệu có làm mới/thử lại.
- 404/403 không làm lộ tên, số phòng hoặc chủ hợp đồng khi người dùng thử ID ngoài quyền.
- Mất mạng: thông báo rõ dữ liệu đang xem có thể cũ; giữ form đang nhập trong phiên, không giả báo gửi thành công.

## 6. Đăng nhập, refresh và vòng đời dữ liệu

1. Access token JWT chỉ giữ trong memory của từng client; không lưu web localStorage hoặc log token.
2. Web dùng nhóm `/auth/web`: refresh token trong HttpOnly cookie do backend đặt; gửi credentials theo cấu hình API.
3. Request dùng refresh cookie phải theo cơ chế CSRF và kiểm tra Origin đã được BE định nghĩa; không tự tắt CSRF để vượt lỗi.
4. Mobile dùng nhóm `/auth/mobile`: opaque refresh token xoay vòng lưu bằng SecureStore; access token vẫn ở memory.
5. Khi mở lại app/trang, thử khôi phục phiên qua refresh trước khi render màn hình cần quyền; thất bại xác thực thì về login.
6. Nhiều request cùng 401 chỉ tạo một refresh đang chạy; các request khác chờ kết quả và chỉ replay tối đa một lần.
7. Refresh trả token mới phải thay token cũ; tránh hai luồng song song làm backend hiểu nhầm token bị dùng lại.
8. Web nhiều tab phải phối hợp refresh bằng cơ chế khóa/thông điệp trình duyệt có kiểm chứng; không mỗi tab tự xoay cookie đồng thời.
9. Logout thu hồi refresh session ở server khi kết nối cho phép, xóa storage/memory và hủy request, xóa toàn bộ query cache.
10. Kết quả request cũ sau logout không được ghi lại vào cache; dùng generation/session guard và cancellation.
11. Lỗi 403 không kích hoạt refresh vòng lặp; lỗi mạng refresh không được báo nhầm “sai mật khẩu”.
12. Không lưu hồ sơ, hóa đơn hoặc ảnh riêng tư lâu dài offline trong v1; xóa preview file/blob tạm khi không cần.

- API error adapter phân biệt lỗi trường, 401, 403, 404, 409, validation, timeout/mất mạng và lỗi server.
- Hiển thị thông báo tiếng Việt; trường có lỗi được focus; lỗi hệ thống có mã tham chiếu nếu API cung cấp.
- Lời mời là thao tác riêng của tài khoản; không đưa token lời mời vào telemetry, lịch sử audit UI hoặc ảnh chụp demo.

## 7. Query, mutation và đồng bộ giữa hai nền tảng

- Query key gồm loại tài nguyên, ID, scope, bộ lọc, kỳ, phân trang; dữ liệu riêng của tài khoản không dùng chung cache sau đổi tài khoản.
- Sau mutation thành công, invalidate detail + list + dashboard + số dư liên quan; refetch từ backend trước khi kết luận số mới.
- Mobile refetch khi app foreground, screen focus và kéo làm mới; web refetch theo focus và nút làm mới có kiểm soát.
- Không hứa tự xuất hiện ngay trên thiết bị khác: v1 đồng bộ khi refresh/focus; không bắt buộc WebSocket.
- Read query có thể retry hữu hạn khi lỗi tạm thời; không retry tự động lỗi 401/403/validation.
- Mọi lệnh thay đổi tài chính có `Idempotency-Key` theo contract, tạo một lần cho một ý định đã xác nhận.
- Timeout không chứng minh giao dịch thất bại; retry cùng payload và CÙNG key hoặc tra cứu kết quả trước khi tạo ý định mới.
- Người dùng sửa payload sau lỗi validation bắt đầu một ý định mới; backend quyết định quy tắc key/payload xung đột.
- Không tạo key mới mỗi lần interceptor replay; không xếp hàng giao dịch tiền offline để tự gửi khi có mạng.
- Không optimistic update số dư/công nợ; chỉ disable nút trong lúc gửi và trình bày kết quả server.
- Xung đột version/409: giữ nội dung nhập, thông báo bản ghi đã thay đổi, cho tải mới và xác nhận lại; không ghi đè im lặng.
- Kiểm tra online giúp UX nhưng không thay xử lý timeout; luôn xử lý trường hợp mạng mất sau khi nhấn xác nhận.

## 8. Biểu mẫu và màn hình tài chính

- Money trong JSON là decimal STRING; giữ dạng string từ form đến API, không `parseFloat` rồi tính tổng nghiệp vụ.
- Frontend định dạng VNĐ để đọc; backend trả subtotal, tổng, làm tròn và số còn thiếu/dư có thẩm quyền.
- Date-only giữ `YYYY-MM-DD`; timestamp hiển thị theo `Asia/Ho_Chi_Minh`; tránh UTC conversion làm lệch ngày hợp đồng.
- Validation UI giúp nhập đúng nhưng backend luôn kiểm tra lại; Zod không tự đặt quy tắc khác đặc tả nghiệp vụ.
- Hóa đơn chi tiết gồm kỳ, ngày ở tính phí, từng dòng, chỉ số đầu/cuối, lượng dùng, đơn giá chụp, phép tính và ảnh được phép xem.
- Phần lịch sử tách hóa đơn gốc, từng điều chỉnh, tổng hiện hành, thanh toán ròng, số còn thiếu và số dư.
- Dialog điều chỉnh có đối tượng gốc, chênh lệch có dấu, lý do bắt buộc, kết quả xem trước do server trả và nút xác nhận.
- Dialog hoàn tiền nói rõ đây là ghi nhận tiền thực trả lại; không tự thực hiện giao dịch ngân hàng.
- Bù trừ cọc vào hóa đơn là MỘT lệnh API nguyên tử: không gọi “trừ cọc” rồi gọi “thanh toán” độc lập ở frontend.
- Bù trừ tiền dư chỉ cho chọn hóa đơn hợp lệ cùng hợp đồng và không vượt số dư backend xác nhận.
- Kết thúc hợp đồng không tự giả định hết nợ/đã hoàn cọc; màn hình tổng hợp cần hiển thị các khoản chưa quyết toán.
- Cảnh báo chỉ số trình bày giá trị hiện tại, lịch sử so sánh và lý do; không khẳng định rò rỉ nước từ dữ liệu tiêu thụ.
- Chặn thao tác không hợp lệ theo trạng thái server; không chỉnh hóa đơn phát hành bằng form sửa nháp.

## 9. Ảnh, tài liệu và trải nghiệm mobile

- Dùng ImagePicker cho chọn ảnh hoặc chụp khi báo sự cố/ghi chỉ số; xử lý cancel, từ chối quyền và lỗi upload.
- Khi camera bị từ chối, vẫn cho chọn ảnh bằng picker nếu hệ điều hành cho phép hoặc tiếp tục không ảnh nếu nghiệp vụ cho phép.
- Kiểm tra kích thước, loại file ở client để báo sớm; server kiểm tra lại; giới hạn cụ thể thống nhất theo OpenAPI.
- Có preview, xóa ảnh chưa gửi, tiến độ và retry upload; lỗi một ảnh không xóa nội dung mô tả đã nhập.
- Ảnh riêng tư được tải qua endpoint có kiểm tra quyền; không gắn access/refresh token vào URL hoặc đưa file thành public.
- Web có thể tải blob được xác thực rồi tạo object URL tạm; mobile dùng request/image source có auth header phù hợp và kiểm chứng refresh.
- Không hiển thị ảnh đã cache từ người dùng trước sau logout; thu hồi blob URL và dọn file tạm thuộc phiên.
- Mobile có safe area, bàn phím không che nút, back navigation, xác nhận rời form đang sửa và touch target dễ bấm.
- Không dùng bảng nhiều cột kéo ngang làm giao diện chính của điện thoại; danh sách dùng card, bộ lọc dùng sheet hoặc màn hình riêng.

## 10. Hệ thống giao diện sạch và nhất quán

- Giao diện tiếng Việt; thiết kế sáng, nền trung tính, một màu chủ đạo; không nhồi gradient, animation hoặc dashboard giả.
- Layout web: sidebar theo quyền, thanh tiêu đề, chọn khu nhà/hợp đồng, breadcrumb khi hữu ích, nội dung có chiều rộng hợp lý.
- Layout mobile: 4–5 tab quan trọng theo vai trò, phần “Thêm” cho nghiệp vụ còn lại; detail/form dùng stack.
- Bảng web có tên cột rõ, lọc, tìm kiếm, phân trang từ API; trên màn hình hẹp đổi thành card hoặc bố cục thích hợp.
- Trạng thái luôn có chữ và có thể có icon; không chỉ dùng màu để phân biệt nợ, dư, hỏng hoặc hoàn tất.
- Form có label, hint, lỗi gần trường, thứ tự focus đúng; không dùng placeholder thay label.
- Nút chính thể hiện hành động: “Phát hành hóa đơn”, “Ghi nhận thu tiền”, “Hoàn cọc”; tránh chỉ ghi “OK”.
- Hành động tài chính cần xem lại số tiền/đối tượng và lý do khi quy tắc yêu cầu; không hỏi xác nhận cho mọi click thông thường.
- Đảm bảo tương phản, phóng chữ, keyboard navigation trên web; kiểm tra label bằng TalkBack trên Android.
- Chart chỉ dùng dữ liệu thật và có bảng/số kèm theo; dashboard ghi rõ kỳ hóa đơn, khoảng thu tiền hoặc thời điểm công nợ.

## 11. Trình tự làm từng feature

1. Đọc nghiệp vụ và quyền; lập checklist OWNER/STAFF/TENANT cho cả web/mobile trước khi viết màn hình.
2. Chốt request/response/error/state transition trong OpenAPI cùng backend; sinh lại API types.
3. Viết adapter, query key, schema form và các component cần tái sử dụng trong riêng từng app.
4. Hoàn thành list/detail/form cùng trạng thái lỗi; mock chỉ dùng trong unit test hoặc phát triển tạm có nhãn rõ.
5. Nối API thật, kiểm tra quyền thực, dữ liệu rỗng và lỗi phát sinh; xóa đường mock trong runtime tích hợp.
6. Thử xuyên nền tảng: thao tác trên web → làm mới app → thấy kết quả; rồi đảo chiều.
7. Chạy test có ý nghĩa, lint, typecheck, build liên quan; chụp bằng chứng giao diện và ghi kết quả thật vào STATUS.
8. Chỉ đánh dấu feature xong khi cả hai nền tảng có khả năng thực hiện đúng use case, không chỉ gọi API thành công.

## 12. Luồng nghiệm thu và điều kiện đạt

| Luồng | Điều kiện đạt trên web VÀ Android |
|---|---|
| OWNER quản lý nền | Tạo khu/phòng, nhân viên, gán khu; app/web hiển thị cùng dữ liệu khi làm mới |
| STAFF theo phạm vi | Hoàn thành nghiệp vụ khu được giao; truy cập ID khu khác bị server từ chối, UI không lộ dữ liệu |
| Hợp đồng/người thuê | Tạo hồ sơ, kích hoạt đại diện, nhận phòng với chỉ số; TENANT chỉ thấy hợp đồng mình, thành viên không tự có tài khoản |
| Điện nước/đơn giá | Nhập chỉ số và ảnh, xem cảnh báo, xác nhận có lý do; giá kỳ mới không thay số trên hóa đơn cũ |
| Hóa đơn minh bạch | Phát hành từ một nền tảng, nền tảng kia đọc đúng từng dòng; TENANT không thấy nháp hoặc nút sửa tiền |
| Thu tiền/điều chỉnh | Thu từng phần, sửa ghi nhận, giảm hóa đơn đã trả đủ; UI tách dư và nợ, không gọi sửa sai là hoàn tiền |
| Cọc/quyết toán | Nhận/khấu trừ/hoàn/bù trừ có lịch sử; bù trừ một lần giảm đúng cọc và nợ cùng lúc |
| Sự cố/phản hồi | TENANT tạo kèm ảnh trên app, STAFF xử lý web; OWNER và người gửi thấy tiến độ đúng khi làm mới |
| Thông báo/dashboard/audit | Người nhận đúng phạm vi; số liệu có nhãn đúng kỳ; audit không lộ dữ liệu ngoài quyền |
| Phiên đăng nhập | Restart/refresh khôi phục đúng; nhiều 401 chỉ refresh một lần; đổi tài khoản không thấy cache cũ |
| Mất mạng/timeout | Không báo thành công giả; không tự gửi giao dịch offline; retry cùng key không tạo khoản thu thứ hai |

- Component tests tập trung lỗi field, xác nhận tiền, hiển thị nợ/dư, quyền và trạng thái; không test snapshot toàn màn hình chỉ để tăng số lượng.
- Playwright chạy tối thiểu ba vai trò với API thật và dữ liệu test tách biệt, có kịch bản bị từ chối ngoài phạm vi.
- React Native Testing Library kiểm tra hành vi screen và adapter; vẫn phải chạy APK thật để kiểm tra camera, SecureStore, mạng và lifecycle.
- Mobile có thể kiểm thử thủ công theo checklist trên emulator; ghi phiên bản APK, thiết bị/API level, bước, kết quả và ảnh/video.
- Chạy đủ luồng quản lý ở mobile, không chỉ demo TENANT rồi kết luận app hỗ trợ đủ ba vai trò.
- Không ghi “iOS pass”, “Android pass” hoặc “end-to-end pass” chỉ vì TypeScript/build thành công.

## 13. Cấu hình môi trường và bàn giao

- Web dùng `VITE_API_BASE_URL`; mobile dùng `EXPO_PUBLIC_API_BASE_URL`; đây là cấu hình public, không chứa secret.
- Android Emulator thường truy cập máy host bằng `10.0.2.2`; `localhost` trên emulator là chính emulator.
- Điện thoại thật dùng IP LAN của máy chạy API khi cùng mạng, hoặc HTTPS của môi trường test; cấu hình backend/firewall có chủ đích.
- Môi trường test dùng chung ưu tiên HTTPS; nếu local HTTP cần cấu hình development riêng, không bật cleartext toàn cục trong bản bàn giao.
- README phải ghi lệnh cài/chạy/build thực sự có trong scripts, cách đổi API URL, seed tài khoản và cách chạy kiểm thử.
- Bàn giao web build được, APK Android cài được, `.env.example`, API types đồng bộ và checklist role × platform đã điền kết quả.
- Nếu chưa build/cài APK do thiếu Android SDK hoặc cấu hình máy, ghi BLOCKED cùng lỗi thật; không coi Expo Go là APK nghiệm thu.

## 14. Tài liệu chính thức đã đối chiếu

- [Expo Router — cấu trúc route và vị trí component](https://docs.expo.dev/router/basics/core-concepts/): route nằm trong `src/app`, component khác nằm ngoài.
- [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/): lưu dữ liệu nhỏ được bảo vệ; xử lý lỗi native và không dựa vào tính tồn tại sau gỡ app.
- [Expo ImagePicker](https://docs.expo.dev/versions/latest/sdk/imagepicker/): chọn/chụp ảnh và các quyền phụ thuộc nền tảng.
- [Android Emulator networking](https://developer.android.com/studio/run/emulator-networking): địa chỉ host và mạng của emulator.
- Khi triển khai, đối chiếu docs theo phiên bản đã khóa; các quyết định về nghiệp vụ, quyền và UI trong tài liệu này là thiết kế của dự án.
