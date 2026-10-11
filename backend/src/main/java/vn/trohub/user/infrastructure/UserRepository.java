package vn.trohub.user.infrastructure;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.trohub.user.domain.User;
import vn.trohub.user.domain.UserRole;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    @org.springframework.data.jpa.repository.Query(value = "SELECT EXISTS (SELECT 1 FROM contracts c JOIN tenant_profiles t ON t.id = c.representative_tenant_id " +
            "JOIN rooms r ON r.id = c.room_id JOIN building_staff_assignments a ON a.building_id = r.building_id " +
            "WHERE t.user_id = :tenantId AND c.status = 'ACTIVE' AND a.user_id = :staffId)", nativeQuery = true)
    boolean isTenantInStaffScope(@org.springframework.data.repository.query.Param("tenantId") UUID tenantId,
                                @org.springframework.data.repository.query.Param("staffId") UUID staffId);
    Optional<User> findByLogin(String login);
    boolean existsByLogin(String login);
    Page<User> findByRole(UserRole role, Pageable pageable);
    long countByRole(UserRole role);
}
