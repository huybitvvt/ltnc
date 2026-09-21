package vn.trohub.pricing.infrastructure;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.trohub.pricing.domain.ContractServiceSubscription;

import java.util.List;
import java.util.UUID;

@Repository
public interface ContractServiceSubscriptionRepository extends JpaRepository<ContractServiceSubscription, UUID> {
    List<ContractServiceSubscription> findByContractId(UUID contractId);
    boolean existsByContractIdAndServiceIdAndStartMonth(UUID contractId, UUID serviceId, String startMonth);
}
