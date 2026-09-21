package vn.trohub.pricing.infrastructure;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.trohub.pricing.domain.BuildingBillingSettings;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface BuildingBillingSettingsRepository extends JpaRepository<BuildingBillingSettings, UUID> {
    Optional<BuildingBillingSettings> findByBuildingId(UUID buildingId);
}
