package vn.trohub.operations.domain;

import jakarta.persistence.*;
import vn.trohub.user.domain.User;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "stored_files")
public class StoredFile {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "storage_key", nullable = false, unique = true)
    private String storageKey;

    @Column(name = "original_name", nullable = false)
    private String originalName;

    @Column(name = "mime_type", nullable = false, length = 100)
    private String mimeType;

    @Column(nullable = false)
    private Long size;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "uploaded_by", nullable = false)
    private User uploadedBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "parent_type", nullable = false, length = 50)
    private ParentType parentType;

    @Column(name = "parent_id", nullable = false)
    private UUID parentId;

    @Column(nullable = false, length = 20)
    private String status = "ATTACHED";

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public StoredFile() {}

    public StoredFile(String storageKey, String originalName, String mimeType, Long size, User uploadedBy, ParentType parentType, UUID parentId) {
        this.storageKey = storageKey;
        this.originalName = originalName;
        this.mimeType = mimeType;
        this.size = size;
        this.uploadedBy = uploadedBy;
        this.parentType = parentType;
        this.parentId = parentId;
        this.status = "ATTACHED";
        this.createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getStorageKey() {
        return storageKey;
    }

    public void setStorageKey(String storageKey) {
        this.storageKey = storageKey;
    }

    public String getOriginalName() {
        return originalName;
    }

    public void setOriginalName(String originalName) {
        this.originalName = originalName;
    }

    public String getMimeType() {
        return mimeType;
    }

    public void setMimeType(String mimeType) {
        this.mimeType = mimeType;
    }

    public Long getSize() {
        return size;
    }

    public void setSize(Long size) {
        this.size = size;
    }

    public User getUploadedBy() {
        return uploadedBy;
    }

    public void setUploadedBy(User uploadedBy) {
        this.uploadedBy = uploadedBy;
    }

    public ParentType getParentType() {
        return parentType;
    }

    public void setParentType(ParentType parentType) {
        this.parentType = parentType;
    }

    public UUID getParentId() {
        return parentId;
    }

    public void setParentId(UUID parentId) {
        this.parentId = parentId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
