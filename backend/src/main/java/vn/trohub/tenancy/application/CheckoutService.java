package vn.trohub.tenancy.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.trohub.billing.domain.FinancialAction;
import vn.trohub.billing.domain.FinancialOperation;
import vn.trohub.billing.infrastructure.FinancialOperationRepository;
import vn.trohub.common.api.ConflictException;
import vn.trohub.common.security.UserPrincipal;
import vn.trohub.tenancy.api.dto.TenancyDtos.*;
import vn.trohub.tenancy.infrastructure.ContractRepository;
import vn.trohub.user.infrastructure.UserRepository;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.UUID;

@Service
public class CheckoutService {
    private final TenancyService tenancy;
    private final ContractRepository contracts;
    private final FinancialOperationRepository operations;
    private final UserRepository users;
    private final ObjectMapper mapper;

    public CheckoutService(TenancyService tenancy, ContractRepository contracts,
                           FinancialOperationRepository operations, UserRepository users, ObjectMapper mapper) {
        this.tenancy = tenancy;
        this.contracts = contracts;
        this.operations = operations;
        this.users = users;
        this.mapper = mapper;
    }

    @Transactional
    public ContractSummary checkout(UUID contractId, CheckoutContractRequest request, UserPrincipal actor, String key) {
        if (actor == null || !actor.isEnabled() || actor.isTenant())
            throw new AccessDeniedException("Chỉ quản lý được trả phòng");
        if (key == null || key.isBlank() || key.length() > 100)
            throw new IllegalArgumentException("X-Idempotency-Key bắt buộc, tối đa 100 ký tự");
        operations.lockKey(actor.getId() + ":" + key);
        contracts.findForUpdate(contractId).orElseThrow(() -> new java.util.NoSuchElementException("Không tìm thấy hợp đồng"));
        // Scope is checked on every attempt, including a replay after assignment removal.
        tenancy.getContract(contractId, actor);
        try {
            String payload = "CONTRACT_CHECKOUT:" + contractId + ":" + mapper.writeValueAsString(request);
            String hash = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(payload.getBytes(StandardCharsets.UTF_8)));
            var saved = operations.findByActorIdAndIdempotencyKey(actor.getId(), key);
            if (saved.isPresent()) {
                if (saved.get().getAction() != FinancialAction.CONTRACT_CHECKOUT || !saved.get().getRequestHash().equals(hash))
                    throw new ConflictException("Idempotency key đã được dùng với yêu cầu khác");
                return mapper.readValue(saved.get().getResponseSnapshot(), ContractSummary.class);
            }
            ContractSummary response = tenancy.checkoutContract(contractId, request, actor);
            operations.save(new FinancialOperation(key, users.findById(actor.getId()).orElseThrow(),
                    FinancialAction.CONTRACT_CHECKOUT, hash, "SUCCESS", mapper.writeValueAsString(response)));
            return response;
        } catch (JsonProcessingException | java.security.NoSuchAlgorithmException ex) {
            throw new IllegalStateException("Không thể lưu kết quả trả phòng", ex);
        }
    }
}
