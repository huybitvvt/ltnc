package vn.trohub.common.security;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import vn.trohub.user.domain.UserRole;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public class UserPrincipal implements UserDetails {

    private final UUID id;
    private final String login;
    private final String password;
    private final UserRole role;
    private final boolean enabled;
    private final UUID sessionId;
    private final List<UUID> assignedBuildingIds;

    public UserPrincipal(UUID id, String login, String password, UserRole role, boolean enabled, UUID sessionId, List<UUID> assignedBuildingIds) {
        this.id = id;
        this.login = login;
        this.password = password;
        this.role = role;
        this.enabled = enabled;
        this.sessionId = sessionId;
        this.assignedBuildingIds = assignedBuildingIds != null ? assignedBuildingIds : List.of();
    }

    public UserPrincipal(UUID id, String login, UserRole role, boolean enabled) {
        this(id, login, "", role, enabled, UUID.randomUUID(), List.of());
    }

    public UUID getId() {
        return id;
    }

    public UserRole getRole() {
        return role;
    }

    public UUID getSessionId() {
        return sessionId;
    }

    public List<UUID> getAssignedBuildingIds() {
        return assignedBuildingIds;
    }

    public boolean isOwner() {
        return role == UserRole.OWNER;
    }

    public boolean isStaff() {
        return role == UserRole.STAFF;
    }

    public boolean isTenant() {
        return role == UserRole.TENANT;
    }

    public boolean hasBuildingScope(UUID buildingId) {
        if (role == UserRole.OWNER) {
            return true;
        }
        if (role == UserRole.STAFF) {
            return assignedBuildingIds.contains(buildingId);
        }
        return false;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return login;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return enabled;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }
}
