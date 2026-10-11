package vn.trohub.user.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public class UserDtos {

    public record CreateStaffRequest(
            @NotBlank(message = "Tên đăng nhập không được để trống")
            @Size(min = 3, max = 50, message = "Tên đăng nhập từ 3 đến 50 ký tự")
            String login,

            @Size(min = 6, message = "Mật khẩu tối thiểu 6 ký tự")
            String password,

            List<UUID> buildingIds
    ) {}

    public record StaffInviteResponse(UUID id, String login, vn.trohub.user.domain.UserRole role,
                                     boolean enabled, String inviteCode) {}

    public record UpdateUserStatusRequest(
            boolean enabled
    ) {}

    public record UpdateAssignmentsRequest(
            List<UUID> buildingIds
    ) {}
}
