package vn.trohub.operations.api;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import vn.trohub.common.api.ApiResponse;
import vn.trohub.common.security.UserPrincipal;
import vn.trohub.operations.application.OperationsDtos;
import vn.trohub.operations.application.OperationsService;
import vn.trohub.operations.domain.ParentType;
import vn.trohub.operations.domain.StoredFile;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/files")
public class FileController {

    private final OperationsService operationsService;

    public FileController(OperationsService operationsService) {
        this.operationsService = operationsService;
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('OWNER', 'STAFF', 'TENANT')")
    public ResponseEntity<ApiResponse<OperationsDtos.StoredFileDto>> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("parentType") ParentType parentType,
            @RequestParam("parentId") UUID parentId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        OperationsDtos.StoredFileDto result = operationsService.storeFile(file, parentType, parentId, principal.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(result));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'STAFF', 'TENANT')")
    public ResponseEntity<byte[]> downloadFile(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        StoredFile meta = operationsService.getStoredFileMetadata(id);
        byte[] content = operationsService.getFileContent(id);

        MediaType mediaType;
        try {
            mediaType = MediaType.parseMediaType(meta.getMimeType());
        } catch (Exception e) {
            mediaType = MediaType.APPLICATION_OCTET_STREAM;
        }

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + meta.getOriginalName() + "\"")
                .body(content);
    }
}
