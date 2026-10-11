package vn.trohub.user.api;

import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import vn.trohub.auth.api.dto.AuthDtos.UserSummaryDto;
import vn.trohub.common.api.ApiResponse;
import vn.trohub.common.security.UserPrincipal;
import vn.trohub.user.api.dto.UserDtos.CreateStaffRequest;
import vn.trohub.user.api.dto.UserDtos.UpdateAssignmentsRequest;
import vn.trohub.user.api.dto.UserDtos.UpdateUserStatusRequest;
import vn.trohub.user.application.UserService;
import vn.trohub.user.domain.User;
import vn.trohub.user.domain.UserRole;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<ApiResponse<List<UserSummaryDto>>> listUsers(
            @RequestParam(required = false) UserRole role,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100));
        Page<User> userPage = userService.listUsers(role, pageable);

        List<UserSummaryDto> data = userPage.getContent().stream()
                .map(u -> new UserSummaryDto(u.getId(), u.getLogin(), u.getRole(), u.isEnabled()))
                .toList();

        Map<String, Object> meta = Map.of(
                "page", userPage.getNumber(),
                "size", userPage.getSize(),
                "totalElements", userPage.getTotalElements(),
                "totalPages", userPage.getTotalPages(),
                "traceId", UUID.randomUUID().toString()
        );

        return ResponseEntity.ok(ApiResponse.of(data, meta));
    }

    @PostMapping
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<ApiResponse<vn.trohub.user.api.dto.UserDtos.StaffInviteResponse>> createStaff(
            @Valid @RequestBody CreateStaffRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        var dto = userService.createStaffWithInvite(request.login(), request.buildingIds(), userService.getUserById(principal.getId()));
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(dto));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<ApiResponse<UserSummaryDto>> updateUserStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateUserStatusRequest request
    ) {
        User updated = userService.updateUserStatus(id, request.enabled());
        UserSummaryDto dto = new UserSummaryDto(updated.getId(), updated.getLogin(), updated.getRole(), updated.isEnabled());
        return ResponseEntity.ok(ApiResponse.of(dto));
    }

    @GetMapping("/{id}/assignments")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<ApiResponse<List<UUID>>> getUserAssignments(@PathVariable UUID id) {
        List<UUID> assignments = userService.getUserAssignments(id);
        return ResponseEntity.ok(ApiResponse.of(assignments));
    }

    @PutMapping("/{id}/assignments")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<ApiResponse<Map<String, String>>> updateUserAssignments(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateAssignmentsRequest request
    ) {
        userService.updateUserAssignments(id, request.buildingIds());
        return ResponseEntity.ok(ApiResponse.of(Map.of("message", "Cập nhật phân công tòa nhà thành công")));
    }

    @PostMapping("/{id}/reissue-invite")
    @PreAuthorize("hasAnyRole('OWNER', 'STAFF')")
    public ResponseEntity<ApiResponse<Map<String, String>>> reissueInvite(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        User manager = userService.getUserById(principal.getId());
        String newCode = userService.reissueInvite(id, manager);
        return ResponseEntity.ok(ApiResponse.of(Map.of("inviteCode", newCode)));
    }
}
