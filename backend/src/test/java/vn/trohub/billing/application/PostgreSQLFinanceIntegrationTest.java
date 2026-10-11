package vn.trohub.billing.application;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import vn.trohub.billing.api.dto.PaymentDtos.*;
import vn.trohub.billing.domain.PaymentMethod;
import vn.trohub.common.api.ConflictException;
import vn.trohub.common.security.UserPrincipal;
import vn.trohub.user.domain.UserRole;
import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class PostgreSQLFinanceIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired PaymentService payments;
    @Autowired MockMvc http;
    @Autowired vn.trohub.operations.application.FinancialReportService reports;
    @Autowired vn.trohub.tenancy.application.CheckoutService checkouts;
    @Autowired vn.trohub.tenancy.application.TenancyService tenancy;
    UUID actor, tenantActor, building, room, contract, invoice;
    UserPrincipal owner, tenant;

    @BeforeEach
    void fixture() {
        actor = UUID.randomUUID(); tenantActor = UUID.randomUUID(); building = UUID.randomUUID();
        room = UUID.randomUUID(); contract = UUID.randomUUID(); invoice = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID(), floor = UUID.randomUUID();
        jdbc.update("INSERT INTO users (id, login, password_hash, role, enabled) VALUES (?, ?, 'fixture-only', 'OWNER', true)", actor, "it_" + actor);
        jdbc.update("INSERT INTO users (id, login, password_hash, role, enabled) VALUES (?, ?, 'fixture-only', 'TENANT', true)", tenantActor, "it_" + tenantActor);
        jdbc.update("INSERT INTO buildings (id, name, address) VALUES (?, 'Integration', 'Test')", building);
        jdbc.update("INSERT INTO floors (id, building_id, name, floor_order) VALUES (?, ?, '1', 1)", floor, building);
        jdbc.update("INSERT INTO rooms (id, building_id, floor_id, room_number, base_price, deposit_amount) VALUES (?, ?, ?, '101', 3000000, 3000000)", room, building, floor);
        jdbc.update("INSERT INTO tenant_profiles (id, user_id, full_name, phone, citizen_id_masked) VALUES (?, ?, 'Fixture', ?, ?)", tenantId, tenantActor, UUID.randomUUID().toString().substring(0, 10), "********1111");
        jdbc.update("INSERT INTO contracts (id, room_id, representative_tenant_id, status, actual_start_date, planned_end_exclusive, rent, deposit_required) VALUES (?, ?, ?, 'ACTIVE', '2026-09-01', '2027-09-01', 3000000, 3000000)", contract, room, tenantId);
        jdbc.update("INSERT INTO invoices (id, contract_id, billing_month, status, period_start, period_end_exclusive, due_date) VALUES (?, ?, '2026-09', 'DRAFT', '2026-09-01', '2026-10-01', '2026-10-08')", invoice, contract);
        jdbc.update("INSERT INTO invoice_items (id, invoice_id, type, label, quantity, unit_price, amount, calculation_snapshot) VALUES (?, ?, 'RENT', 'Rent', 1, 3000000, 3000000, '{}')", UUID.randomUUID(), invoice);
        jdbc.update("UPDATE invoices SET status='ISSUED', issued_at=now() WHERE id=?", invoice);
        owner = new UserPrincipal(actor, "owner", UserRole.OWNER, true);
        tenant = new UserPrincipal(tenantActor, "tenant", UserRole.TENANT, true);
    }

    RecordPaymentRequest receipt(String amount, boolean confirmed) {
        return new RecordPaymentRequest(invoice, new BigDecimal(amount), PaymentMethod.CASH, null, "Fixture", null, confirmed);
    }

    @Test
    void concurrentSameKeyHasOneLedgerAndImmutableReplay() throws Exception {
        RecordPaymentRequest request = receipt("1000000", false);
        var responses = concurrently(() -> payments.recordPayment(request, owner, "same-key"));
        assertEquals(responses.get(0), responses.get(1));
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM invoice_ledger_entries WHERE invoice_id = ?", Integer.class, invoice));
        payments.recordPayment(request, owner, "second-key");
        assertEquals("1000000", payments.recordPayment(request, owner, "same-key").netApplied());
        assertEquals("2000000", payments.getInvoiceFinancialStatus(invoice, owner).netApplied());
    }

    @Test
    void concurrentRefundCannotOverdrawCredit() throws Exception {
        payments.recordPayment(receipt("3200000", true), owner, "initial");
        var results = concurrently(() -> {
            try {
                payments.refundInvoiceCredit(new RefundRequest(invoice, new BigDecimal("150000"),
                        PaymentMethod.CASH, null, "Actual refund"), owner, UUID.randomUUID().toString());
                return true;
            } catch (IllegalArgumentException | ConflictException expected) { return false; }
        });
        assertEquals(1, results.stream().filter(Boolean::booleanValue).count());
        assertEquals("50000", payments.getInvoiceFinancialStatus(invoice, owner).credit());
    }

    @Test
    void changedMethodConflictsAndFailedCommandRollsBack() {
        payments.recordPayment(receipt("1000000", false), owner, "payload");
        var changed = new RecordPaymentRequest(invoice, new BigDecimal("1000000"), PaymentMethod.BANK_TRANSFER, null, "Fixture", null, false);
        assertThrows(ConflictException.class, () -> payments.recordPayment(changed, owner, "payload"));
        assertThrows(ConflictException.class, () -> payments.recordPayment(receipt("3000000", false), owner, "unconfirmed"));
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM financial_operations WHERE actor_id = ?", Integer.class, actor));
        assertEquals("1000000", payments.getInvoiceFinancialStatus(invoice, owner).netApplied());
    }

    @Test
    void tenantCannotRecordMoneyOrReadDraftThroughFinancialEndpoint() throws Exception {
        http.perform(post("/api/v1/payments/record").with(user(tenant))
                .header("X-Idempotency-Key", "illegal").contentType("application/json")
                .content("{\"invoiceId\":\"" + invoice + "\",\"amount\":\"1\",\"paymentMethod\":\"CASH\"}"))
                .andExpect(status().isForbidden());
        UUID draft=UUID.randomUUID();
        jdbc.update("INSERT INTO invoices (id, contract_id, billing_month, status, period_start, period_end_exclusive, due_date) VALUES (?, ?, '2026-10', 'DRAFT', '2026-10-01', '2026-11-01', '2026-11-08')", draft, contract);
        http.perform(get("/api/v1/invoices/" + draft + "/financial-status").with(user(tenant)))
                .andExpect(status().isNotFound());
        http.perform(post("/api/v1/auth/web/refresh")).andExpect(status().isForbidden());
    }

    @Test void reportsUseCashDatesIndependentlyOfBillingMonthAndRestrictStaff() {
        var dated = new RecordPaymentRequest(invoice,new BigDecimal("1000000"),PaymentMethod.CASH,null,"Late receipt",java.time.LocalDate.of(2026,9,23),false);
        payments.recordPayment(dated,owner,"dated");
        var result=reports.dashboard(building,"2026-10",java.time.LocalDate.of(2026,9,1),java.time.LocalDate.of(2026,9,30),null,owner);
        assertEquals("0",result.billedAmount());
        assertEquals("1000000",result.cashCollected());
        assertEquals("2000000",result.totalDebt());
        UUID staff=UUID.randomUUID();
        var principal=new UserPrincipal(staff,"unassigned",UserRole.STAFF,true);
        assertEquals("0",reports.dashboard(null,null,null,null,null,principal).totalDebt());
        assertThrows(org.springframework.security.access.AccessDeniedException.class,()->reports.dashboard(building,null,null,null,null,principal));
    }

    @Test void databaseRejectsMutationOfIssuedSnapshotAndLedger() {
        assertThrows(org.springframework.dao.DataAccessException.class,()->jdbc.update("UPDATE invoice_items SET amount=1 WHERE invoice_id=?",invoice));
        assertThrows(org.springframework.dao.DataAccessException.class,()->jdbc.update("UPDATE invoices SET status='DRAFT' WHERE id=?",invoice));
        payments.recordPayment(receipt("1",false),owner,"immutable");
        assertThrows(org.springframework.dao.DataAccessException.class,()->jdbc.update("UPDATE invoice_ledger_entries SET amount=2 WHERE invoice_id=?",invoice));
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM audit_events WHERE actor_id=?",Integer.class,actor));
    }

    @Test void expenseCannotBeChargedAndDeductedInEitherOrder() {
        jdbc.update("INSERT INTO one_off_charges (contract_id, billing_month, label, amount, reason, source_ref) VALUES (?, '2026-09', 'Repair', 100, 'Fixture', 'repair-1')", contract);
        assertThrows(org.springframework.dao.DataAccessException.class, () -> jdbc.update(
                "INSERT INTO deposit_ledger_entries (contract_id, entry_type, amount, note, reason, actor_id, effective_date) VALUES (?, 'DEDUCTION', -100, 'repair-1', 'Fixture', ?, current_date)", contract, actor));
        jdbc.update("INSERT INTO deposit_ledger_entries (contract_id, entry_type, amount, note, reason, actor_id, effective_date) VALUES (?, 'DEDUCTION', -100, 'repair-2', 'Fixture', ?, current_date)", contract, actor);
        assertThrows(org.springframework.dao.DataAccessException.class, () -> jdbc.update(
                "INSERT INTO one_off_charges (contract_id, billing_month, label, amount, reason, source_ref) VALUES (?, '2026-09', 'Repair', 100, 'Fixture', 'repair-2')", contract));
    }

    @Test void tenantProfilesRequireManagerAndStaffBuildingScope() throws Exception {
        UUID profile = jdbc.queryForObject("SELECT representative_tenant_id FROM contracts WHERE id=?", UUID.class, contract);
        http.perform(get("/api/v1/tenants").with(user(tenant))).andExpect(status().isForbidden());
        UUID staff = UUID.randomUUID();
        jdbc.update("INSERT INTO users (id,login,password_hash,role,enabled) VALUES (?,?,'fixture','STAFF',true)", staff, "staff_"+staff);
        UserPrincipal manager = new UserPrincipal(staff,"staff",UserRole.STAFF,true);
        http.perform(get("/api/v1/tenants/"+profile).with(user(manager))).andExpect(status().isForbidden());
        http.perform(get("/api/v1/tenants").with(user(manager))).andExpect(status().isOk()).andExpect(jsonPath("$.data").isEmpty());
        jdbc.update("INSERT INTO building_staff_assignments (user_id,building_id) VALUES (?,?)", staff, building);
        http.perform(get("/api/v1/tenants/"+profile).with(user(manager))).andExpect(status().isOk());
        jdbc.update("DELETE FROM building_staff_assignments WHERE user_id=?", staff);
        http.perform(get("/api/v1/tenants/"+profile).with(user(manager))).andExpect(status().isForbidden());
    }

    @Test void concurrentActivationHasOneWinnerAndTwoHandoverReadings() throws Exception {
        UUID profile = jdbc.queryForObject("SELECT representative_tenant_id FROM contracts WHERE id=?", UUID.class, contract);
        jdbc.update("UPDATE contracts SET status='DRAFT' WHERE id=?", contract);
        UUID other = UUID.randomUUID();
        jdbc.update("INSERT INTO contracts (id,room_id,representative_tenant_id,status,actual_start_date,planned_end_exclusive,rent,deposit_required) VALUES (?,?,?,'DRAFT','2026-09-01','2027-09-01',3000000,3000000)", other, room, profile);
        for (UUID id : List.of(contract, other))
            jdbc.update("INSERT INTO contract_members (contract_id,tenant_id,joined_on,is_representative) VALUES (?,?,'2026-09-01',true)", id, profile);
        var readings = new vn.trohub.tenancy.api.dto.TenancyDtos.ActivateContractRequest(List.of(
                new vn.trohub.tenancy.api.dto.TenancyDtos.HandoverReadingItem(null, vn.trohub.tenancy.domain.MeterType.ELECTRICITY, java.time.LocalDate.of(2026,9,1), BigDecimal.ZERO),
                new vn.trohub.tenancy.api.dto.TenancyDtos.HandoverReadingItem(null, vn.trohub.tenancy.domain.MeterType.WATER, java.time.LocalDate.of(2026,9,1), BigDecimal.ZERO)));
        var index = new java.util.concurrent.atomic.AtomicInteger();
        var results = concurrently(() -> {
            UUID id = index.getAndIncrement() == 0 ? contract : other;
            try { tenancy.activateContract(id, readings, owner); return true; }
            catch (IllegalStateException expected) { return false; }
        });
        assertEquals(1, results.stream().filter(Boolean::booleanValue).count());
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM contracts WHERE room_id=? AND status='ACTIVE'", Integer.class, room));
        assertEquals(2, jdbc.queryForObject("SELECT count(*) FROM meter_readings mr JOIN room_meters rm ON rm.id=mr.meter_id WHERE rm.room_id=?", Integer.class, room));
        assertEquals("RENTED", jdbc.queryForObject("SELECT status FROM rooms WHERE id=?", String.class, room));
    }

    @Test void checkoutRetryIsAtomicAndRequiresSamePayloadAndScope() throws Exception {
        java.time.LocalDate date = java.time.LocalDate.of(2026,10,10);
        UUID electric = UUID.randomUUID(), water = UUID.randomUUID();
        jdbc.update("INSERT INTO room_meters (id,room_id,type,serial,installed_on,initial_reading) VALUES (?,?,'ELECTRICITY','IT-E','2026-09-01',0),(?,?,'WATER','IT-W','2026-09-01',0)", electric, room, water, room);
        var request = new vn.trohub.tenancy.api.dto.TenancyDtos.CheckoutContractRequest(date, List.of(
                new vn.trohub.tenancy.api.dto.TenancyDtos.HandoverReadingItem(electric,vn.trohub.tenancy.domain.MeterType.ELECTRICITY,date,BigDecimal.TEN),
                new vn.trohub.tenancy.api.dto.TenancyDtos.HandoverReadingItem(water,vn.trohub.tenancy.domain.MeterType.WATER,date,BigDecimal.ONE)));
        var results = concurrently(() -> checkouts.checkout(contract, request, owner, "checkout-retry"));
        assertEquals(results.get(0), results.get(1));
        assertEquals(2, jdbc.queryForObject("SELECT count(*) FROM meter_readings WHERE meter_id IN (?,?)", Integer.class, electric, water));
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM contract_events WHERE contract_id=? AND type='CHECKOUT'", Integer.class, contract));
        assertEquals("ENDED", results.get(0).status().name());
        assertEquals("VACANT", jdbc.queryForObject("SELECT status FROM rooms WHERE id=?", String.class, room));
        assertThrows(ConflictException.class, () -> checkouts.checkout(contract,
                new vn.trohub.tenancy.api.dto.TenancyDtos.CheckoutContractRequest(date.minusDays(1), request.finalReadings()), owner, "checkout-retry"));
        assertThrows(org.springframework.security.access.AccessDeniedException.class, () -> checkouts.checkout(contract,request,tenant,"checkout-retry"));
        http.perform(post("/api/v1/contracts/"+contract+"/checkout").with(user(owner)).contentType("application/json")
                .content("{\"actualCheckoutDate\":\"2026-10-10\",\"finalReadings\":[]}"))
                .andExpect(status().isBadRequest());
    }

    private <T> List<T> concurrently(Callable<T> command) throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(2);
        CyclicBarrier barrier = new CyclicBarrier(2);
        try {
            Callable<T> simultaneous = () -> { barrier.await(10, TimeUnit.SECONDS); return command.call(); };
            Future<T> first = executor.submit(simultaneous), second = executor.submit(simultaneous);
            return List.of(first.get(30, TimeUnit.SECONDS), second.get(30, TimeUnit.SECONDS));
        } finally { executor.shutdownNow(); }
    }
}
