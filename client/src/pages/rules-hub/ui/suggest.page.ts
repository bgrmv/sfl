import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { KIT } from '@shared/ui/kit';

/** DUMMY (suggest.page): nothing is sent; the anonymous endpoint is S10.37. */
@Component({
  selector: 'sfl-suggest-page',
  imports: [FormsModule, ...KIT],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="k-page"
      *sflFeature="'suggest.page'"
    >
      <sfl-page-head
        title="Proposal or complaint"
        lead="Write what should change. A moderator checks the text, and a good one goes to the vote."
      />
      <sfl-card
        flag="suggest.page"
        style="max-width:640px"
      >
        <form
          class="k-col"
          style="gap:16px"
          (submit)="$event.preventDefault()"
        >
          <div class="k-field">
            <span class="k-label">This is a</span>
            <sfl-segmented
              label="Kind"
              [options]="['Proposal', 'Complaint']"
              [value]="kind()"
              (changed)="kind.set($event)"
            />
          </div>
          <div class="k-field">
            <label for="st">Short title</label>
            <input
              id="st"
              class="k-input"
              placeholder="Players who come late start on the bench"
            />
          </div>
          <div class="k-field">
            <label for="tx">What and why</label>
            <textarea
              id="tx"
              class="k-textarea"
              maxlength="1000"
              [ngModel]="text()"
              (ngModelChange)="text.set($event)"
              name="tx"
            ></textarea>
            <span class="k-hint">{{ text().length }} of 1000 characters</span>
          </div>
          <div class="k-field">
            <label for="rl">Related rule (optional)</label>
            <select
              id="rl"
              class="k-select"
            >
              <option>1.1 When we play</option>
              <option>2.1 Captains</option>
              <option>3.1 Goal</option>
            </select>
          </div>
          <label class="k-check">
            <input
              type="checkbox"
              checked
            />
            Send anonymously
          </label>
          <p class="k-callout">
            Your name and account are not stored with this text. The moderator
            sees only the text. The number of messages per device is limited to
            stop spam, and that limit is not linked to you.
          </p>
          <div class="k-row">
            <button
              sflBtn
              type="submit"
            >
              Send
            </button>
            <button
              sflBtn
              variant="ghost"
              type="button"
            >
              Cancel
            </button>
          </div>
          <span class="k-hint">
            After sending you will not be able to edit the text.
          </span>
        </form>
      </sfl-card>
    </div>
  `,
})
export class SuggestPageComponent {
  protected readonly kind = signal('Proposal');
  protected readonly text = signal('');
}
