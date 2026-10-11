package vn.trohub.auth.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import vn.trohub.user.domain.UserRole;

import java.util.List;
import java.util.UUID;

public class AuthDtos {

    public record LoginRequest(
            @NotBlank(message = "Tên đăng nhập không được để trống")
            String login,
            @NotBlank(message = "Mật khẩu không được để trống")
            String password
    ) {}

    public record ActivateInviteRequest(
            @NotBlank(message = "Mã mời kích hoạt không được để trống")
            String inviteCode,
            @NotBlank(message = "Mật khẩu mới không được để trống")
            @Size(min = 6, message = "Mật khẩu phải từ 6 ký tự trở lên")
            @com.fasterxml.jackson.annotation.JsonAlias("newPassword")
            String password
    ) {}

    public record MobileRefreshRequest(
            @NotBlank(message = "Refresh token không được để trống")
            String refreshToken
    ) {}

    public record ChangePasswordRequest(
            @NotBlank(message = "Mật khẩu cũ không được để trống")
            String oldPassword,
            @NotBlank(message = "Mật khẩu mới không được để trống")
            @Size(min = 6, message = "Mật khẩu mới phải từ 6 ký tự trở lên")
            String newPassword
    ) {}

    public record UserSummaryDto(
            UUID id,
            String login,
            UserRole role,
            boolean enabled
    ) {}

    public record AuthResponseData(
            String accessToken,
            String tokenType,
            long expiresIn,
            String refreshToken,
            UserSummaryDto user
    ) {}

    public record UserProfileData(
            UUID id,
            String login,
            UserRole role,
            String fullName,
            List<UUID> assignedBuildingIds
    ) {}
}
