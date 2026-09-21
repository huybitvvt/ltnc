package vn.trohub.pricing.application;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import vn.trohub.common.security.UserPrincipal;
import vn.trohub.pricing.domain.*;
import vn.trohub.pricing.infrastructure.*;
import vn.trohub.property.domain.Building;
import vn.trohub.property.domain.Floor;
import vn.trohub.property.domain.Room;
import vn.trohub.property.infrastructure.BuildingRepository;
import vn.trohub.tenancy.domain.Contract;
import vn.trohub.tenancy.domain.TenantProfile;
import vn.trohub.tenancy.infrastructure.ContractRepository;
import vn.trohub.user.domain.User;
import vn.trohub.user.domain.UserRole;
import vn.trohub.user.infrastructure.BuildingStaffAssignmentRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PricingServiceTest {

    @Mock
    private ServiceDefinitionRepository serviceRepository;
    @Mock
    private TariffRepository tariffRepository;
    @Mock
    private BuildingBillingSettingsRepository settingsRepository;
    @Mock
    private ContractServiceSubscriptionRepository subscriptionRepository;
    @Mock
    private OneOffChargeRepository oneOffChargeRepository;
    @Mock
    private BuildingRepository buildingRepository;
    @Mock
    private BuildingStaffAssignmentRepository staffAssignmentRepository;
    @Mock
    private ContractRepository contractRepository;

    @InjectMocks
    private PricingService pricingService;

    private User ownerUser;
    private User staffUser;
    private UserPrincipal ownerPrincipal;
    private UserPrincipal staffPrincipal;
    private Building building;
    private ServiceDefinition electricityService;

    @BeforeEach
    void setUp() {
        ownerUser = new User("owner", "hash", UserRole.OWNER);
        ownerPrincipal = new UserPrincipal(ownerUser.getId(), "owner", UserRole.OWNER, true);

        staffUser = new User("staff", "hash", UserRole.STAFF);
        staffPrincipal = new UserPrincipal(staffUser.getId(), "staff", UserRole.STAFF, true);

        building = new Building("Tòa TroHub Landmark", "123 Đường Láng, Hà Nội");

        electricityService = new ServiceDefinition("Điện sinh hoạt", "kWh", ServiceCalculationType.METERED);
    }

    @Test
    void testCreateService_Owner_Success() {
        when(serviceRepository.existsByNameIgnoreCase("Internet")).thenReturn(false);
        when(serviceRepository.save(any(ServiceDefinition.class))).thenAnswer(i -> {
            ServiceDefinition s = i.getArgument(0);
            s.setId(UUID.randomUUID());
            return s;
        });

        ServiceDefinition result = pricingService.createService("Internet", "phòng", ServiceCalculationType.ROOM_MONTHLY, ownerPrincipal);

        assertNotNull(result);
        assertEquals("Internet", result.getName());
        assertEquals(ServiceCalculationType.ROOM_MONTHLY, result.getCalculationType());
        verify(serviceRepository).save(any(ServiceDefinition.class));
    }

    @Test
    void testCreateService_Staff_ThrowsForbidden() {
        assertThrows(AccessDeniedException.class, () ->
                pricingService.createService("Internet", "phòng", ServiceCalculationType.ROOM_MONTHLY, staffPrincipal));
    }

    @Test
    void testCreateTariff_Success() {
        when(buildingRepository.findById(building.getId())).thenReturn(Optional.of(building));
        when(serviceRepository.findById(electricityService.getId())).thenReturn(Optional.of(electricityService));
        when(tariffRepository.existsByBuildingIdAndServiceIdAndEffectiveMonth(building.getId(), electricityService.getId(), "2026-10"))
                .thenReturn(false);
        when(tariffRepository.save(any(Tariff.class))).thenAnswer(i -> i.getArgument(0));

        Tariff tariff = pricingService.createTariff(
                building.getId(), electricityService.getId(), "2026-10", new BigDecimal("3500"), ownerPrincipal);

        assertNotNull(tariff);
        assertEquals("2026-10", tariff.getEffectiveMonth());
        assertEquals(new BigDecimal("3500"), tariff.getUnitPrice());
    }

    @Test
    void testCreateTariff_DuplicateMonth_ThrowsException() {
        when(buildingRepository.findById(building.getId())).thenReturn(Optional.of(building));
        when(serviceRepository.findById(electricityService.getId())).thenReturn(Optional.of(electricityService));
        when(tariffRepository.existsByBuildingIdAndServiceIdAndEffectiveMonth(building.getId(), electricityService.getId(), "2026-10"))
                .thenReturn(true);

        assertThrows(IllegalStateException.class, () ->
                pricingService.createTariff(building.getId(), electricityService.getId(), "2026-10", new BigDecimal("3500"), ownerPrincipal));
    }

    @Test
    void testGetEffectiveTariff_FindsMostRecentBeforeOrEqual() {
        // BR-067: Lấy đơn giá gần nhất không sau kỳ tính tiền
        Tariff oldTariff = new Tariff(building, electricityService, "2026-01", new BigDecimal("3000"));
        Tariff recentTariff = new Tariff(building, electricityService, "2026-06", new BigDecimal("3500"));

        // Repository sắp xếp giảm dần theo effectiveMonth
        when(tariffRepository.findByBuildingIdAndServiceIdAndEffectiveMonthLessThanEqualOrderByEffectiveMonthDesc(
                building.getId(), electricityService.getId(), "2026-08"))
                .thenReturn(List.of(recentTariff, oldTariff));

        Tariff effective = pricingService.getEffectiveTariff(building.getId(), electricityService.getId(), "2026-08");

        assertNotNull(effective);
        assertEquals("2026-06", effective.getEffectiveMonth());
        assertEquals(new BigDecimal("3500"), effective.getUnitPrice());
    }

    @Test
    void testGetEffectiveTariff_NoTariff_ThrowsException() {
        when(tariffRepository.findByBuildingIdAndServiceIdAndEffectiveMonthLessThanEqualOrderByEffectiveMonthDesc(
                building.getId(), electricityService.getId(), "2026-08"))
                .thenReturn(List.of());

        assertThrows(IllegalStateException.class, () ->
                pricingService.getEffectiveTariff(building.getId(), electricityService.getId(), "2026-08"));
    }

    @Test
    void testUpdateBillingSettings_Success() {
        when(buildingRepository.findById(building.getId())).thenReturn(Optional.of(building));
        BuildingBillingSettings settings = new BuildingBillingSettings(building);
        when(settingsRepository.findByBuildingId(building.getId())).thenReturn(Optional.of(settings));
        when(settingsRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        BuildingBillingSettings updated = pricingService.updateSettings(
                building.getId(), 10, new BigDecimal("12.500"), new BigDecimal("150.000"), ownerPrincipal);

        assertEquals(10, updated.getDueDays());
        assertEquals(new BigDecimal("12.500"), updated.getWaterAbsoluteThreshold());
        assertEquals(new BigDecimal("150.000"), updated.getElectricityAbsoluteThreshold());
    }

    @Test
    void testCreateOneOffCharge_Success() {
        Floor floor = new Floor(building, "Tầng 1", 1);
        Room room = new Room(building, floor, "P101", new BigDecimal("4000000"), new BigDecimal("4000000"));
        TenantProfile tenant = new TenantProfile("Nguyễn Văn A", "0912345678", "001099******", "a@test.com");
        Contract contract = new Contract(room, tenant, LocalDate.of(2026, 9, 1), LocalDate.of(2027, 3, 1),
                new BigDecimal("4000000"), new BigDecimal("4000000"));
        contract.setId(UUID.randomUUID());

        when(contractRepository.findById(contract.getId())).thenReturn(Optional.of(contract));
        when(oneOffChargeRepository.save(any(OneOffCharge.class))).thenAnswer(i -> i.getArgument(0));

        OneOffCharge charge = pricingService.createOneOffCharge(
                contract.getId(), "2026-09", "Phí thẻ xe làm lại", new BigDecimal("100000"), "Mất thẻ", null, ownerPrincipal);

        assertNotNull(charge);
        assertEquals("Phí thẻ xe làm lại", charge.getLabel());
        assertEquals(new BigDecimal("100000"), charge.getAmount());
    }
}
