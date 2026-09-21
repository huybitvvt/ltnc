package vn.trohub.common.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;
import vn.trohub.auth.domain.AuthSession;
import vn.trohub.auth.infrastructure.AuthSessionRepository;
import vn.trohub.user.domain.User;
import vn.trohub.user.domain.UserRole;
import vn.trohub.user.infrastructure.BuildingStaffAssignmentRepository;
import vn.trohub.user.infrastructure.UserRepository;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;
    private final AuthSessionRepository authSessionRepository;
    private final UserRepository userRepository;
    private final BuildingStaffAssignmentRepository buildingStaffAssignmentRepository;

    public JwtAuthenticationFilter(
            JwtTokenProvider jwtTokenProvider,
            AuthSessionRepository authSessionRepository,
            UserRepository userRepository,
            BuildingStaffAssignmentRepository buildingStaffAssignmentRepository
    ) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.authSessionRepository = authSessionRepository;
        this.userRepository = userRepository;
        this.buildingStaffAssignmentRepository = buildingStaffAssignmentRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String token = resolveToken(request);
        if (StringUtils.hasText(token) && jwtTokenProvider.validateToken(token)) {
            try {
                Claims claims = jwtTokenProvider.parseClaims(token);
                UUID userId = UUID.fromString(claims.getSubject());
                UUID sessionId = UUID.fromString(claims.get("sid", String.class));
                UserRole role = UserRole.valueOf(claims.get("role", String.class));

                // Kiểm tra trạng thái phiên trực tiếp trong DB (BR-025, D-16)
                Optional<AuthSession> sessionOpt = authSessionRepository.findById(sessionId);
                if (sessionOpt.isPresent()) {
                    AuthSession session = sessionOpt.get();
                    Instant now = Instant.now();
                    if (!session.isRevoked() && !session.isExpired(now)) {
                        Optional<User> userOpt = userRepository.findById(userId);
                        if (userOpt.isPresent() && userOpt.get().isEnabled()) {
                            User user = userOpt.get();
                            List<UUID> assignedBuildingIds = List.of();
                            if (user.getRole() == UserRole.STAFF) {
                                assignedBuildingIds = buildingStaffAssignmentRepository.findBuildingIdsByUserId(userId);
                            }

                            UserPrincipal principal = new UserPrincipal(
                                    user.getId(),
                                    user.getLogin(),
                                    user.getPasswordHash(),
                                    user.getRole(),
                                    user.isEnabled(),
                                    sessionId,
                                    assignedBuildingIds
                            );

                            UsernamePasswordAuthenticationToken authentication =
                                    new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
                            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                            SecurityContextHolder.getContext().setAuthentication(authentication);
                        }
                    }
                }
            } catch (Exception e) {
                logger.debug("Failed to authenticate user from JWT: " + e.getMessage());
            }
        }

        filterChain.doFilter(request, response);
    }

    private String resolveToken(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
