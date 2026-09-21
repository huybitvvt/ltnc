package vn.trohub.user.application;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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
import java.util.List;
import java.util.UUID;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final BuildingStaffAssignmentRepository assignmentRepository;
    private final BuildingRepository buildingRepository;
    private final AuthSessionRepository authSessionRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthService authService;
    private final Clock clock;

    public UserService(
            UserRepository userRepository,
            BuildingStaffAssignmentRepository assignmentRepository,
            BuildingRepository buildingRepository,
            AuthSessionRepository authSessionRepository,
            PasswordEncoder passwordEncoder,
            AuthService authService,
            Clock clock
    ) {
        this.userRepository = userRepository;
        this.assignmentRepository = assignmentRepository;
        this.buildingRepository = buildingRepository;
        this.authSessionRepository = authSessionRepository;
        this.passwordEncoder = passwordEncoder;
        this.authService = authService;
        this.clock = clock;
    }

    public Page<User> listUsers(UserRole role, Pageable pageable) {
        if (role != null) {
            return userRepository.findByRole(role, pageable);
        }
        return userRepository.findAll(pageable);
    }

    public User getUserById(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng với ID: " + id));
    }

    @Transactional
    public User createStaff(String login, String password, List<UUID> buildingIds) {
        if (userRepository.existsByLogin(login)) {
            throw new IllegalArgumentException("Tên đăng nhập '" + login + "' đã tồn tại trong hệ thống");
        }

        User staff = new User(login, passwordEncoder.encode(password), UserRole.STAFF);
        staff = userRepository.save(staff);

        if (buildingIds != null && !buildingIds.isEmpty()) {
            for (UUID buildingId : buildingIds) {
                Building building = buildingRepository.findById(buildingId)
                        .orElseThrow(() -> new IllegalArgumentException("Tòa nhà không tồn tại: " + buildingId));
                assignmentRepository.save(new BuildingStaffAssignment(staff, building));
            }
        }

        return staff;
    }

    @Transactional
    public User updateUserStatus(UUID userId, boolean enabled) {
        User user = getUserById(userId);
        user.setEnabled(enabled);
        user = userRepository.save(user);

        if (!enabled) {
            // Khi vô hiệu hóa tài khoản, thu hồi toàn bộ phiên làm việc ngay lập tức (BR-025, D-16)
            authSessionRepository.revokeAllUserSessions(userId, clock.instant());
        }

        return user;
    }

    public List<UUID> getUserAssignments(UUID userId) {
        return assignmentRepository.findBuildingIdsByUserId(userId);
    }

    @Transactional
    public void updateUserAssignments(UUID userId, List<UUID> buildingIds) {
        User user = getUserById(userId);
        if (user.getRole() != UserRole.STAFF) {
            throw new IllegalArgumentException("Chỉ có thể phân công tòa nhà cho tài khoản STAFF");
        }

        assignmentRepository.deleteByUserId(userId);

        if (buildingIds != null) {
            for (UUID buildingId : buildingIds) {
                Building building = buildingRepository.findById(buildingId)
                        .orElseThrow(() -> new IllegalArgumentException("Tòa nhà không tồn tại: " + buildingId));
                assignmentRepository.save(new BuildingStaffAssignment(user, building));
            }
        }
    }

    @Transactional
    public String reissueInvite(UUID targetUserId, User manager) {
        User target = getUserById(targetUserId);
        return authService.createInvite(manager, target, InvitePurpose.TENANT_INVITE);
    }
}
