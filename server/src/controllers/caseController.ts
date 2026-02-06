import { Request, Response } from 'express';
import { pool } from '../config/database.js';
import { logAudit, getClientIp } from '../middleware/logger.js';
import { canAccessStation } from '../middleware/roleCheck.js';
import { DbCase, CaseData, WitnessDetails, HigherCourtDetails, Hearing, AccusedConviction } from '../types/index.js';

// Default witness details
const defaultWitnessDetails: WitnessDetails = {
    complainantWitness: { supported: 0, hostile: 0 },
    mahazarSeizureWitness: { supported: 0, hostile: 0 },
    ioWitness: { supported: 0, hostile: 0 },
    eyeWitness: { supported: 0, hostile: 0 },
    otherWitness: { supported: 0, hostile: 0 },
};

// Default higher court details
const defaultHigherCourtDetails: HigherCourtDetails = {
    proceedingsPending: false,
    proceedingType: '',
    courtName: '',
    petitionerParty: '',
    petitionNumber: '',
    dateOfFiling: '',
    petitionStatus: '',
    natureOfDisposal: '',
    actionAfterDisposal: '',
};

// Convert database row to CaseData
function dbToCaseData(row: DbCase): CaseData {
    return {
        id: row.id,
        slNo: row.sl_no || '',
        policeStation: row.police_station || '',
        crimeNumber: row.crime_number || '',
        sectionsOfLaw: row.sections_of_law || '',
        investigatingOfficer: row.investigating_officer || '',
        publicProsecutor: row.public_prosecutor || '',
        dateOfChargeSheet: row.date_of_charge_sheet || '',
        ccNoScNo: row.cc_no_sc_no || '',
        courtName: row.court_name || '',
        totalAccused: row.total_accused || 0,
        accusedNames: row.accused_names || '',
        accusedInJudicialCustody: row.accused_in_judicial_custody || 0,
        accusedOnBail: row.accused_on_bail || 0,
        totalWitnesses: row.total_witnesses || 0,
        witnessDetails: row.witness_details || defaultWitnessDetails,
        hearings: (row.hearings as Hearing[]) || [],
        nextHearingDate: row.next_hearing_date || '',
        currentStageOfTrial: row.current_stage_of_trial || '',
        dateOfFramingCharges: row.date_of_framing_charges || '',
        dateOfJudgment: row.date_of_judgment || '',
        judgmentResult: row.judgment_result || '',
        reasonForAcquittal: row.reason_for_acquittal || '',
        totalAccusedConvicted: row.total_accused_convicted || 0,
        accusedConvictions: (row.accused_convictions as AccusedConviction[]) || [],
        fineAmount: row.fine_amount || '',
        victimCompensation: row.victim_compensation || '',
        higherCourtDetails: row.higher_court_details || defaultHigherCourtDetails,
        status: row.status,
        createdBy: row.created_by || undefined,
        approvedBy: row.approved_by || undefined,
        createdAt: row.created_at || '',
        updatedAt: row.updated_at || '',
    };
}

// Convert CaseData to database format
function caseDataToDb(caseData: Partial<CaseData>) {
    return {
        sl_no: caseData.slNo,
        police_station: caseData.policeStation,
        crime_number: caseData.crimeNumber,
        sections_of_law: caseData.sectionsOfLaw,
        investigating_officer: caseData.investigatingOfficer,
        public_prosecutor: caseData.publicProsecutor,
        date_of_charge_sheet: caseData.dateOfChargeSheet || null,
        cc_no_sc_no: caseData.ccNoScNo,
        court_name: caseData.courtName,
        total_accused: caseData.totalAccused,
        accused_names: caseData.accusedNames,
        accused_in_judicial_custody: caseData.accusedInJudicialCustody,
        accused_on_bail: caseData.accusedOnBail,
        total_witnesses: caseData.totalWitnesses,
        witness_details: JSON.stringify(caseData.witnessDetails),
        hearings: JSON.stringify(caseData.hearings),
        next_hearing_date: caseData.nextHearingDate || null,
        current_stage_of_trial: caseData.currentStageOfTrial,
        date_of_framing_charges: caseData.dateOfFramingCharges || null,
        date_of_judgment: caseData.dateOfJudgment || null,
        judgment_result: caseData.judgmentResult,
        reason_for_acquittal: caseData.reasonForAcquittal,
        total_accused_convicted: caseData.totalAccusedConvicted,
        accused_convictions: JSON.stringify(caseData.accusedConvictions),
        fine_amount: caseData.fineAmount,
        victim_compensation: caseData.victimCompensation,
        higher_court_details: JSON.stringify(caseData.higherCourtDetails),
        status: caseData.status || 'draft',
    };
}

