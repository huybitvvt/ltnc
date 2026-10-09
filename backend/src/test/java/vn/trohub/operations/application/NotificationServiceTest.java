package vn.trohub.operations.application;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import vn.trohub.common.security.UserPrincipal;
import vn.trohub.operations.application.OperationsDtos.BroadcastNotificationRequest;
import vn.trohub.operations.application.OperationsDtos.NotificationDto;
import vn.trohub.operations.domain.Notification;
import vn.trohub.operations.infrastructure.NotificationRepository;
import vn.trohub.property.domain.Building;
import vn.trohub.property.domain.Room;
import vn.trohub.tenancy.domain.Contract;
import vn.trohub.tenancy.domain.ContractStatus;
import vn.trohub.tenancy.domain.TenantProfile;
import vn.trohub.tenancy.infrastructure.ContractRepository;
import vn.trohub.user.domain.User;
import vn.trohub.user.domain.UserRole;
import vn.trohub.user.infrastructure.BuildingStaffAssignmentRepository;
import vn.trohub.user.infrastructure.UserRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private ContractRepository contractRepository;
    @Mock
    private BuildingStaffAssignmentRepository staffAssignmentRepository;

    private NotificationService notificationService;

    private User owner;
    private User staff;
    private User tenantUser;
    private Building building;
    private Room room;
    private Contract contract;

    @BeforeEach
    void setUp() {
        notificationService = new NotificationService(
                notificationRepository,
                userRepository,
                contractRepository,
                staffAssignmentRepository
        );

        owner = new User("owner@trohub.vn", "hash", UserRole.OWNER);
        owner.setId(UUID.randomUUID());

        staff = new User("staff@trohub.vn", "hash", UserRole.STAFF);
        staff.setId(UUID.randomUUID());

        tenantUser = new User("tenant@trohub.vn", "hash", UserRole.TENANT);
        tenantUser.setId(UUID.randomUUID());

        building = new Building("Tòa A", "123 Giải Phóng");
        building.setId(UUID.randomUUID());

        room = new Room(building, null, "101", new BigDecimal("3000000"), new BigDecimal("3000000"));
        room.setId(UUID.randomUUID());

        TenantProfile tenantProfile = new TenantProfile("Nguyễn Văn Thuê", "0903333333", "001200000001", "Hà Nội");
        tenantProfile.setUser(tenantUser);

        contract = new Contract(room, tenantProfile, LocalDate.now(), LocalDate.now().plusMonths(6), new BigDecimal("3000000"), new BigDecimal("3000000"));
        contract.setId(UUID.randomUUID());
        contract.setStatus(ContractStatus.ACTIVE);
    }

    @Test
    @DisplayName("Gửi thông báo thành công và lưu vào database")
    void testSendNotification_Success() {
        when(notificationRepository.existsByUserIdAndEventKey(tenantUser.getId(), "EVT-01")).thenReturn(false);
        when(userRepository.findById(tenantUser.getId())).thenReturn(Optional.of(tenantUser));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> {
            Notification n = inv.getArgument(0);
            n.setId(UUID.randomUUID());
            return n;
        });

        Optional<NotificationDto> result = notificationService.sendNotification(
                tenantUser.getId(),
                "EVT-01",
                "INVOICE_ISSUED",
                "Hóa đơn mới",
                "Bạn có hóa đơn tháng 9",
                "INVOICE",
                UUID.randomUUID()
        );

        assertTrue(result.isPresent());
        assertEquals("Hóa đơn mới", result.get().title());
        verify(notificationRepository).save(any(Notification.class));
    }

    @Test
    @DisplayName("Chống trùng lặp thông báo theo event_key (BR-136)")
    void testSendNotification_Deduplication_BR136() {
        when(notificationRepository.existsByUserIdAndEventKey(tenantUser.getId(), "EVT-DUP")).thenReturn(true);

        Optional<NotificationDto> result = notificationService.sendNotification(
                tenantUser.getId(),
                "EVT-DUP",
                "INVOICE_ISSUED",
                "Hóa đơn mới",
                "Bạn có hóa đơn tháng 9",
                "INVOICE",
                UUID.randomUUID()
        );

        assertTrue(result.isEmpty());
        verify(notificationRepository, never()).save(any(Notification.class));
    }

    @Test
    @DisplayName("Đánh dấu đã đọc thông báo khi đúng user sở hữu")
    void testMarkAsRead_Success() {
        UUID notifId = UUID.randomUUID();
        Notification notif = new Notification(tenantUser, "EVT-01", "INFO", "Tiêu đề", "Nội dung", null, null);
        notif.setId(notifId);

        when(notificationRepository.findById(notifId)).thenReturn(Optional.of(notif));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> inv.getArgument(0));

        NotificationDto dto = notificationService.markAsRead(notifId, tenantUser.getId());
        assertNotNull(dto.readAt());
    }

    @Test
    @DisplayName("Từ chối đánh dấu đã đọc khi user khác cố truy cập")
    void testMarkAsRead_AccessDenied_DifferentUser() {
        UUID notifId = UUID.randomUUID();
        Notification notif = new Notification(tenantUser, "EVT-01", "INFO", "Tiêu đề", "Nội dung", null, null);
        notif.setId(notifId);

        when(notificationRepository.findById(notifId)).thenReturn(Optional.of(notif));

        assertThrows(AccessDeniedException.class, () ->
                notificationService.markAsRead(notifId, staff.getId()));
    }

    @Test
    @DisplayName("Đánh dấu tất cả thông báo là đã đọc")
    void testMarkAllAsRead_Success() {
        Notification n1 = new Notification(tenantUser, "EVT-1", "INFO", "T1", "M1", null, null);
        Notification n2 = new Notification(tenantUser, "EVT-2", "INFO", "T2", "M2", null, null);

        when(notificationRepository.findByUserIdAndReadAtIsNull(tenantUser.getId())).thenReturn(List.of(n1, n2));

        notificationService.markAllAsRead(tenantUser.getId());

        assertNotNull(n1.getReadAt());
        assertNotNull(n2.getReadAt());
        verify(notificationRepository).saveAll(anyList());
    }

    @Test
    @DisplayName("OWNER phát thông báo broadcast tới tất cả người thuê ACTIVE trong tòa")
    void testBroadcastNotification_OwnerSuccess() {
        UserPrincipal principal = new UserPrincipal(owner.getId(), owner.getLogin(), owner.getRole(), true);
        when(userRepository.findById(owner.getId())).thenReturn(Optional.of(owner));
        when(userRepository.findById(tenantUser.getId())).thenReturn(Optional.of(tenantUser));

        when(contractRepository.findContracts(eq(building.getId()), isNull(), eq(ContractStatus.ACTIVE), isNull(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(contract)));

        when(notificationRepository.existsByUserIdAndEventKey(any(), any())).thenReturn(false);
        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> {
            Notification n = inv.getArgument(0);
            n.setId(UUID.randomUUID());
            return n;
        });

        BroadcastNotificationRequest req = new BroadcastNotificationRequest(building.getId(), "Cúp nước", "Ngày mai cúp nước từ 8h đến 11h");
        int count = notificationService.broadcastNotification(req, principal);

        assertEquals(1, count);
        verify(notificationRepository).save(any(Notification.class));
    }

    @Test
    @DisplayName("STAFF chưa được phân công quản lý tòa nhà bị từ chối broadcast")
    void testBroadcastNotification_StaffWithoutAssignment_AccessDenied() {
        UserPrincipal principal = new UserPrincipal(staff.getId(), staff.getLogin(), staff.getRole(), true);
        when(userRepository.findById(staff.getId())).thenReturn(Optional.of(staff));
        when(staffAssignmentRepository.existsByUserIdAndBuildingId(staff.getId(), building.getId())).thenReturn(false);

        BroadcastNotificationRequest req = new BroadcastNotificationRequest(building.getId(), "Cúp điện", "Thông báo cúp điện");
        assertThrows(AccessDeniedException.class, () ->
                notificationService.broadcastNotification(req, principal));
    }
}
