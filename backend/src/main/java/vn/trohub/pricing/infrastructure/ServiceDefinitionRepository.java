package vn.trohub.pricing.infrastructure;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.trohub.pricing.domain.ServiceDefinition;

import java.util.List;
import java.util.UUID;

@Repository
public interface ServiceDefinitionRepository extends JpaRepository<ServiceDefinition, UUID> {
    List<ServiceDefinition> findAllByActiveTrueOrderByNameAsc();
    boolean existsByNameIgnoreCase(String name);
}
