package vn.trohub.operations.application;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.trohub.common.security.UserPrincipal;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;

@Service
public class FinancialReportService {
    private final NamedParameterJdbcTemplate jdbc;
    private final Clock clock;
    public FinancialReportService(NamedParameterJdbcTemplate jdbc, Clock clock) { this.jdbc=jdbc; this.clock=clock; }

    @Transactional(readOnly=true)
    public OperationsDtos.DashboardMetricsDto dashboard(UUID buildingId, String billingMonth, LocalDate cashFrom,
            LocalDate cashTo, LocalDate asOf, UserPrincipal caller) {
        if (caller.isTenant()) throw new AccessDeniedException("Chỉ quản lý được xem dashboard");
        if (billingMonth != null) YearMonth.parse(billingMonth);
        LocalDate snapshot = asOf == null ? LocalDate.now(clock) : asOf;
        if (snapshot.isAfter(LocalDate.now(clock))) throw new IllegalArgumentException("asOf không được ở tương lai");
        if (cashFrom != null && cashTo != null && cashFrom.isAfter(cashTo)) throw new IllegalArgumentException("Khoảng ngày thu không hợp lệ");
        var p = new MapSqlParameterSource().addValue("actor", caller.getId()).addValue("owner", caller.isOwner())
            .addValue("building",buildingId).addValue("month",billingMonth)
            .addValue("asOf",snapshot).addValue("cutoff",java.sql.Timestamp.from(snapshot.plusDays(1).atStartOfDay(ZoneId.of("Asia/Ho_Chi_Minh")).toInstant()))
            .addValue("cashFrom",cashFrom).addValue("cashTo",cashTo);
        String scope = "(cast(:building as uuid) IS NULL OR r.building_id=cast(:building as uuid)) AND (:owner OR EXISTS (SELECT 1 FROM building_staff_assignments s WHERE s.building_id=r.building_id AND s.user_id=:actor))";
        if (buildingId != null && !caller.isOwner() && jdbc.queryForObject("SELECT count(*) FROM building_staff_assignments WHERE user_id=:actor AND building_id=cast(:building as uuid)",p,Integer.class)==0)
            throw new AccessDeniedException("Tòa nhà ngoài phạm vi");
        var financial = jdbc.queryForMap("""
            WITH balances AS (
              SELECT i.id, i.billing_month,
                coalesce((SELECT sum(amount) FROM invoice_items WHERE invoice_id=i.id),0)
                  +coalesce((SELECT sum(delta_amount) FROM invoice_adjustments WHERE invoice_id=i.id AND effective_date<=:asOf AND recorded_at<:cutoff),0) AS due,
                coalesce((SELECT sum(amount) FROM invoice_ledger_entries WHERE invoice_id=i.id AND effective_date<=:asOf AND recorded_at<:cutoff),0) AS applied
              FROM invoices i JOIN contracts c ON c.id=i.contract_id JOIN rooms r ON r.id=c.room_id
              WHERE i.status='ISSUED' AND i.issued_at<:cutoff AND
            """+scope+"""
            ) SELECT
              coalesce(sum(due) FILTER (WHERE cast(:month as varchar) IS NULL OR billing_month=cast(:month as varchar)),0) AS billed,
              coalesce(sum(greatest(due-applied,0)),0) AS debt,
              coalesce(sum(greatest(applied-due,0)),0) AS credit FROM balances
            """,p);
        var cash = jdbc.queryForMap("""
            SELECT coalesce(sum(e.amount) FILTER (WHERE e.entry_type IN ('PAYMENT','PAYMENT_CORRECTION')),0) AS collected,
              coalesce(sum(-e.amount) FILTER (WHERE e.entry_type='REFUND'),0) AS refunded
            FROM invoice_ledger_entries e JOIN contracts c ON c.id=e.contract_id JOIN rooms r ON r.id=c.room_id
            WHERE e.effective_date<=:asOf AND e.recorded_at<:cutoff
              AND (cast(:cashFrom as date) IS NULL OR e.effective_date>=cast(:cashFrom as date))
              AND (cast(:cashTo as date) IS NULL OR e.effective_date<=cast(:cashTo as date)) AND
            """+scope,p);
        BigDecimal held=jdbc.queryForObject("SELECT coalesce(sum(e.amount),0) FROM deposit_ledger_entries e JOIN contracts c ON c.id=e.contract_id JOIN rooms r ON r.id=c.room_id WHERE e.effective_date<=:asOf AND e.recorded_at<:cutoff AND "+scope,p,BigDecimal.class);
        var rooms=jdbc.queryForMap("""
            SELECT count(*) AS total,
              count(*) FILTER (WHERE EXISTS (SELECT 1 FROM contracts c WHERE c.room_id=r.id AND c.actual_start_date<=:asOf AND (c.actual_checkout_date IS NULL OR c.actual_checkout_date>:asOf) AND c.status IN ('ACTIVE','ENDED'))) AS occupied,
              count(*) FILTER (WHERE r.bookable AND r.status<>'MAINTENANCE' AND NOT EXISTS (SELECT 1 FROM contracts c WHERE c.room_id=r.id AND c.actual_start_date<=:asOf AND (c.actual_checkout_date IS NULL OR c.actual_checkout_date>:asOf) AND c.status IN ('ACTIVE','ENDED'))) AS bookable
            FROM rooms r WHERE
            """+scope,p);
        int total=((Number)rooms.get("total")).intValue(), occupied=((Number)rooms.get("occupied")).intValue(), bookable=((Number)rooms.get("bookable")).intValue();
        Integer open=jdbc.queryForObject("SELECT count(*) FROM maintenance_issues m JOIN rooms r ON r.id=m.room_id WHERE m.status<>'CLOSED' AND "+scope,p,Integer.class);
        BigDecimal collected=(BigDecimal)cash.get("collected"),refunded=(BigDecimal)cash.get("refunded");
        return new OperationsDtos.DashboardMetricsDto(buildingId,billingMonth,financial.get("billed").toString(),collected.toPlainString(),refunded.toPlainString(),
            collected.subtract(refunded).toPlainString(),financial.get("debt").toString(),financial.get("credit").toString(),held.toPlainString(),total,occupied,bookable,total-occupied-bookable,open);
    }
}
