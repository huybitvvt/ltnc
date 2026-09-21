package vn.trohub.user.domain;

import jakarta.persistence.*;
import vn.trohub.property.domain.Building;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "building_staff_assignments", uniqueConstraints = {
        @UniqueConstraint(name = "uq_staff_building", columnNames = {"user_id", "building_id"})
})
public class BuildingStaffAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "building_id", nullable = false)
    private Building building;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public BuildingStaffAssignment() {}

    public BuildingStaffAssignment(User user, Building building) {
        this.user = user;
        this.building = building;
        this.createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public Building getBuilding() {
        return building;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