/**
 * GET /api/cases
 * Get all cases (filtered by police station for non-SP users)
 */
export async function getAllCases(req: Request, res: Response): Promise<void> {
    try {
        let query = 'SELECT * FROM cases';
        const params: string[] = [];

        // Filter by police station for non-SP users
        if (req.user?.role !== 'SP') {
            query += ' WHERE police_station = $1';
            params.push(req.user?.policeStation || '');
        }

        query += ' ORDER BY created_at DESC';

        const result = await pool.query<DbCase>(query, params);
        const cases = result.rows.map(dbToCaseData);

        res.json({ success: true, data: cases });
    } catch (error) {
        console.error('Get all cases error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
}

/**
 * GET /api/cases/:id
 * Get case by ID
 */
export async function getCaseById(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;

        const result = await pool.query<DbCase>(
            'SELECT * FROM cases WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ success: false, error: 'Case not found' });
            return;
        }

        const caseData = dbToCaseData(result.rows[0]);

        // Check access permission
        if (!canAccessStation(req, caseData.policeStation)) {
            res.status(403).json({ success: false, error: 'Access denied to this case' });
            return;
        }

        res.json({ success: true, data: caseData });
    } catch (error) {
        console.error('Get case by ID error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
}

/**
 * POST /api/cases
 * Create new case
 */
export async function createCase(req: Request, res: Response): Promise<void> {
    try {
        const caseData = req.body as CaseData;

        // Validate required fields
        if (!caseData.policeStation || !caseData.crimeNumber) {
            res.status(400).json({ success: false, error: 'Police station and crime number are required' });
            return;
        }

        // Check access permission
        if (!canAccessStation(req, caseData.policeStation)) {
            res.status(403).json({ success: false, error: 'Cannot create case for another police station' });
            return;
        }

        const dbData = caseDataToDb(caseData);

        const result = await pool.query<DbCase>(
            `INSERT INTO cases (
        sl_no, police_station, crime_number, sections_of_law, investigating_officer,
        public_prosecutor, date_of_charge_sheet, cc_no_sc_no, court_name, total_accused,
        accused_names, accused_in_judicial_custody, accused_on_bail, total_witnesses,
        witness_details, hearings, next_hearing_date, current_stage_of_trial,
        date_of_framing_charges, date_of_judgment, judgment_result, reason_for_acquittal,
        total_accused_convicted, accused_convictions, fine_amount, victim_compensation,
        higher_court_details, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)
      RETURNING *`,
            [
                dbData.sl_no, dbData.police_station, dbData.crime_number, dbData.sections_of_law,
                dbData.investigating_officer, dbData.public_prosecutor, dbData.date_of_charge_sheet,
                dbData.cc_no_sc_no, dbData.court_name, dbData.total_accused, dbData.accused_names,
                dbData.accused_in_judicial_custody, dbData.accused_on_bail, dbData.total_witnesses,
                dbData.witness_details, dbData.hearings, dbData.next_hearing_date, dbData.current_stage_of_trial,
                dbData.date_of_framing_charges, dbData.date_of_judgment, dbData.judgment_result,
                dbData.reason_for_acquittal, dbData.total_accused_convicted, dbData.accused_convictions,
                dbData.fine_amount, dbData.victim_compensation, dbData.higher_court_details, dbData.status,
                req.user?.userId
            ]
        );

        await logAudit(
            req.user?.userId,
            'CASE_CREATED',
            'case',
            result.rows[0].id,
            `Crime Number: ${caseData.crimeNumber}`,
            getClientIp(req)
        );

        res.status(201).json({ success: true, data: dbToCaseData(result.rows[0]) });
    } catch (error) {
        console.error('Create case error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
}

/**
 * PUT /api/cases/:id
 * Update case
 */
export async function updateCase(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        const caseData = req.body as Partial<CaseData>;

        // Get existing case
        const existingResult = await pool.query<DbCase>(
            'SELECT * FROM cases WHERE id = $1',
            [id]
        );

        if (existingResult.rows.length === 0) {
            res.status(404).json({ success: false, error: 'Case not found' });
            return;
        }

        const existingCase = dbToCaseData(existingResult.rows[0]);

        // Check access permission
        if (!canAccessStation(req, existingCase.policeStation)) {
            res.status(403).json({ success: false, error: 'Access denied to this case' });
            return;
        }

        const dbData = caseDataToDb(caseData);

        const result = await pool.query<DbCase>(
            `UPDATE cases SET
        sl_no = COALESCE($1, sl_no),
        police_station = COALESCE($2, police_station),
        crime_number = COALESCE($3, crime_number),
        sections_of_law = COALESCE($4, sections_of_law),
        investigating_officer = COALESCE($5, investigating_officer),
        public_prosecutor = COALESCE($6, public_prosecutor),
        date_of_charge_sheet = COALESCE($7, date_of_charge_sheet),
        cc_no_sc_no = COALESCE($8, cc_no_sc_no),
        court_name = COALESCE($9, court_name),
        total_accused = COALESCE($10, total_accused),
        accused_names = COALESCE($11, accused_names),
        accused_in_judicial_custody = COALESCE($12, accused_in_judicial_custody),
        accused_on_bail = COALESCE($13, accused_on_bail),
        total_witnesses = COALESCE($14, total_witnesses),
        witness_details = COALESCE($15, witness_details),
        hearings = COALESCE($16, hearings),
        next_hearing_date = COALESCE($17, next_hearing_date),
        current_stage_of_trial = COALESCE($18, current_stage_of_trial),
        date_of_framing_charges = COALESCE($19, date_of_framing_charges),
        date_of_judgment = COALESCE($20, date_of_judgment),
        judgment_result = COALESCE($21, judgment_result),
        reason_for_acquittal = COALESCE($22, reason_for_acquittal),
        total_accused_convicted = COALESCE($23, total_accused_convicted),
        accused_convictions = COALESCE($24, accused_convictions),
        fine_amount = COALESCE($25, fine_amount),
        victim_compensation = COALESCE($26, victim_compensation),
        higher_court_details = COALESCE($27, higher_court_details),
        status = COALESCE($28, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $29
      RETURNING *`,
            [
                dbData.sl_no, dbData.police_station, dbData.crime_number, dbData.sections_of_law,
                dbData.investigating_officer, dbData.public_prosecutor, dbData.date_of_charge_sheet,
                dbData.cc_no_sc_no, dbData.court_name, dbData.total_accused, dbData.accused_names,
                dbData.accused_in_judicial_custody, dbData.accused_on_bail, dbData.total_witnesses,
                dbData.witness_details, dbData.hearings, dbData.next_hearing_date, dbData.current_stage_of_trial,
                dbData.date_of_framing_charges, dbData.date_of_judgment, dbData.judgment_result,
                dbData.reason_for_acquittal, dbData.total_accused_convicted, dbData.accused_convictions,
                dbData.fine_amount, dbData.victim_compensation, dbData.higher_court_details, dbData.status, id
            ]
        );

        await logAudit(
            req.user?.userId,
            'CASE_UPDATED',
            'case',
            id,
            `Crime Number: ${result.rows[0].crime_number}`,
            getClientIp(req)
        );

        res.json({ success: true, data: dbToCaseData(result.rows[0]) });
    } catch (error) {
        console.error('Update case error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
}

/**
 * DELETE /api/cases/:id
 * Delete case (SHO and SP only)
 */
export async function deleteCase(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;

        // Get existing case
        const existingResult = await pool.query<DbCase>(
            'SELECT * FROM cases WHERE id = $1',
            [id]
        );

        if (existingResult.rows.length === 0) {
            res.status(404).json({ success: false, error: 'Case not found' });
            return;
        }

        const existingCase = dbToCaseData(existingResult.rows[0]);

        // Check access permission
        if (!canAccessStation(req, existingCase.policeStation)) {
            res.status(403).json({ success: false, error: 'Access denied to this case' });
            return;
        }

        await pool.query('DELETE FROM cases WHERE id = $1', [id]);

        await logAudit(
            req.user?.userId,
            'CASE_DELETED',
            'case',
            id,
            `Crime Number: ${existingCase.crimeNumber}`,
            getClientIp(req)
        );

        res.json({ success: true, message: 'Case deleted successfully' });
    } catch (error) {
        console.error('Delete case error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
}

/**
 * GET /api/cases/search
 * Search cases by crime number or accused names
 */
export async function searchCases(req: Request, res: Response): Promise<void> {
    try {
        const { q } = req.query;

        if (!q || typeof q !== 'string') {
            res.status(400).json({ success: false, error: 'Search query is required' });
            return;
        }

        let query = `
      SELECT * FROM cases 
      WHERE (
        crime_number ILIKE $1 OR
        accused_names ILIKE $1 OR
        sections_of_law ILIKE $1 OR
        investigating_officer ILIKE $1
      )
    `;
        const params: string[] = [`%${q}%`];

        // Filter by police station for non-SP users
        if (req.user?.role !== 'SP') {
            query += ' AND police_station = $2';
            params.push(req.user?.policeStation || '');
        }

        query += ' ORDER BY created_at DESC LIMIT 50';

        const result = await pool.query<DbCase>(query, params);
        const cases = result.rows.map(dbToCaseData);

        res.json({ success: true, data: cases });
    } catch (error) {
        console.error('Search cases error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
}

/**
 * POST /api/cases/bulk-upload
 * Bulk upsert cases from Excel upload
 * Matches by crime_number + police_station for updates
 */
export async function bulkUpsertCases(req: Request, res: Response): Promise<void> {
    try {
        const cases = req.body.cases as CaseData[];

        if (!Array.isArray(cases) || cases.length === 0) {
            res.status(400).json({ success: false, error: 'No cases provided' });
            return;
        }

        let inserted = 0;
        let updated = 0;
        const errors: { row: number; error: string }[] = [];

        for (let i = 0; i < cases.length; i++) {
            const caseData = cases[i];

            // Validate required fields
            if (!caseData.policeStation || !caseData.crimeNumber) {
                errors.push({ row: i + 1, error: 'Police station and crime number are required' });
                continue;
            }

            // Check access permission
            if (!canAccessStation(req, caseData.policeStation)) {
                errors.push({ row: i + 1, error: `Cannot access police station: ${caseData.policeStation}` });
                continue;
            }

            try {
                // Check if case exists by crime_number + police_station
                const existingResult = await pool.query<DbCase>(
                    'SELECT id FROM cases WHERE crime_number = $1 AND police_station = $2',
                    [caseData.crimeNumber, caseData.policeStation]
                );

                const dbData = caseDataToDb(caseData);

                if (existingResult.rows.length > 0) {
                    // Update existing case
                    const existingId = existingResult.rows[0].id;
                    await pool.query(
                        `UPDATE cases SET
                            sl_no = COALESCE($1, sl_no),
                            sections_of_law = COALESCE($2, sections_of_law),
                            investigating_officer = COALESCE($3, investigating_officer),
                            public_prosecutor = COALESCE($4, public_prosecutor),
                            date_of_charge_sheet = COALESCE($5, date_of_charge_sheet),
                            cc_no_sc_no = COALESCE($6, cc_no_sc_no),
                            court_name = COALESCE($7, court_name),
                            total_accused = COALESCE($8, total_accused),
                            accused_names = COALESCE($9, accused_names),
                            accused_in_judicial_custody = COALESCE($10, accused_in_judicial_custody),
                            accused_on_bail = COALESCE($11, accused_on_bail),
                            total_witnesses = COALESCE($12, total_witnesses),
                            witness_details = COALESCE($13, witness_details),
                            hearings = COALESCE($14, hearings),
                            next_hearing_date = COALESCE($15, next_hearing_date),
                            current_stage_of_trial = COALESCE($16, current_stage_of_trial),
                            date_of_framing_charges = COALESCE($17, date_of_framing_charges),
                            date_of_judgment = COALESCE($18, date_of_judgment),
                            judgment_result = COALESCE($19, judgment_result),
                            reason_for_acquittal = COALESCE($20, reason_for_acquittal),
                            total_accused_convicted = COALESCE($21, total_accused_convicted),
                            accused_convictions = COALESCE($22, accused_convictions),
                            fine_amount = COALESCE($23, fine_amount),
                            victim_compensation = COALESCE($24, victim_compensation),
                            higher_court_details = COALESCE($25, higher_court_details),
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = $26`,
                        [
                            dbData.sl_no, dbData.sections_of_law, dbData.investigating_officer,
                            dbData.public_prosecutor, dbData.date_of_charge_sheet, dbData.cc_no_sc_no,
                            dbData.court_name, dbData.total_accused, dbData.accused_names,
                            dbData.accused_in_judicial_custody, dbData.accused_on_bail, dbData.total_witnesses,
                            dbData.witness_details, dbData.hearings, dbData.next_hearing_date,
                            dbData.current_stage_of_trial, dbData.date_of_framing_charges, dbData.date_of_judgment,
                            dbData.judgment_result, dbData.reason_for_acquittal, dbData.total_accused_convicted,
                            dbData.accused_convictions, dbData.fine_amount, dbData.victim_compensation,
                            dbData.higher_court_details, existingId
                        ]
                    );
                    updated++;

                    await logAudit(
                        req.user?.userId,
                        'CASE_BULK_UPDATED',
                        'case',
                        existingId,
                        `Crime Number: ${caseData.crimeNumber}`,
                        getClientIp(req)
                    );
                } else {
                    // Insert new case
                    const result = await pool.query<DbCase>(
                        `INSERT INTO cases (
                            sl_no, police_station, crime_number, sections_of_law, investigating_officer,
                            public_prosecutor, date_of_charge_sheet, cc_no_sc_no, court_name, total_accused,
                            accused_names, accused_in_judicial_custody, accused_on_bail, total_witnesses,
                            witness_details, hearings, next_hearing_date, current_stage_of_trial,
                            date_of_framing_charges, date_of_judgment, judgment_result, reason_for_acquittal,
                            total_accused_convicted, accused_convictions, fine_amount, victim_compensation,
                            higher_court_details, status, created_by
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)
                        RETURNING id`,
                        [
                            dbData.sl_no, dbData.police_station, dbData.crime_number, dbData.sections_of_law,
                            dbData.investigating_officer, dbData.public_prosecutor, dbData.date_of_charge_sheet,
                            dbData.cc_no_sc_no, dbData.court_name, dbData.total_accused, dbData.accused_names,
                            dbData.accused_in_judicial_custody, dbData.accused_on_bail, dbData.total_witnesses,
                            dbData.witness_details, dbData.hearings, dbData.next_hearing_date, dbData.current_stage_of_trial,
                            dbData.date_of_framing_charges, dbData.date_of_judgment, dbData.judgment_result,
                            dbData.reason_for_acquittal, dbData.total_accused_convicted, dbData.accused_convictions,
                            dbData.fine_amount, dbData.victim_compensation, dbData.higher_court_details,
                            dbData.status || 'draft', req.user?.userId
                        ]
                    );
                    inserted++;

                    await logAudit(
                        req.user?.userId,
                        'CASE_BULK_CREATED',
                        'case',
                        result.rows[0].id,
                        `Crime Number: ${caseData.crimeNumber}`,
                        getClientIp(req)
                    );
                }
            } catch (err) {
                console.error(`Error processing row ${i + 1}:`, err);
                errors.push({ row: i + 1, error: 'Database error' });
            }
        }

        res.json({
            success: true,
            data: {
                inserted,
                updated,
                errors,
                total: cases.length
            }
        });
    } catch (error) {
        console.error('Bulk upsert error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
}
