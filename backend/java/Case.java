package com.davangere.police.casemonitoring.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * JPA Entity for Case - Maps to the 'cases' table in PostgreSQL
 * Davangere Police Department - Case Monitoring System
 */
@Entity
@Table(name = "cases")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Case {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // ==================== Step 1: Basic Case Details ====================
    
    @Column(name = "sl_no", length = 50)
    private String slNo;

    @Column(name = "police_station", nullable = false)
    private String policeStation;

    @Column(name = "crime_number", nullable = false, unique = true, length = 100)
    private String crimeNumber;

    @Column(name = "sections_of_law", nullable = false, columnDefinition = "TEXT")
    private String sectionsOfLaw;

    @Column(name = "investigating_officer", nullable = false)
    private String investigatingOfficer;

    @Column(name = "public_prosecutor")
    private String publicProsecutor;

    // ==================== Step 2: Charge Sheet & Court Details ====================
    
    @Column(name = "date_of_charge_sheet")
    private LocalDate dateOfChargeSheet;

    @Column(name = "cc_no_sc_no", length = 100)
    private String ccNoScNo;

    @Column(name = "court_name")
    private String courtName;

    // ==================== Step 3: Accused Information ====================
    
    @Column(name = "total_accused")
    private Integer totalAccused = 0;

    @Column(name = "accused_names", columnDefinition = "TEXT")
    private String accusedNames;

    @Column(name = "accused_in_judicial_custody")
    private Integer accusedInJudicialCustody = 0;

    @Column(name = "accused_on_bail")
    private Integer accusedOnBail = 0;

    // ==================== Step 4: Witness Details ====================
    
    @Column(name = "total_witnesses")
    private Integer totalWitnesses = 0;

    @OneToOne(mappedBy = "caseEntity", cascade = CascadeType.ALL, orphanRemoval = true)
    private WitnessDetails witnessDetails;

    // ==================== Step 5: Trial & Hearing Tracking ====================
    
    @OneToMany(mappedBy = "caseEntity", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("hearingDate ASC")
    private List<Hearing> hearings;

    @Column(name = "next_hearing_date")
    private LocalDate nextHearingDate;

    @Column(name = "current_stage_of_trial")
    private String currentStageOfTrial;

    @Column(name = "date_of_framing_charges")
    private LocalDate dateOfFramingCharges;

    @Column(name = "date_of_judgment")
    private LocalDate dateOfJudgment;

    // ==================== Step 6: Judgment & Outcome ====================
    
    @Column(name = "judgment_result", length = 50)
    private String judgmentResult; // Convicted, Acquitted, Partly

    @Column(name = "reason_for_acquittal", columnDefinition = "TEXT")
    private String reasonForAcquittal;

    @Column(name = "total_accused_convicted")
    private Integer totalAccusedConvicted = 0;

    @OneToMany(mappedBy = "caseEntity", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<AccusedConviction> accusedConvictions;

    @Column(name = "fine_amount", length = 100)
    private String fineAmount;

    @Column(name = "victim_compensation", columnDefinition = "TEXT")
    private String victimCompensation;

    // ==================== Step 7: Higher Court Proceedings ====================
    
    @OneToOne(mappedBy = "caseEntity", cascade = CascadeType.ALL, orphanRemoval = true)
    private HigherCourtDetails higherCourtDetails;

    // ==================== Metadata ====================
    
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "updated_by")
    private String updatedBy;
}

/**
 * Entity for Witness Details
 */
@Entity
@Table(name = "witness_details")
@Data
@NoArgsConstructor
@AllArgsConstructor
class WitnessDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne
    @JoinColumn(name = "case_id", nullable = false)
    private Case caseEntity;

    @Column(name = "complainant_witness_supported")
    private Integer complainantWitnessSupported = 0;

    @Column(name = "complainant_witness_hostile")
    private Integer complainantWitnessHostile = 0;

    @Column(name = "mahazar_seizure_witness_supported")
    private Integer mahazarSeizureWitnessSupported = 0;

    @Column(name = "mahazar_seizure_witness_hostile")
    private Integer mahazarSeizureWitnessHostile = 0;

    @Column(name = "io_witness_supported")
    private Integer ioWitnessSupported = 0;

    @Column(name = "io_witness_hostile")
    private Integer ioWitnessHostile = 0;

    @Column(name = "eye_witness_supported")
    private Integer eyeWitnessSupported = 0;

    @Column(name = "eye_witness_hostile")
    private Integer eyeWitnessHostile = 0;

    @Column(name = "other_witness_supported")
    private Integer otherWitnessSupported = 0;

    @Column(name = "other_witness_hostile")
    private Integer otherWitnessHostile = 0;
}

/**
 * Entity for Hearing records
 */
@Entity
@Table(name = "hearings")
@Data
@NoArgsConstructor
@AllArgsConstructor
class Hearing {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "case_id", nullable = false)
    private Case caseEntity;

    @Column(name = "hearing_date", nullable = false)
    private LocalDate hearingDate;

    @Column(name = "stage_of_trial")
    private String stageOfTrial;

    @Column(name = "remarks", columnDefinition = "TEXT")
    private String remarks;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}

/**
 * Entity for Accused Convictions
 */
@Entity
@Table(name = "accused_convictions")
@Data
@NoArgsConstructor
@AllArgsConstructor
class AccusedConviction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "case_id", nullable = false)
    private Case caseEntity;

    @Column(name = "accused_name", nullable = false)
    private String accusedName;

    @Column(name = "sentence_awarded", columnDefinition = "TEXT")
    private String sentenceAwarded;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}

/**
 * Entity for Higher Court Details
 */
@Entity
@Table(name = "higher_court_details")
@Data
@NoArgsConstructor
@AllArgsConstructor
class HigherCourtDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne
    @JoinColumn(name = "case_id", nullable = false)
    private Case caseEntity;

    @Column(name = "proceedings_pending")
    private Boolean proceedingsPending = false;

    @Column(name = "proceeding_type", length = 10)
    private String proceedingType; // REV, REW, APP, CP, WP

    @Column(name = "higher_court_name")
    private String higherCourtName;

    @Column(name = "petitioner_party")
    private String petitionerParty;

    @Column(name = "petition_number", length = 100)
    private String petitionNumber;

    @Column(name = "date_of_filing")
    private LocalDate dateOfFiling;

    @Column(name = "petition_status", length = 50)
    private String petitionStatus; // Pending, Disposed

    @Column(name = "nature_of_disposal", columnDefinition = "TEXT")
    private String natureOfDisposal;

    @Column(name = "action_after_disposal", columnDefinition = "TEXT")
    private String actionAfterDisposal;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
