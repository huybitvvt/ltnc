package vn.trohub.billing.infrastructure;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import vn.trohub.billing.domain.DepositLedgerEntry;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Repository
public interface DepositLedgerEntryRepository extends JpaRepository<DepositLedgerEntry, UUID> {

    List<DepositLedgerEntry> findByContractIdOrderByRecordedAtAsc(UUID contractId);

    @Query("SELECT COALESCE(SUM(d.amount), 0) FROM DepositLedgerEntry d WHERE d.contract.id = :contractId")
    BigDecimal sumAmountByContractId(@Param("contractId") UUID contractId);

    @Query("SELECT COALESCE(SUM(d.amount), 0) FROM DepositLedgerEntry d WHERE d.contract.id = :contractId AND d.entryType IN ('RECEIPT', 'RECEIPT_CORRECTION')")
    BigDecimal sumTotalReceiptByContractId(@Param("contractId") UUID contractId);

    @Query("SELECT COALESCE(SUM(ABS(d.amount)), 0) FROM DepositLedgerEntry d WHERE d.contract.id = :contractId AND d.entryType = 'REFUND'")
    BigDecimal sumTotalRefundByContractId(@Param("contractId") UUID contractId);

    @Query("SELECT COALESCE(SUM(ABS(d.amount)), 0) FROM DepositLedgerEntry d WHERE d.contract.id = :contractId AND d.entryType = 'DEDUCTION'")
    BigDecimal sumTotalDeductionByContractId(@Param("contractId") UUID contractId);

    @Query("SELECT COALESCE(SUM(ABS(d.amount)), 0) FROM DepositLedgerEntry d WHERE d.contract.id = :contractId AND d.entryType = 'OFFSET_OUT'")
    BigDecimal sumTotalOffsetByContractId(@Param("contractId") UUID contractId);

    @Query("SELECT COALESCE(SUM(d.amount), 0) FROM DepositLedgerEntry d")
    BigDecimal sumTotalDepositHeldAcrossSystem();

    @Query("SELECT COALESCE(SUM(d.amount), 0) FROM DepositLedgerEntry d WHERE " +
           "(:buildingId IS NULL OR d.contract.room.building.id = :buildingId)")
    BigDecimal sumTotalDepositHeldByBuildingId(@Param("buildingId") UUID buildingId);
}
