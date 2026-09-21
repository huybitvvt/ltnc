# Ma trận Chức năng & Nghiệm thu (docs/FEATURE_MATRIX.md)

Tài liệu này theo dõi tiến độ và mức độ hoàn thiện của từng chức năng xuyên suốt các thành phần: **API (Backend), Web (React), Mobile (React Native/Expo Android), Automated Test và Bằng chứng kiểm thử (Evidence)** cho cả 3 vai trò: `OWNER`, `STAFF`, `TENANT`.

Trạng thái hợp lệ cho các cột: `NOT_STARTED`, `IN_PROGRESS`, `PASS`, `FAIL`, `BLOCKED`.

---

| ID | Nhóm nghiệp vụ | Chức năng (Capability) | Vai trò | API | Web | Mobile | Test | Evidence |
|---|---|---|---|---|---|---|---|---|
| **AUTH-01** | Tài khoản & Xác thực | Đăng nhập bằng tài khoản & mật khẩu | OWNER | PASS | PASS | PASS | PASS | `AuthServiceTest.testLogin_Success`, `web/src/features/auth/LoginPage`, `mobile/src/features/auth/LoginScreen` |
| **AUTH-02** | Tài khoản & Xác thực | Đăng nhập bằng tài khoản & mật khẩu | STAFF | PASS | PASS | PASS | PASS | `AuthServiceTest.testLogin_Success`, `web/src/features/auth/LoginPage`, `mobile/src/features/auth/LoginScreen` |
| **AUTH-03** | Tài khoản & Xác thực | Đăng nhập bằng tài khoản & mật khẩu | TENANT | PASS | PASS | PASS | PASS | `AuthServiceTest.testLogin_Success`, `web/src/features/auth/LoginPage`, `mobile/src/features/auth/LoginScreen` |
| **AUTH-04** | Tài khoản & Xác thực | Kích hoạt tài khoản qua mã mời | TENANT | PASS | PASS | PASS | PASS | `AuthServiceTest.testActivateAccount_ExpiredInvite`, `web/src/features/auth/ActivatePage`, `mobile/src/features/auth/ActivateScreen` |
| **AUTH-05** | Tài khoản & Xác thực | Đổi mật khẩu & Reset mật khẩu | ALL | PASS | PASS | PASS | PASS | `AuthServiceTest.testChangePassword_RevokesAllUserSessions`, `ChangePasswordDialog`, `ChangePasswordModal` |
| **AUTH-06** | Tài khoản & Xác thực | Xoay vòng phiên & Refresh token | ALL | PASS | PASS | PASS | PASS | `AuthServiceTest.testRefreshToken_Rotation`, `AuthServiceTest.testRefreshToken_ReuseDetection`, single-flight axios interceptor |
| **AUTH-07** | Tài khoản & Xác thực | Đăng xuất & Thu hồi phiên làm việc | ALL | PASS | PASS | PASS | PASS | `/api/v1/auth/logout`, `AuthContext.logout`, revoke session |
| **USER-01** | Quản trị người dùng | Quản lý tài khoản nhân viên (tạo/khóa) | OWNER | PASS | PASS | PASS | PASS | `UserServiceTest.testCreateStaff_Success`, `UserServiceTest.testUpdateUserStatus_Disable_RevokesSessions`, `web/src/features/users/UsersPage` |
| **USER-02** | Quản trị người dùng | Gán và cập nhật phân công tòa nhà cho STAFF | OWNER | PASS | PASS | PASS | PASS | `UserService.updateUserAssignments`, `BuildingStaffAssignmentRepository` |
| **PROP-01** | Bất động sản | Quản lý tòa nhà (Thêm/Sửa/Trạng thái) | OWNER | PASS | PASS | PASS | PASS | `PropertyServiceTest.testCreateBuilding_Owner_Success`, `web/src/features/property/BuildingsPage`, `mobile/src/features/property/PropertyScreen` |
| **PROP-02** | Bất động sản | Xem danh sách tòa nhà trong phạm vi phân công | STAFF | PASS | PASS | PASS | PASS | `PropertyServiceTest.testListBuildings_Staff_OnlyAssigned`, `PropertyServiceTest.testCheckBuildingAccess_Staff_NotAssigned_ThrowsAccessDenied` |
| **PROP-03** | Bất động sản | Quản lý tầng của tòa nhà | OWNER | PASS | PASS | PASS | PASS | `PropertyService.createFloor`, `FloorRepository`, `BuildingsPage` |
| **PROP-04** | Bất động sản | Quản lý phòng trọ (Thêm/Sửa/Sức chứa/Giá) | OWNER | PASS | PASS | PASS | PASS | `PropertyServiceTest.testCreateRoom_Success`, `PropertyServiceTest.testCreateRoom_DuplicateRoomNumber_ThrowsException`, `BuildingsPage` |
| **PROP-05** | Bất động sản | Quản lý phòng trọ trong tòa được giao | STAFF | PASS | PASS | PASS | PASS | `PropertyService.listRooms`, `PropertyScreen` |
| **PROP-06** | Bất động sản | Khóa/Mở trạng thái cho thuê phòng (bookable) | OWNER | PASS | PASS | PASS | PASS | `PropertyServiceTest.testSetRoomBookable_Success`, toggle lock trên Web & Mobile |
| **PROP-07** | Bất động sản | Khóa/Mở trạng thái cho thuê phòng (bookable) | STAFF | PASS | PASS | PASS | PASS | `PropertyServiceTest.testSetRoomBookable_Success`, toggle lock trên Web & Mobile |
| **PROP-08** | Bất động sản | Xem thông tin phòng đang thuê | TENANT | PASS | PASS | PASS | PASS | `TenantPortalPage`, `HomeScreen` cư dân |
| **TEN-01** | Cư trú & Khách thuê | Quản lý hồ sơ khách thuê | OWNER | PASS | PASS | PASS | PASS | `TenancyServiceTest.testCreateTenantProfile_Success`, `web/src/features/contracts/ContractsPage`, `mobile/src/features/contracts/ContractsScreen` |
| **TEN-02** | Cư trú & Khách thuê | Quản lý hồ sơ khách thuê trong phạm vi | STAFF | PASS | PASS | PASS | PASS | `TenancyService.listTenantProfiles`, scope filter |
| **TEN-03** | Cư trú & Khách thuê | Tạo mã mời kích hoạt tài khoản người đại diện | OWNER | PASS | PASS | PASS | PASS | `TenancyServiceTest.testIssueTenantInvite_Success`, `ContractsPage` dialog mã mời |
| **TEN-04** | Cư trú & Khách thuê | Tạo mã mời kích hoạt tài khoản người đại diện | STAFF | PASS | PASS | PASS | PASS | `TenancyService.issueTenantInvite`, `ContractsScreen` dialog mã mời |
| **TEN-05** | Cư trú & Khách thuê | Xem hồ sơ cá nhân của mình | TENANT | PASS | PASS | PASS | PASS | `TenantPortalPage`, `HomeScreen` cmt/cccd masked |
| **CONT-01**| Hợp đồng thuê phòng | Lập hợp đồng nháp (DRAFT) | OWNER | PASS | PASS | PASS | PASS | `TenancyServiceTest.testCreateDraftContract_Success`, `TenancyServiceTest.testCreateDraftContract_UnbookableRoom_ThrowsException`, modal lập hợp đồng |
| **CONT-02**| Hợp đồng thuê phòng | Lập hợp đồng nháp trong phạm vi | STAFF | PASS | PASS | PASS | PASS | `TenancyService.createDraftContract`, STAFF building assignment check |
| **CONT-03**| Hợp đồng thuê phòng | Nhận phòng & Kích hoạt hợp đồng (ACTIVE) | OWNER | PASS | PASS | PASS | PASS | `TenancyServiceTest.testActivateContract_Success`, `TenancyServiceTest.testActivateContract_RoomAlreadyRented_ThrowsException`, migration `uq_active_room_contract`, modal bàn giao điện nước |
| **CONT-04**| Hợp đồng thuê phòng | Nhận phòng & Kích hoạt hợp đồng (ACTIVE) | STAFF | PASS | PASS | PASS | PASS | `TenancyService.activateContract`, modal kích hoạt & chỉ số bàn giao |
| **CONT-05**| Hợp đồng thuê phòng | Xem hợp đồng đang thuê & hợp đồng cũ | TENANT | PASS | PASS | PASS | PASS | `TenancyServiceTest.testListContracts_Tenant_CannotReadDrafts`, `TenantPortalPage` & `ContractsScreen` hiển thị hợp đồng thật |
| **CONT-06**| Hợp đồng thuê phòng | Gia hạn hợp đồng (tăng ngày dự kiến) | OWNER | PASS | PASS | PASS | PASS | `TenancyServiceTest.testExtendContract_Success_KeepsRent`, modal gia hạn hợp đồng |
| **CONT-07**| Hợp đồng thuê phòng | Gia hạn hợp đồng trong phạm vi | STAFF | PASS | PASS | PASS | PASS | `TenancyService.extendContract`, modal gia hạn mobile & web |
| **CONT-08**| Hợp đồng thuê phòng | Quản lý thành viên cùng phòng | OWNER | PASS | PASS | PASS | PASS | `TenancyServiceTest.testAddContractMember_ExceedsCapacity_ThrowsException`, modal thêm thành viên kiểm tra maxTenants |
| **CONT-09**| Hợp đồng thuê phòng | Quản lý thành viên cùng phòng trong phạm vi | STAFF | PASS | PASS | PASS | PASS | `TenancyService.addMemberToContract`, kiểm tra sức chứa phòng |
| **CONT-10**| Hợp đồng thuê phòng | Xem danh sách thành viên cùng phòng | TENANT | PASS | PASS | PASS | PASS | `TenantPortalPage`, `ContractsScreen` chi tiết thành viên |
| **CONT-11**| Hợp đồng thuê phòng | Trả phòng thực tế & Giải phóng phòng | OWNER | PASS | PASS | PASS | PASS | `TenancyService.checkoutContract`, chuyển trạng thái ENDED & VACANT |
| **CONT-12**| Hợp đồng thuê phòng | Trả phòng thực tế & Giải phóng phòng | STAFF | PASS | PASS | PASS | PASS | `TenancyService.checkoutContract` |
| **MET-01** | Đơn giá & Đo lường | Cấu hình loại dịch vụ | OWNER | PASS | PASS | PASS | PASS | `PricingServiceTest.testCreateServiceDefinition_Owner_Success`, `web/src/features/metering/MeteringPage` |
| **MET-02** | Đơn giá & Đo lường | Thiết lập bảng đơn giá theo tháng hiệu lực | OWNER | PASS | PASS | PASS | PASS | `PricingServiceTest.testCreateTariff_DuplicateMonth_ThrowsException`, constraint `uq_building_service_month` |
| **MET-03** | Đơn giá & Đo lường | Thiết lập bảng đơn giá trong phạm vi | STAFF | PASS | PASS | PASS | PASS | `PricingService.createTariff`, kiểm tra phân công quản lý tòa nhà |
| **MET-04** | Đơn giá & Đo lường | Ghi chỉ số đồng hồ & Tải ảnh đính kèm | OWNER | PASS | PASS | PASS | PASS | `MeteringServiceTest.testRecordReading_Success`, `MeteringServiceTest.testRecordReading_LowerThanPrevious_ThrowsException` (BR-059) |
| **MET-05** | Đơn giá & Đo lường | Ghi chỉ số đồng hồ & Tải ảnh đính kèm | STAFF | PASS | PASS | PASS | PASS | `MeteringService.recordReading`, `MeteringScreen` ghi chỉ số & upload ảnh |
| **MET-06** | Đơn giá & Đo lường | Xem chỉ số và ảnh đồng hồ trên hóa đơn | TENANT | PASS | PASS | PASS | PASS | `MeteringController.getRoomReadings`, hiển thị trên web & app |
| **MET-07** | Đơn giá & Đo lường | Đánh giá cảnh báo tiêu thụ bất thường (3 kỳ)| OWNER | PASS | PASS | PASS | PASS | `MeteringServiceTest.testEvaluateConsumption_OverThreshold_ReturnsWarning` (BR-141), snapshot so sánh median |
| **MET-08** | Đơn giá & Đo lường | Xác nhận cảnh báo chỉ số đúng có lý do | STAFF | PASS | PASS | PASS | PASS | `MeteringServiceTest.testAcknowledgeAlert_Success` (BR-145), dialog xác nhận giải trình trên web & app |
| **INV-01** | Hóa đơn & Tính tiền | Xem trước & Tính toán hóa đơn nháp | OWNER | NOT_STARTED | NOT_STARTED | NOT_STARTED | NOT_STARTED | — |
| **INV-02** | Hóa đơn & Tính tiền | Xem trước & Tính toán hóa đơn nháp | STAFF | NOT_STARTED | NOT_STARTED | NOT_STARTED | NOT_STARTED | — |
| **INV-03** | Hóa đơn & Tính tiền | Phát hành hóa đơn (chốt snapshot bất biến) | OWNER | NOT_STARTED | NOT_STARTED | NOT_STARTED | NOT_STARTED | — |
| **INV-04** | Hóa đơn & Tính tiền | Phát hành hóa đơn trong phạm vi | STAFF | NOT_STARTED | NOT_STARTED | NOT_STARTED | NOT_STARTED | — |
| **INV-05** | Hóa đơn & Tính tiền | Xem hóa đơn đã phát hành & chi tiết dòng | TENANT | NOT_STARTED | NOT_STARTED | NOT_STARTED | NOT_STARTED | — |
| **INV-06** | Hóa đơn & Tính tiền | Điều chỉnh tăng/giảm giá trị hóa đơn | OWNER | NOT_STARTED | NOT_STARTED | NOT_STARTED | NOT_STARTED | — |
| **INV-07** | Hóa đơn & Tính tiền | Điều chỉnh tăng/giảm giá trị hóa đơn | STAFF | NOT_STARTED | NOT_STARTED | NOT_STARTED | NOT_STARTED | — |
| **INV-08** | Hóa đơn & Tính tiền | Thêm ghi chú đính chính mô tả hóa đơn | OWNER/STAFF| NOT_STARTED| NOT_STARTED | NOT_STARTED | NOT_STARTED | — |
| **PAY-01** | Thu tiền & Sổ cái | Ghi nhận thu tiền hóa đơn | OWNER | NOT_STARTED | NOT_STARTED | NOT_STARTED | NOT_STARTED | — |
| **PAY-02** | Thu tiền & Sổ cái | Ghi nhận thu tiền hóa đơn trong phạm vi | STAFF | NOT_STARTED | NOT_STARTED | NOT_STARTED | NOT_STARTED | — |
| **PAY-03** | Thu tiền & Sổ cái | Sửa khoản thu nhập nhầm (PAYMENT_CORRECTION)| OWNER | NOT_STARTED | NOT_STARTED | NOT_STARTED | NOT_STARTED | — |
| **PAY-04** | Thu tiền & Sổ cái | Sửa khoản thu nhập nhầm trong phạm vi | STAFF | NOT_STARTED | NOT_STARTED | NOT_STARTED | NOT_STARTED | — |
| **PAY-05** | Thu tiền & Sổ cái | Hoàn tiền thực tế từ khoản tiền dư | OWNER | NOT_STARTED | NOT_STARTED | NOT_STARTED | NOT_STARTED | — |
| **PAY-06** | Thu tiền & Sổ cái | Hoàn tiền thực tế từ khoản tiền dư | STAFF | NOT_STARTED | NOT_STARTED | NOT_STARTED | NOT_STARTED | — |
| **PAY-07** | Thu tiền & Sổ cái | Chuyển tiền dư giữa 2 hóa đơn cùng hợp đồng| OWNER | NOT_STARTED | NOT_STARTED | NOT_STARTED | NOT_STARTED | — |
| **PAY-08** | Thu tiền & Sổ cái | Chuyển tiền dư giữa 2 hóa đơn cùng hợp đồng| STAFF | NOT_STARTED | NOT_STARTED | NOT_STARTED | NOT_STARTED | — |
| **PAY-09** | Thu tiền & Sổ cái | Xem lịch sử thanh toán hóa đơn của mình | TENANT | NOT_STARTED | NOT_STARTED | NOT_STARTED | NOT_STARTED | — |
| **DEP-01** | Tiền cọc & Quyết toán| Ghi nhận thu tiền cọc | OWNER | NOT_STARTED | NOT_STARTED | NOT_STARTED | NOT_STARTED | — |
| **DEP-02** | Tiền cọc & Quyết toán| Ghi nhận thu tiền cọc trong phạm vi | STAFF | NOT_STARTED | NOT_STARTED | NOT_STARTED | NOT_STARTED | — |
| **DEP-03** | Tiền cọc & Quyết toán| Sửa sai khoản thu cọc | OWNER/STAFF| NOT_STARTED| NOT_STARTED | NOT_STARTED | NOT_STARTED | — |
| **DEP-04** | Tiền cọc & Quyết toán| Hoàn trả tiền cọc | OWNER/STAFF| NOT_STARTED| NOT_STARTED | NOT_STARTED | NOT_STARTED | — |
| **DEP-05** | Tiền cọc & Quyết toán| Khấu trừ tiền cọc do hư hại thiết bị | OWNER/STAFF| NOT_STARTED| NOT_STARTED | NOT_STARTED | NOT_STARTED | — |
| **DEP-06** | Tiền cọc & Quyết toán| Bù trừ tiền cọc sang thanh toán hóa đơn | OWNER/STAFF| NOT_STARTED| NOT_STARTED | NOT_STARTED | NOT_STARTED | — |
| **DEP-07** | Tiền cọc & Quyết toán| Xác nhận hoàn tất quyết toán cọc (SETTLED) | OWNER/STAFF| NOT_STARTED| NOT_STARTED | NOT_STARTED | NOT_STARTED | — |
| **DEP-08** | Tiền cọc & Quyết toán| Xem số dư cọc & lịch sử cọc của mình | TENANT | NOT_STARTED | NOT_STARTED | NOT_STARTED | NOT_STARTED | — |
| **OPS-01** | Sự cố & Sửa chữa | Báo cáo sự cố kèm ảnh | TENANT | NOT_STARTED | NOT_STARTED | NOT_STARTED | NOT_STARTED | — |
| **OPS-02** | Sự cố & Sửa chữa | Tạo và tiếp nhận sự cố trong phạm vi | STAFF | NOT_STARTED | NOT_STARTED | NOT_STARTED | NOT_STARTED | — |
| **OPS-03** | Sự cố & Sửa chữa | Phân công nhân viên & Cập nhật tiến độ | OWNER/STAFF| NOT_STARTED| NOT_STARTED | NOT_STARTED | NOT_STARTED | — |
| **OPS-04** | Sự cố & Sửa chữa | Xác nhận hoàn tất hoặc Yêu cầu mở lại sự cố | TENANT | NOT_STARTED | NOT_STARTED | NOT_STARTED | NOT_STARTED | — |
| **OPS-05** | Phản hồi hóa đơn | Gửi phản hồi thắc mắc về hóa đơn | TENANT | NOT_STARTED | NOT_STARTED | NOT_STARTED | NOT_STARTED | — |
| **OPS-06** | Phản hồi hóa đơn | Tiếp nhận và trả lời phản hồi hóa đơn | OWNER/STAFF| NOT_STARTED| NOT_STARTED | NOT_STARTED | NOT_STARTED | — |
| **NOTIF-01**| Thông báo nội bộ | Nhận thông báo tự động (hóa đơn, sự cố) | TENANT | NOT_STARTED | NOT_STARTED | NOT_STARTED | NOT_STARTED | — |
| **NOTIF-02**| Thông báo nội bộ | Quản lý soạn và gửi thông báo cho tòa | OWNER/STAFF| NOT_STARTED| NOT_STARTED | NOT_STARTED | NOT_STARTED | — |
| **REP-01** | Dashboard & Báo cáo | Dashboard tổng quan tài chính và phòng toàn bộ| OWNER | NOT_STARTED | NOT_STARTED | NOT_STARTED | NOT_STARTED | — |
| **REP-02** | Dashboard & Báo cáo | Dashboard trong phạm vi tòa nhà được giao | STAFF | NOT_STARTED | NOT_STARTED | NOT_STARTED | NOT_STARTED | — |
| **REP-03** | Dashboard & Báo cáo | Dashboard tổng quan cá nhân người thuê | TENANT | NOT_STARTED | NOT_STARTED | NOT_STARTED | NOT_STARTED | — |
| **AUDIT-01**| Lịch sử kiểm toán | Tra cứu lịch sử thao tác tài chính có phân quyền| OWNER | NOT_STARTED | NOT_STARTED | NOT_STARTED | NOT_STARTED | — |
| **AUDIT-02**| Lịch sử kiểm toán | Tra cứu lịch sử thao tác trong phạm vi tòa | STAFF | NOT_STARTED | NOT_STARTED | NOT_STARTED | NOT_STARTED | — |
