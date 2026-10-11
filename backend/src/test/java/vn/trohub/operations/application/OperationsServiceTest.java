package vn.trohub.operations.application;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import vn.trohub.billing.domain.Invoice;
import vn.trohub.billing.infrastructure.InvoiceRepository;
import vn.trohub.common.api.ConflictException;
import vn.trohub.operations.domain.*;
import vn.trohub.operations.infrastructure.*;
import vn.trohub.property.domain.Room;
import vn.trohub.property.domain.RoomStatus;
import vn.trohub.property.infrastructure.RoomRepository;
import vn.trohub.tenancy.domain.Contract;
import vn.trohub.tenancy.domain.ContractStatus;
import vn.trohub.tenancy.domain.TenantProfile;
import vn.trohub.tenancy.infrastructure.ContractRepository;
import vn.trohub.user.domain.User;
import vn.trohub.user.domain.UserRole;
import vn.trohub.user.infrastructure.UserRepository;

import java.math.BigDecimal;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OperationsServiceTest {

    @Mock
    private MaintenanceIssueRepository issueRepository;
    @Mock
    private IssueStatusHistoryRepository issueHistoryRepository;
    @Mock
    private InvoiceFeedbackRepository feedbackRepository;
    @Mock
    private InvoiceFeedbackReplyRepository feedbackReplyRepository;
    @Mock
    private StoredFileRepository storedFileRepository;
    @Mock
    private ContractRepository contractRepository;
    @Mock
    private RoomRepository roomRepository;
    @Mock
    private InvoiceRepository invoiceRepository;
    @Mock
    private UserRepository userRepository;

    @Mock private vn.trohub.user.infrastructure.BuildingStaffAssignmentRepository assignments;
    @Mock private vn.trohub.tenancy.infrastructure.MeterReadingRepository readings;

    @TempDir
    Path tempStorageDir;

    private OperationsService operationsService;

    private User tenantUser;
    private User staffUser;
    private Contract activeContract;
    private Contract endedContract;
    private Room room;
    private Invoice invoice;

    @BeforeEach
    void setUp() {
        operationsService = new OperationsService(
                issueRepository,
                issueHistoryRepository,
                feedbackRepository,
                feedbackReplyRepository,
                storedFileRepository,
                contractRepository,
                roomRepository,
                invoiceRepository,
                userRepository, assignments, readings,
                tempStorageDir.toString()
        );

        tenantUser = new User("tenant_test", "hashed_pwd", UserRole.TENANT);
        tenantUser.setId(UUID.randomUUID());

        staffUser = new User("staff_test", "hashed_pwd", UserRole.STAFF);
        staffUser.setId(UUID.randomUUID());

        vn.trohub.property.domain.Building building = new vn.trohub.property.domain.Building("Tòa Nhà Test", "Địa chỉ");
        building.setId(UUID.randomUUID());

        room = new Room(building, null, "101", new BigDecimal("3000000"), new BigDecimal("3000000"));
        room.setId(UUID.randomUUID());
        room.setStatus(RoomStatus.RENTED);

        TenantProfile profile = new TenantProfile("Nguyen Van A", "0901234567", "012345678901", null);
        profile.setId(UUID.randomUUID());
        profile.setUser(tenantUser);
        lenient().when(assignments.findBuildingIdsByUserId(staffUser.getId())).thenReturn(List.of(building.getId()));

        activeContract = new Contract(
                room,
                profile,
                LocalDate.of(2026, 9, 1),
                LocalDate.of(2027, 3, 1),
                new BigDecimal("3000000"),
                new BigDecimal("3000000")
        );
        activeContract.setId(UUID.randomUUID());
        activeContract.setStatus(ContractStatus.ACTIVE);

        endedContract = new Contract(
                room,
                profile,
                LocalDate.of(2026, 3, 1),
                LocalDate.of(2026, 9, 1),
                new BigDecimal("3000000"),
                new BigDecimal("3000000")
        );
        endedContract.setId(UUID.randomUUID());
        endedContract.setStatus(ContractStatus.ENDED);

        invoice = new Invoice();
        invoice.setId(UUID.randomUUID());
        invoice.setContract(activeContract);
        invoice.setBillingMonth("2026-09");
        invoice.setStatus(vn.trohub.billing.domain.InvoiceStatus.ISSUED);
    }

    @Test
    @DisplayName("Tạo sự cố khi hợp đồng ACTIVE -> Thành công, trạng thái OPEN (BR-125)")
    void createIssue_activeContract_success() {
        OperationsDtos.CreateIssueRequest req = new OperationsDtos.CreateIssueRequest(
                activeContract.getId(),
                room.getId(),
                "Hỏng vòi nước bồn rửa",
                "Vòi nước rò rỉ liên tục gây tràn sàn",
                Collections.emptyList()
        );

        when(contractRepository.findById(activeContract.getId())).thenReturn(Optional.of(activeContract));
        when(roomRepository.findById(room.getId())).thenReturn(Optional.of(room));
        when(userRepository.findById(tenantUser.getId())).thenReturn(Optional.of(tenantUser));
        when(issueRepository.save(any(MaintenanceIssue.class))).thenAnswer(inv -> {
            MaintenanceIssue issue = inv.getArgument(0);
            issue.setId(UUID.randomUUID());
            return issue;
        });

        OperationsDtos.IssueDto result = operationsService.createIssue(req, tenantUser.getId());

        assertNotNull(result);
        assertEquals(IssueStatus.OPEN, result.status());
        assertEquals("Hỏng vòi nước bồn rửa", result.title());
        verify(issueRepository).save(any(MaintenanceIssue.class));
        verify(issueHistoryRepository).save(any(IssueStatusHistory.class));
    }

    @Test
    @DisplayName("Tạo sự cố khi hợp đồng đã ENDED -> Bị từ chối Conflict 409 (BR-125)")
    void createIssue_endedContract_throwsConflict() {
        OperationsDtos.CreateIssueRequest req = new OperationsDtos.CreateIssueRequest(
                endedContract.getId(),
                room.getId(),
                "Sự cố sau trả phòng",
                "Mô tả",
                Collections.emptyList()
        );

        when(contractRepository.findById(endedContract.getId())).thenReturn(Optional.of(endedContract));

        assertThrows(ConflictException.class, () -> operationsService.createIssue(req, tenantUser.getId()));
        verify(issueRepository, never()).save(any());
    }

    @Test
    @DisplayName("Tạo sự cố đính kèm quá 5 ảnh -> Bị từ chối BR-131")
    void createIssue_tooManyFiles_throwsBadRequest() {
        List<UUID> sixFiles = List.of(
                UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
                UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID()
        );
        OperationsDtos.CreateIssueRequest req = new OperationsDtos.CreateIssueRequest(
                activeContract.getId(),
                room.getId(),
                "Tiêu đề",
                "Mô tả",
                sixFiles
        );

        when(contractRepository.findById(activeContract.getId())).thenReturn(Optional.of(activeContract));
        when(roomRepository.findById(room.getId())).thenReturn(Optional.of(room));
        when(userRepository.findById(tenantUser.getId())).thenReturn(Optional.of(tenantUser));

        assertThrows(IllegalArgumentException.class, () -> operationsService.createIssue(req, tenantUser.getId()));
    }

    @Test
    @DisplayName("Chuyển trạng thái hợp lệ: OPEN -> ACCEPTED -> IN_PROGRESS -> RESOLVED -> CLOSED (BR-126)")
    void updateIssueStatus_validFlow_success() {
        MaintenanceIssue issue = new MaintenanceIssue(activeContract, room, "Sự cố điều hòa", "Không mát", tenantUser);
        issue.setId(UUID.randomUUID());
        issue.setStatus(IssueStatus.OPEN);

        when(issueRepository.findById(issue.getId())).thenReturn(Optional.of(issue));
        when(userRepository.findById(staffUser.getId())).thenReturn(Optional.of(staffUser));
        when(userRepository.findById(tenantUser.getId())).thenReturn(Optional.of(tenantUser));

        // 1. OPEN -> ACCEPTED
        operationsService.updateIssueStatus(
                issue.getId(),
                new OperationsDtos.UpdateIssueStatusRequest(IssueStatus.ACCEPTED, "Nhân viên đã tiếp nhận"),
                staffUser.getId()
        );
        assertEquals(IssueStatus.ACCEPTED, issue.getStatus());

        // 2. ACCEPTED -> IN_PROGRESS
        operationsService.updateIssueStatus(
                issue.getId(),
                new OperationsDtos.UpdateIssueStatusRequest(IssueStatus.IN_PROGRESS, "Thợ đang kiểm tra"),
                staffUser.getId()
        );
        assertEquals(IssueStatus.IN_PROGRESS, issue.getStatus());

        // 3. IN_PROGRESS -> RESOLVED
        operationsService.updateIssueStatus(
                issue.getId(),
                new OperationsDtos.UpdateIssueStatusRequest(IssueStatus.RESOLVED, "Đã bơm gas và vệ sinh lưới lọc"),
                staffUser.getId()
        );
        assertEquals(IssueStatus.RESOLVED, issue.getStatus());

        // 4. RESOLVED -> CLOSED
        operationsService.updateIssueStatus(
                issue.getId(),
                new OperationsDtos.UpdateIssueStatusRequest(IssueStatus.CLOSED, "Khách thuê xác nhận mát bình thường"),
                tenantUser.getId()
        );
        assertEquals(IssueStatus.CLOSED, issue.getStatus());
    }

    @Test
    @DisplayName("Chuyển trạng thái không hợp lệ: OPEN nhảy cóc sang RESOLVED -> Bị từ chối Conflict 409")
    void updateIssueStatus_invalidTransition_throwsConflict() {
        MaintenanceIssue issue = new MaintenanceIssue(activeContract, room, "Sự cố", "Mô tả", tenantUser);
        issue.setId(UUID.randomUUID());
        issue.setStatus(IssueStatus.OPEN);

        when(issueRepository.findById(issue.getId())).thenReturn(Optional.of(issue));
        when(userRepository.findById(staffUser.getId())).thenReturn(Optional.of(staffUser));

        assertThrows(ConflictException.class, () -> operationsService.updateIssueStatus(
                issue.getId(),
                new OperationsDtos.UpdateIssueStatusRequest(IssueStatus.RESOLVED, "Bỏ qua các bước"),
                staffUser.getId()
        ));
    }

    @Test
    @DisplayName("Mở lại sự cố từ RESOLVED về IN_PROGRESS không có lý do -> Bị từ chối BR-127")
    void updateIssueStatus_reopenWithoutReason_throws() {
        MaintenanceIssue issue = new MaintenanceIssue(activeContract, room, "Sự cố", "Mô tả", tenantUser);
        issue.setId(UUID.randomUUID());
        issue.setStatus(IssueStatus.RESOLVED);

        when(issueRepository.findById(issue.getId())).thenReturn(Optional.of(issue));
        when(userRepository.findById(tenantUser.getId())).thenReturn(Optional.of(tenantUser));

        assertThrows(IllegalArgumentException.class, () -> operationsService.updateIssueStatus(
                issue.getId(),
                new OperationsDtos.UpdateIssueStatusRequest(IssueStatus.IN_PROGRESS, "   "),
                tenantUser.getId()
        ));
    }

    @Test
    @DisplayName("Tạo phản hồi hóa đơn và trả lời trao đổi -> Chuyển OPEN sang IN_REVIEW (BR-123, BR-124)")
    void feedbackFlow_success() {
        when(invoiceRepository.findById(invoice.getId())).thenReturn(Optional.of(invoice));
        when(userRepository.findById(tenantUser.getId())).thenReturn(Optional.of(tenantUser));
        when(feedbackRepository.save(any(InvoiceFeedback.class))).thenAnswer(inv -> {
            InvoiceFeedback fb = inv.getArgument(0);
            fb.setId(UUID.randomUUID());
            return fb;
        });

        // 1. Tenant gửi phản hồi
        OperationsDtos.FeedbackDto fbDto = operationsService.createFeedback(
                invoice.getId(),
                new OperationsDtos.CreateFeedbackRequest("Thắc mắc tiền nước tháng này cao bất thường"),
                tenantUser.getId()
        );
        assertEquals(FeedbackStatus.OPEN, fbDto.status());

        // 2. Staff trả lời trao đổi
        InvoiceFeedback storedFb = new InvoiceFeedback(invoice, tenantUser, "Thắc mắc tiền nước");
        storedFb.setId(fbDto.id());
        storedFb.setStatus(FeedbackStatus.OPEN);

        when(feedbackRepository.findById(fbDto.id())).thenReturn(Optional.of(storedFb));
        when(userRepository.findById(staffUser.getId())).thenReturn(Optional.of(staffUser));

        OperationsDtos.FeedbackDto replyResult = operationsService.replyFeedback(
                fbDto.id(),
                new OperationsDtos.ReplyFeedbackRequest("BQL sẽ cho thợ qua kiểm tra lại đồng hồ nước phòng bạn"),
                staffUser.getId()
        );

        assertEquals(FeedbackStatus.IN_REVIEW, storedFb.getStatus());
        verify(feedbackReplyRepository).save(any(InvoiceFeedbackReply.class));
    }

    @Test
    @DisplayName("Lưu tệp ảnh: Kiểm tra kích thước <= 5MB và định dạng magic numbers hợp lệ (BR-131)")
    void storeFile_validation_success() {
        // PNG Header thật: 89 50 4E 47 0D 0A 1A 0A
        byte[] validPngContent = java.util.Base64.getDecoder().decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aK1cAAAAASUVORK5CYII=");
        MockMultipartFile validPng = new MockMultipartFile(
                "file", "test.png", "image/png", validPngContent
        );

        when(userRepository.findById(tenantUser.getId())).thenReturn(Optional.of(tenantUser));
        when(storedFileRepository.save(any(StoredFile.class))).thenAnswer(inv -> {
            StoredFile sf = inv.getArgument(0);
            sf.setId(UUID.randomUUID());
            return sf;
        });

        OperationsDtos.StoredFileDto fileDto = operationsService.storeFile(
                validPng,
                ParentType.MAINTENANCE_ISSUE,
                null,
                tenantUser.getId()
        );

        assertNotNull(fileDto);
        assertEquals("image/png", fileDto.mimeType());
        assertEquals("test.png", fileDto.originalName());
    }

    @Test
    @DisplayName("Tải file giả mạo định dạng (Content-type JPEG nhưng nội dung text) -> Bị từ chối BR-131")
    void storeFile_fakeContent_throws() {
        byte[] fakeContent = "This is a plain text file pretending to be jpg".getBytes();
        MockMultipartFile fakeJpg = new MockMultipartFile(
                "file", "fake.jpg", "image/jpeg", fakeContent
        );

        assertThrows(IllegalArgumentException.class, () -> operationsService.storeFile(
                fakeJpg,
                ParentType.MAINTENANCE_ISSUE,
                null,
                tenantUser.getId()
        ));
    }
}
