package vn.trohub.property.infrastructure;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.trohub.property.domain.Building;

import java.util.List;
import java.util.UUID;

public interface BuildingRepository extends JpaRepository<Building, UUID> {
    List<Building> findByActiveTrue();
}
