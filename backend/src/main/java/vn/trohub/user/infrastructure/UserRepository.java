package vn.trohub.user.infrastructure;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.trohub.user.domain.User;
import vn.trohub.user.domain.UserRole;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByLogin(String login);
    boolean existsByLogin(String login);
    Page<User> findByRole(UserRole role, Pageable pageable);
    long countByRole(UserRole role);
}
