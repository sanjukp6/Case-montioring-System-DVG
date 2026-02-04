package com.davangere.police.casemonitoring.controller;

import com.davangere.police.casemonitoring.dto.CaseDTO;
import com.davangere.police.casemonitoring.dto.ApiResponse;
import com.davangere.police.casemonitoring.service.CaseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST Controller for Case Management
 * Davangere Police Department - Case Monitoring System
 */
@RestController
@RequestMapping("/api/cases")
@RequiredArgsConstructor
@CrossOrigin(origins = "*") // Configure appropriately for production
public class CaseController {

    private final CaseService caseService;

    /**
     * Get all cases with optional filtering
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<CaseDTO>>> getAllCases(
            @RequestParam(required = false) String policeStation,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Boolean urgent) {
        
        List<CaseDTO> cases;
        
        if (urgent != null && urgent) {
            cases = caseService.getUrgentCases();
        } else if (policeStation != null) {
            cases = caseService.getCasesByPoliceStation(policeStation);
        } else if (status != null) {
            cases = caseService.getCasesByStatus(status);
        } else {
            cases = caseService.getAllCases();
        }
        
        return ResponseEntity.ok(ApiResponse.success(cases, "Cases retrieved successfully"));
    }

    /**
     * Get a case by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CaseDTO>> getCaseById(@PathVariable UUID id) {
        CaseDTO caseDTO = caseService.getCaseById(id);
        return ResponseEntity.ok(ApiResponse.success(caseDTO, "Case retrieved successfully"));
    }

    /**
     * Get a case by Crime Number
     */
    @GetMapping("/crime-number/{crimeNumber}")
    public ResponseEntity<ApiResponse<CaseDTO>> getCaseByCrimeNumber(@PathVariable String crimeNumber) {
        CaseDTO caseDTO = caseService.getCaseByCrimeNumber(crimeNumber);
        return ResponseEntity.ok(ApiResponse.success(caseDTO, "Case retrieved successfully"));
    }

    /**
     * Create a new case
     */
    @PostMapping
    public ResponseEntity<ApiResponse<CaseDTO>> createCase(@Valid @RequestBody CaseDTO caseDTO) {
        CaseDTO createdCase = caseService.createCase(caseDTO);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(createdCase, "Case created successfully"));
    }

    /**
     * Update an existing case
     */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<CaseDTO>> updateCase(
            @PathVariable UUID id,
            @Valid @RequestBody CaseDTO caseDTO) {
        CaseDTO updatedCase = caseService.updateCase(id, caseDTO);
        return ResponseEntity.ok(ApiResponse.success(updatedCase, "Case updated successfully"));
    }

    /**
     * Delete a case
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteCase(@PathVariable UUID id) {
        caseService.deleteCase(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Case deleted successfully"));
    }

    /**
     * Search cases by keyword
     */
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<CaseDTO>>> searchCases(@RequestParam String query) {
        List<CaseDTO> cases = caseService.searchCases(query);
        return ResponseEntity.ok(ApiResponse.success(cases, "Search completed successfully"));
    }

    /**
     * Get cases with upcoming hearings (within specified days)
     */
    @GetMapping("/upcoming-hearings")
    public ResponseEntity<ApiResponse<List<CaseDTO>>> getUpcomingHearings(
            @RequestParam(defaultValue = "7") int days) {
        List<CaseDTO> cases = caseService.getCasesWithUpcomingHearings(days);
        return ResponseEntity.ok(ApiResponse.success(cases, "Upcoming hearings retrieved successfully"));
    }

    /**
     * Get statistics/dashboard data
     */
    @GetMapping("/statistics")
    public ResponseEntity<ApiResponse<CaseStatisticsDTO>> getStatistics() {
        CaseStatisticsDTO stats = caseService.getCaseStatistics();
        return ResponseEntity.ok(ApiResponse.success(stats, "Statistics retrieved successfully"));
    }
}

/**
 * API Response wrapper class
 */
class ApiResponse<T> {
    private boolean success;
    private String message;
    private T data;
    private long timestamp;

    public static <T> ApiResponse<T> success(T data, String message) {
        ApiResponse<T> response = new ApiResponse<>();
        response.success = true;
        response.message = message;
        response.data = data;
        response.timestamp = System.currentTimeMillis();
        return response;
    }

    public static <T> ApiResponse<T> error(String message) {
        ApiResponse<T> response = new ApiResponse<>();
        response.success = false;
        response.message = message;
        response.data = null;
        response.timestamp = System.currentTimeMillis();
        return response;
    }

    // Getters and setters
    public boolean isSuccess() { return success; }
    public String getMessage() { return message; }
    public T getData() { return data; }
    public long getTimestamp() { return timestamp; }
}

/**
 * DTO for Case Statistics
 */
class CaseStatisticsDTO {
    private long totalCases;
    private long pendingCases;
    private long convictedCases;
    private long acquittedCases;
    private long urgentCases;
    private long casesWithHigherCourtProceedings;

    // Getters and setters
    public long getTotalCases() { return totalCases; }
    public void setTotalCases(long totalCases) { this.totalCases = totalCases; }
    public long getPendingCases() { return pendingCases; }
    public void setPendingCases(long pendingCases) { this.pendingCases = pendingCases; }
    public long getConvictedCases() { return convictedCases; }
    public void setConvictedCases(long convictedCases) { this.convictedCases = convictedCases; }
    public long getAcquittedCases() { return acquittedCases; }
    public void setAcquittedCases(long acquittedCases) { this.acquittedCases = acquittedCases; }
    public long getUrgentCases() { return urgentCases; }
    public void setUrgentCases(long urgentCases) { this.urgentCases = urgentCases; }
    public long getCasesWithHigherCourtProceedings() { return casesWithHigherCourtProceedings; }
    public void setCasesWithHigherCourtProceedings(long cases) { this.casesWithHigherCourtProceedings = cases; }
}
