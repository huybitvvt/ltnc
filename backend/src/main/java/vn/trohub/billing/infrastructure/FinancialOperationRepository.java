package vn.trohub.billing.infrastructure;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.trohub.billing.domain.FinancialOperation;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface FinancialOperationRepository extends JpaRepository<FinancialOperation, UUID> {
    Optional<FinancialOperation> findByIdempotencyKey(String idempotencyKey);
    Optional<FinancialOperation> findByActorIdAndIdempotencyKey(UUID actorId, String idempotencyKey);

    @org.springframework.data.jpa.repository.Query(value = "SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(:key, 0))", nativeQuery = true)
    int lockKey(@org.springframework.data.repository.query.Param("key") String key);
}
