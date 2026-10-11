package vn.trohub.tenancy.application;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.trohub.auth.application.AuthService;
import vn.trohub.auth.domain.InvitePurpose;
import vn.trohub.common.security.UserPrincipal;
import vn.trohub.property.domain.Room;
import vn.trohub.property.domain.RoomStatus;
import vn.trohub.property.infrastructure.RoomRepository;
import vn.trohub.tenancy.api.dto.TenancyDtos.*;
import vn.trohub.tenancy.domain.*;
import vn.trohub.tenancy.infrastructure.*;
import vn.trohub.user.domain.User;
import vn.trohub.user.domain.UserRole;
import vn.trohub.user.infrastructure.BuildingStaffAssignmentRepository;
import vn.trohub.user.infrastructure.UserRepository;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
public class TenancyService {
    private java.time.Clock clock = java.time.Clock.system(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));
    @org.springframework.beans.factory.annotation.Autowired
    public void setClock(java.time.Clock clock) { this.clock = clock; }

    private static final Logger log = LoggerFactory.getLogger(TenancyService.class);

    private final TenantProfileRepository tenantProfileRepository;
    private final ContractRepository contractRepository;
    private final ContractMemberRepository contractMemberRepository;
    private final ContractEventRepository contractEventRepository;
    private final RoomMeterRepository roomMeterRepository;
    private final MeterReadingRepository meterReadingRepository;
    private final RoomRepository roomRepository;
    private final UserRepository userRepository;
    private final BuildingStaffAssignmentRepository assignmentRepository;
    private final AuthService authService;

    public TenancyService(
            TenantProfileRepository tenantProfileRepository,
            ContractRepository contractRepository,
            ContractMemberRepository contractMemberRepository,
            ContractEventRepository contractEventRepository,
            RoomMeterRepository roomMeterRepository,
            MeterReadingRepository meterReadingRepository,
            RoomRepository roomRepository,
            UserRepository userRepository,
            BuildingStaffAssignmentRepository assignmentRepository,
            AuthService authService) {
        this.tenantProfileRepository = tenantProfileRepository;
        this.contractRepository = contractRepository;
        this.contractMemberRepository = contractMemberRepository;
        this.contractEventRepository = contractEventRepository;
        this.roomMeterRepository = roomMeterRepository;
        this.meterReadingRepository = meterReadingRepository;
        this.roomRepository = roomRepository;
        this.userRepository = userRepository;
        this.assignmentRepository = assignmentRepository;
        this.authService = authService;
    }

    // ==========================================
    // TENANT PROFILES & INVITES
    // ==========================================

    @Transactional
    public TenantSummary createTenantProfile(CreateTenantRequest request, UserPrincipal actor) {
        verifyManagerRole(actor);
        String masked = maskCitizenId(request.citizenId());
        TenantProfile profile = new TenantProfile(
                request.fullName().trim(),
                request.phone().trim(),
                masked,
                request.email() != null ? request.email().trim() : null
        );
        profile.setCreatedBy(actor.getId());
        profile = tenantProfileRepository.save(profile);
        return toTenantSummary(profile);
    }

    public TenantSummary getTenantProfile(UUID tenantId, UserPrincipal actor) {
        requireProfileScope(tenantId, actor);
        TenantProfile profile = tenantProfileRepository.findById(tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy hồ sơ người thuê: " + tenantId));
        return toTenantSummary(profile);
    }

    public Page<TenantSummary> searchTenants(String query, Pageable pageable, UserPrincipal actor) {
        verifyManagerRole(actor);
        return (actor.isOwner() ? tenantProfileRepository.searchTenants(query, pageable)
                : tenantProfileRepository.searchInStaffScope(query, actor.getId(), pageable)).map(this::toTenantSummary);
    }

    private void requireProfileScope(UUID id, UserPrincipal actor) {
        verifyManagerRole(actor);
        if (!actor.isOwner() && !tenantProfileRepository.inStaffScope(id, actor.getId()))
            throw new AccessDeniedException("Hồ sơ người thuê ngoài phạm vi được giao");
    }

    @Transactional
    public TenantInviteResponse issueTenantInvite(UUID tenantId, UserPrincipal actor) {
        requireProfileScope(tenantId, actor);

        TenantProfile profile = tenantProfileRepository.findById(tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy hồ sơ người thuê: " + tenantId));

        User manager = userRepository.findById(actor.getId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài khoản quản lý"));

        User tenantUser = profile.getUser();
        if (tenantUser == null) {
            String login = profile.getPhone();
            if (userRepository.existsByLogin(login)) {
                login = profile.getPhone() + "_" + UUID.randomUUID().toString().substring(0, 4);
            }
            User newUser = new User(login, "PENDING_INVITE_ACTIVATION", UserRole.TENANT);
            newUser.setEnabled(false); // Chờ kích hoạt qua mã mời (BR-016)
            tenantUser = userRepository.save(newUser);

            profile.setUser(tenantUser);
            tenantProfileRepository.save(profile);
        }

        String rawCode = authService.createInvite(manager, tenantUser, tenantUser.isEnabled() ? InvitePurpose.PASSWORD_RESET : InvitePurpose.TENANT_INVITE);
        Instant expiresAt = clock.instant().plus(24, ChronoUnit.HOURS);

        return new TenantInviteResponse(rawCode, expiresAt);
    }

    // ==========================================
    // CONTRACTS
    // ==========================================

    @Transactional
    public ContractSummary createContractDraft(CreateContractRequest request, UserPrincipal actor) {
        verifyManagerRole(actor);
        requireProfileScope(request.representativeTenantId(), actor);

        Room room = roomRepository.findById(request.roomId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy phòng: " + request.roomId()));

        checkBuildingScope(room.getBuilding().getId(), actor);

        if (!room.isBookable()) {
            throw new IllegalArgumentException("Phòng " + room.getRoomNumber() + " đang bị khóa không cho thuê (BR-029)");
        }

        // Kiểm tra thời gian thuê tối thiểu 1 ngày (BR-036, BR-037, BR-038)
        if (!request.actualStartDate().isBefore(request.plannedEndExclusive())) {
            throw new IllegalArgumentException("Ngày kết thúc dự kiến phải sau ngày bắt đầu ít nhất 1 ngày (BR-037)");
        }
        vn.trohub.common.money.Money.requireWhole(request.rent());
        vn.trohub.common.money.Money.requireWhole(request.depositRequired());
        if (request.rent().signum() < 0 || request.depositRequired().signum() < 0)
            throw new IllegalArgumentException("Giá thuê và cọc không được âm");

        TenantProfile representative = tenantProfileRepository.findById(request.representativeTenantId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người đại diện: " + request.representativeTenantId()));

        Contract contract = new Contract(
                room,
                representative,
                request.actualStartDate(),
                request.plannedEndExclusive(),
                request.rent(),
                request.depositRequired()
        );
        contract = contractRepository.save(contract);

        // Tự động thêm người đại diện làm thành viên cư trú đầu tiên (BR-018)
        ContractMember member = new ContractMember(contract, representative, request.actualStartDate(), true);
        contractMemberRepository.save(member);

        // Ghi nhận nhật ký sự kiện
        ContractEvent event = new ContractEvent(
                contract.getId(),
                "ACTIVATION_DRAFT",
                null,
                "Tạo bản nháp hợp đồng phòng " + room.getRoomNumber(),
                "Lập hợp đồng mới",
                actor.getId()
        );
        contractEventRepository.save(event);

        return toContractSummary(contract);
    }

    @Transactional
    public ContractSummary activateContract(UUID contractId, ActivateContractRequest request, UserPrincipal actor) {
        verifyManagerRole(actor);

        Contract contract = contractRepository.findForUpdate(contractId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy hợp đồng: " + contractId));

        Room room = roomRepository.findForUpdate(contract.getRoom().getId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy phòng"));
        checkBuildingScope(room.getBuilding().getId(), actor);

        if (contract.getStatus() != ContractStatus.DRAFT) {
            throw new IllegalStateException("Chỉ hợp đồng DRAFT mới có thể kích hoạt");
        }

        if (!room.isBookable() || !room.getBuilding().isActive()) {
            throw new IllegalStateException("Phòng đang bị khóa cho thuê (BR-029)");
        }

        // Bất biến then chốt BR-035: một phòng chỉ có tối đa một hợp đồng ACTIVE
        if (contractRepository.existsByRoomIdAndStatus(room.getId(), ContractStatus.ACTIVE)) {
            throw new IllegalStateException("Phòng " + room.getRoomNumber() + " đã có một hợp đồng ACTIVE khác đang chạy (BR-035)");
        }

        User representative = contract.getRepresentativeTenant().getUser();
        if (representative == null || !representative.isEnabled() || representative.getRole() != UserRole.TENANT)
            throw new IllegalStateException("Người đại diện phải kích hoạt tài khoản TENANT trước nhận phòng");
        if (contract.getActualStartDate().isAfter(LocalDate.now(clock)))
            throw new IllegalArgumentException("Ngày nhận phòng thực tế không được ở tương lai");
        List<ContractMember> initialMembers = contractMemberRepository.findByContractIdOrderByJoinedOnAsc(contractId).stream()
                .filter(m -> !m.getJoinedOn().isAfter(contract.getActualStartDate())
                        && (m.getLeftOn() == null || m.getLeftOn().isAfter(contract.getActualStartDate()))).toList();
        if (initialMembers.isEmpty() || initialMembers.size() > room.getMaxTenants()
                || initialMembers.stream().filter(m -> m.isRepresentative()
                    && java.util.Objects.equals(m.getTenant().getId(), contract.getRepresentativeTenant().getId())).count() != 1)
            throw new IllegalStateException("Thành viên ban đầu phải có đúng người đại diện và không vượt sức chứa");
        if (request.handoverReadings() == null || request.handoverReadings().size() != 2)
            throw new IllegalArgumentException("Nhận phòng cần đủ chỉ số bàn giao điện và nước");
        java.util.Set<MeterType> suppliedTypes = new java.util.HashSet<>();

        User actorUser = userRepository.findById(actor.getId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng hiện tại"));

        // Lưu các chỉ số bàn giao (Handover readings)
        if (request.handoverReadings() != null) {
            for (HandoverReadingItem item : request.handoverReadings()) {
                RoomMeter meter;
                if (item.meterId() != null) {
                    meter = roomMeterRepository.findById(item.meterId())
                            .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đồng hồ: " + item.meterId()));
                } else {
                    // Tự động tìm hoặc tạo đồng hồ theo loại
                    MeterType type = item.meterType() != null ? item.meterType() : MeterType.ELECTRICITY;
                    meter = roomMeterRepository.findByRoomIdAndType(room.getId(), type)
                            .orElseGet(() -> {
                                RoomMeter newMeter = new RoomMeter(
                                        room,
                                        type,
                                        "MTR-" + room.getRoomNumber() + "-" + type.name().substring(0, 3),
                                        item.readingDate(),
                                        item.value()
                                );
                                return roomMeterRepository.save(newMeter);
                            });
                }

                if (!meter.getRoom().getId().equals(room.getId()) || !meter.isActive()
                        || (item.meterType() != null && item.meterType() != meter.getType()))
                    throw new IllegalArgumentException("Công tơ bàn giao không thuộc phòng hoặc sai loại");
                if (!contract.getActualStartDate().equals(item.readingDate()) || item.value() == null || item.value().signum() < 0)
                    throw new IllegalArgumentException("Chỉ số bàn giao phải đúng ngày nhận và không âm");
                if (!suppliedTypes.add(meter.getType())) throw new IllegalArgumentException("Loại công tơ bàn giao bị trùng");
                var previous = meterReadingRepository.findByMeterIdAndReadingDateLessThanEqualOrderByReadingDateDescCreatedAtDesc(
                        meter.getId(), item.readingDate());
                if (!previous.isEmpty() && item.value().compareTo(previous.get(0).getValue()) < 0)
                    throw new IllegalArgumentException("Chỉ số bàn giao không được giảm");

                MeterReading reading = new MeterReading(
                        meter,
                        item.readingDate(),
                        item.value(),
                        MeterReadingKind.HANDOVER,
                        actorUser
                );
                meterReadingRepository.save(reading);
            }
        }
        if (!suppliedTypes.containsAll(java.util.Set.of(MeterType.ELECTRICITY, MeterType.WATER)))
            throw new IllegalArgumentException("Nhận phòng cần chỉ số điện và nước");

        // Kích hoạt hợp đồng và đổi trạng thái phòng sang RENTED
        contract.setStatus(ContractStatus.ACTIVE);
        room.setStatus(RoomStatus.RENTED);

        contractRepository.save(contract);
        roomRepository.save(room);

        ContractEvent event = new ContractEvent(
                contract.getId(),
                "ACTIVATION",
                "DRAFT",
                "ACTIVE",
                "Kích hoạt nhận phòng thực tế kèm chỉ số bàn giao",
                actor.getId()
        );
        contractEventRepository.save(event);

        return toContractSummary(contract);
    }

    @Transactional
    public ContractSummary extendContract(UUID contractId, ExtendContractRequest request, UserPrincipal actor) {
        verifyManagerRole(actor);

        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy hợp đồng: " + contractId));

        checkBuildingScope(contract.getRoom().getBuilding().getId(), actor);

        if (contract.getStatus() != ContractStatus.ACTIVE) {
            throw new IllegalStateException("Chỉ có thể gia hạn hợp đồng đang ACTIVE");
        }

        if (!request.newPlannedEndExclusive().isAfter(contract.getPlannedEndExclusive())) {
            throw new IllegalArgumentException("Ngày gia hạn mới phải sau ngày kết thúc dự kiến hiện tại (" + contract.getPlannedEndExclusive() + ")");
        }

        LocalDate oldEnd = contract.getPlannedEndExclusive();
        contract.setPlannedEndExclusive(request.newPlannedEndExclusive());
        // Giữ nguyên giá thuê đã thỏa thuận theo BR-040
        contract = contractRepository.save(contract);

        ContractEvent event = new ContractEvent(
                contract.getId(),
                "EXTENSION",
                oldEnd.toString(),
                request.newPlannedEndExclusive().toString(),
                request.reason().trim(),
                actor.getId()
        );
        contractEventRepository.save(event);

        return toContractSummary(contract);
    }

    @Transactional
    public ContractSummary checkoutContract(UUID contractId, CheckoutContractRequest request, UserPrincipal actor) {
        verifyManagerRole(actor);

        Contract contract = contractRepository.findForUpdate(contractId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy hợp đồng: " + contractId));

        Room room = contract.getRoom();
        checkBuildingScope(room.getBuilding().getId(), actor);

        if (contract.getStatus() != ContractStatus.ACTIVE) {
            throw new IllegalStateException("Chỉ hợp đồng ACTIVE mới có thể thực hiện trả phòng");
        }

        if (!request.actualCheckoutDate().isAfter(contract.getActualStartDate())) {
            throw new IllegalArgumentException("Ngày trả phòng thực tế phải sau ngày nhận phòng (BR-037)");
        }

        User actorUser = userRepository.findById(actor.getId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng hiện tại"));
        if (request.actualCheckoutDate().isAfter(LocalDate.now(clock)))
            throw new IllegalArgumentException("Ngày trả phòng không được ở tương lai");
        java.util.Set<UUID> requiredMeters = roomMeterRepository.findByRoomId(room.getId()).stream()
                .filter(RoomMeter::isActive).map(RoomMeter::getId).collect(java.util.stream.Collectors.toSet());
        java.util.Set<UUID> suppliedMeters = new java.util.HashSet<>();

        if (request.finalReadings() != null) {
            for (HandoverReadingItem item : request.finalReadings()) {
                RoomMeter meter = null;
                if (item.meterId() != null) {
                    meter = roomMeterRepository.findById(item.meterId()).orElse(null);
                } else if (item.meterType() != null) {
                    meter = roomMeterRepository.findByRoomIdAndType(room.getId(), item.meterType()).orElse(null);
                }
                if (meter == null || !meter.getRoom().getId().equals(room.getId()))
                    throw new IllegalArgumentException("Công tơ không thuộc phòng trả");
                if (!request.actualCheckoutDate().equals(item.readingDate()) || item.value() == null || item.value().signum() < 0)
                    throw new IllegalArgumentException("Chỉ số cuối phải ghi đúng ngày trả phòng và không âm");
                if (!suppliedMeters.add(meter.getId())) throw new IllegalArgumentException("Công tơ cuối bị trùng");
                var previous = meterReadingRepository.findByMeterIdOrderByReadingDateDesc(meter.getId()).stream()
                        .filter(reading -> !reading.getReadingDate().isAfter(item.readingDate())).findFirst();
                if (previous.isPresent() && item.value().compareTo(previous.get().getValue()) < 0)
                    throw new IllegalArgumentException("Chỉ số cuối không được giảm");
                if (meter != null) {
                    MeterReading reading = new MeterReading(
                            meter,
                            item.readingDate(),
                            item.value(),
                            MeterReadingKind.CHECKOUT,
                            actorUser
                    );
                    meterReadingRepository.save(reading);
                }
            }
        }
        if (!suppliedMeters.containsAll(requiredMeters)) throw new IllegalArgumentException("Thiếu chỉ số công tơ cuối khi trả phòng");

        // Kết thúc cư trú của tất cả thành viên trong phòng (BR-043, BR-045)
        List<ContractMember> members = contractMemberRepository.findByContractIdOrderByJoinedOnAsc(contract.getId());
        for (ContractMember m : members) {
            if (m.getLeftOn() == null) {
                m.setLeftOn(request.actualCheckoutDate());
                contractMemberRepository.save(m);
            }
        }

        contract.setStatus(ContractStatus.ENDED);
        contract.setActualCheckoutDate(request.actualCheckoutDate());
        if (contract.getDepositStatus() != DepositStatus.SETTLED) {
            contract.setDepositStatus(DepositStatus.SETTLING);
        }
        room.setStatus(RoomStatus.VACANT);

        contract = contractRepository.save(contract);
        roomRepository.save(room);

        ContractEvent event = new ContractEvent(
                contract.getId(),
                "CHECKOUT",
                "ACTIVE",
                "ENDED",
                "Trả phòng thực tế và giải phóng phòng",
                actor.getId()
        );
        contractEventRepository.save(event);

        return toContractSummary(contract);
    }

    // ==========================================
    // CONTRACT MEMBERS
    // ==========================================

    @Transactional
    public ContractMemberResponse addContractMember(UUID contractId, AddMemberRequest request, UserPrincipal actor) {
        verifyManagerRole(actor);
        requireProfileScope(request.tenantId(), actor);

        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy hợp đồng: " + contractId));

        checkBuildingScope(contract.getRoom().getBuilding().getId(), actor);

        if (contract.getStatus() == ContractStatus.ENDED) {
            throw new IllegalStateException("Không thể thêm thành viên vào hợp đồng đã kết thúc");
        }

        // Kiểm tra sức chứa phòng (BR-027)
        long currentMembers = contractMemberRepository.countActiveMembersAtDate(contractId, request.joinedOn());
        if (currentMembers >= contract.getRoom().getMaxTenants()) {
            throw new IllegalArgumentException("Phòng đã đạt sức chứa tối đa (" + contract.getRoom().getMaxTenants() + " người) tại ngày " + request.joinedOn());
        }

        TenantProfile profile = tenantProfileRepository.findById(request.tenantId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy hồ sơ người thuê: " + request.tenantId()));

        ContractMember member = new ContractMember(contract, profile, request.joinedOn(), false);
        member = contractMemberRepository.save(member);

        return toMemberResponse(member);
    }

    public List<ContractMemberResponse> listContractMembers(UUID contractId, UserPrincipal actor) {
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy hợp đồng: " + contractId));

        verifyContractAccess(contract, actor);

        return contractMemberRepository.findByContractIdOrderByJoinedOnAsc(contractId)
                .stream()
                .map(this::toMemberResponse)
                .toList();
    }

    // ==========================================
    // CONTRACT QUERIES
    // ==========================================

    public Page<ContractSummary> listContracts(
            UUID buildingId,
            UUID roomId,
            ContractStatus status,
            Pageable pageable,
            UserPrincipal actor) {

        if (actor.getRole() == UserRole.TENANT) {
            // Người thuê chỉ xem danh sách hợp đồng của chính mình, không thấy DRAFT (BR-021)
            return contractRepository.findTenantContracts(actor.getId(), pageable).map(this::toContractSummary);
        }

        if (actor.getRole() == UserRole.STAFF) {
            List<UUID> allowedBuildingIds = assignmentRepository.findBuildingIdsByUserId(actor.getId());
            if (buildingId != null && !allowedBuildingIds.contains(buildingId)) {
                throw new AccessDeniedException("Bạn không được phân công quản lý tòa nhà này");
            }
            return contractRepository.findContracts(buildingId, roomId, status, allowedBuildingIds, pageable)
                    .map(this::toContractSummary);
        }

        // OWNER xem toàn bộ
        return contractRepository.findContracts(buildingId, roomId, status, null, pageable)
                .map(this::toContractSummary);
    }

    public ContractSummary getContract(UUID contractId, UserPrincipal actor) {
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy hợp đồng: " + contractId));

        verifyContractAccess(contract, actor);

        return toContractSummary(contract);
    }

    // ==========================================
    // ROOM METERS
    // ==========================================

    public List<RoomMeterResponse> getRoomMeters(UUID roomId, UserPrincipal actor) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy phòng: " + roomId));

        if (actor.getRole() == UserRole.STAFF) {
            checkBuildingScope(room.getBuilding().getId(), actor);
        }

        return roomMeterRepository.findByRoomId(roomId).stream()
                .map(this::toRoomMeterResponse)
                .toList();
    }

    // ==========================================
    // HELPERS & SECURITY
    // ==========================================

    private void verifyManagerRole(UserPrincipal actor) {
        if (actor.getRole() != UserRole.OWNER && actor.getRole() != UserRole.STAFF) {
            throw new AccessDeniedException("Chỉ OWNER hoặc STAFF mới có quyền thực hiện thao tác này");
        }
    }

    private void checkBuildingScope(UUID buildingId, UserPrincipal actor) {
        if (actor.getRole() == UserRole.OWNER) {
            return;
        }
        if (actor.getRole() == UserRole.STAFF) {
            List<UUID> allowedIds = assignmentRepository.findBuildingIdsByUserId(actor.getId());
            if (!allowedIds.contains(buildingId)) {
                throw new AccessDeniedException("Bạn không có quyền quản lý tòa nhà này");
            }
            return;
        }
        throw new AccessDeniedException("Không có quyền truy cập dữ liệu tòa nhà");
    }

    private void verifyContractAccess(Contract contract, UserPrincipal actor) {
        if (actor.getRole() == UserRole.OWNER) {
            return;
        }
        if (actor.getRole() == UserRole.STAFF) {
            checkBuildingScope(contract.getRoom().getBuilding().getId(), actor);
            return;
        }
        if (actor.getRole() == UserRole.TENANT) {
            // Người thuê chỉ xem hợp đồng của mình và không xem bản DRAFT (BR-021)
            User repUser = contract.getRepresentativeTenant().getUser();
            if (repUser == null || repUser.getId() == null || !repUser.getId().equals(actor.getId())) {
                throw new AccessDeniedException("Bạn không có quyền xem thông tin hợp đồng này");
            }
            if (contract.getStatus() == ContractStatus.DRAFT) {
                throw new AccessDeniedException("Người thuê không có quyền xem bản nháp hợp đồng (BR-021)");
            }
            return;
        }
        throw new AccessDeniedException("Từ chối truy cập");
    }

    private String maskCitizenId(String citizenId) {
        if (citizenId == null || citizenId.trim().isEmpty()) {
            return "************";
        }
        String cleaned = citizenId.trim();
        if (cleaned.length() <= 4) {
            return cleaned;
        }
        String last4 = cleaned.substring(cleaned.length() - 4);
        return "*".repeat(cleaned.length() - 4) + last4;
    }

    private TenantSummary toTenantSummary(TenantProfile p) {
        return new TenantSummary(
                p.getId(),
                p.getUser() != null ? p.getUser().getId() : null,
                p.getFullName(),
                p.getPhone(),
                p.getCitizenIdMasked(),
                p.getEmail(),
                p.getCreatedAt()
        );
    }

    private ContractSummary toContractSummary(Contract c) {
        return new ContractSummary(
                c.getId(),
                c.getRoom().getId(),
                c.getRoom().getRoomNumber(),
                c.getRoom().getBuilding().getId(),
                c.getRoom().getBuilding().getName(),
                c.getRepresentativeTenant().getId(),
                c.getRepresentativeTenant().getFullName(),
                c.getStatus(),
                c.getActualStartDate(),
                c.getPlannedEndExclusive(),
                c.getActualCheckoutDate(),
                c.getRent().toPlainString(),
                c.getDepositRequired().toPlainString(),
                BigDecimal.ZERO.toPlainString() // depositHeld tính qua depositLedger ở module E1/E2
        );
    }

    private ContractMemberResponse toMemberResponse(ContractMember m) {
        return new ContractMemberResponse(
                m.getId(),
                m.getTenant().getId(),
                m.getTenant().getFullName(),
                m.getTenant().getPhone(),
                m.getTenant().getCitizenIdMasked(),
                m.getJoinedOn(),
                m.getLeftOn(),
                m.isRepresentative()
        );
    }

    private RoomMeterResponse toRoomMeterResponse(RoomMeter m) {
        return new RoomMeterResponse(
                m.getId(),
                m.getRoom().getId(),
                m.getType(),
                m.getSerial(),
                m.getInstalledOn(),
                m.getInitialReading().toPlainString(),
                m.isActive()
        );
    }
}
