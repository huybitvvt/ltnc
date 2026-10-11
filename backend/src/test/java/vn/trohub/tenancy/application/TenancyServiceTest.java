package vn.trohub.tenancy.application;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import vn.trohub.auth.application.AuthService;
import vn.trohub.auth.domain.InvitePurpose;
import vn.trohub.common.security.UserPrincipal;
import vn.trohub.property.domain.Building;
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
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TenancyServiceTest {

    @Mock
    private TenantProfileRepository tenantProfileRepository;
    @Mock
    private ContractRepository contractRepository;
    @Mock
    private ContractMemberRepository contractMemberRepository;
    @Mock
    private ContractEventRepository contractEventRepository;
    @Mock
    private RoomMeterRepository roomMeterRepository;
    @Mock
    private MeterReadingRepository meterReadingRepository;
    @Mock
    private RoomRepository roomRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private BuildingStaffAssignmentRepository assignmentRepository;
    @Mock
    private AuthService authService;

    @InjectMocks
    private TenancyService tenancyService;

    private Building testBuilding;
    private Room testRoom;
    private TenantProfile testTenant;
    private User managerUser;
    private UserPrincipal ownerPrincipal;
    private UserPrincipal tenantPrincipal;

    @BeforeEach
    void setUp() {
        testBuilding = new Building("Tòa nhà Cầu Giấy", "Số 12 Dịch Vọng Hậu");
        testRoom = new Room(testBuilding, null, "P101", new BigDecimal("3500000"), new BigDecimal("3500000"));
        testRoom.setId(UUID.randomUUID());
        testRoom.setMaxTenants(2);

        testTenant = new TenantProfile("Nguyễn Văn An", "0912345678", "********1234", "an@example.com");

        managerUser = new User("admin", "hashed_pwd", UserRole.OWNER);
        ownerPrincipal = new UserPrincipal(managerUser.getId(), "admin", UserRole.OWNER, true);

        User tenantUser = new User("tenant01", "hashed_pwd", UserRole.TENANT);
        tenantPrincipal = new UserPrincipal(tenantUser.getId(), "tenant01", UserRole.TENANT, true);
    }

    @Test
    @DisplayName("Tạo hợp đồng nháp DRAFT thành công, tự động thêm người đại diện và không khóa phòng")
    void createContractDraft_success() {
        CreateContractRequest request = new CreateContractRequest(
                testRoom.getId(),
                testTenant.getId(),
                LocalDate.of(2026, 10, 1),
                LocalDate.of(2027, 4, 1),
                new BigDecimal("3500000"),
                new BigDecimal("3500000")
        );

        when(roomRepository.findById(testRoom.getId())).thenReturn(Optional.of(testRoom));
        when(tenantProfileRepository.findById(testTenant.getId())).thenReturn(Optional.of(testTenant));
        when(contractRepository.save(any(Contract.class))).thenAnswer(inv -> inv.getArgument(0));

        ContractSummary summary = tenancyService.createContractDraft(request, ownerPrincipal);

        assertThat(summary.status()).isEqualTo(ContractStatus.DRAFT);
        assertThat(summary.roomNumber()).isEqualTo("P101");
        assertThat(summary.rent()).isEqualTo("3500000");

        // DRAFT không khóa phòng (BR-033)
        assertThat(testRoom.getStatus()).isEqualTo(RoomStatus.VACANT);

        verify(contractMemberRepository, times(1)).save(any(ContractMember.class));
        verify(contractEventRepository, times(1)).save(any(ContractEvent.class));
    }

    @Test
    @DisplayName("Tạo hợp đồng thất bại nếu khoảng ngày thuê vi phạm tối thiểu 1 ngày (BR-037)")
    void createContractDraft_invalidDateRange_throws() {
        CreateContractRequest request = new CreateContractRequest(
                testRoom.getId(),
                testTenant.getId(),
                LocalDate.of(2026, 10, 1),
                LocalDate.of(2026, 10, 1), // Trùng ngày bắt đầu
                new BigDecimal("3500000"),
                new BigDecimal("3500000")
        );

        when(roomRepository.findById(testRoom.getId())).thenReturn(Optional.of(testRoom));

        assertThatThrownBy(() -> tenancyService.createContractDraft(request, ownerPrincipal))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("ít nhất 1 ngày");
    }

    @Test
    @DisplayName("Tạo hợp đồng thất bại nếu phòng đang bị khóa không cho thuê (BR-029)")
    void createContractDraft_unbookableRoom_throws() {
        testRoom.setBookable(false);

        CreateContractRequest request = new CreateContractRequest(
                testRoom.getId(),
                testTenant.getId(),
                LocalDate.of(2026, 10, 1),
                LocalDate.of(2027, 4, 1),
                new BigDecimal("3500000"),
                new BigDecimal("3500000")
        );

        when(roomRepository.findById(testRoom.getId())).thenReturn(Optional.of(testRoom));

        assertThatThrownBy(() -> tenancyService.createContractDraft(request, ownerPrincipal))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("đang bị khóa");
    }

    @Test
    @DisplayName("Kích hoạt hợp đồng thành công: chuyển ACTIVE, phòng chuyển RENTED và ghi chỉ số bàn giao")
    void activateContract_success() {
        Contract contract = new Contract(testRoom, testTenant, LocalDate.of(2026, 10, 1),
                LocalDate.of(2027, 4, 1), new BigDecimal("3500000"), new BigDecimal("3500000"));

        ActivateContractRequest request = new ActivateContractRequest(List.of(
                new HandoverReadingItem(null, MeterType.ELECTRICITY, LocalDate.of(2026, 10, 1), new BigDecimal("120.500")),
                new HandoverReadingItem(null, MeterType.WATER, LocalDate.of(2026, 10, 1), new BigDecimal("15.000"))
        ));

        when(contractRepository.findById(contract.getId())).thenReturn(Optional.of(contract));
        when(contractRepository.existsByRoomIdAndStatus(testRoom.getId(), ContractStatus.ACTIVE)).thenReturn(false);
        when(userRepository.findById(ownerPrincipal.getId())).thenReturn(Optional.of(managerUser));
        when(roomMeterRepository.findByRoomIdAndType(eq(testRoom.getId()), any(MeterType.class)))
                .thenAnswer(inv -> Optional.of(new RoomMeter(testRoom, inv.getArgument(1), "SERIAL-1", LocalDate.now(), BigDecimal.ZERO)));
        when(contractRepository.save(any(Contract.class))).thenAnswer(inv -> inv.getArgument(0));

        ContractSummary summary = tenancyService.activateContract(contract.getId(), request, ownerPrincipal);

        assertThat(summary.status()).isEqualTo(ContractStatus.ACTIVE);
        assertThat(testRoom.getStatus()).isEqualTo(RoomStatus.RENTED);

        verify(meterReadingRepository, times(2)).save(any(MeterReading.class));
        verify(contractEventRepository, times(1)).save(any(ContractEvent.class));
    }

    @Test
    @DisplayName("Bất biến BR-035: Từ chối kích hoạt nếu phòng đã có 1 hợp đồng ACTIVE khác")
    void activateContract_twoSimultaneousActiveContracts_throws() {
        Contract contract = new Contract(testRoom, testTenant, LocalDate.of(2026, 10, 1),
                LocalDate.of(2027, 4, 1), new BigDecimal("3500000"), new BigDecimal("3500000"));

        when(contractRepository.findById(contract.getId())).thenReturn(Optional.of(contract));
        when(contractRepository.existsByRoomIdAndStatus(testRoom.getId(), ContractStatus.ACTIVE)).thenReturn(true);

        ActivateContractRequest request = new ActivateContractRequest(List.of());

        assertThatThrownBy(() -> tenancyService.activateContract(contract.getId(), request, ownerPrincipal))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("đã có một hợp đồng ACTIVE");
    }

    @Test
    @DisplayName("Gia hạn hợp đồng thành công, giữ nguyên giá thuê theo BR-040 và ghi log audit")
    void extendContract_success() {
        Contract contract = new Contract(testRoom, testTenant, LocalDate.of(2026, 10, 1),
                LocalDate.of(2027, 4, 1), new BigDecimal("3500000"), new BigDecimal("3500000"));
        contract.setStatus(ContractStatus.ACTIVE);

        ExtendContractRequest request = new ExtendContractRequest(LocalDate.of(2027, 10, 1), "Khách muốn ở thêm 6 tháng");

        when(contractRepository.findById(contract.getId())).thenReturn(Optional.of(contract));
        when(contractRepository.save(any(Contract.class))).thenAnswer(inv -> inv.getArgument(0));

        ContractSummary summary = tenancyService.extendContract(contract.getId(), request, ownerPrincipal);

        assertThat(summary.plannedEndExclusive()).isEqualTo(LocalDate.of(2027, 10, 1));
        assertThat(summary.rent()).isEqualTo("3500000"); // Giữ nguyên giá

        verify(contractEventRepository, times(1)).save(any(ContractEvent.class));
    }

    @Test
    @DisplayName("Thêm thành viên vượt sức chứa phòng bị từ chối theo BR-027")
    void addContractMember_capacityExceeded_throws() {
        Contract contract = new Contract(testRoom, testTenant, LocalDate.of(2026, 10, 1),
                LocalDate.of(2027, 4, 1), new BigDecimal("3500000"), new BigDecimal("3500000"));
        contract.setStatus(ContractStatus.ACTIVE);

        // testRoom có maxTenants = 2, hiện tại đã có 2 người
        when(contractRepository.findById(contract.getId())).thenReturn(Optional.of(contract));
        when(contractMemberRepository.countActiveMembersAtDate(eq(contract.getId()), any(LocalDate.class))).thenReturn(2L);

        AddMemberRequest request = new AddMemberRequest(UUID.randomUUID(), LocalDate.of(2026, 10, 15));

        assertThatThrownBy(() -> tenancyService.addContractMember(contract.getId(), request, ownerPrincipal))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("sức chứa tối đa");
    }

    @Test
    @DisplayName("Người thuê không có quyền xem hợp đồng DRAFT theo BR-021")
    void tenantCannotAccessDraftContract_throws() {
        Contract contract = new Contract(testRoom, testTenant, LocalDate.of(2026, 10, 1),
                LocalDate.of(2027, 4, 1), new BigDecimal("3500000"), new BigDecimal("3500000"));
        contract.setStatus(ContractStatus.DRAFT);

        User repUser = new User("tenant01", "pwd", UserRole.TENANT);
        repUser.setId(UUID.randomUUID());
        testTenant.setUser(repUser);

        when(contractRepository.findById(contract.getId())).thenReturn(Optional.of(contract));

        UserPrincipal tenantActor = new UserPrincipal(repUser.getId(), "tenant01", UserRole.TENANT, true);

        assertThatThrownBy(() -> tenancyService.getContract(contract.getId(), tenantActor))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("không có quyền xem bản nháp");
    }

    @Test
    @DisplayName("Tạo mã mời 24h kích hoạt tài khoản người thuê thành công")
    void issueTenantInvite_success() {
        when(tenantProfileRepository.findById(testTenant.getId())).thenReturn(Optional.of(testTenant));
        when(userRepository.findById(ownerPrincipal.getId())).thenReturn(Optional.of(managerUser));
        when(userRepository.existsByLogin("0912345678")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(authService.createInvite(eq(managerUser), any(User.class), eq(InvitePurpose.TENANT_INVITE)))
                .thenReturn("INV-12345678");

        TenantInviteResponse response = tenancyService.issueTenantInvite(testTenant.getId(), ownerPrincipal);

        assertThat(response.inviteCode()).isEqualTo("INV-12345678");
        assertThat(response.expiresAt()).isNotNull();
    }

    @Test
    @DisplayName("Trả phòng checkout thành công: giải phóng phòng, kết thúc hợp đồng, chuyển cọc sang SETTLING và chốt ngày rời đi thành viên (BR-043)")
    void checkoutContract_success() {
        Contract contract = new Contract(testRoom, testTenant, LocalDate.of(2026, 9, 20),
                LocalDate.of(2027, 4, 1), new BigDecimal("3500000"), new BigDecimal("3500000"));
        contract.setStatus(ContractStatus.ACTIVE);
        contract.setDepositStatus(DepositStatus.HOLDING);
        testRoom.setStatus(RoomStatus.RENTED);

        ContractMember member = new ContractMember(contract, testTenant, LocalDate.of(2026, 9, 20), true);
        member.setLeftOn(null);

        UUID meterId = UUID.randomUUID();
        RoomMeter elecMeter = new RoomMeter(testRoom, MeterType.ELECTRICITY, "ELEC-01", LocalDate.of(2026, 9, 20), new BigDecimal("100.000"));
        elecMeter.setId(meterId);
        HandoverReadingItem finalReading = new HandoverReadingItem(
                meterId,
                MeterType.ELECTRICITY,
                LocalDate.of(2026, 10, 10),
                new BigDecimal("150.000")
        );
        CheckoutContractRequest request = new CheckoutContractRequest(
                LocalDate.of(2026, 10, 10),
                List.of(finalReading)
        );

        when(contractRepository.findForUpdate(contract.getId())).thenReturn(Optional.of(contract));
        when(userRepository.findById(ownerPrincipal.getId())).thenReturn(Optional.of(managerUser));
        when(roomMeterRepository.findById(elecMeter.getId())).thenReturn(Optional.of(elecMeter));
        when(contractMemberRepository.findByContractIdOrderByJoinedOnAsc(contract.getId())).thenReturn(List.of(member));
        when(contractRepository.save(any(Contract.class))).thenAnswer(inv -> inv.getArgument(0));

        ContractSummary summary = tenancyService.checkoutContract(contract.getId(), request, ownerPrincipal);

        assertThat(summary.status()).isEqualTo(ContractStatus.ENDED);
        assertThat(summary.actualCheckoutDate()).isEqualTo(LocalDate.of(2026, 10, 10));
        assertThat(testRoom.getStatus()).isEqualTo(RoomStatus.VACANT);
        assertThat(contract.getDepositStatus()).isEqualTo(DepositStatus.SETTLING);
        assertThat(member.getLeftOn()).isEqualTo(LocalDate.of(2026, 10, 10));

        verify(meterReadingRepository, times(1)).save(any(MeterReading.class));
        verify(contractEventRepository, times(1)).save(any(ContractEvent.class));
        verify(roomRepository, times(1)).save(testRoom);
    }

    @Test
    @DisplayName("Trả phòng thất bại nếu ngày checkout không sau ngày bắt đầu theo BR-037")
    void checkoutContract_invalidDate_throws() {
        Contract contract = new Contract(testRoom, testTenant, LocalDate.of(2026, 9, 20),
                LocalDate.of(2027, 4, 1), new BigDecimal("3500000"), new BigDecimal("3500000"));
        contract.setStatus(ContractStatus.ACTIVE);

        CheckoutContractRequest request = new CheckoutContractRequest(
                LocalDate.of(2026, 9, 20), // Bằng ngày bắt đầu -> không hợp lệ
                List.of()
        );

        when(contractRepository.findForUpdate(contract.getId())).thenReturn(Optional.of(contract));

        assertThatThrownBy(() -> tenancyService.checkoutContract(contract.getId(), request, ownerPrincipal))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("BR-037");
    }

    @Test
    @DisplayName("Trả phòng thất bại nếu hợp đồng không ở trạng thái ACTIVE")
    void checkoutContract_notActive_throws() {
        Contract contract = new Contract(testRoom, testTenant, LocalDate.of(2026, 9, 20),
                LocalDate.of(2027, 4, 1), new BigDecimal("3500000"), new BigDecimal("3500000"));
        contract.setStatus(ContractStatus.ENDED);

        CheckoutContractRequest request = new CheckoutContractRequest(
                LocalDate.of(2026, 10, 10),
                List.of()
        );

        when(contractRepository.findForUpdate(contract.getId())).thenReturn(Optional.of(contract));

        assertThatThrownBy(() -> tenancyService.checkoutContract(contract.getId(), request, ownerPrincipal))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("ACTIVE");
    }
}

