import { LitElement, html, css } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';

export function tick(cb: FrameRequestCallback): number {
  return requestAnimationFrame(cb);
}

export function cancelAnims(ele: HTMLElement): void {
  ele.getAnimations().forEach((anim) => anim.cancel());
}

export function showAnim(ele: HTMLElement, msec: number): Promise<Animation> {
  const anim = ele.animate(
    [
      { opacity: 0, transform: 'translate3d(0, -20px, 0)' },
      { opacity: 1, transform: 'translate3d(0,   0px, 0)' },
    ],
    {
      delay: 0,
      easing: 'ease-out',
      duration: msec,
    }
  );
  return new Promise((resolve) => {
    anim.finished.then(() => resolve(anim)).catch(() => {}); // noop, Abort Error
  });
}

export function hideAnim(ele: HTMLElement, msec: number): Promise<Animation> {
  const anim = ele.animate(
    [
      { opacity: 1, transform: 'translate3d(0,   0px, 0)' },
      { opacity: 0, transform: 'translate3d(0, -20px, 0)' },
    ],
    {
      delay: 0,
      easing: 'ease-in',
      duration: msec,
    }
  );
  return new Promise((resolve) => {
    anim.finished.then(() => resolve(anim)).catch(() => {}); // noop, Abort Error
  });
}

export function getFocusElement(): Element | undefined {
  return document.activeElement || undefined;
}

export function createEvent(eventName: string): CustomEvent {
  return new CustomEvent(eventName, { bubbles: true, cancelable: true });
}

@customElement('bs-modal')
export class BsModalElement extends LitElement {
  static styles = css`
  .backdrop {
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0,0,0,0.5);
      overflow-x: hidden;
      overflow-y: auto;
  }
  
  #container {
    display: block;
    position: relative;
    pointer-events: none;
    transform-origin: 50% 0%;
  }
  
  #slot {
      pointer-events: auto;
      display: block;
      position: relative;
      background-color: #fff;
      width: 600px;
      margin: 20px auto;
      padding: 1px 0;
  }
  `;

  @property({ type: Boolean }) isOpen = false;
  @property({ type: Boolean }) isClosed = true;
  @query('#container') container!: HTMLDivElement;

  // attr options
  @property({ type: String, reflect: true }) width = '600px';
  @property({ type: String, reflect: true }) backdrop = 'true';
  @property({ type: String, reflect: true }) keyboard = 'true';
  @property({ type: Number, reflect: true, attribute: 'anim-msec' })
  animMsec = 300;

  private _unsubFuncs: Array<Function> = [];
  private _prevFocusElement?: Element;

  show(): boolean {
    if (this.isOpen) {
      return false;
    }

    this._prevFocusElement = getFocusElement();
    this.isOpen = true;
    this.isClosed = false;
    document.body.classList.add('modal-open');
    cancelAnims(this.container);

    // "show.bs.modal" event be fired.
    this.dispatchEvent(createEvent('show'));

    // "shown.bs.modal" event be fired after animation.
    showAnim(this.container, this.animMsec).then(() => {
      this.dispatchEvent(createEvent('shown'));
    });

    tick(() => {
      this.scrollTop = 0;
      this.focus({ preventScroll: true });
    });

    return true;
  }

  hide(): boolean {
    if (!this.isOpen) {
      return false;
    }

    document.body.classList.remove('modal-open');
    this.isOpen = false;
    cancelAnims(this.container);

    // "hide.bs.modal" event be fired.
    this.dispatchEvent(createEvent('hide'));

    // "hidden.bs.modal" event be fired after animation.
    hideAnim(this.container, this.animMsec).then(() => {
      this.isClosed = true;
      this._prevFocusElement &&
        (this._prevFocusElement as HTMLElement).focus({ preventScroll: true });
      this.dispatchEvent(createEvent('hidden'));
    });

    return true;
  }

  toggle(): boolean {
    return this.isOpen ? this.hide() : this.show();
  }

  _clickHandler(event: Event): void {
    if ((event.target as HTMLElement).matches("[data-dismiss='modal']")) {
      this.hide();
    }
  }

  _clickBackdropHandler(): void {
    if (this.backdrop === 'true') {
      this.hide();
    }
  }

  _keyHandler(event: KeyboardEvent): void {
    if (
      this.keyboard === 'true' &&
      (event.key === 'Escape' || event.key === 'Esc')
    ) {
      this.hide();
    }
  }

  _focusinHandler(event: FocusEvent): void {
    if (
      this.isOpen &&
      event.target &&
      !this.contains(event.target as Element)
    ) {
      this.focus({ preventScroll: true });
    }
  }

  connectedCallback(): void {
    super.connectedCallback();

    this.setAttribute('tabindex', '-1');

    const clickHnd = this._clickHandler.bind(this);
    const keydownHnd = this._keyHandler.bind(this);
    const focusinHnd = this._focusinHandler.bind(this);
    this.shadowRoot!.host.addEventListener('click', clickHnd, true);
    this.ownerDocument.addEventListener('keydown', keydownHnd, true);
    this.ownerDocument.addEventListener('focusin', focusinHnd, true);
    this._unsubFuncs.push(() =>
      this.shadowRoot!.host.removeEventListener('click', clickHnd, true)
    );
    this._unsubFuncs.push(() =>
      this.ownerDocument.removeEventListener('keydown', keydownHnd, true)
    );
    this._unsubFuncs.push(() =>
      this.ownerDocument.removeEventListener('focusin', focusinHnd, true)
    );
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();

    this._unsubFuncs.map((func) => func());
  }

  render() {
    this.hidden = this.isClosed;
    return html`
      <div class="backdrop" @click=${this._clickBackdropHandler}></div>
      <div id="container">
          <slot id="slot" style="width:${this.width}"></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'bs-modal': BsModalElement;
  }
}
