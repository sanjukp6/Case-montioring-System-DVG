package com.davangere.police.casemonitoring.service;

import com.davangere.police.casemonitoring.dto.CaseDTO;
import com.davangere.police.casemonitoring.dto.CaseStatisticsDTO;
import com.davangere.police.casemonitoring.entity.Case;
import com.davangere.police.casemonitoring.exception.ResourceNotFoundException;
import com.davangere.police.casemonitoring.mapper.CaseMapper;
import com.davangere.police.casemonitoring.repository.CaseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service layer for Case Management
 * Davangere Police Department - Case Monitoring System
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class CaseService {

    private final CaseRepository caseRepository;
    private final CaseMapper caseMapper;

    /**
     * Get all cases
     */
    @Transactional(readOnly = true)
    public List<CaseDTO> getAllCases() {
        log.info("Fetching all cases");
        return caseRepository.findAll().stream()
                .map(caseMapper::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get case by ID
     */
    @Transactional(readOnly = true)
    public CaseDTO getCaseById(UUID id) {
        log.info("Fetching case with ID: {}", id);
        Case caseEntity = caseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Case not found with ID: " + id));
        return caseMapper.toDTO(caseEntity);
    }

    /**
     * Get case by Crime Number
     */
    @Transactional(readOnly = true)
    public CaseDTO getCaseByCrimeNumber(String crimeNumber) {
        log.info("Fetching case with Crime Number: {}", crimeNumber);
        Case caseEntity = caseRepository.findByCrimeNumber(crimeNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Case not found with Crime Number: " + crimeNumber));
        return caseMapper.toDTO(caseEntity);
    }

    /**
     * Create a new case
     */
    public CaseDTO createCase(CaseDTO caseDTO) {
        log.info("Creating new case with Crime Number: {}", caseDTO.getCrimeNumber());
        
        // Check if crime number already exists
        if (caseRepository.existsByCrimeNumber(caseDTO.getCrimeNumber())) {
            throw new IllegalArgumentException("Case with Crime Number " + caseDTO.getCrimeNumber() + " already exists");
        }
        
        Case caseEntity = caseMapper.toEntity(caseDTO);
        Case savedCase = caseRepository.save(caseEntity);
        
        log.info("Case created successfully with ID: {}", savedCase.getId());
        return caseMapper.toDTO(savedCase);
    }

    /**
     * Update an existing case
     */
    public CaseDTO updateCase(UUID id, CaseDTO caseDTO) {
        log.info("Updating case with ID: {}", id);
        
        Case existingCase = caseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Case not found with ID: " + id));
        
        // Update fields
        caseMapper.updateEntity(existingCase, caseDTO);
        Case updatedCase = caseRepository.save(existingCase);
        
        log.info("Case updated successfully: {}", id);
        return caseMapper.toDTO(updatedCase);
    }

    /**
     * Delete a case
     */
    public void deleteCase(UUID id) {
        log.info("Deleting case with ID: {}", id);
        
        if (!caseRepository.existsById(id)) {
            throw new ResourceNotFoundException("Case not found with ID: " + id);
        }
        
        caseRepository.deleteById(id);
        log.info("Case deleted successfully: {}", id);
    }

    /**
     * Search cases by keyword
     */
    @Transactional(readOnly = true)
    public List<CaseDTO> searchCases(String query) {
        log.info("Searching cases with query: {}", query);
        return caseRepository.searchCases(query).stream()
                .map(caseMapper::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get cases by police station
     */
    @Transactional(readOnly = true)
    public List<CaseDTO> getCasesByPoliceStation(String policeStation) {
        log.info("Fetching cases for Police Station: {}", policeStation);
        return caseRepository.findByPoliceStationContainingIgnoreCase(policeStation).stream()
                .map(caseMapper::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get cases by judgment status
     */
    @Transactional(readOnly = true)
    public List<CaseDTO> getCasesByStatus(String status) {
        log.info("Fetching cases with status: {}", status);
        if ("pending".equalsIgnoreCase(status)) {
            return caseRepository.findByJudgmentResultIsNull().stream()
                    .map(caseMapper::toDTO)
                    .collect(Collectors.toList());
        }
        return caseRepository.findByJudgmentResult(status).stream()
                .map(caseMapper::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get cases with upcoming hearings
     */
    @Transactional(readOnly = true)
    public List<CaseDTO> getCasesWithUpcomingHearings(int days) {
        log.info("Fetching cases with hearings in next {} days", days);
        LocalDate today = LocalDate.now();
        LocalDate endDate = today.plusDays(days);
        return caseRepository.findByNextHearingDateBetween(today, endDate).stream()
                .map(caseMapper::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get urgent cases (hearings within 3 days)
     */
    @Transactional(readOnly = true)
    public List<CaseDTO> getUrgentCases() {
        log.info("Fetching urgent cases (hearings within 3 days)");
        return getCasesWithUpcomingHearings(3);
    }

    /**
     * Get case statistics for dashboard
     */
    @Transactional(readOnly = true)
    public CaseStatisticsDTO getCaseStatistics() {
        log.info("Calculating case statistics");
        
        CaseStatisticsDTO stats = new CaseStatisticsDTO();
        stats.setTotalCases(caseRepository.count());
        stats.setPendingCases(caseRepository.countByJudgmentResultIsNull());
        stats.setConvictedCases(caseRepository.countByJudgmentResultIn(List.of("Convicted", "Partly")));
        stats.setAcquittedCases(caseRepository.countByJudgmentResult("Acquitted"));
        
        LocalDate today = LocalDate.now();
        LocalDate urgentDate = today.plusDays(3);
        stats.setUrgentCases(caseRepository.countByNextHearingDateBetween(today, urgentDate));
        
        stats.setCasesWithHigherCourtProceedings(
                caseRepository.countByHigherCourtDetailsProceedingsPendingTrue());
        
        return stats;
    }
}

/**
 * Case Repository Interface
 */
interface CaseRepository extends org.springframework.data.jpa.repository.JpaRepository<Case, UUID> {
    
    java.util.Optional<Case> findByCrimeNumber(String crimeNumber);
    
    boolean existsByCrimeNumber(String crimeNumber);
    
    List<Case> findByPoliceStationContainingIgnoreCase(String policeStation);
    
    List<Case> findByJudgmentResult(String judgmentResult);
    
    List<Case> findByJudgmentResultIsNull();
    
    List<Case> findByNextHearingDateBetween(LocalDate start, LocalDate end);
    
    long countByJudgmentResultIsNull();
    
    long countByJudgmentResult(String judgmentResult);
    
    long countByJudgmentResultIn(List<String> results);
    
    long countByNextHearingDateBetween(LocalDate start, LocalDate end);
    
    long countByHigherCourtDetailsProceedingsPendingTrue();
    
    @org.springframework.data.jpa.repository.Query(
        "SELECT c FROM Case c WHERE " +
        "LOWER(c.crimeNumber) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
        "LOWER(c.policeStation) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
        "LOWER(c.accusedNames) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
        "LOWER(c.investigatingOfficer) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
        "LOWER(c.courtName) LIKE LOWER(CONCAT('%', :query, '%'))"
    )
    List<Case> searchCases(@org.springframework.data.repository.query.Param("query") String query);
}

/**
 * Case Mapper Interface (MapStruct)
 */
@org.mapstruct.Mapper(componentModel = "spring")
interface CaseMapper {
    CaseDTO toDTO(Case caseEntity);
    Case toEntity(CaseDTO caseDTO);
    void updateEntity(@org.mapstruct.MappingTarget Case caseEntity, CaseDTO caseDTO);
}

/**
 * Resource Not Found Exception
 */
class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }
}
