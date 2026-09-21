package vn.trohub.auth.application;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.UUID;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final AuthSessionRepository authSessionRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final InviteRepository inviteRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final Clock clock;

    @Value("${trohub.jwt.refresh-token-expiration-days:7}")
    private long refreshTokenExpirationDays;

    @Value("${trohub.owner-bootstrap.login:owner}")
    private String bootstrapOwnerLogin;

    @Value("${trohub.owner-bootstrap.password:TroHubOwner@2026}")
    private String bootstrapOwnerPassword;

    public AuthService(
            UserRepository userRepository,
            AuthSessionRepository authSessionRepository,
            RefreshTokenRepository refreshTokenRepository,
            InviteRepository inviteRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenProvider jwtTokenProvider,
            Clock clock
    ) {
        this.userRepository = userRepository;
        this.authSessionRepository = authSessionRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.inviteRepository = inviteRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
        this.clock = clock;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void bootstrapOwnerIfNecessary() {
        if (userRepository.countByRole(UserRole.OWNER) == 0) {
            log.info("Khởi tạo tài khoản OWNER mặc định từ cấu hình hệ thống: {}", bootstrapOwnerLogin);
            User owner = new User(
                    bootstrapOwnerLogin,
                    passwordEncoder.encode(bootstrapOwnerPassword),
                    UserRole.OWNER
            );
            userRepository.save(owner);
        }
    }

    @Transactional
    public AuthResult login(String login, String password) {
        User user = userRepository.findByLogin(login)
                .orElseThrow(() -> new BadCredentialsException("Tên đăng nhập hoặc mật khẩu không chính xác"));

        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new BadCredentialsException("Tên đăng nhập hoặc mật khẩu không chính xác");
        }

        if (!user.isEnabled()) {
            throw new BadCredentialsException("Tài khoản đã bị vô hiệu hóa");
        }

        Instant now = clock.instant();
        UUID familyId = UUID.randomUUID();
        Instant sessionExpiry = now.plus(refreshTokenExpirationDays, ChronoUnit.DAYS);

        AuthSession session = new AuthSession(user, familyId, sessionExpiry);
        session = authSessionRepository.save(session);

        String rawRefreshToken = generateSecureToken();
        String tokenHash = JwtTokenProvider.hashToken(rawRefreshToken);
        Instant tokenExpiry = now.plus(refreshTokenExpirationDays, ChronoUnit.DAYS);

        RefreshToken refreshToken = new RefreshToken(session, tokenHash, tokenExpiry);
        refreshTokenRepository.save(refreshToken);

        String accessToken = jwtTokenProvider.generateAccessToken(user.getId(), user.getLogin(), user.getRole(), session.getId());

        return new AuthResult(accessToken, rawRefreshToken, user);
    }

    @Transactional
    public AuthResult refreshSession(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw new BadCredentialsException("Refresh token không hợp lệ");
        }

        Instant now = clock.instant();
        String tokenHash = JwtTokenProvider.hashToken(rawRefreshToken);

        RefreshToken token = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new BadCredentialsException("Refresh token không tồn tại hoặc đã hết hạn"));

        AuthSession session = token.getSession();

        // Kiểm tra phát hiện tái sử dụng Token (Token Reuse Detection)
        if (token.isUsed()) {
            log.warn("CẢNH BÁO BẢO MẬT: Phát hiện tái sử dụng Refresh Token! Thu hồi toàn bộ Family ID={}", session.getFamilyId());
            authSessionRepository.revokeFamily(session.getFamilyId(), now);
            throw new BadCredentialsException("Phiên làm việc đã bị thu hồi do phát hiện tái sử dụng token bảo mật");
        }

        if (session.isRevoked() || session.isExpired(now)) {
            throw new BadCredentialsException("Phiên làm việc đã hết hạn hoặc bị thu hồi");
        }

        if (token.isExpired(now)) {
            throw new BadCredentialsException("Refresh token đã hết hạn");
        }

        User user = session.getUser();
        if (!user.isEnabled()) {
            authSessionRepository.revokeFamily(session.getFamilyId(), now);
            throw new BadCredentialsException("Tài khoản đã bị vô hiệu hóa");
        }

        // Xoay vòng Refresh Token (Token Rotation)
        String newRawRefreshToken = generateSecureToken();
        String newTokenHash = JwtTokenProvider.hashToken(newRawRefreshToken);
        Instant newTokenExpiry = now.plus(refreshTokenExpirationDays, ChronoUnit.DAYS);

        RefreshToken newToken = new RefreshToken(session, newTokenHash, newTokenExpiry);
        newToken = refreshTokenRepository.save(newToken);

        token.setUsedAt(now);
        token.setReplacedBy(newToken);
        refreshTokenRepository.save(token);

        String newAccessToken = jwtTokenProvider.generateAccessToken(user.getId(), user.getLogin(), user.getRole(), session.getId());

        return new AuthResult(newAccessToken, newRawRefreshToken, user);
    }

    @Transactional
    public void logoutBySessionId(UUID sessionId) {
        authSessionRepository.findById(sessionId).ifPresent(session -> {
            session.setRevokedAt(clock.instant());
            authSessionRepository.save(session);
        });
    }

    @Transactional
    public void logoutByRefreshToken(String rawRefreshToken) {
        if (rawRefreshToken != null && !rawRefreshToken.isBlank()) {
            String tokenHash = JwtTokenProvider.hashToken(rawRefreshToken);
            refreshTokenRepository.findByTokenHash(tokenHash).ifPresent(token -> {
                AuthSession session = token.getSession();
                session.setRevokedAt(clock.instant());
                authSessionRepository.save(session);
            });
        }
    }

    @Transactional
    public AuthResult activateAccount(String inviteCode, String newPassword) {
        Instant now = clock.instant();
        String codeHash = JwtTokenProvider.hashToken(inviteCode.trim());

        Invite invite = inviteRepository.findByCodeHashAndPurpose(codeHash, InvitePurpose.TENANT_INVITE)
                .orElseThrow(() -> new IllegalArgumentException("Mã mời kích hoạt không chính xác hoặc không tồn tại"));

        if (invite.isConsumed()) {
            throw new IllegalArgumentException("Mã mời này đã được sử dụng trước đó");
        }

        if (invite.isExpired(now)) {
            throw new IllegalArgumentException("Mã mời kích hoạt đã hết hạn sử dụng (hạn 24 giờ)");
        }

        User user = invite.getUser();
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setEnabled(true);
        userRepository.save(user);

        invite.setConsumedAt(now);
        inviteRepository.save(invite);

        // Tạo phiên đăng nhập ngay sau khi kích hoạt thành công
        UUID familyId = UUID.randomUUID();
        Instant sessionExpiry = now.plus(refreshTokenExpirationDays, ChronoUnit.DAYS);
        AuthSession session = authSessionRepository.save(new AuthSession(user, familyId, sessionExpiry));

        String rawRefreshToken = generateSecureToken();
        String tokenHash = JwtTokenProvider.hashToken(rawRefreshToken);
        RefreshToken refreshToken = new RefreshToken(session, tokenHash, sessionExpiry);
        refreshTokenRepository.save(refreshToken);

        String accessToken = jwtTokenProvider.generateAccessToken(user.getId(), user.getLogin(), user.getRole(), session.getId());

        return new AuthResult(accessToken, rawRefreshToken, user);
    }

    @Transactional
    public void changePassword(UUID userId, String oldPassword, String newPassword) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Người dùng không tồn tại"));

        if (!passwordEncoder.matches(oldPassword, user.getPasswordHash())) {
            throw new BadCredentialsException("Mật khẩu hiện tại không chính xác");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Thu hồi toàn bộ phiên làm việc cũ khi đổi mật khẩu (BR-025, D-16)
        authSessionRepository.revokeAllUserSessions(userId, clock.instant());
    }

    @Transactional
    public String createInvite(User manager, User targetUser, InvitePurpose purpose) {
        Instant now = clock.instant();
        Instant expiresAt = now.plus(24, ChronoUnit.HOURS); // Hạn 24 giờ (BR-016)

        String rawCode = "INV-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        String codeHash = JwtTokenProvider.hashToken(rawCode);

        Invite invite = new Invite(targetUser, codeHash, purpose, expiresAt, manager);
        inviteRepository.save(invite);

        return rawCode;
    }

    private String generateSecureToken() {
        byte[] randomBytes = new byte[32];
        new SecureRandom().nextBytes(randomBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
    }

    public record AuthResult(String accessToken, String refreshToken, User user) {}
}
