package vn.trohub.operations.infrastructure;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.trohub.operations.domain.IssueStatusHistory;

import java.util.List;
import java.util.UUID;

public interface IssueStatusHistoryRepository extends JpaRepository<IssueStatusHistory, UUID> {
    List<IssueStatusHistory> findByIssueIdOrderByCreatedAtAsc(UUID issueId);
}
