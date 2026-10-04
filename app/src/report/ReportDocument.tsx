import type { Report } from '../domain/types';
import { ShortReportDocument } from './ShortReportDocument';
import { DetailedReportDocument } from './DetailedReportDocument';

export interface ReportDocumentProps {
  report: Report;
  qr?: string;
  format?: 'short' | 'detailed';
  onFormatChange?: (format: 'short' | 'detailed') => void;
}

/**
 * Multi-format Report Document Component.
 * Supports switching between 1-page Short Summary Certificate and Full OIML R 76-2 Test Dossier.
 */
export function ReportDocument({
  report,
  qr,
  format = 'detailed',
  onFormatChange,
}: ReportDocumentProps) {
  return (
    <div className="space-y-4">
      {onFormatChange && (
        <div className="no-print flex items-center justify-end gap-2 text-xs">
          <span className="font-semibold text-ink-faint">Report Layout:</span>
          <button
            type="button"
            onClick={() => onFormatChange('short')}
            className={`rounded-lg px-3 py-1 font-semibold transition ${
              format === 'short'
                ? 'bg-espresso text-champagne-light shadow-sm'
                : 'bg-paper text-ink-faint hover:text-ink border border-line'
            }`}
          >
            Summary (Short)
          </button>
          <button
            type="button"
            onClick={() => onFormatChange('detailed')}
            className={`rounded-lg px-3 py-1 font-semibold transition ${
              format === 'detailed'
                ? 'bg-espresso text-champagne-light shadow-sm'
                : 'bg-paper text-ink-faint hover:text-ink border border-line'
            }`}
          >
            Full OIML R 76-2 Dossier
          </button>
        </div>
      )}

      {format === 'short' ? (
        <ShortReportDocument report={report} qr={qr} />
      ) : (
        <DetailedReportDocument report={report} qr={qr} />
      )}
    </div>
  );
}
