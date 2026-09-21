package vn.trohub.pricing.application;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.trohub.common.security.UserPrincipal;
import vn.trohub.pricing.domain.*;
import vn.trohub.pricing.infrastructure.*;
import vn.trohub.property.domain.Building;
import vn.trohub.property.infrastructure.BuildingRepository;
import vn.trohub.user.infrastructure.BuildingStaffAssignmentRepository;
import vn.trohub.tenancy.domain.Contract;
import vn.trohub.tenancy.infrastructure.ContractRepository;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class PricingService {

    private final ServiceDefinitionRepository serviceRepository;
    private final TariffRepository tariffRepository;
    private final BuildingBillingSettingsRepository settingsRepository;
    private final ContractServiceSubscriptionRepository subscriptionRepository;
    private final OneOffChargeRepository oneOffChargeRepository;
    private final BuildingRepository buildingRepository;
    private final BuildingStaffAssignmentRepository staffAssignmentRepository;
    private final ContractRepository contractRepository;

    public PricingService(ServiceDefinitionRepository serviceRepository,
                          TariffRepository tariffRepository,
                          BuildingBillingSettingsRepository settingsRepository,
                          ContractServiceSubscriptionRepository subscriptionRepository,
                          OneOffChargeRepository oneOffChargeRepository,
                          BuildingRepository buildingRepository,
                          BuildingStaffAssignmentRepository staffAssignmentRepository,
                          ContractRepository contractRepository) {
        this.serviceRepository = serviceRepository;
        this.tariffRepository = tariffRepository;
        this.settingsRepository = settingsRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.oneOffChargeRepository = oneOffChargeRepository;
        this.buildingRepository = buildingRepository;
        this.staffAssignmentRepository = staffAssignmentRepository;
        this.contractRepository = contractRepository;
    }

    // ----------------------------------------------------
    // SERVICE DEFINITIONS
    // ----------------------------------------------------
    @Transactional(readOnly = true)
    public List<ServiceDefinition> listActiveServices() {
        return serviceRepository.findAllByActiveTrueOrderByNameAsc();
    }

    public ServiceDefinition createService(String name, String unit, ServiceCalculationType calculationType, UserPrincipal actor) {
        if (!actor.isOwner()) {
            throw new AccessDeniedException("Chỉ Chủ nhà mới có quyền thêm dịch vụ hệ thống");
        }
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Tên dịch vụ không được để trống");
        }
        if (serviceRepository.existsByNameIgnoreCase(name.trim())) {
            throw new IllegalStateException("Dịch vụ đã tồn tại trong hệ thống");
        }
        ServiceDefinition def = new ServiceDefinition(name.trim(), unit != null ? unit.trim() : "", calculationType);
        return serviceRepository.save(def);
    }

    // ----------------------------------------------------
    // TARIFFS
    // ----------------------------------------------------
    @Transactional(readOnly = true)
    public List<Tariff> listTariffsByBuilding(UUID buildingId, UserPrincipal actor) {
        checkBuildingAccess(buildingId, actor);
        return tariffRepository.findByBuildingIdOrderByEffectiveMonthDesc(buildingId);
    }

    public Tariff createTariff(UUID buildingId, UUID serviceId, String effectiveMonth, BigDecimal unitPrice, UserPrincipal actor) {
        checkBuildingAccess(buildingId, actor);
        Building building = buildingRepository.findById(buildingId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy tòa nhà"));
        ServiceDefinition service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy dịch vụ"));

        if (effectiveMonth == null || !effectiveMonth.matches("^\\d{4}-(0[1-9]|1[0-2])$")) {
            throw new IllegalArgumentException("Tháng hiệu lực không hợp lệ (định dạng YYYY-MM)");
        }
        if (unitPrice == null || unitPrice.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Đơn giá không được âm");
        }
        if (tariffRepository.existsByBuildingIdAndServiceIdAndEffectiveMonth(buildingId, serviceId, effectiveMonth)) {
            throw new IllegalStateException("Đã tồn tại đơn giá cho dịch vụ này trong tháng " + effectiveMonth + " tại tòa nhà");
        }

        Tariff tariff = new Tariff(building, service, effectiveMonth, unitPrice);
        return tariffRepository.save(tariff);
    }

    @Transactional(readOnly = true)
    public Tariff getEffectiveTariff(UUID buildingId, UUID serviceId, String billingMonth) {
        // BR-067: Kỳ dùng phiên bản giá có tháng hiệu lực gần nhất không sau kỳ đó
        List<Tariff> tariffs = tariffRepository
                .findByBuildingIdAndServiceIdAndEffectiveMonthLessThanEqualOrderByEffectiveMonthDesc(
                        buildingId, serviceId, billingMonth);
        if (tariffs.isEmpty()) {
            throw new IllegalStateException("Không tìm thấy đơn giá hiệu lực cho dịch vụ trong kỳ " + billingMonth);
        }
        return tariffs.get(0);
    }

    // ----------------------------------------------------
    // BUILDING BILLING SETTINGS
    // ----------------------------------------------------
    public BuildingBillingSettings getOrCreateSettings(UUID buildingId, UserPrincipal actor) {
        checkBuildingAccess(buildingId, actor);
        Building building = buildingRepository.findById(buildingId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy tòa nhà"));

        return settingsRepository.findByBuildingId(buildingId).orElseGet(() -> {
            BuildingBillingSettings settings = new BuildingBillingSettings(building);
            return settingsRepository.save(settings);
        });
    }

    public BuildingBillingSettings updateSettings(UUID buildingId, int dueDays,
                                                 BigDecimal waterThreshold,
                                                 BigDecimal electricityThreshold,
                                                 UserPrincipal actor) {
        checkBuildingAccess(buildingId, actor);
        BuildingBillingSettings settings = getOrCreateSettings(buildingId, actor);
        if (dueDays <= 0) {
            throw new IllegalArgumentException("Số ngày thanh toán phải lớn hơn 0");
        }
        if (waterThreshold == null || waterThreshold.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Ngưỡng nước không được âm");
        }
        if (electricityThreshold == null || electricityThreshold.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Ngưỡng điện không được âm");
        }
        settings.setDueDays(dueDays);
        settings.setWaterAbsoluteThreshold(waterThreshold);
        settings.setElectricityAbsoluteThreshold(electricityThreshold);
        return settingsRepository.save(settings);
    }

    // ----------------------------------------------------
    // SUBSCRIPTIONS
    // ----------------------------------------------------
    @Transactional(readOnly = true)
    public List<ContractServiceSubscription> listSubscriptions(UUID contractId, UserPrincipal actor) {
        verifyContractAccess(contractId, actor);
        return subscriptionRepository.findByContractId(contractId);
    }

    public ContractServiceSubscription subscribeService(UUID contractId, UUID serviceId,
                                                        String startMonth, String endMonthExclusive,
                                                        UserPrincipal actor) {
        Contract contract = verifyContractAccess(contractId, actor);
        if (actor.isTenant()) {
            throw new AccessDeniedException("Khách thuê không thể tự gán gói dịch vụ");
        }
        ServiceDefinition service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy dịch vụ"));

        if (startMonth == null || !startMonth.matches("^\\d{4}-(0[1-9]|1[0-2])$")) {
            throw new IllegalArgumentException("Tháng bắt đầu không hợp lệ (YYYY-MM)");
        }
        if (subscriptionRepository.existsByContractIdAndServiceIdAndStartMonth(contractId, serviceId, startMonth)) {
            throw new IllegalStateException("Đăng ký dịch vụ này đã tồn tại từ tháng " + startMonth);
        }

        ContractServiceSubscription sub = new ContractServiceSubscription(contract, service, startMonth, endMonthExclusive);
        return subscriptionRepository.save(sub);
    }

    // ----------------------------------------------------
    // ONE OFF CHARGES
    // ----------------------------------------------------
    @Transactional(readOnly = true)
    public List<OneOffCharge> listOneOffCharges(UUID contractId, String billingMonth, UserPrincipal actor) {
        verifyContractAccess(contractId, actor);
        if (billingMonth != null && !billingMonth.isBlank()) {
            return oneOffChargeRepository.findByContractIdAndBillingMonth(contractId, billingMonth);
        }
        return oneOffChargeRepository.findByContractId(contractId);
    }

    public OneOffCharge createOneOffCharge(UUID contractId, String billingMonth, String label,
                                           BigDecimal amount, String reason, String sourceRef,
                                           UserPrincipal actor) {
        Contract contract = verifyContractAccess(contractId, actor);
        if (actor.isTenant()) {
            throw new AccessDeniedException("Khách thuê không thể tạo khoản thu phát sinh");
        }
        if (billingMonth == null || !billingMonth.matches("^\\d{4}-(0[1-9]|1[0-2])$")) {
            throw new IllegalArgumentException("Kỳ tính tiền không hợp lệ (YYYY-MM)");
        }
        if (label == null || label.isBlank()) {
            throw new IllegalArgumentException("Tên khoản thu không được để trống");
        }
        if (amount == null || amount.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Số tiền không được âm");
        }
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("Lý do thu không được để trống");
        }

        OneOffCharge charge = new OneOffCharge(contract, billingMonth, label.trim(), amount, reason.trim(), sourceRef);
        return oneOffChargeRepository.save(charge);
    }

    // ----------------------------------------------------
    // HELPER CHECKS
    // ----------------------------------------------------
    private void checkBuildingAccess(UUID buildingId, UserPrincipal actor) {
        if (actor.isOwner()) return;
        if (actor.isStaff()) {
            boolean assigned = staffAssignmentRepository.existsByUserIdAndBuildingId(actor.getId(), buildingId);
            if (!assigned) {
                throw new AccessDeniedException("Nhân viên không được phân công tòa nhà này");
            }
            return;
        }
        throw new AccessDeniedException("Không có quyền truy cập tòa nhà");
    }

    private Contract verifyContractAccess(UUID contractId, UserPrincipal actor) {
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy hợp đồng"));
        if (actor.isOwner()) return contract;
        if (actor.isStaff()) {
            UUID buildingId = contract.getRoom().getBuilding().getId();
            boolean assigned = staffAssignmentRepository.existsByUserIdAndBuildingId(actor.getId(), buildingId);
            if (!assigned) {
                throw new AccessDeniedException("Nhân viên không có quyền trên hợp đồng thuộc tòa này");
            }
            return contract;
        }
        if (actor.isTenant()) {
            var repUser = contract.getRepresentativeTenant().getUser();
            if (repUser == null || !repUser.getId().equals(actor.getId())) {
                throw new AccessDeniedException("Không có quyền xem hợp đồng của người khác");
            }
            return contract;
        }
        throw new AccessDeniedException("Không có quyền truy cập");
    }
}
