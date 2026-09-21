package vn.trohub.pricing.infrastructure;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.trohub.pricing.domain.Tariff;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TariffRepository extends JpaRepository<Tariff, UUID> {

    List<Tariff> findByBuildingIdOrderByEffectiveMonthDesc(UUID buildingId);

    List<Tariff> findByBuildingIdAndServiceIdOrderByEffectiveMonthDesc(UUID buildingId, UUID serviceId);

    boolean existsByBuildingIdAndServiceIdAndEffectiveMonth(UUID buildingId, UUID serviceId, String effectiveMonth);

    // BR-067: Kỳ dùng phiên bản giá có tháng hiệu lực gần nhất không sau kỳ đó
    List<Tariff> findByBuildingIdAndServiceIdAndEffectiveMonthLessThanEqualOrderByEffectiveMonthDesc(
            UUID buildingId, UUID serviceId, String billingMonth);
}
