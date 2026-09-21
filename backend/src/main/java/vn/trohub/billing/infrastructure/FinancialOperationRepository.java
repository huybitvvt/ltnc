package vn.trohub.billing.infrastructure;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.trohub.billing.domain.FinancialOperation;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface FinancialOperationRepository extends JpaRepository<FinancialOperation, UUID> {
    Optional<FinancialOperation> findByIdempotencyKey(String idempotencyKey);
}
