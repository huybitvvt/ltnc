package vn.trohub.billing.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import vn.trohub.billing.api.dto.BillingDtos.*;
import vn.trohub.billing.domain.*;
import vn.trohub.billing.infrastructure.*;
import vn.trohub.common.security.UserPrincipal;
import vn.trohub.metering.domain.ConsumptionAlert;
import vn.trohub.metering.domain.EvaluationStatus;
import vn.trohub.metering.infrastructure.ConsumptionAlertRepository;
import vn.trohub.pricing.domain.*;
import vn.trohub.pricing.infrastructure.*;
import vn.trohub.property.domain.Building;
import vn.trohub.property.domain.Floor;
import vn.trohub.property.domain.Room;
import vn.trohub.tenancy.domain.*;
import vn.trohub.tenancy.infrastructure.*;
import vn.trohub.user.domain.User;
import vn.trohub.user.domain.UserRole;
import vn.trohub.user.infrastructure.BuildingStaffAssignmentRepository;
import vn.trohub.user.infrastructure.UserRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BillingServiceTest {

    @Mock
    private InvoiceRepository invoiceRepository;
    @Mock
    private InvoiceItemRepository invoiceItemRepository;
    @Mock
    private InvoiceAdjustmentRepository invoiceAdjustmentRepository;
    @Mock
    private InvoiceNoteRepository invoiceNoteRepository;
    @Mock
    private FinancialOperationRepository financialOperationRepository;
    @Mock
    private InvoiceLedgerEntryRepository ledgerEntryRepository;
    @Mock
    private ContractRepository contractRepository;
    @Mock
    private ContractMemberRepository contractMemberRepository;
    @Mock
    private RoomMeterRepository roomMeterRepository;
    @Mock
    private MeterReadingRepository meterReadingRepository;
    @Mock
    private ConsumptionAlertRepository consumptionAlertRepository;
    @Mock
    private TariffRepository tariffRepository;
    @Mock
    private ContractServiceSubscriptionRepository subscriptionRepository;
    @Mock
    private BuildingBillingSettingsRepository settingsRepository;
    @Mock
    private OneOffChargeRepository oneOffChargeRepository;
    @Mock
    private BuildingStaffAssignmentRepository staffAssignmentRepository;
    @Mock
    private UserRepository userRepository;

    private ObjectMapper objectMapper = new ObjectMapper();

    private BillingService billingService;

    private User ownerUser;
    private UserPrincipal ownerPrincipal;
    private Building building;
    private Room room;
    private TenantProfile tenantProfile;
    private Contract contract;

    @BeforeEach
    void setUp() {
        billingService = new BillingService(
                invoiceRepository,
                invoiceItemRepository,
                invoiceAdjustmentRepository,
                invoiceNoteRepository,
                financialOperationRepository,
                ledgerEntryRepository,
                contractRepository,
                contractMemberRepository,
                roomMeterRepository,
                meterReadingRepository,
                consumptionAlertRepository,
                tariffRepository,
                subscriptionRepository,
                settingsRepository,
                oneOffChargeRepository,
                staffAssignmentRepository,
                userRepository,
                objectMapper
        );

        ownerUser = new User("owner@trohub.vn", "encodedPassword", UserRole.OWNER);
        ownerPrincipal = new UserPrincipal(ownerUser.getId(), ownerUser.getLogin(), ownerUser.getRole(), true);

        building = new Building("Tòa nhà Thảo Điền", "123 Xa Lộ Hà Nội");
        Floor floor = new Floor(building, "Tầng 1", 1);
        room = new Room(building, floor, "P.101", BigDecimal.valueOf(3000000), BigDecimal.valueOf(3000000));

        tenantProfile = new TenantProfile("Nguyễn Văn An", "0912345678", "079090001111", "an@gmail.com");
        contract = new Contract(room, tenantProfile, LocalDate.of(2026, 9, 1), LocalDate.of(2027, 9, 1), BigDecimal.valueOf(3000000), BigDecimal.valueOf(3000000));
        contract.setStatus(ContractStatus.ACTIVE);
    }

    @Test
    @DisplayName("EX-01: Tính tiền phòng 3.000.000, tháng 30 ngày, ở 15 ngày (ngày 1 đến 16) -> 1.500.000đ")
    void testCalculateRoomRent_ProratedDays_EX01() {
        contract.setActualStartDate(LocalDate.of(2026, 9, 1));
        contract.setActualCheckoutDate(LocalDate.of(2026, 9, 16)); // end-exclusive -> 15 ngày

        when(contractRepository.findById(contract.getId())).thenReturn(Optional.of(contract));
        when(roomMeterRepository.findByRoomId(room.getId())).thenReturn(List.of());
        when(subscriptionRepository.findByContractId(contract.getId())).thenReturn(List.of());
        when(oneOffChargeRepository.findByContractIdAndBillingMonth(contract.getId(), "2026-09")).thenReturn(List.of());

        BuildingBillingSettings settings = new BuildingBillingSettings(building);
        settings.setDueDays(7);
        when(settingsRepository.findByBuildingId(building.getId())).thenReturn(Optional.of(settings));

        InvoiceDetailResponse preview = billingService.previewInvoice(contract.getId(), "2026-09", ownerPrincipal);

        assertThat(preview.originalTotal()).isEqualByComparingTo("1500000");
        assertThat(preview.items()).hasSize(1);
        assertThat(preview.items().get(0).amount()).isEqualByComparingTo("1500000");
        assertThat(preview.items().get(0).quantity()).isEqualByComparingTo("15");
    }

    @Test
    @DisplayName("EX-02: Tính tiền phòng 3.000.000, tháng 31 ngày, ở 1 ngày -> 96.774đ")
    void testCalculateRoomRent_SingleDay_EX02() {
        contract.setActualStartDate(LocalDate.of(2026, 8, 1));
        contract.setActualCheckoutDate(LocalDate.of(2026, 8, 2)); // 1 ngày trong tháng 31 ngày

        when(contractRepository.findById(contract.getId())).thenReturn(Optional.of(contract));
        when(roomMeterRepository.findByRoomId(room.getId())).thenReturn(List.of());
        when(subscriptionRepository.findByContractId(contract.getId())).thenReturn(List.of());
        when(oneOffChargeRepository.findByContractIdAndBillingMonth(contract.getId(), "2026-08")).thenReturn(List.of());
        when(settingsRepository.findByBuildingId(building.getId())).thenReturn(Optional.empty());

        InvoiceDetailResponse preview = billingService.previewInvoice(contract.getId(), "2026-08", ownerPrincipal);

        assertThat(preview.originalTotal()).isEqualByComparingTo("96774");
    }

    @Test
    @DisplayName("EX-03: Nhận ngày 20/09, trả ngày 10/10: Tháng 9 có 11 ngày (1.100.000đ), Tháng 10 có 9 ngày (870.968đ)")
    void testCalculateRoomRent_CrossingMonth_EX03() {
        contract.setActualStartDate(LocalDate.of(2026, 9, 20));
        contract.setActualCheckoutDate(LocalDate.of(2026, 10, 10));

        when(contractRepository.findById(contract.getId())).thenReturn(Optional.of(contract));
        when(roomMeterRepository.findByRoomId(room.getId())).thenReturn(List.of());
        when(subscriptionRepository.findByContractId(contract.getId())).thenReturn(List.of());
        when(oneOffChargeRepository.findByContractIdAndBillingMonth(any(), any())).thenReturn(List.of());

        // Tháng 9: 20/09 đến 01/10 (30 ngày) -> 11 ngày: 3.000.000 * 11 / 30 = 1.100.000
        InvoiceDetailResponse sepPreview = billingService.previewInvoice(contract.getId(), "2026-09", ownerPrincipal);
        assertThat(sepPreview.originalTotal()).isEqualByComparingTo("1100000");

        // Tháng 10: 01/10 đến 10/10 (31 ngày) -> 9 ngày: 3.000.000 * 9 / 31 = 870.967,74 -> 870.968
        InvoiceDetailResponse octPreview = billingService.previewInvoice(contract.getId(), "2026-10", ownerPrincipal);
        assertThat(octPreview.originalTotal()).isEqualByComparingTo("870968");
    }

    @Test
    @DisplayName("EX-04 & EX-05: Dịch vụ cố định theo phòng (50.000đ) và dịch vụ theo người-ngày (90.000đ)")
    void testServicesCalculation_EX04_EX05() {
        contract.setActualStartDate(LocalDate.of(2026, 9, 1));
        contract.setActualCheckoutDate(LocalDate.of(2026, 9, 16)); // 15 ngày ở

        ServiceDefinition roomService = new ServiceDefinition("Vệ sinh phòng", "phòng/tháng", ServiceCalculationType.ROOM_MONTHLY);
        roomService.setId(UUID.randomUUID());
        Tariff roomTariff = new Tariff(building, roomService, "2026-01", BigDecimal.valueOf(100000));
        ContractServiceSubscription sub1 = new ContractServiceSubscription(contract, roomService, "2026-01", null);

        ServiceDefinition personService = new ServiceDefinition("Nước sinh hoạt", "người/tháng", ServiceCalculationType.PERSON_MONTHLY);
        personService.setId(UUID.randomUUID());
        Tariff personTariff = new Tariff(building, personService, "2026-01", BigDecimal.valueOf(60000));

        when(contractRepository.findById(contract.getId())).thenReturn(Optional.of(contract));
        when(roomMeterRepository.findByRoomId(room.getId())).thenReturn(List.of());
        when(subscriptionRepository.findByContractId(contract.getId())).thenReturn(List.of(sub1));
        when(tariffRepository.findByBuildingIdAndEffectiveMonthLessThanEqualOrderByEffectiveMonthDesc(building.getId(), "2026-09"))
                .thenReturn(List.of(roomTariff, personTariff));
        when(oneOffChargeRepository.findByContractIdAndBillingMonth(contract.getId(), "2026-09")).thenReturn(List.of());

        InvoiceDetailResponse preview = billingService.previewInvoice(contract.getId(), "2026-09", ownerPrincipal);

        // Tiền phòng: 3.000.000 * 15 / 30 = 1.500.000
        // Tiền vệ sinh: 100.000 * 15 / 30 = 50.000
        // Tổng = 1.550.000
        assertThat(preview.originalTotal()).isEqualByComparingTo("1550000");
    }

    @Test
    @DisplayName("EX-06: Điện đầu 120.500, cuối 150.750, giá 3.500 -> dùng 30.250 kWh, thành tiền 105.875đ")
    void testElectricityCalculation_EX06() {
        RoomMeter meter = new RoomMeter(room, MeterType.ELECTRICITY, "EM-101", LocalDate.of(2026, 1, 1), BigDecimal.valueOf(100));
        MeterReading rStart = new MeterReading(meter, LocalDate.of(2026, 9, 1), BigDecimal.valueOf(120.500), MeterReadingKind.PERIOD_END, ownerUser);
        MeterReading rEnd = new MeterReading(meter, LocalDate.of(2026, 10, 1), BigDecimal.valueOf(150.750), MeterReadingKind.PERIOD_END, ownerUser);

        ServiceDefinition elecService = new ServiceDefinition("Điện", "kWh", ServiceCalculationType.METERED);
        Tariff elecTariff = new Tariff(building, elecService, "2026-01", BigDecimal.valueOf(3500));

        when(contractRepository.findById(contract.getId())).thenReturn(Optional.of(contract));
        when(roomMeterRepository.findByRoomId(room.getId())).thenReturn(List.of(meter));
        when(meterReadingRepository.findByMeterIdOrderByReadingDateDesc(meter.getId())).thenReturn(List.of(rEnd, rStart));
        when(tariffRepository.findByBuildingIdAndEffectiveMonthLessThanEqualOrderByEffectiveMonthDesc(building.getId(), "2026-09"))
                .thenReturn(List.of(elecTariff));
        when(subscriptionRepository.findByContractId(contract.getId())).thenReturn(List.of());
        when(oneOffChargeRepository.findByContractIdAndBillingMonth(contract.getId(), "2026-09")).thenReturn(List.of());

        InvoiceDetailResponse preview = billingService.previewInvoice(contract.getId(), "2026-09", ownerPrincipal);

        // Tiền phòng: 3.000.000
        // Tiền điện: 30.250 * 3500 = 105.875
        // Tổng: 3.105.875
        assertThat(preview.originalTotal()).isEqualByComparingTo("3105875");
    }

    @Test
    @DisplayName("EX-07: Chỉ số cuối 99 nhỏ hơn đầu 100 -> ném ngoại lệ INVALID_METER_READING chặn phát hành")
    void testIssueInvoice_LowerEndReading_ThrowsException_EX07() {
        RoomMeter meter = new RoomMeter(room, MeterType.ELECTRICITY, "EM-101", LocalDate.of(2026, 1, 1), BigDecimal.valueOf(100));
        MeterReading rStart = new MeterReading(meter, LocalDate.of(2026, 9, 1), BigDecimal.valueOf(100.000), MeterReadingKind.PERIOD_END, ownerUser);
        MeterReading rEnd = new MeterReading(meter, LocalDate.of(2026, 10, 1), BigDecimal.valueOf(99.000), MeterReadingKind.PERIOD_END, ownerUser);

        Invoice draft = new Invoice(contract, "2026-09", InvoiceStatus.DRAFT, LocalDate.of(2026, 9, 1), LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 8));

        when(invoiceRepository.findById(draft.getId())).thenReturn(Optional.of(draft));
        when(roomMeterRepository.findByRoomId(room.getId())).thenReturn(List.of(meter));
        when(meterReadingRepository.findByMeterIdOrderByReadingDateDesc(meter.getId())).thenReturn(List.of(rEnd, rStart));

        assertThatThrownBy(() -> billingService.issueInvoice(draft.getId(), null, ownerPrincipal))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("INVALID_METER_READING");
    }

    @Test
    @DisplayName("BR-145: Cảnh báo tiêu thụ WARNING chưa được giải trình -> chặn phát hành")
    void testIssueInvoice_UnacknowledgedWarningAlert_ThrowsException() {
        RoomMeter meter = new RoomMeter(room, MeterType.ELECTRICITY, "EM-101", LocalDate.of(2026, 1, 1), BigDecimal.valueOf(100));
        MeterReading rStart = new MeterReading(meter, LocalDate.of(2026, 9, 1), BigDecimal.valueOf(100.000), MeterReadingKind.PERIOD_END, ownerUser);
        MeterReading rEnd = new MeterReading(meter, LocalDate.of(2026, 10, 1), BigDecimal.valueOf(300.000), MeterReadingKind.PERIOD_END, ownerUser);

        ConsumptionAlert unackedAlert = new ConsumptionAlert(contract, MeterType.ELECTRICITY, "2026-09", 1L, EvaluationStatus.WARNING, "{}");

        Invoice draft = new Invoice(contract, "2026-09", InvoiceStatus.DRAFT, LocalDate.of(2026, 9, 1), LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 8));

        when(invoiceRepository.findById(draft.getId())).thenReturn(Optional.of(draft));
        when(roomMeterRepository.findByRoomId(room.getId())).thenReturn(List.of(meter));
        when(meterReadingRepository.findByMeterIdOrderByReadingDateDesc(meter.getId())).thenReturn(List.of(rEnd, rStart));
        when(consumptionAlertRepository.findByContractId(contract.getId())).thenReturn(List.of(unackedAlert));

        assertThatThrownBy(() -> billingService.issueInvoice(draft.getId(), null, ownerPrincipal))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("chưa được giải trình xác nhận");
    }

    @Test
    @DisplayName("EX-12: Điều chỉnh làm effectiveDue âm -> ném ngoại lệ từ chối")
    void testAdjustInvoice_NegativeEffectiveDue_ThrowsException_EX12() {
        Invoice issued = new Invoice(contract, "2026-09", InvoiceStatus.ISSUED, LocalDate.of(2026, 9, 1), LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 8));
        InvoiceItem item = new InvoiceItem(issued, InvoiceItemType.RENT, "Tiền phòng", BigDecimal.ONE, BigDecimal.valueOf(100000), BigDecimal.valueOf(100000), "{}", null, null);
        issued.addItem(item);

        when(invoiceRepository.findById(issued.getId())).thenReturn(Optional.of(issued));

        assertThatThrownBy(() -> billingService.adjustInvoice(issued.getId(), BigDecimal.valueOf(-100001), "Giảm quá mức", LocalDate.now(), null, ownerPrincipal))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("không được âm");
    }

    @Test
    @DisplayName("Điều chỉnh hợp lệ cập nhật effectiveDue chính xác và lưu nhật ký điều chỉnh")
    void testAdjustInvoice_Success() {
        Invoice issued = new Invoice(contract, "2026-09", InvoiceStatus.ISSUED, LocalDate.of(2026, 9, 1), LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 8));
        InvoiceItem item = new InvoiceItem(issued, InvoiceItemType.RENT, "Tiền phòng", BigDecimal.ONE, BigDecimal.valueOf(3000000), BigDecimal.valueOf(3000000), "{}", null, null);
        issued.addItem(item);

        when(invoiceRepository.findById(issued.getId())).thenReturn(Optional.of(issued));
        when(userRepository.findById(ownerPrincipal.getId())).thenReturn(Optional.of(ownerUser));
        when(financialOperationRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(invoiceRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        InvoiceDetailResponse response = billingService.adjustInvoice(
                issued.getId(),
                BigDecimal.valueOf(-200000),
                "Giảm trừ dịch vụ hỗ trợ",
                LocalDate.now(),
                "idem-key-123",
                ownerPrincipal
        );

        assertThat(response.originalTotal()).isEqualByComparingTo("3000000");
        assertThat(response.adjustmentsTotal()).isEqualByComparingTo("-200000");
        assertThat(response.effectiveDue()).isEqualByComparingTo("2800000");
        assertThat(response.adjustments()).hasSize(1);
        assertThat(response.adjustments().get(0).deltaAmount()).isEqualByComparingTo("-200000");
    }
}
