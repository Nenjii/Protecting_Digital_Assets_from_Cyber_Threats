import { icon } from '../core/icons';
import { PdacBase, esc } from './base';

interface TemplateData { template: string; examples?: string[][] }

/**
 * <pdac-fill-template data-template="When I use AI at work, I will never put {{personal data}} into {{a public chatbot}}.">
 * or data-src="m5-plan.json". Blanks are typed in live by the facilitator from a
 * volunteer's answer. Nothing is saved. A fills in the example answer.
 */
export class PdacFillTemplate extends PdacBase {
  private template = '';
  private examples: string[][] = [];
  private exampleIndex = 0;

  protected setup(): void {
    if (this.dataset.src) {
      const data = this.json<TemplateData>();
      this.template = data.template;
      this.examples = data.examples ?? [];
    } else {
      this.template = this.dataset.template ?? '';
    }
    const blanks = [...this.template.matchAll(/\{\{(.+?)\}\}/g)].map((m) => m[1]);
    if (!this.examples.length) this.examples = [blanks];
    let n = 0;
    const html = esc(this.template).replace(/\{\{(.+?)\}\}/g, (_, hint: string) =>
      `<label class="ft-blank"><span class="pdac-sr">Blank ${++n}</span><input type="text" spellcheck="false" autocomplete="off" placeholder="${hint}" data-hint="${hint}"></label>`);
    this.innerHTML = `
      <p class="ft-sentence">${html}</p>
      <div class="pdac-bar">
        <div class="pdac-bar__left">
          <button type="button" class="pdac-btn" data-act="example">${icon('lightbulb')} Show an example <span class="pdac-key">A</span></button>
          <button type="button" class="pdac-btn pdac-btn--quiet" data-act="reset">${icon('rotate-ccw')} Clear <span class="pdac-key">R</span></button>
        </div>
        <p class="pdac-bar__status">Type a volunteer's words into the blanks. Nothing is saved.</p>
      </div>`;
    this.$$('input').forEach((input) => {
      const fit = () => {
        const len = Math.max((input as HTMLInputElement).value.length, (input as HTMLInputElement).placeholder.length, 6);
        input.style.width = `${len + 1}ch`;
      };
      input.addEventListener('input', fit);
      input.addEventListener('keydown', (e) => {
        if ((e as KeyboardEvent).key === 'Escape') (input as HTMLInputElement).blur();
        e.stopPropagation();
      });
      fit();
    });
    this.addEventListener('click', (e) => {
      const act = (e.target as HTMLElement).closest<HTMLElement>('[data-act]')?.dataset.act;
      if (act === 'example') this.showAnswer();
      if (act === 'reset') this.reset();
    });
  }

  showAnswer(): void {
    const ex = this.examples[this.exampleIndex % this.examples.length] ?? [];
    this.exampleIndex++;
    this.$$('input').forEach((input, i) => {
      (input as HTMLInputElement).value = ex[i] ?? (input as HTMLInputElement).dataset.hint ?? '';
      input.dispatchEvent(new Event('input'));
    });
  }

  reset(): void {
    this.exampleIndex = 0;
    this.$$('input').forEach((input) => {
      (input as HTMLInputElement).value = '';
      input.dispatchEvent(new Event('input'));
    });
  }
}
