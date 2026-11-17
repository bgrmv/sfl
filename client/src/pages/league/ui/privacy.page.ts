import { ChangeDetectionStrategy, Component } from '@angular/core';
import { KIT } from '@shared/ui/kit';

/**
 * What the site stores about people and how to leave (S8.4, docs/privacy.md).
 * The contact of the owner is a placeholder until the owner gives the text.
 */
@Component({
  selector: 'sfl-privacy-page',
  imports: [...KIT],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="k-page">
      <sfl-page-head
        title="Privacy"
        lead="What the league site keeps about people, why, and how to take your data away."
      />
      <sfl-card title="What we keep">
        <div class="k-prose">
          <ul>
            <li>
              <b>Games and results.</b>
              Nickname, shirt number, position and the statistics of every game.
              This is the history of the league; everyone can see it.
            </li>
            <li>
              <b>Account.</b>
              First name and picture are shown next to the nickname. Surname,
              email and age are seen only by the league administrator and are
              not sent to other visitors. The password is stored as a hash.
            </li>
            <li>
              <b>Sign-in.</b>
              One cookie that keeps you signed in, only for people who sign in.
              No analytics, no advertising, no requests to other sites: the
              fonts are served by this site.
            </li>
            <li>
              <b>Photos.</b>
              Pictures of games and players with a caption, added by the
              administrator.
            </li>
          </ul>
        </div>
      </sfl-card>
      <sfl-card title="Leaving or correcting">
        <div class="k-prose">
          <p>
            Ask the league administrator to show, correct or remove your data.
            On a request to leave, your nickname becomes “Former player”, your
            name, surname, picture, age and email are erased, you cannot sign in
            any more, and photos stop pointing at you. The games you played and
            their numbers stay, because other players' results depend on them. A
            photo can be deleted at once.
          </p>
          <p class="k-muted">
            Where to write: the contact address will appear here.
          </p>
        </div>
      </sfl-card>
    </div>
  `,
})
export class PrivacyPageComponent {}
