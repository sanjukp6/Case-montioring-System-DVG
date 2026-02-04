import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCases } from '../context/CaseContext';
import { generateExcelReport } from '../utils/excelGenerator';
import {
  ArrowLeft,
  Edit,
  FileDown,
  Calendar,
  User,
  MapPin,
  Scale,
  Users,
  Gavel,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';

export const CaseDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { getCaseById } = useCases();

  const caseData = id ? getCaseById(id) : undefined;

  if (!caseData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <XCircle size={64} className="mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold text-gray-800">Case Not Found</h2>
          <button
            onClick={() => navigate('/')}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const getDaysUntilHearing = (): number => {
    if (!caseData.nextHearingDate) return Infinity;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const hearingDate = new Date(caseData.nextHearingDate);
    return Math.ceil((hearingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const daysUntil = getDaysUntilHearing();
  const isUrgent = daysUntil >= 0 && daysUntil <= 3;

  const InfoCard: React.FC<{
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
  }> = ({ title, icon, children }) => (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center space-x-2 border-b border-gray-100 pb-3">
        <span className="text-blue-600">{icon}</span>
        <h3 className="font-semibold text-gray-800">{title}</h3>
      </div>
      {children}
    </div>
  );

  const InfoRow: React.FC<{ label: string; value: string | number | undefined }> = ({
    label,
    value,
  }) => (
    <div className="mb-2 flex flex-wrap justify-between border-b border-gray-50 py-1">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-800">{value || '-'}</span>
    </div>
  );

  const calculateTotalWitnesses = () => {
    const w = caseData.witnessDetails;
    return (
      w.complainantWitness.supported +
      w.complainantWitness.hostile +
      w.mahazarSeizureWitness.supported +
      w.mahazarSeizureWitness.hostile +
      w.ioWitness.supported +
      w.ioWitness.hostile +
      w.eyeWitness.supported +
      w.eyeWitness.hostile +
      w.otherWitness.supported +
      w.otherWitness.hostile
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-800 to-blue-900 text-white shadow-lg">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/')}
                className="rounded-lg bg-white/10 p-2 transition hover:bg-white/20"
              >
                <ArrowLeft size={24} />
              </button>
              <div>
                <h1 className="text-2xl font-bold">Case: {caseData.crimeNumber}</h1>
                <p className="text-blue-200">{caseData.policeStation}</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => generateExcelReport(caseData)}
                className="flex items-center space-x-2 rounded-lg bg-white/10 px-4 py-2 font-medium transition hover:bg-white/20"
              >
                <FileDown size={18} /> <span>Download Excel</span>
              </button>
              <button
                onClick={() => navigate(`/case/edit/${caseData.id}`)}
                className="flex items-center space-x-2 rounded-lg bg-white px-4 py-2 font-semibold text-blue-800 transition hover:bg-blue-50"
              >
                <Edit size={18} /> <span>Edit Case</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Urgent Alert */}
        {isUrgent && (
          <div className="mb-6 rounded-lg border-l-4 border-red-500 bg-red-50 p-4 shadow-md">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="text-red-500" size={24} />
              <div>
                <h3 className="font-bold text-red-800">Urgent Hearing Alert!</h3>
                <p className="text-red-700">
                  Next hearing is on{' '}
                  <strong>
                    {new Date(caseData.nextHearingDate).toLocaleDateString('en-IN', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </strong>{' '}
                  ({daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `in ${daysUntil} days`})
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Basic Case Details */}
          <InfoCard title="Basic Case Details" icon={<MapPin size={20} />}>
            <InfoRow label="Sl No" value={caseData.slNo} />
            <InfoRow label="Police Station" value={caseData.policeStation} />
            <InfoRow label="Crime Number" value={caseData.crimeNumber} />
            <InfoRow label="Sections of Law" value={caseData.sectionsOfLaw} />
            <InfoRow label="Investigating Officer" value={caseData.investigatingOfficer} />
            <InfoRow label="Public Prosecutor / APP" value={caseData.publicProsecutor} />
          </InfoCard>

          {/* Charge Sheet & Court */}
          <InfoCard title="Charge Sheet & Court" icon={<Scale size={20} />}>
            <InfoRow
              label="Date of Charge Sheet"
              value={
                caseData.dateOfChargeSheet
                  ? new Date(caseData.dateOfChargeSheet).toLocaleDateString('en-IN')
                  : '-'
              }
            />
            <InfoRow label="CC No / SC No" value={caseData.ccNoScNo} />
            <InfoRow label="Court Name" value={caseData.courtName} />
          </InfoCard>

          {/* Accused Information */}
          <InfoCard title="Accused Information" icon={<Users size={20} />}>
            <InfoRow label="Total Accused" value={caseData.totalAccused} />
            <InfoRow label="In Judicial Custody" value={caseData.accusedInJudicialCustody} />
            <InfoRow label="On Bail" value={caseData.accusedOnBail} />
            <div className="mt-3">
              <p className="mb-1 text-sm text-gray-500">Accused Names:</p>
              <p className="rounded-lg bg-gray-50 p-2 text-sm text-gray-800">
                {caseData.accusedNames || '-'}
              </p>
            </div>
          </InfoCard>

          {/* Witness Details */}
          <InfoCard title="Witness Details" icon={<User size={20} />}>
            <InfoRow label="Total Witnesses" value={caseData.totalWitnesses || calculateTotalWitnesses()} />
            <div className="mt-3 rounded-lg bg-gray-50 p-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-1 text-left text-gray-600">Type</th>
                    <th className="py-1 text-center text-green-600">Supported</th>
                    <th className="py-1 text-center text-red-600">Hostile</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-1">Complainant</td>
                    <td className="py-1 text-center">{caseData.witnessDetails.complainantWitness.supported}</td>
                    <td className="py-1 text-center">{caseData.witnessDetails.complainantWitness.hostile}</td>
                  </tr>
                  <tr>
                    <td className="py-1">Mahazar/Seizure</td>
                    <td className="py-1 text-center">{caseData.witnessDetails.mahazarSeizureWitness.supported}</td>
                    <td className="py-1 text-center">{caseData.witnessDetails.mahazarSeizureWitness.hostile}</td>
                  </tr>
                  <tr>
                    <td className="py-1">IO</td>
                    <td className="py-1 text-center">{caseData.witnessDetails.ioWitness.supported}</td>
                    <td className="py-1 text-center">{caseData.witnessDetails.ioWitness.hostile}</td>
                  </tr>
                  <tr>
                    <td className="py-1">Eye Witness</td>
                    <td className="py-1 text-center">{caseData.witnessDetails.eyeWitness.supported}</td>
                    <td className="py-1 text-center">{caseData.witnessDetails.eyeWitness.hostile}</td>
                  </tr>
                  <tr>
                    <td className="py-1">Other</td>
                    <td className="py-1 text-center">{caseData.witnessDetails.otherWitness.supported}</td>
                    <td className="py-1 text-center">{caseData.witnessDetails.otherWitness.hostile}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </InfoCard>

          {/* Trial & Hearing */}
          <InfoCard title="Trial & Hearing" icon={<Calendar size={20} />}>
            <div
              className={`mb-4 rounded-lg p-3 ${isUrgent ? 'animate-pulse bg-red-100' : 'bg-blue-50'
                }`}
            >
              <div className="flex items-center space-x-2">
                <Clock className={isUrgent ? 'text-red-600' : 'text-blue-600'} size={20} />
                <div>
                  <p className="text-xs text-gray-500">Next Hearing Date</p>
                  <p className={`font-bold ${isUrgent ? 'text-red-700' : 'text-blue-700'}`}>
                    {caseData.nextHearingDate
                      ? new Date(caseData.nextHearingDate).toLocaleDateString('en-IN', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                      : 'Not scheduled'}
                  </p>
                </div>
              </div>
            </div>
            <InfoRow label="Current Stage" value={caseData.currentStageOfTrial} />
            <InfoRow
              label="Date of Framing Charges"
              value={
                caseData.dateOfFramingCharges
                  ? new Date(caseData.dateOfFramingCharges).toLocaleDateString('en-IN')
                  : '-'
              }
            />
            <InfoRow
              label="Date of Judgment"
              value={
                caseData.dateOfJudgment
                  ? new Date(caseData.dateOfJudgment).toLocaleDateString('en-IN')
                  : '-'
              }
            />
            {caseData.hearings.length > 0 && (
              <div className="mt-3">
                <p className="mb-2 text-sm font-medium text-gray-600">Hearing History:</p>
                <div className="max-h-40 overflow-y-auto rounded-lg bg-gray-50 p-2">
                  {caseData.hearings.map((h, i) => (
                    <div key={h.id} className="mb-2 flex items-center space-x-2 border-b border-gray-100 pb-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs text-blue-600">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium">
                          {new Date(h.date).toLocaleDateString('en-IN')}
                        </p>
                        <p className="text-xs text-gray-500">{h.stageOfTrial}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </InfoCard>

          {/* Judgment & Outcome */}
          <InfoCard title="Judgment & Outcome" icon={<Gavel size={20} />}>
            {caseData.judgmentResult ? (
              <>
                <div
                  className={`mb-4 flex items-center space-x-3 rounded-lg p-3 ${caseData.judgmentResult === 'Convicted'
                      ? 'bg-green-50'
                      : caseData.judgmentResult === 'Acquitted'
                        ? 'bg-gray-50'
                        : 'bg-yellow-50'
                    }`}
                >
                  {caseData.judgmentResult === 'Convicted' ? (
                    <CheckCircle className="text-green-600" size={24} />
                  ) : caseData.judgmentResult === 'Acquitted' ? (
                    <XCircle className="text-gray-600" size={24} />
                  ) : (
                    <Scale className="text-yellow-600" size={24} />
                  )}
                  <div>
                    <p className="text-xs text-gray-500">Judgment Result</p>
                    <p className="font-bold text-gray-800">{caseData.judgmentResult}</p>
                  </div>
                </div>
                <InfoRow label="Accused Convicted" value={caseData.totalAccusedConvicted} />
                <InfoRow label="Fine Amount" value={caseData.fineAmount} />
                {caseData.reasonForAcquittal && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">Reason for Acquittal:</p>
                    <p className="rounded-lg bg-gray-50 p-2 text-sm">{caseData.reasonForAcquittal}</p>
                  </div>
                )}
                {caseData.accusedConvictions.length > 0 && (
                  <div className="mt-3">
                    <p className="mb-2 text-sm font-medium text-gray-600">Sentences Awarded:</p>
                    <div className="rounded-lg bg-gray-50 p-2">
                      {caseData.accusedConvictions.map((ac, i) => (
                        <div key={i} className="mb-1 border-b border-gray-100 pb-1 text-sm">
                          <span className="font-medium">{ac.name}:</span> {ac.sentence}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {caseData.victimCompensation && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">Victim Compensation:</p>
                    <p className="rounded-lg bg-gray-50 p-2 text-sm">{caseData.victimCompensation}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="py-4 text-center text-gray-500">
                <Scale size={32} className="mx-auto mb-2 text-gray-300" />
                <p>Judgment pending</p>
              </div>
            )}
          </InfoCard>
        </div>

        {/* Higher Court Proceedings - Full Width */}
        {caseData.higherCourtDetails.proceedingsPending && (
          <div className="mt-6">
            <InfoCard title="Higher Court Proceedings" icon={<Scale size={20} />}>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <InfoRow label="Type of Proceeding" value={caseData.higherCourtDetails.proceedingType} />
                <InfoRow label="Higher Court" value={caseData.higherCourtDetails.courtName} />
                <InfoRow label="Petitioner Party" value={caseData.higherCourtDetails.petitionerParty} />
                <InfoRow label="Petition Number" value={caseData.higherCourtDetails.petitionNumber} />
                <InfoRow
                  label="Date of Filing"
                  value={
                    caseData.higherCourtDetails.dateOfFiling
                      ? new Date(caseData.higherCourtDetails.dateOfFiling).toLocaleDateString('en-IN')
                      : '-'
                  }
                />
                <InfoRow label="Petition Status" value={caseData.higherCourtDetails.petitionStatus} />
              </div>
              {caseData.higherCourtDetails.petitionStatus === 'Disposed' && (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-gray-500">Nature of Disposal:</p>
                    <p className="rounded-lg bg-gray-50 p-2 text-sm">
                      {caseData.higherCourtDetails.natureOfDisposal || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Action Taken After Disposal:</p>
                    <p className="rounded-lg bg-gray-50 p-2 text-sm">
                      {caseData.higherCourtDetails.actionAfterDisposal || '-'}
                    </p>
                  </div>
                </div>
              )}
            </InfoCard>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-8 text-center text-sm text-gray-500">
          <p>Case Last Updated: {new Date(caseData.updatedAt).toLocaleString('en-IN')}</p>
        </footer>
      </main>
    </div>
  );
};
