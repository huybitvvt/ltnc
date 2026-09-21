package vn.trohub.metering.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import vn.trohub.common.security.UserPrincipal;
import vn.trohub.metering.domain.ConsumptionAlert;
import vn.trohub.metering.domain.EvaluationStatus;
import vn.trohub.metering.infrastructure.ConsumptionAlertRepository;
import vn.trohub.pricing.domain.BuildingBillingSettings;
import vn.trohub.pricing.infrastructure.BuildingBillingSettingsRepository;
import vn.trohub.property.domain.Building;
import vn.trohub.property.domain.Floor;
import vn.trohub.property.domain.Room;
import vn.trohub.tenancy.domain.*;
import vn.trohub.tenancy.infrastructure.ContractMemberRepository;
import vn.trohub.tenancy.infrastructure.ContractRepository;
import vn.trohub.tenancy.infrastructure.MeterReadingRepository;
import vn.trohub.tenancy.infrastructure.RoomMeterRepository;
import vn.trohub.user.domain.User;
import vn.trohub.user.domain.UserRole;
import vn.trohub.user.infrastructure.BuildingStaffAssignmentRepository;
import vn.trohub.user.infrastructure.UserRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MeteringServiceTest {

    @Mock
    private RoomMeterRepository roomMeterRepository;
    @Mock
    private MeterReadingRepository meterReadingRepository;
    @Mock
    private ConsumptionAlertRepository alertRepository;
    @Mock
    private BuildingBillingSettingsRepository settingsRepository;
    @Mock
    private ContractRepository contractRepository;
    @Mock
    private ContractMemberRepository memberRepository;
    @Mock
    private BuildingStaffAssignmentRepository staffAssignmentRepository;
    @Mock
    private UserRepository userRepository;
    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private MeteringService meteringService;

    private User ownerUser;
    private UserPrincipal ownerPrincipal;
    private Building building;
    private Room room;
    private RoomMeter electricityMeter;
    private Contract contract;

    @BeforeEach
    void setUp() {
        ownerUser = new User("owner", "hash", UserRole.OWNER);
        ownerPrincipal = new UserPrincipal(ownerUser.getId(), "owner", UserRole.OWNER, true);

        building = new Building("Tòa TroHub Landmark", "123 Đường Láng");

        Floor floor = new Floor(building, "Tầng 1", 1);

        room = new Room(building, floor, "P101", new BigDecimal("4000000"), new BigDecimal("4000000"));
        room.setMaxTenants(2);

        electricityMeter = new RoomMeter(room, MeterType.ELECTRICITY, "EM-101", LocalDate.of(2026, 1, 1), BigDecimal.ZERO);
        electricityMeter.setId(UUID.randomUUID());

        TenantProfile tenant = new TenantProfile("Nguyễn Văn A", "0912345678", "001099******", "a@test.com");
        contract = new Contract(room, tenant, LocalDate.of(2026, 6, 1), LocalDate.of(2026, 12, 1),
                new BigDecimal("4000000"), new BigDecimal("4000000"));
        contract.setId(UUID.randomUUID());
        contract.setStatus(ContractStatus.ACTIVE);
    }

    @Test
    void testRecordPeriodicReading_Success() {
        when(roomMeterRepository.findById(electricityMeter.getId())).thenReturn(Optional.of(electricityMeter));
        when(meterReadingRepository.findFirstByMeterIdOrderByReadingDateDescCreatedAtDesc(electricityMeter.getId()))
                .thenReturn(Optional.of(new MeterReading(electricityMeter, LocalDate.of(2026, 8, 31),
                        new BigDecimal("100.000"), MeterReadingKind.PERIOD_END, null, ownerUser)));
        when(userRepository.findById(ownerUser.getId())).thenReturn(Optional.of(ownerUser));
        when(meterReadingRepository.save(any(MeterReading.class))).thenAnswer(i -> i.getArgument(0));

        MeterReading reading = meteringService.recordPeriodicReading(
                electricityMeter.getId(), LocalDate.of(2026, 9, 30), new BigDecimal("180.000"), null, ownerPrincipal);

        assertNotNull(reading);
        assertEquals(new BigDecimal("180.000"), reading.getValue());
        assertEquals(MeterReadingKind.PERIOD_END, reading.getKind());
    }

    @Test
    void testRecordPeriodicReading_LowerThanPrevious_ThrowsException() {
        // BR-059: Chỉ số cuối phải lớn hơn hoặc bằng chỉ số đầu; số nhỏ hơn là lỗi dữ liệu chặn phát hành
        when(roomMeterRepository.findById(electricityMeter.getId())).thenReturn(Optional.of(electricityMeter));
        when(meterReadingRepository.findFirstByMeterIdOrderByReadingDateDescCreatedAtDesc(electricityMeter.getId()))
                .thenReturn(Optional.of(new MeterReading(electricityMeter, LocalDate.of(2026, 8, 31),
                        new BigDecimal("150.000"), MeterReadingKind.PERIOD_END, null, ownerUser)));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                meteringService.recordPeriodicReading(
                        electricityMeter.getId(), LocalDate.of(2026, 9, 30), new BigDecimal("140.000"), null, ownerPrincipal));

        assertTrue(ex.getMessage().contains("không được nhỏ hơn"));
    }

    @Test
    void testEvaluateAlert_InsufficientData_LessThanThreePeriods() {
        // BR-143: Thiếu 3 kỳ lịch sử -> INSUFFICIENT_DATA
        when(roomMeterRepository.findById(electricityMeter.getId())).thenReturn(Optional.of(electricityMeter));
        when(meterReadingRepository.findFirstByMeterIdOrderByReadingDateDescCreatedAtDesc(electricityMeter.getId()))
                .thenReturn(Optional.of(new MeterReading(electricityMeter, LocalDate.of(2026, 8, 31),
                        new BigDecimal("100.000"), MeterReadingKind.PERIOD_END, null, ownerUser)));
        when(userRepository.findById(ownerUser.getId())).thenReturn(Optional.of(ownerUser));
        when(contractRepository.findByRoomIdAndStatus(room.getId(), ContractStatus.ACTIVE))
                .thenReturn(Optional.of(contract));
        when(settingsRepository.findByBuildingId(building.getId()))
                .thenReturn(Optional.of(new BuildingBillingSettings(building)));

        // Chỉ có 1 kỳ lịch sử
        when(meterReadingRepository.findByMeterIdOrderByReadingDateDesc(electricityMeter.getId()))
                .thenReturn(List.of(
                        new MeterReading(electricityMeter, LocalDate.of(2026, 9, 30), new BigDecimal("150.000"), MeterReadingKind.PERIOD_END, null, ownerUser),
                        new MeterReading(electricityMeter, LocalDate.of(2026, 8, 31), new BigDecimal("100.000"), MeterReadingKind.PERIOD_END, null, ownerUser)
                ));

        when(meterReadingRepository.save(any(MeterReading.class))).thenAnswer(i -> i.getArgument(0));
        when(alertRepository.save(any(ConsumptionAlert.class))).thenAnswer(i -> i.getArgument(0));

        meteringService.recordPeriodicReading(
                electricityMeter.getId(), LocalDate.of(2026, 9, 30), new BigDecimal("150.000"), null, ownerPrincipal);

        verify(alertRepository).save(argThat(alert ->
                alert.getEvaluationStatus() == EvaluationStatus.INSUFFICIENT_DATA
        ));
    }

    @Test
    void testEvaluateAlert_Warning_ExceedsDoubleMedianAndThreshold() {
        // BR-141: Cảnh báo khi đồng thời current > 2 * median và current - median >= absoluteThreshold
        // Giả sử 3 kỳ trước tiêu thụ lần lượt là: 50, 60, 70 -> Median = 60
        // Ngưỡng điện mặc định = 100 kWh
        // Kỳ hiện tại: tiêu thụ = 250 kWh (chỉ số nhảy từ 300 lên 550)
        // Kiểm tra: 250 > 2 * 60 = 120 (PASS); 250 - 60 = 190 >= 100 (PASS) -> WARNING!
        when(roomMeterRepository.findById(electricityMeter.getId())).thenReturn(Optional.of(electricityMeter));
        when(meterReadingRepository.findFirstByMeterIdOrderByReadingDateDescCreatedAtDesc(electricityMeter.getId()))
                .thenReturn(Optional.of(new MeterReading(electricityMeter, LocalDate.of(2026, 8, 31),
                        new BigDecimal("300.000"), MeterReadingKind.PERIOD_END, null, ownerUser)));
        when(userRepository.findById(ownerUser.getId())).thenReturn(Optional.of(ownerUser));
        when(contractRepository.findByRoomIdAndStatus(room.getId(), ContractStatus.ACTIVE))
                .thenReturn(Optional.of(contract));
        when(settingsRepository.findByBuildingId(building.getId()))
                .thenReturn(Optional.of(new BuildingBillingSettings(building)));

        List<MeterReading> history = List.of(
                new MeterReading(electricityMeter, LocalDate.of(2026, 9, 30), new BigDecimal("550.000"), MeterReadingKind.PERIOD_END, null, ownerUser),
                new MeterReading(electricityMeter, LocalDate.of(2026, 8, 31), new BigDecimal("300.000"), MeterReadingKind.PERIOD_END, null, ownerUser),
                new MeterReading(electricityMeter, LocalDate.of(2026, 7, 31), new BigDecimal("230.000"), MeterReadingKind.PERIOD_END, null, ownerUser),
                new MeterReading(electricityMeter, LocalDate.of(2026, 6, 30), new BigDecimal("170.000"), MeterReadingKind.PERIOD_END, null, ownerUser),
                new MeterReading(electricityMeter, LocalDate.of(2026, 5, 31), new BigDecimal("120.000"), MeterReadingKind.PERIOD_END, null, ownerUser)
        );

        when(meterReadingRepository.findByMeterIdOrderByReadingDateDesc(electricityMeter.getId()))
                .thenReturn(history);
        when(meterReadingRepository.save(any(MeterReading.class))).thenAnswer(i -> i.getArgument(0));
        when(alertRepository.save(any(ConsumptionAlert.class))).thenAnswer(i -> i.getArgument(0));

        meteringService.recordPeriodicReading(
                electricityMeter.getId(), LocalDate.of(2026, 9, 30), new BigDecimal("550.000"), null, ownerPrincipal);

        verify(alertRepository).save(argThat(alert ->
                alert.getEvaluationStatus() == EvaluationStatus.WARNING
        ));
    }

    @Test
    void testAcknowledgeAlert_Success() {
        // BR-145: Quản lý xác nhận số liệu đúng kèm lý do
        ConsumptionAlert alert = new ConsumptionAlert(contract, MeterType.ELECTRICITY, "2026-09",
                1L, EvaluationStatus.WARNING, "{}");
        alert.setId(UUID.randomUUID());

        when(alertRepository.findById(alert.getId())).thenReturn(Optional.of(alert));
        when(userRepository.findById(ownerUser.getId())).thenReturn(Optional.of(ownerUser));
        when(alertRepository.save(any(ConsumptionAlert.class))).thenAnswer(i -> i.getArgument(0));

        ConsumptionAlert acknowledged = meteringService.acknowledgeAlert(
                alert.getId(), "Khách mở máy lạnh liên tục mùa nóng", ownerPrincipal);

        assertNotNull(acknowledged.getAcknowledgedAt());
        assertEquals("Khách mở máy lạnh liên tục mùa nóng", acknowledged.getReason());
        assertEquals(ownerUser, acknowledged.getAcknowledgedBy());
    }

    @Test
    void testAcknowledgeAlert_BlankReason_ThrowsException() {
        ConsumptionAlert alert = new ConsumptionAlert(contract, MeterType.ELECTRICITY, "2026-09",
                1L, EvaluationStatus.WARNING, "{}");
        alert.setId(UUID.randomUUID());

        when(alertRepository.findById(alert.getId())).thenReturn(Optional.of(alert));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                meteringService.acknowledgeAlert(alert.getId(), "  ", ownerPrincipal));

        assertTrue(ex.getMessage().contains("không được để trống"));
    }
}
