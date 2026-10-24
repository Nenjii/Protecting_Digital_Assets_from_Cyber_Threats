import { icon } from '../core/icons';
import { PdacBase, esc, md, parseOptions, verdict } from './base';

interface Option { id: string; label: string }
interface Fact { k: string; v: string }
interface Vignette { id: string; text: string; answer?: string | string[]; reason?: string; who?: string; facts?: Fact[] }
type VoteData = Vignette[] | { options?: Option[]; items: Vignette[]; unit?: string };

/**
 * <pdac-vote-reveal data-src="m1-vignettes.json" data-options="compliant:Compliant|not-compliant:Not compliant|depends:It depends">
 * One case at a time. Tap the room's tally (or press 1, 2, 3), then reveal the
 * answer and the plain reason. The clicker steps: reveal → next case → … → next slide.
 * "answer" may list two options ("People and process"); "facts" adds labelled lines
 * to the reveal, for example the learner guide's weakness, data at risk and fix.
 * data-no-vote: no options to vote on; each case's reveal is its model answer
 * (the facts), for activities where teams write their own answer first.
 * "unit" in the data names the cases ("Data set 1 of 8"); the default is "Case".
 */
export class PdacVoteReveal extends PdacBase {
  private items: Vignette[] = [];
  private options: Option[] = [];
  private index = 0;
  private tallies: number[][] = [];
  private history: number[][] = [];
  private revealed: boolean[] = [];
  private noVote = false;
  private unit = 'Case';

  protected setup(): void {
    const data = this.json<VoteData>();
    this.items = Array.isArray(data) ? data : data.items;
    const fromData = Array.isArray(data) ? [] : data.options ?? [];
    if (!Array.isArray(data) && data.unit) this.unit = data.unit;
    this.noVote = this.hasAttribute('data-no-vote');
    this.options = parseOptions(this.dataset.options).length ? parseOptions(this.dataset.options) : fromData;
    if (!this.options.length && !this.noVote) throw new Error('No vote options: add data-options or "options" in the data file');
    this.classList.toggle('is-no-vote', this.noVote);
    const [from, to] = (this.dataset.range ?? '').split('-').map(Number);
    if (from) this.items = this.items.slice(from - 1, to || from);
    this.resetState();
    this.innerHTML = `
      <div class="vr-top">
        <p class="vr-count" aria-live="polite"></p>
        <div class="vr-nav">
          <button type="button" class="pdac-btn pdac-btn--quiet" data-act="prev">${icon('chevron-left')} Previous</button>
          <button type="button" class="pdac-btn pdac-btn--quiet" data-act="next">Next ${icon('chevron-right')}</button>
        </div>
      </div>
      <blockquote class="vr-case"></blockquote>
      ${this.noVote ? '' : '<div class="vr-options" role="group" aria-label="Room\'s tally"></div>'}
      <div class="pdac-bar">
        <div class="pdac-bar__left">
          <button type="button" class="pdac-btn pdac-btn--primary" data-act="reveal">${icon('eye')} ${this.noVote ? 'Show the model answer' : 'Reveal answer'} <span class="pdac-key">A</span></button>
          ${this.noVote ? '' : `<button type="button" class="pdac-btn pdac-btn--quiet" data-act="undo">${icon('rotate-ccw')} Undo last vote</button>`}
        </div>
        <p class="pdac-bar__status">${this.noVote ? 'Teams answer first; → shows the model answer, then the next' : `Tap an option for each vote, or press 1 to ${this.options.length}`}</p>
      </div>
      <div class="vr-reveal" aria-live="polite"></div>`;
    this.addEventListener('click', (e) => this.onClick(e));
    this.render();
  }

  private resetState(): void {
    this.index = 0;
    this.tallies = this.items.map(() => this.options.map(() => 0));
    this.history = this.items.map(() => []);
    this.revealed = this.items.map(() => false);
  }

  private onClick(e: Event): void {
    const t = e.target as HTMLElement;
    const opt = t.closest<HTMLElement>('[data-opt]');
    if (opt) return this.vote(Number(opt.dataset.opt) + 1);
    const act = t.closest<HTMLElement>('[data-act]')?.dataset.act;
    if (act === 'prev') this.go(this.index - 1);
    if (act === 'next') this.go(this.index + 1);
    if (act === 'reveal') this.showAnswer();
    if (act === 'undo') {
      const last = this.history[this.index].pop();
      if (last !== undefined) this.tallies[this.index][last] = Math.max(0, this.tallies[this.index][last] - 1);
      this.render();
    }
  }

