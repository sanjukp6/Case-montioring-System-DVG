import { Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';
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

// Parse JSON field from MySQL (may be string or object)
function parseJsonField<T>(field: unknown, defaultValue: T): T {
    if (!field) return defaultValue;
    if (typeof field === 'string') {
        try {
            return JSON.parse(field) as T;
        } catch {
            return defaultValue;
        }
    }
    return field as T;
}

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
        witnessDetails: parseJsonField(row.witness_details, defaultWitnessDetails),
        hearings: parseJsonField<Hearing[]>(row.hearings, []),
        nextHearingDate: row.next_hearing_date || '',
        currentStageOfTrial: row.current_stage_of_trial || '',
        dateOfFramingCharges: row.date_of_framing_charges || '',
        dateOfJudgment: row.date_of_judgment || '',
        judgmentResult: row.judgment_result || '',
        reasonForAcquittal: row.reason_for_acquittal || '',
        totalAccusedConvicted: row.total_accused_convicted || 0,
        accusedConvictions: parseJsonField<AccusedConviction[]>(row.accused_convictions, []),
        fineAmount: row.fine_amount || '',
        victimCompensation: row.victim_compensation || '',
        higherCourtDetails: parseJsonField(row.higher_court_details, defaultHigherCourtDetails),
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
            query += ' WHERE police_station = ?';
            params.push(req.user?.policeStation || '');
        }

        query += ' ORDER BY created_at DESC';

        const [rows] = await pool.query<(DbCase & RowDataPacket)[]>(query, params);
        const cases = rows.map(dbToCaseData);

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

        const [rows] = await pool.query<(DbCase & RowDataPacket)[]>(
            'SELECT * FROM cases WHERE id = ?',
            [id]
        );

        if (rows.length === 0) {
            res.status(404).json({ success: false, error: 'Case not found' });
            return;
        }

        const caseData = dbToCaseData(rows[0]);

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
        const caseId = uuidv4();

        await pool.query(
            `INSERT INTO cases (
        id, sl_no, police_station, crime_number, sections_of_law, investigating_officer,
        public_prosecutor, date_of_charge_sheet, cc_no_sc_no, court_name, total_accused,
        accused_names, accused_in_judicial_custody, accused_on_bail, total_witnesses,
        witness_details, hearings, next_hearing_date, current_stage_of_trial,
        date_of_framing_charges, date_of_judgment, judgment_result, reason_for_acquittal,
        total_accused_convicted, accused_convictions, fine_amount, victim_compensation,
        higher_court_details, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                caseId,
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

        // Fetch created case
        const [rows] = await pool.query<(DbCase & RowDataPacket)[]>(
            'SELECT * FROM cases WHERE id = ?',
            [caseId]
        );

        await logAudit(
            req.user?.userId,
            'CASE_CREATED',
            'case',
            caseId,
            `Crime Number: ${caseData.crimeNumber}`,
            getClientIp(req)
        );

        res.status(201).json({ success: true, data: dbToCaseData(rows[0]) });
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
        const [existingRows] = await pool.query<(DbCase & RowDataPacket)[]>(
            'SELECT * FROM cases WHERE id = ?',
            [id]
        );

        if (existingRows.length === 0) {
            res.status(404).json({ success: false, error: 'Case not found' });
            return;
        }

        const existingCase = dbToCaseData(existingRows[0]);

        // Check access permission
        if (!canAccessStation(req, existingCase.policeStation)) {
            res.status(403).json({ success: false, error: 'Access denied to this case' });
            return;
        }

        const dbData = caseDataToDb(caseData);

        await pool.query(
            `UPDATE cases SET
        sl_no = COALESCE(?, sl_no),
        police_station = COALESCE(?, police_station),
        crime_number = COALESCE(?, crime_number),
        sections_of_law = COALESCE(?, sections_of_law),
        investigating_officer = COALESCE(?, investigating_officer),
        public_prosecutor = COALESCE(?, public_prosecutor),
        date_of_charge_sheet = COALESCE(?, date_of_charge_sheet),
        cc_no_sc_no = COALESCE(?, cc_no_sc_no),
        court_name = COALESCE(?, court_name),
        total_accused = COALESCE(?, total_accused),
        accused_names = COALESCE(?, accused_names),
        accused_in_judicial_custody = COALESCE(?, accused_in_judicial_custody),
        accused_on_bail = COALESCE(?, accused_on_bail),
        total_witnesses = COALESCE(?, total_witnesses),
        witness_details = COALESCE(?, witness_details),
        hearings = COALESCE(?, hearings),
        next_hearing_date = COALESCE(?, next_hearing_date),
        current_stage_of_trial = COALESCE(?, current_stage_of_trial),
        date_of_framing_charges = COALESCE(?, date_of_framing_charges),
        date_of_judgment = COALESCE(?, date_of_judgment),
        judgment_result = COALESCE(?, judgment_result),
        reason_for_acquittal = COALESCE(?, reason_for_acquittal),
        total_accused_convicted = COALESCE(?, total_accused_convicted),
        accused_convictions = COALESCE(?, accused_convictions),
        fine_amount = COALESCE(?, fine_amount),
        victim_compensation = COALESCE(?, victim_compensation),
        higher_court_details = COALESCE(?, higher_court_details),
        status = COALESCE(?, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
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

        // Fetch updated case
        const [rows] = await pool.query<(DbCase & RowDataPacket)[]>(
            'SELECT * FROM cases WHERE id = ?',
            [id]
        );

        await logAudit(
            req.user?.userId,
            'CASE_UPDATED',
            'case',
            id as string,
            `Crime Number: ${rows[0].crime_number}`,
            getClientIp(req)
        );

        res.json({ success: true, data: dbToCaseData(rows[0]) });
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
        const [existingRows] = await pool.query<(DbCase & RowDataPacket)[]>(
            'SELECT * FROM cases WHERE id = ?',
            [id]
        );

        if (existingRows.length === 0) {
            res.status(404).json({ success: false, error: 'Case not found' });
            return;
        }

        const existingCase = dbToCaseData(existingRows[0]);

        // Check access permission
        if (!canAccessStation(req, existingCase.policeStation)) {
            res.status(403).json({ success: false, error: 'Access denied to this case' });
            return;
        }

        await pool.query('DELETE FROM cases WHERE id = ?', [id]);

        await logAudit(
            req.user?.userId,
            'CASE_DELETED',
            'case',
            id as string,
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
        crime_number LIKE ? OR
        accused_names LIKE ? OR
        sections_of_law LIKE ? OR
        investigating_officer LIKE ?
      )
    `;
        const searchPattern = `%${q}%`;
        const params: string[] = [searchPattern, searchPattern, searchPattern, searchPattern];

        // Filter by police station for non-SP users
        if (req.user?.role !== 'SP') {
            query += ' AND police_station = ?';
            params.push(req.user?.policeStation || '');
        }

        query += ' ORDER BY created_at DESC LIMIT 50';

        const [rows] = await pool.query<(DbCase & RowDataPacket)[]>(query, params);
        const cases = rows.map(dbToCaseData);

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
            console.log(`User role: ${req.user?.role}, checking access to: ${caseData.policeStation}, can access: ${canAccessStation(req, caseData.policeStation)}`);
            if (!canAccessStation(req, caseData.policeStation)) {
                errors.push({ row: i + 1, error: `Cannot access police station: ${caseData.policeStation}` });
                continue;
            }

            try {
                // Check if case exists by crime_number + police_station
                const [existingRows] = await pool.query<(DbCase & RowDataPacket)[]>(
                    'SELECT id FROM cases WHERE crime_number = ? AND police_station = ?',
                    [caseData.crimeNumber, caseData.policeStation]
                );

                const dbData = caseDataToDb(caseData);

                if (existingRows.length > 0) {
                    // Update existing case
                    const existingId = existingRows[0].id;
                    await pool.query(
                        `UPDATE cases SET
                            sl_no = COALESCE(?, sl_no),
                            sections_of_law = COALESCE(?, sections_of_law),
                            investigating_officer = COALESCE(?, investigating_officer),
                            public_prosecutor = COALESCE(?, public_prosecutor),
                            date_of_charge_sheet = COALESCE(?, date_of_charge_sheet),
                            cc_no_sc_no = COALESCE(?, cc_no_sc_no),
                            court_name = COALESCE(?, court_name),
                            total_accused = COALESCE(?, total_accused),
                            accused_names = COALESCE(?, accused_names),
                            accused_in_judicial_custody = COALESCE(?, accused_in_judicial_custody),
                            accused_on_bail = COALESCE(?, accused_on_bail),
                            total_witnesses = COALESCE(?, total_witnesses),
                            witness_details = COALESCE(?, witness_details),
                            hearings = COALESCE(?, hearings),
                            next_hearing_date = COALESCE(?, next_hearing_date),
                            current_stage_of_trial = COALESCE(?, current_stage_of_trial),
                            date_of_framing_charges = COALESCE(?, date_of_framing_charges),
                            date_of_judgment = COALESCE(?, date_of_judgment),
                            judgment_result = COALESCE(?, judgment_result),
                            reason_for_acquittal = COALESCE(?, reason_for_acquittal),
                            total_accused_convicted = COALESCE(?, total_accused_convicted),
                            accused_convictions = COALESCE(?, accused_convictions),
                            fine_amount = COALESCE(?, fine_amount),
                            victim_compensation = COALESCE(?, victim_compensation),
                            higher_court_details = COALESCE(?, higher_court_details),
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?`,
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
                    const newCaseId = uuidv4();
                    await pool.query(
                        `INSERT INTO cases (
                            id, sl_no, police_station, crime_number, sections_of_law, investigating_officer,
                            public_prosecutor, date_of_charge_sheet, cc_no_sc_no, court_name, total_accused,
                            accused_names, accused_in_judicial_custody, accused_on_bail, total_witnesses,
                            witness_details, hearings, next_hearing_date, current_stage_of_trial,
                            date_of_framing_charges, date_of_judgment, judgment_result, reason_for_acquittal,
                            total_accused_convicted, accused_convictions, fine_amount, victim_compensation,
                            higher_court_details, status, created_by
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            newCaseId,
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
                        newCaseId,
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
