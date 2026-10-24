import { icon } from '../core/icons';
import { PdacBase, esc, md } from './base';

interface Role { id: string; label: string }
interface Fn { id: string; label: string; sensitive?: boolean }
interface Conflict { a: string; b: string; why: string }
interface RbacData {
  system: string;
  roles: Role[];
  functions: Fn[];
  start: Record<string, string[]>;
  recommended: Record<string, string[]>;
  conflicts: Conflict[];
  /** The model answer's qualifier for a granted cell, keyed "role:function" (shown after A). */
  notes?: Record<string, string>;
  /** A line under the conflicts after A, e.g. a conflict the grid cannot show. */
  answerNote?: string;
  /** Words on the buttons (the default is "Least privilege" and "Start state"). */
  labels?: { answer?: string; reset?: string };
}

/**
 * <pdac-rbac-matrix data-src="m3-rbac.json">
 * Roles × functions for the (fictional) RSSO Assistance Portal. Click a cell to
 * grant or remove; separation-of-duties conflicts are flagged in words.
 * A shows the least-privilege answer, with the model answer's notes in the cells.
 */
export class PdacRbacMatrix extends PdacBase {
  private data!: RbacData;
  private grants = new Map<string, Set<string>>();
  private answered = false;

  protected setup(): void {
    this.data = this.json<RbacData>();
    this.load(this.data.start);
    const labels = this.data.labels ?? {};
    this.innerHTML = `
      <div class="rb-wrap">
        <table class="rb-table">
          <thead><tr><th scope="col">Function</th>${this.data.roles.map((r) => `<th scope="col">${esc(r.label)}</th>`).join('')}</tr></thead>
          <tbody></tbody>
        </table>
        <aside class="rb-side">
          <p class="rb-k">${icon('triangle-alert')} Conflicts</p>
          <ul class="rb-conflicts" aria-live="polite"></ul>
          <p class="rb-note-line" hidden></p>
          <div class="pdac-bar__left">
            <button type="button" class="pdac-btn" data-act="answer">${icon('eye')} ${esc(labels.answer ?? 'Least privilege')} <span class="pdac-key">A</span></button>
            <button type="button" class="pdac-btn pdac-btn--quiet" data-act="reset">${icon('rotate-ccw')} ${esc(labels.reset ?? 'Start state')} <span class="pdac-key">R</span></button>
          </div>
        </aside>
      </div>`;
    this.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      const cell = t.closest<HTMLElement>('[data-role]');
      if (cell) {
        const set = this.grants.get(cell.dataset.role!)!;
        const fn = cell.dataset.fn!;
        if (set.has(fn)) set.delete(fn);
        else set.add(fn);
        return this.render();
      }
      const act = t.closest<HTMLElement>('[data-act]')?.dataset.act;
      if (act === 'answer') this.showAnswer();
      if (act === 'reset') this.reset();
    });
    this.render();
  }

  private load(src: Record<string, string[]>): void {
    this.grants = new Map(this.data.roles.map((r) => [r.id, new Set(src[r.id] ?? [])]));
  }

  private conflicts(): { role: Role; c: Conflict }[] {
    const out: { role: Role; c: Conflict }[] = [];
    for (const role of this.data.roles) {
      const set = this.grants.get(role.id)!;
      for (const c of this.data.conflicts) if (set.has(c.a) && set.has(c.b)) out.push({ role, c });
    }
    return out;
  }

  private render(): void {
    const conflicts = this.conflicts();
    const hot = new Set(conflicts.flatMap(({ role, c }) => [`${role.id}:${c.a}`, `${role.id}:${c.b}`]));
    this.$('.rb-table tbody').innerHTML = this.data.functions.map((fn) => `
      <tr><th scope="row">${esc(fn.label)}${fn.sensitive ? ' <span class="rb-sens">sensitive</span>' : ''}</th>
        ${this.data.roles.map((r) => {
          const on = this.grants.get(r.id)!.has(fn.id);
          const conflict = hot.has(`${r.id}:${fn.id}`);
          const note = this.answered && on ? this.data.notes?.[`${r.id}:${fn.id}`] : undefined;
          return `<td><button type="button" class="rb-cell ${on ? 'is-on' : ''} ${conflict ? 'is-conflict' : ''} ${note ? 'has-note' : ''}" data-role="${r.id}" data-fn="${fn.id}"
              aria-pressed="${on}" aria-label="${esc(r.label)}: ${esc(fn.label)}${note ? ` (${esc(note)})` : ''}">${on ? `<span>${icon('check')} Yes</span>${note ? `<small class="rb-note">${esc(note)}</small>` : ''}` : 'No'}</button></td>`;
        }).join('')}
      </tr>`).join('');
    this.$('.rb-conflicts').innerHTML = conflicts.length
      ? conflicts.map(({ role, c }) => `<li><b>${esc(role.label)}:</b> ${md(c.why)}</li>`).join('')
      : `<li class="rb-none"><span class="pdac-verdict is-ok">✓ No conflicts</span></li>`;
    const line = this.querySelector<HTMLElement>('.rb-note-line')!;
    line.hidden = !(this.answered && this.data.answerNote);
    line.innerHTML = this.answered && this.data.answerNote ? md(this.data.answerNote) : '';
  }

  showAnswer(): void {
    this.load(this.data.recommended);
    this.answered = true;
    this.render();
  }

  reset(): void {
    this.load(this.data.start);
    this.answered = false;
    this.render();
  }
}
