package vn.trohub.auth.infrastructure;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.trohub.auth.domain.Invite;
import vn.trohub.auth.domain.InvitePurpose;

import java.util.Optional;
import java.util.UUID;

public interface InviteRepository extends JpaRepository<Invite, UUID> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    Optional<Invite> findByCodeHashAndPurpose(String codeHash, InvitePurpose purpose);
    Optional<Invite> findFirstByUserIdAndPurposeAndConsumedAtIsNullOrderByCreatedAtDesc(UUID userId, InvitePurpose purpose);
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("update Invite i set i.consumedAt = :now where i.user.id = :userId and i.purpose = :purpose and i.consumedAt is null")
    int consumeUnused(UUID userId, InvitePurpose purpose, java.time.Instant now);
}
