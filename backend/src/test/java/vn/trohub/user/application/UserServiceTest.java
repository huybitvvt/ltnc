package vn.trohub.user.application;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import vn.trohub.auth.application.AuthService;
import vn.trohub.auth.domain.InvitePurpose;
import vn.trohub.auth.infrastructure.AuthSessionRepository;
import vn.trohub.property.domain.Building;
import vn.trohub.property.infrastructure.BuildingRepository;
import vn.trohub.user.domain.BuildingStaffAssignment;
import vn.trohub.user.domain.User;
import vn.trohub.user.domain.UserRole;
import vn.trohub.user.infrastructure.BuildingStaffAssignmentRepository;
import vn.trohub.user.infrastructure.UserRepository;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private BuildingStaffAssignmentRepository assignmentRepository;
    @Mock
    private BuildingRepository buildingRepository;
    @Mock
    private AuthSessionRepository authSessionRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private AuthService authService;

    private Clock fixedClock;
    private UserService userService;
    private final Instant now = Instant.parse("2026-09-21T10:00:00Z");

    @BeforeEach
    void setUp() {
        fixedClock = Clock.fixed(now, ZoneId.of("Asia/Ho_Chi_Minh"));
        userService = new UserService(
                userRepository,
                assignmentRepository,
                buildingRepository,
                authSessionRepository,
                passwordEncoder,
                authService,
                fixedClock
        );
    }

    @Test
    @DisplayName("Tạo STAFF thành công và phân công tòa nhà")
    void testCreateStaff_Success() {
        UUID bId1 = UUID.randomUUID();
        Building b1 = new Building("Nhà Trọ A", "123 Đường A");
        b1.setId(bId1);

        when(userRepository.existsByLogin("staff01")).thenReturn(false);
        when(passwordEncoder.encode("TempPassword123")).thenReturn("hashedTempPassword");
        when(buildingRepository.findById(bId1)).thenReturn(Optional.of(b1));
        when(userRepository.save(any(User.class))).thenAnswer(i -> {
            User u = i.getArgument(0);
            u.setId(UUID.randomUUID());
            return u;
        });

        User staff = userService.createStaff("staff01", "TempPassword123", List.of(bId1));

        assertNotNull(staff);
        assertEquals("staff01", staff.getLogin());
        assertEquals(UserRole.STAFF, staff.getRole());
        verify(userRepository).save(any(User.class));
        verify(assignmentRepository).save(any(BuildingStaffAssignment.class));
    }

    @Test
    @DisplayName("Vô hiệu hóa tài khoản (enabled=false) sẽ thu hồi toàn bộ session")
    void testUpdateUserStatus_Disable_RevokesSessions() {
        UUID userId = UUID.randomUUID();
        User user = new User("staff01", "hash", UserRole.STAFF);
        user.setId(userId);
        user.setEnabled(true);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        User updated = userService.updateUserStatus(userId, false);

        assertFalse(updated.isEnabled());
        verify(authSessionRepository).revokeAllUserSessions(eq(userId), eq(now));
    }

    @Test
    @DisplayName("Cấp lại mã mời gọi authService.createInvite thành công")
    void testReissueInvite_Success() {
        UUID targetUserId = UUID.randomUUID();
        User target = new User("tenant01", "pass", UserRole.TENANT);
        target.setId(targetUserId);

        User manager = new User("owner", "pass", UserRole.OWNER);

        when(userRepository.findById(targetUserId)).thenReturn(Optional.of(target));
        when(authService.createInvite(eq(manager), eq(target), eq(InvitePurpose.PASSWORD_RESET)))
                .thenReturn("INV-NEWCODE123");

        String inviteCode = userService.reissueInvite(targetUserId, manager);

        assertNotNull(inviteCode);
        assertEquals("INV-NEWCODE123", inviteCode);
        verify(authService).createInvite(eq(manager), eq(target), eq(InvitePurpose.PASSWORD_RESET));
    }
}
