package vn.trohub.metering.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.trohub.user.domain.User;
import vn.trohub.common.security.UserPrincipal;
import vn.trohub.user.infrastructure.UserRepository;
import vn.trohub.metering.domain.ConsumptionAlert;
import vn.trohub.metering.domain.EvaluationStatus;
import vn.trohub.metering.infrastructure.ConsumptionAlertRepository;
import vn.trohub.pricing.domain.BuildingBillingSettings;
import vn.trohub.pricing.infrastructure.BuildingBillingSettingsRepository;
import vn.trohub.user.infrastructure.BuildingStaffAssignmentRepository;
import vn.trohub.tenancy.domain.*;
import vn.trohub.tenancy.infrastructure.ContractMemberRepository;
import vn.trohub.tenancy.infrastructure.ContractRepository;
import vn.trohub.tenancy.infrastructure.MeterReadingRepository;
import vn.trohub.tenancy.infrastructure.RoomMeterRepository;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

@Service
@Transactional
public class MeteringService {

    private final RoomMeterRepository roomMeterRepository;
    private final MeterReadingRepository meterReadingRepository;
    private final ConsumptionAlertRepository alertRepository;
    private final BuildingBillingSettingsRepository settingsRepository;
    private final ContractRepository contractRepository;
    private final ContractMemberRepository memberRepository;
    private final BuildingStaffAssignmentRepository staffAssignmentRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public MeteringService(RoomMeterRepository roomMeterRepository,
                           MeterReadingRepository meterReadingRepository,
                           ConsumptionAlertRepository alertRepository,
                           BuildingBillingSettingsRepository settingsRepository,
                           ContractRepository contractRepository,
                           ContractMemberRepository memberRepository,
                           BuildingStaffAssignmentRepository staffAssignmentRepository,
                           UserRepository userRepository,
                           ObjectMapper objectMapper) {
        this.roomMeterRepository = roomMeterRepository;
        this.meterReadingRepository = meterReadingRepository;
        this.alertRepository = alertRepository;
        this.settingsRepository = settingsRepository;
        this.contractRepository = contractRepository;
        this.memberRepository = memberRepository;
        this.staffAssignmentRepository = staffAssignmentRepository;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * Ghi nhận chỉ số định kỳ (thường là cuối tháng PERIOD_END) cho một đồng hồ.
     * Kiểm tra BR-059: chỉ số mới >= chỉ số trước đó.
     * Đánh giá cảnh báo tiêu thụ bất thường BR-138..147.
     */
    public MeterReading recordPeriodicReading(UUID meterId, LocalDate readingDate, BigDecimal value,
                                             UUID fileId, UserPrincipal actor) {
        RoomMeter meter = roomMeterRepository.findById(meterId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy đồng hồ"));

        checkBuildingAccess(meter.getRoom().getBuilding().getId(), actor);

        if (value == null || value.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Chỉ số không được âm");
        }
        if (readingDate == null) {
            readingDate = LocalDate.now();
        }

        // Lấy chỉ số gần nhất trước thời điểm này
        Optional<MeterReading> previousReadingOpt = meterReadingRepository
                .findFirstByMeterIdOrderByReadingDateDescCreatedAtDesc(meterId);

        if (previousReadingOpt.isPresent()) {
            MeterReading prev = previousReadingOpt.get();
            // BR-059: Chỉ số cuối phải lớn hơn hoặc bằng chỉ số đầu; số nhỏ hơn là lỗi dữ liệu chặn phát hành
            if (value.compareTo(prev.getValue()) < 0) {
                throw new IllegalArgumentException(
                        String.format("Chỉ số mới (%s) không được nhỏ hơn chỉ số trước đó (%s)",
                                value.toPlainString(), prev.getValue().toPlainString()));
            }
        }

        User user = userRepository.findById(actor.getId())
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy tài khoản người dùng"));

        MeterReading reading = new MeterReading(meter, readingDate, value, MeterReadingKind.PERIOD_END, fileId, user);
        reading = meterReadingRepository.save(reading);

        // Đánh giá cảnh báo nếu phòng đang có hợp đồng ACTIVE
        evaluateConsumptionAlert(meter, reading, readingDate, previousReadingOpt.orElse(null));

        return reading;
    }

    /**
     * Đánh giá tiêu thụ bất thường theo BR-138..147
     */
    private void evaluateConsumptionAlert(RoomMeter meter, MeterReading currentReading,
                                          LocalDate readingDate, MeterReading previousReading) {
        Optional<Contract> activeContractOpt = contractRepository
                .findByRoomIdAndStatus(meter.getRoom().getId(), ContractStatus.ACTIVE);

        if (activeContractOpt.isEmpty()) {
            return; // Không có hợp đồng active, bỏ qua cảnh báo
        }

        Contract contract = activeContractOpt.get();
        String billingMonth = String.format("%04d-%02d", readingDate.getYear(), readingDate.getMonthValue());

        // Lấy ngưỡng từ BuildingBillingSettings
        BuildingBillingSettings settings = settingsRepository
                .findByBuildingId(meter.getRoom().getBuilding().getId())
                .orElseGet(() -> new BuildingBillingSettings(meter.getRoom().getBuilding()));

        BigDecimal threshold = (meter.getType() == MeterType.WATER)
                ? settings.getWaterAbsoluteThreshold()
                : settings.getElectricityAbsoluteThreshold();

        // Tính lượng dùng hiện tại
        BigDecimal currentConsumption = (previousReading != null)
                ? currentReading.getValue().subtract(previousReading.getValue())
                : BigDecimal.ZERO;

        // Lấy lịch sử các chỉ số PERIOD_END trước đó của đồng hồ này
        List<MeterReading> history = meterReadingRepository.findByMeterIdOrderByReadingDateDesc(meter.getId());
        List<BigDecimal> pastConsumptions = new ArrayList<>();

        for (int i = 1; i < history.size() - 1 && pastConsumptions.size() < 3; i++) {
            BigDecimal curr = history.get(i).getValue();
            BigDecimal prev = history.get(i + 1).getValue();
            if (curr.compareTo(prev) >= 0) {
                pastConsumptions.add(curr.subtract(prev));
            }
        }

        EvaluationStatus status;
        BigDecimal median = BigDecimal.ZERO;
        Map<String, Object> snapshot = new HashMap<>();
        snapshot.put("meterType", meter.getType().name());
        snapshot.put("currentReading", currentReading.getValue().toPlainString());
        snapshot.put("previousReading", previousReading != null ? previousReading.getValue().toPlainString() : "0");
        snapshot.put("currentConsumption", currentConsumption.toPlainString());
        snapshot.put("threshold", threshold.toPlainString());

        // BR-143: Thiếu ba kỳ lịch sử so sánh thì trả INSUFFICIENT_DATA
        if (pastConsumptions.size() < 3) {
            status = EvaluationStatus.INSUFFICIENT_DATA;
            snapshot.put("reason", "Thiếu 3 kỳ lịch sử hoàn chỉnh để so sánh");
        } else {
            // Sắp xếp tìm trung vị (median)
            List<BigDecimal> sorted = new ArrayList<>(pastConsumptions);
            Collections.sort(sorted);
            median = sorted.get(1); // Phần tử giữa của 3 kỳ
            snapshot.put("median", median.toPlainString());
            snapshot.put("pastConsumptions", pastConsumptions.stream().map(BigDecimal::toPlainString).toList());

            // BR-141: Cảnh báo khi đồng thời current > 2 * median và current - median >= absoluteThreshold
            BigDecimal doubleMedian = median.multiply(BigDecimal.valueOf(2));
            BigDecimal diff = currentConsumption.subtract(median);

            boolean exceedsDoubleMedian = currentConsumption.compareTo(doubleMedian) > 0;
            boolean exceedsAbsoluteThreshold = diff.compareTo(threshold) >= 0;

            if (exceedsDoubleMedian && exceedsAbsoluteThreshold) {
                status = EvaluationStatus.WARNING;
                snapshot.put("exceedsDoubleMedian", true);
                snapshot.put("exceedsAbsoluteThreshold", true);
                snapshot.put("diff", diff.toPlainString());
            } else {
                status = EvaluationStatus.NORMAL;
            }
        }

        String jsonSnapshot = "{}";
        try {
            jsonSnapshot = objectMapper.writeValueAsString(snapshot);
        } catch (Exception ignored) {}

        // Kiểm tra xem đã có alert cho kỳ này chưa
        Optional<ConsumptionAlert> existingAlertOpt = alertRepository
                .findByContractIdAndMeterTypeAndBillingMonth(contract.getId(), meter.getType(), billingMonth);

        ConsumptionAlert alert;
        if (existingAlertOpt.isPresent()) {
            alert = existingAlertOpt.get();
            alert.setReadingVersion(alert.getReadingVersion() + 1); // BR-146: tăng version làm mất hiệu lực xác nhận cũ
            alert.setEvaluationStatus(status);
            alert.setComparisonSnapshot(jsonSnapshot);
            alert.setAcknowledgedBy(null);
            alert.setAcknowledgedAt(null);
            alert.setReason(null);
        } else {
            alert = new ConsumptionAlert(contract, meter.getType(), billingMonth, 0L, status, jsonSnapshot);
        }

        alertRepository.save(alert);
    }

    /**
     * Xác nhận số liệu cảnh báo là đúng kèm lý do (BR-145).
     */
    public ConsumptionAlert acknowledgeAlert(UUID alertId, String reason, UserPrincipal actor) {
        ConsumptionAlert alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy cảnh báo"));

        checkBuildingAccess(alert.getContract().getRoom().getBuilding().getId(), actor);

        if (reason == null || reason.trim().length() < 3) {
            throw new IllegalArgumentException("Lý do xác nhận không được để trống (tối thiểu 3 ký tự)");
        }

        User user = userRepository.findById(actor.getId())
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy tài khoản người dùng"));

        alert.setAcknowledgedBy(user);
        alert.setAcknowledgedAt(Instant.now());
        alert.setReason(reason.trim());

        return alertRepository.save(alert);
    }

    @Transactional(readOnly = true)
    public List<ConsumptionAlert> listAlerts(UUID contractId, String billingMonth, UserPrincipal actor) {
        if (billingMonth != null && !billingMonth.isBlank()) {
            return alertRepository.findByContractIdAndBillingMonth(contractId, billingMonth);
        }
        return alertRepository.findByContractId(contractId);
    }

    @Transactional(readOnly = true)
    public List<MeterReading> listReadingsByRoom(UUID roomId, UserPrincipal actor) {
        return meterReadingRepository.findByMeterRoomIdOrderByReadingDateDesc(roomId);
    }

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
}
