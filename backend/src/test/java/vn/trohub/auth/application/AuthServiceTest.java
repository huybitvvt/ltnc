package vn.trohub.auth.application;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import vn.trohub.auth.domain.AuthSession;
import vn.trohub.auth.domain.Invite;
import vn.trohub.auth.domain.InvitePurpose;
import vn.trohub.auth.domain.RefreshToken;
import vn.trohub.auth.infrastructure.AuthSessionRepository;
import vn.trohub.auth.infrastructure.InviteRepository;
import vn.trohub.auth.infrastructure.RefreshTokenRepository;
import vn.trohub.common.security.JwtTokenProvider;
import vn.trohub.user.domain.User;
import vn.trohub.user.domain.UserRole;
import vn.trohub.user.infrastructure.UserRepository;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private AuthSessionRepository authSessionRepository;
    @Mock
    private RefreshTokenRepository refreshTokenRepository;
    @Mock
    private InviteRepository inviteRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    private JwtTokenProvider jwtTokenProvider;

    private Clock fixedClock;
    private AuthService authService;
    private final Instant now = Instant.parse("2026-09-21T10:00:00Z");

    @BeforeEach
    void setUp() {
        fixedClock = Clock.fixed(now, ZoneId.of("Asia/Ho_Chi_Minh"));
        jwtTokenProvider = new JwtTokenProvider("TroHubSuperSecretKeyForTestingAtLeast32BytesLength!", 900);
        authService = new AuthService(
                userRepository,
                authSessionRepository,
                refreshTokenRepository,
                inviteRepository,
                passwordEncoder,
                jwtTokenProvider,
                fixedClock
        );
    }

    @Test
    @DisplayName("Đăng nhập thành công trả về access token và refresh token hợp lệ")
    void testLogin_Success() {
        User user = new User("owner", "hashedPassword", UserRole.OWNER);
        user.setId(UUID.randomUUID());

        when(userRepository.findByLogin("owner")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("TroHubOwner@2026", "hashedPassword")).thenReturn(true);
        when(authSessionRepository.save(any(AuthSession.class))).thenAnswer(i -> {
            AuthSession s = i.getArgument(0);
            if (s.getId() == null) {
                s.setId(UUID.randomUUID());
            }
            s.setRevokedAt(null);
            return s;
        });

        AuthService.AuthResult result = authService.login("owner", "TroHubOwner@2026");

        assertNotNull(result);
        assertNotNull(result.accessToken());
        assertFalse(result.accessToken().isBlank());
        assertNotNull(result.refreshToken());
        assertEquals("owner", result.user().getLogin());
        verify(authSessionRepository).save(any(AuthSession.class));
        verify(refreshTokenRepository).save(any(RefreshToken.class));
    }

    @Test
    @DisplayName("Đăng nhập sai mật khẩu ném ra BadCredentialsException")
    void testLogin_WrongPassword() {
        User user = new User("owner", "hashedPassword", UserRole.OWNER);
        when(userRepository.findByLogin("owner")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrongPass", "hashedPassword")).thenReturn(false);

        assertThrows(BadCredentialsException.class, () -> authService.login("owner", "wrongPass"));
    }

    @Test
    @DisplayName("Đăng nhập khi tài khoản bị khóa (enabled=false) ném ra BadCredentialsException")
    void testLogin_DisabledUser() {
        User user = new User("owner", "hashedPassword", UserRole.OWNER);
        user.setEnabled(false);

        when(userRepository.findByLogin("owner")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("pass", "hashedPassword")).thenReturn(true);

        assertThrows(BadCredentialsException.class, () -> authService.login("owner", "pass"));
    }

    @Test
    @DisplayName("Xoay vòng refresh token: cấp token mới và đánh dấu token cũ đã dùng")
    void testRefreshToken_Rotation() {
        User user = new User("tenant", "pass", UserRole.TENANT);
        user.setId(UUID.randomUUID());
        AuthSession session = new AuthSession(user, UUID.randomUUID(), now.plus(7, ChronoUnit.DAYS));
        session.setId(UUID.randomUUID());

        RefreshToken oldToken = new RefreshToken(session, "oldHash", now.plus(7, ChronoUnit.DAYS));

        when(refreshTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(oldToken));
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(i -> i.getArgument(0));

        AuthService.AuthResult result = authService.refreshSession("validRawRefreshToken");

        assertNotNull(result);
        assertNotNull(result.accessToken());
        assertFalse(result.accessToken().isBlank());
        assertTrue(oldToken.isUsed());
        assertEquals(now, oldToken.getUsedAt());
        assertNotNull(oldToken.getReplacedBy());
    }

    @Test
    @DisplayName("Phát hiện tái sử dụng Token: Token đã dùng bị gửi lại -> thu hồi toàn bộ token family")
    void testRefreshToken_ReuseDetection() {
        User user = new User("tenant", "pass", UserRole.TENANT);
        UUID familyId = UUID.randomUUID();
        AuthSession session = new AuthSession(user, familyId, now.plus(7, ChronoUnit.DAYS));

        RefreshToken reusedToken = new RefreshToken(session, "reusedHash", now.plus(7, ChronoUnit.DAYS));
        reusedToken.setUsedAt(now.minusSeconds(100)); // Đã được sử dụng trước đó!

        when(refreshTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(reusedToken));

        BadCredentialsException ex = assertThrows(BadCredentialsException.class,
                () -> authService.refreshSession("alreadyUsedRefreshToken"));

        assertTrue(ex.getMessage().contains("tái sử dụng"));
        // Xác minh toàn bộ token family bị thu hồi ngay lập tức
        verify(authSessionRepository).revokeFamily(eq(familyId), eq(now));
    }

    @Test
    @DisplayName("Kích hoạt tài khoản: mã mời quá 24 giờ bị từ chối")
    void testActivateAccount_ExpiredInvite() {
        User user = new User("tenant", "oldHash", UserRole.TENANT);
        Instant expiredAt = now.minus(1, ChronoUnit.HOURS);
        Invite expiredInvite = new Invite(user, "codeHash", InvitePurpose.TENANT_INVITE, expiredAt, user);

        when(inviteRepository.findByCodeHashAndPurpose(anyString(), eq(InvitePurpose.TENANT_INVITE)))
                .thenReturn(Optional.of(expiredInvite));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> authService.activateAccount("INV-EXPIRED", "newPassword123"));

        assertTrue(ex.getMessage().contains("hết hạn"));
    }

    @Test
    @DisplayName("Đổi mật khẩu: Cập nhật hash mới và thu hồi toàn bộ phiên làm việc của người dùng")
    void testChangePassword_RevokesAllUserSessions() {
        UUID userId = UUID.randomUUID();
        User user = new User("tenant", "currentHash", UserRole.TENANT);
        user.setId(userId);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("oldPass", "currentHash")).thenReturn(true);
        when(passwordEncoder.encode("newPass123")).thenReturn("newHashedPass");

        authService.changePassword(userId, "oldPass", "newPass123");

        assertEquals("newHashedPass", user.getPasswordHash());
        verify(userRepository).save(user);
        // Thu hồi mọi phiên làm việc cũ để bảo mật
        verify(authSessionRepository).revokeAllUserSessions(eq(userId), eq(now));
    }
}
