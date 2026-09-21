package vn.trohub.auth.infrastructure;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.trohub.auth.domain.Invite;
import vn.trohub.auth.domain.InvitePurpose;

import java.util.Optional;
import java.util.UUID;

public interface InviteRepository extends JpaRepository<Invite, UUID> {
    Optional<Invite> findByCodeHashAndPurpose(String codeHash, InvitePurpose purpose);
    Optional<Invite> findFirstByUserIdAndPurposeAndConsumedAtIsNullOrderByCreatedAtDesc(UUID userId, InvitePurpose purpose);
}
