package vn.trohub.pricing.infrastructure;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.trohub.pricing.domain.OneOffCharge;

import java.util.List;
import java.util.UUID;

@Repository
public interface OneOffChargeRepository extends JpaRepository<OneOffCharge, UUID> {
    List<OneOffCharge> findByContractIdAndBillingMonth(UUID contractId, String billingMonth);
    List<OneOffCharge> findByContractId(UUID contractId);
}
