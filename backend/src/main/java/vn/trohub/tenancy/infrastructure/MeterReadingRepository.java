package vn.trohub.tenancy.infrastructure;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.trohub.tenancy.domain.MeterReading;
import vn.trohub.tenancy.domain.MeterReadingKind;

import java.util.List;
import java.util.UUID;

@Repository
public interface MeterReadingRepository extends JpaRepository<MeterReading, UUID> {

    List<MeterReading> findByMeterIdOrderByReadingDateDesc(UUID meterId);

    List<MeterReading> findByMeterRoomIdAndKind(UUID roomId, MeterReadingKind kind);

    List<MeterReading> findByMeterRoomIdOrderByReadingDateDesc(UUID roomId);

    List<MeterReading> findByMeterIdAndReadingDateLessThanEqualOrderByReadingDateDescCreatedAtDesc(
            UUID meterId, java.time.LocalDate readingDate);

    java.util.Optional<MeterReading> findFirstByMeterIdOrderByReadingDateDescCreatedAtDesc(UUID meterId);
}
