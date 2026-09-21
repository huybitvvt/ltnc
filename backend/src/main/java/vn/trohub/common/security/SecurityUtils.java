package vn.trohub.common.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;
import java.util.UUID;

public final class SecurityUtils {

    private SecurityUtils() {}

    public static Optional<UserPrincipal> getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal) {
            return Optional.of(principal);
        }
        return Optional.empty();
    }

    public static UUID getCurrentUserId() {
        return getCurrentUser()
                .map(UserPrincipal::getId)
                .orElseThrow(() -> new IllegalStateException("Không tìm thấy người dùng trong SecurityContext"));
    }
}
