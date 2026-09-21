package vn.trohub.tenancy.infrastructure;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.trohub.tenancy.domain.MeterType;
import vn.trohub.tenancy.domain.RoomMeter;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RoomMeterRepository extends JpaRepository<RoomMeter, UUID> {

    List<RoomMeter> findByRoomId(UUID roomId);

    Optional<RoomMeter> findByRoomIdAndType(UUID roomId, MeterType type);
}
