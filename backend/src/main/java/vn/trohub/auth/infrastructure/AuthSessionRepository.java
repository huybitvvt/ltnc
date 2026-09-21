package vn.trohub.auth.infrastructure;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.trohub.auth.domain.AuthSession;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface AuthSessionRepository extends JpaRepository<AuthSession, UUID> {
    List<AuthSession> findByFamilyId(UUID familyId);

    @Modifying
    @Query("UPDATE AuthSession s SET s.revokedAt = :now WHERE s.familyId = :familyId AND s.revokedAt IS NULL")
    void revokeFamily(@Param("familyId") UUID familyId, @Param("now") Instant now);

    @Modifying
    @Query("UPDATE AuthSession s SET s.revokedAt = :now WHERE s.user.id = :userId AND s.revokedAt IS NULL")
    void revokeAllUserSessions(@Param("userId") UUID userId, @Param("now") Instant now);
}
