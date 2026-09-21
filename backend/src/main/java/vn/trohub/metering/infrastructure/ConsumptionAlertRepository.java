package vn.trohub.metering.infrastructure;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.trohub.metering.domain.ConsumptionAlert;
import vn.trohub.tenancy.domain.MeterType;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ConsumptionAlertRepository extends JpaRepository<ConsumptionAlert, UUID> {
    List<ConsumptionAlert> findByContractId(UUID contractId);
    List<ConsumptionAlert> findByContractIdAndBillingMonth(UUID contractId, String billingMonth);
    Optional<ConsumptionAlert> findByContractIdAndMeterTypeAndBillingMonth(UUID contractId, MeterType meterType, String billingMonth);
}
