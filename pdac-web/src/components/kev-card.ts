import { getData, hasData } from '../core/data';
import { icon } from '../core/icons';
import { esc } from './base';

interface Kev {
  catalogVersion: string; dateReleased: string; count: number; addedPastYear: number; ransomware: number;
  topVendors: [string, number][];
  newest: { vendor: string; product: string; dateAdded: string; dueDate: string; daysToFix: number }[];
  catalogPage: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const day = (iso: string) => { const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`; };
const num = (n: number) => n.toLocaleString('en-US');

/**
 * <pdac-kev-card data-proof="kev-count"> — CISA's Known Exploited Vulnerabilities
 * catalog in one card: how many weaknesses attackers already use, and how fast
 * CISA tells US agencies to fix the newest. Data: src/data/kev.json (npm run kev).
 * data-proof lets the E key show the catalog's own header word for word.
 */
export class PdacKevCard extends HTMLElement {
  connectedCallback(): void {
    if (this.dataset.done) return;
    this.dataset.done = '1';
    this.classList.add('pdac-c');
    if (!hasData('kev.json')) {
      this.innerHTML = '<p class="qr-missing">No CISA snapshot yet: run <code>npm run kev</code>, then rebuild.</p>';
      return;
    }
    const k = getData<Kev>('kev.json');
    const first = k.newest[0];
    this.innerHTML = `
      <p class="kev-k">${icon('shield-alert')} Known exploited, right now</p>
      <p class="kev-big"><b>${num(k.count)}</b> <span>weaknesses attackers already use, on CISA's list</span></p>
      <p class="kev-line">${num(k.addedPastYear)} added in the past year · ${num(k.ransomware)} used in ransomware</p>
      ${first ? `<p class="kev-line">Newest: ${esc(first.vendor)} ${esc(first.product)}, added ${day(first.dateAdded)}. US agencies must fix it by ${day(first.dueDate)}: <b>${first.daysToFix} days</b>.</p>` : ''}
      <p class="kev-src">CISA catalog ${esc(k.catalogVersion)} · E shows the source</p>`;
  }
}
