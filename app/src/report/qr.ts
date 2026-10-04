import QRCode from 'qrcode';
import type { Report } from '../domain/types';

/** Public verification URL encoded in the QR (resolves on the /verify page). */
export function verifyUrl(report: Report): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/verify/${report.verificationId}`;
}

export async function qrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 240,
    color: { dark: '#0b1f3a', light: '#ffffff' },
  });
}
