package vn.trohub.operations.infrastructure;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.trohub.operations.domain.ParentType;
import vn.trohub.operations.domain.StoredFile;

import java.util.List;
import java.util.UUID;

public interface StoredFileRepository extends JpaRepository<StoredFile, UUID> {
    List<StoredFile> findByParentTypeAndParentId(ParentType parentType, UUID parentId);
    List<StoredFile> findByParentId(UUID parentId);
}