  vote(option: number): void {
    const i = option - 1;
    if (this.noVote || i < 0 || i >= this.options.length || this.revealed[this.index]) return;
    this.tallies[this.index][i] += 1;
    this.history[this.index].push(i);
    this.render();
  }

  private go(i: number): void {
    if (i < 0 || i >= this.items.length) return;
    this.index = i;
    this.render();
  }

  step(dir: 1 | -1): boolean {
    if (dir === 1) {
      if (!this.revealed[this.index]) { this.showAnswer(); return true; }
      if (this.index < this.items.length - 1) { this.go(this.index + 1); return true; }
      return false;
    }
    if (this.revealed[this.index]) { this.revealed[this.index] = false; this.render(); return true; }
    if (this.index > 0) { this.go(this.index - 1); return true; }
    return false;
  }

  private render(): void {
    const item = this.items[this.index];
    const tally = this.tallies[this.index];
    const total = tally.reduce((a, b) => a + b, 0);
    const max = Math.max(...tally);
    const revealed = this.revealed[this.index];
    const answers = answersOf(item);
    this.$('.vr-count').textContent = `${this.unit} ${this.index + 1} of ${this.items.length}`;
    this.$('.vr-case').innerHTML = `${item.who ? `<span class="vr-who">${esc(item.who)}</span>` : ''}${md(item.text)}`;
    (this.querySelector('[data-act="prev"]') as HTMLButtonElement).disabled = this.index === 0;
    (this.querySelector('[data-act="next"]') as HTMLButtonElement).disabled = this.index === this.items.length - 1;

    if (!this.noVote) this.$('.vr-options').innerHTML = this.options.map((o, i) => {
      const isAnswer = revealed && answers.includes(o.id);
      const isTop = total > 0 && tally[i] === max;
      const pct = total ? Math.round((tally[i] / total) * 100) : 0;
      return `<button type="button" class="vr-opt ${isAnswer ? 'is-answer' : ''} ${revealed && !isAnswer ? 'is-dim' : ''}" data-opt="${i}" ${revealed ? 'aria-disabled="true"' : ''}>
          <span class="vr-opt__key">${i + 1}</span>
          <span class="vr-opt__label">${esc(o.label)}</span>
          <span class="vr-opt__count">${tally[i]}<span class="pdac-sr"> votes</span></span>
          <span class="vr-opt__bar" style="width:${pct}%"></span>
          ${isAnswer ? `<span class="vr-opt__tag">${icon('check')} Answer</span>` : ''}
          ${revealed && isTop && !isAnswer ? '<span class="vr-opt__tag is-room">Room’s top pick</span>' : ''}
        </button>`;
    }).join('');

    const box = this.$('.vr-reveal');
    if (!revealed) {
      box.innerHTML = '';
      box.classList.remove('is-on');
      return;
    }
    const answer = answers.map((id, i) => {
      const label = this.options.find((o) => o.id === id)?.label ?? id;
      return i ? label.toLowerCase() : label;
    }).join(' and ');
    const top = total ? this.options.filter((_, i) => tally[i] === max) : [];
    const roomRight = top.length > 0 && top.length <= answers.length && top.every((o) => answers.includes(o.id));
    const roomLine = total
      ? `<p class="vr-room">The room said <b>${top.map((o) => esc(o.label)).join(' or ')}</b>. ${verdict(roomRight, 'The room got it', 'Not quite')}</p>`
      : '';
    const facts = item.facts?.length
      ? `<dl class="vr-facts">${item.facts.map((f) => `<dt>${esc(f.k)}</dt><dd>${md(f.v)}</dd>`).join('')}</dl>`
      : '';
    const why = item.reason ? `<p class="vr-why"><span class="vr-why__k">Why:</span> ${md(item.reason)}</p>` : '';
    const answerLine = answers.length ? `<p class="vr-answer"><span class="vr-answer__k">Answer</span> ${esc(answer)}</p>` : '';
    box.innerHTML = `${answerLine}${facts}${why}${this.noVote ? '' : roomLine}`;
    box.classList.add('is-on');
  }

  showAnswer(): void {
    this.revealed[this.index] = true;
    this.render();
  }

  reset(): void {
    this.resetState();
    this.render();
  }
}

function answersOf(item: Vignette): string[] {
  if (item.answer === undefined) return [];
  return Array.isArray(item.answer) ? item.answer : [item.answer];
}
