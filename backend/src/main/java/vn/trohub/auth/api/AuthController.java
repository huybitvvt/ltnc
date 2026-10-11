package vn.trohub.auth.api;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import vn.trohub.auth.api.dto.AuthDtos.*;
import vn.trohub.auth.application.AuthService;
import vn.trohub.auth.application.AuthService.AuthResult;
import vn.trohub.common.api.ApiResponse;
import vn.trohub.common.security.UserPrincipal;

import java.util.Arrays;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private static final String REFRESH_COOKIE_NAME = "trohub_refresh_token";

    private final AuthService authService;
    @org.springframework.beans.factory.annotation.Value("${trohub.auth.secure-cookies:true}")
    private boolean secureCookies;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @GetMapping("/csrf")
    public ResponseEntity<ApiResponse<Map<String, String>>> getCsrfToken(org.springframework.security.web.csrf.CsrfToken csrf) {
        Map<String, String> data = Map.of(
                "token", csrf.getToken(),
                "headerName", csrf.getHeaderName()
        );
        return ResponseEntity.ok(ApiResponse.of(data));
    }

    @PostMapping({"/web/login", "/mobile/login"})
    public ResponseEntity<ApiResponse<AuthResponseData>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse response
    ) {
        AuthResult result = authService.login(request.login(), request.password());

        // Đặt HttpOnly cookie cho Web client (BR: D-16)
        boolean mobile = httpRequest.getRequestURI().contains("/mobile/");
        if (!mobile) setRefreshCookie(response, result.refreshToken(), 7 * 24 * 60 * 60);

        AuthResponseData responseData = new AuthResponseData(
                result.accessToken(),
                "Bearer",
                900,
                mobile ? result.refreshToken() : null,
                new UserSummaryDto(
                        result.user().getId(),
                        result.user().getLogin(),
                        result.user().getRole(),
                        result.user().isEnabled()
                )
        );

        return ResponseEntity.ok(ApiResponse.of(responseData));
    }

    @PostMapping("/activate")
    public ResponseEntity<ApiResponse<Map<String, String>>> activate(
            @Valid @RequestBody ActivateInviteRequest request,
            HttpServletResponse response
    ) {
        authService.activateAccount(request.inviteCode(), request.password());
        return ResponseEntity.ok(ApiResponse.of(Map.of("message", "Kích hoạt thành công. Vui lòng đăng nhập.")));
    }

    @PostMapping("/web/refresh")
    public ResponseEntity<ApiResponse<AuthResponseData>> refreshWeb(
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        String refreshToken = extractCookie(request, REFRESH_COOKIE_NAME);
        AuthResult result = authService.refreshSession(refreshToken);

        setRefreshCookie(response, result.refreshToken(), 7 * 24 * 60 * 60);

        AuthResponseData responseData = new AuthResponseData(
                result.accessToken(),
                "Bearer",
                900,
                null, // Web không cần đọc refresh token trong JSON body vì đã nằm trong cookie
                new UserSummaryDto(
                        result.user().getId(),
                        result.user().getLogin(),
                        result.user().getRole(),
                        result.user().isEnabled()
                )
        );

        return ResponseEntity.ok(ApiResponse.of(responseData));
    }

    @PostMapping("/web/logout")
    public ResponseEntity<ApiResponse<Map<String, String>>> logoutWeb(
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        if (principal != null) {
            authService.logoutBySessionId(principal.getSessionId());
        }
        authService.logoutByRefreshToken(extractCookie(request, REFRESH_COOKIE_NAME));
        deleteRefreshCookie(response);
        return ResponseEntity.ok(ApiResponse.of(Map.of("message", "Đăng xuất thành công")));
    }

    @PostMapping("/mobile/refresh")
    public ResponseEntity<ApiResponse<AuthResponseData>> refreshMobile(
            @Valid @RequestBody MobileRefreshRequest request
    ) {
        AuthResult result = authService.refreshSession(request.refreshToken());

        AuthResponseData responseData = new AuthResponseData(
                result.accessToken(),
                "Bearer",
                900,
                result.refreshToken(),
                new UserSummaryDto(
                        result.user().getId(),
                        result.user().getLogin(),
                        result.user().getRole(),
                        result.user().isEnabled()
                )
        );

        return ResponseEntity.ok(ApiResponse.of(responseData));
    }

    @PostMapping("/mobile/logout")
    public ResponseEntity<ApiResponse<Map<String, String>>> logoutMobile(
            @Valid @RequestBody MobileRefreshRequest request
    ) {
        authService.logoutByRefreshToken(request.refreshToken());
        return ResponseEntity.ok(ApiResponse.of(Map.of("message", "Đăng xuất thành công")));
    }

    @PostMapping("/change-password")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Map<String, String>>> changePassword(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody ChangePasswordRequest request,
            HttpServletResponse response
    ) {
        authService.changePassword(principal.getId(), request.oldPassword(), request.newPassword());
        deleteRefreshCookie(response);
        return ResponseEntity.ok(ApiResponse.of(Map.of("message", "Đổi mật khẩu thành công. Vui lòng đăng nhập lại.")));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Map<String, String>>> resetPassword(@Valid @RequestBody ActivateInviteRequest request) {
        authService.resetPassword(request.inviteCode(), request.password());
        return ResponseEntity.ok(ApiResponse.of(Map.of("message", "Đặt lại mật khẩu thành công. Vui lòng đăng nhập.")));
    }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<UserProfileData>> getCurrentUser(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UserProfileData profile = new UserProfileData(
                principal.getId(),
                principal.getUsername(),
                principal.getRole(),
                principal.getUsername(),
                principal.getAssignedBuildingIds()
        );
        return ResponseEntity.ok(ApiResponse.of(profile));
    }

    private void setRefreshCookie(HttpServletResponse response, String token, long maxAgeSeconds) {
        ResponseCookie cookie = ResponseCookie.from(REFRESH_COOKIE_NAME, token)
                .httpOnly(true)
                .secure(secureCookies)
                .sameSite("Lax")
                .path("/api/v1/auth/web")
                .maxAge(maxAgeSeconds)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private void deleteRefreshCookie(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from(REFRESH_COOKIE_NAME, "")
                .httpOnly(true)
                .secure(secureCookies)
                .sameSite("Lax")
                .path("/api/v1/auth/web")
                .maxAge(0)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private String extractCookie(HttpServletRequest request, String name) {
        if (request.getCookies() == null) {
            return null;
        }
        return Arrays.stream(request.getCookies())
                .filter(c -> name.equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
    }
}
