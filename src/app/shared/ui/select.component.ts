import { Component, Directive, ElementRef, computed, contentChildren, inject, input, model, output, signal } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCheck, faChevronDown, faPlus } from '@fortawesome/free-solid-svg-icons';

export interface SelectItem {
  value: string;
  label: string;
  hint?: string;
  disabled?: boolean;
  group?: string;
}
export type SelectOption = string | SelectItem;

// An option written in the template, like <option>: <app-option [value]="x.id" [label]="x.name" />
@Directive({ selector: 'app-option' })
export class SelectOptionDirective {
  readonly value = input.required<string | number>();
  readonly label = input.required<string>();
  readonly hint = input<string>();
  readonly disabled = input(false);
  readonly group = input<string>(); // options with the same group are listed under one title
}

// The one dropdown of Aulix (same look as the course category picker). Works with signal forms ([formField])
// or with [(value)]. Options come from [options] or from <app-option> children. Long lists get a search box;
// allowCustom lets the person type a value that is not listed.
@Component({
  selector: 'app-select',
  imports: [FaIconComponent],
  host: {
    class: 'app-select',
    '(document:click)': 'closeIfOutside($event)',
    '(keydown.escape)': 'close()',
  },
  styles: `
    :host { position: relative; display: block; width: 100%; min-width: 0; }
    :host(.compacto) { width: auto; min-width: 200px; }
    .trigger { display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; text-align: left; cursor: pointer; }
    .trigger:disabled { cursor: not-allowed; opacity: 0.6; }
    .trigger span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .placeholder { color: var(--muted, #6b6b80); }
    .chevron { flex-shrink: 0; font-size: 12px; color: var(--muted, #6b6b80); transition: transform 0.15s; }
    .abierto .chevron { transform: rotate(180deg); }
    .menu {
      position: absolute; z-index: 1200; top: calc(100% + 4px); left: 0; min-width: 100%; max-width: min(420px, 90vw);
      padding: 6px; box-sizing: border-box; border: 1px solid var(--line, #ececf0); border-radius: 10px;
      background: var(--text-light, #fff); box-shadow: 0 10px 24px rgba(10, 10, 35, 0.12);
    }
    .buscar { width: 100%; box-sizing: border-box; margin-bottom: 4px; }
    .resultados { max-height: 240px; overflow-y: auto; }
    .grupo { padding: 8px 10px 4px; font-size: 11px; font-weight: bold; letter-spacing: 0.04em; text-transform: uppercase; color: var(--muted, #6b6b80); }
    .opcion, .vacia, .agregar {
      display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; box-sizing: border-box;
      border: 0; border-radius: 6px; background: transparent; color: var(--dark-blue, #0a0a23);
      padding: 9px 10px; font: inherit; font-size: 14px; text-align: left; cursor: pointer;
    }
    .opcion small { margin-left: 6px; color: var(--muted, #6b6b80); font-size: 12px; }
    .opcion:hover:not(:disabled), .opcion.activa { background: var(--hover, #f5f5f8); }
    .opcion[aria-selected='true'] { background: var(--lime-soft, #f1f6d8); font-weight: 600; }
    .opcion:disabled { color: var(--muted, #6b6b80); cursor: not-allowed; opacity: 0.6; }
    .opcion fa-icon { font-size: 12px; color: var(--lime-strong, #6b7a1f); }
    .vacia { color: var(--muted, #6b6b80); cursor: default; }
    .agregar { border-top: 1px solid var(--line, #ececf0); border-radius: 0; font-weight: 600; justify-content: flex-start; }
  `,
  template: `
    <div [class.abierto]="open()">
      <button
        type="button"
        class="ui-input trigger"
        [id]="inputId()"
        [disabled]="disabled()"
        [attr.aria-invalid]="showError() ? 'true' : null"
        [attr.aria-label]="ariaLabel()"
        aria-haspopup="listbox"
        [attr.aria-expanded]="open()"
        (click)="toggle()"
        (keydown.arrowDown)="$event.preventDefault(); openAndMove(1)"
        (keydown.arrowUp)="$event.preventDefault(); openAndMove(-1)">
        <span [class.placeholder]="!selectedLabel()">{{ selectedLabel() || placeholder() }}</span>
        <fa-icon class="chevron" [icon]="faChevronDown" />
      </button>

      @if (open()) {
        <div class="menu">
          @if (isSearchable()) {
            <input
              class="ui-input buscar"
              [attr.aria-label]="'Buscar ' + (ariaLabel() ?? '')"
              [placeholder]="searchPlaceholder()"
              [value]="query()"
              (input)="query.set($any($event.target).value); activeIndex.set(0)"
              (keydown.arrowDown)="$event.preventDefault(); move(1)"
              (keydown.arrowUp)="$event.preventDefault(); move(-1)"
              (keydown.enter)="$event.preventDefault(); chooseActive()" />
          }
          <div class="resultados" role="listbox" [attr.aria-label]="ariaLabel()">
            @for (option of filtered(); track option.value + '|' + (option.group ?? ''); let i = $index) {
              @if (option.group && option.group !== filtered()[i - 1]?.group) { <div class="grupo" role="presentation">{{ option.group }}</div> }
              <button
                type="button"
                role="option"
                class="opcion"
                [class.activa]="i === activeIndex()"
                [disabled]="option.disabled"
                [attr.aria-selected]="option.value === value()"
                (click)="choose(option.value)">
                <span>{{ option.label }}@if (option.hint) {<small>{{ option.hint }}</small>}</span>
                @if (option.value === value()) { <fa-icon [icon]="faCheck" /> }
              </button>
            } @empty {
              <span class="vacia">{{ allowCustom() && query().trim() ? 'No está en la lista.' : emptyText() }}</span>
            }
          </div>
          @if (allowCustom() && customCandidate()) {
            <button type="button" class="agregar" (click)="choose(customCandidate())"><fa-icon [icon]="faPlus" /> Usar «{{ customCandidate() }}»</button>
          }
        </div>
      }
    </div>
  `,
})
export class SelectComponent implements FormValueControl<string> {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  // Form contract (bound automatically by [formField])
  readonly value = model('');
  readonly disabled = input(false);
  readonly invalid = input(false);
  readonly touched = input(false);
  readonly touch = output<void>();

  readonly options = input<readonly SelectOption[]>([]);
  readonly placeholder = input('Elige una opción');
  readonly inputId = input<string | null>(null); // so <label for="..."> points to the dropdown
  readonly ariaLabel = input<string | null>(null);
  readonly searchable = input<boolean | null>(null); // null: automatic, with more than 7 options
  readonly searchPlaceholder = input('Buscar…');
  readonly emptyText = input('No hay opciones.');
  readonly allowCustom = input(false); // lets the person type a value that is not in the list
  readonly forceError = input(false); // red border even if no form marks it (manual validation)

  private readonly children = contentChildren(SelectOptionDirective);

  protected readonly faChevronDown = faChevronDown;
  protected readonly faCheck = faCheck;
  protected readonly faPlus = faPlus;
  protected readonly open = signal(false);
  protected readonly query = signal('');
  protected readonly activeIndex = signal(0);

  private readonly items = computed<SelectItem[]>(() => [
    ...this.options().map((option) => (typeof option === 'string' ? { value: option, label: option } : option)),
    ...this.children().map((child) => ({
      value: String(child.value()),
      label: child.label(),
      hint: child.hint(),
      disabled: child.disabled(),
      group: child.group(),
    })),
  ]);
  protected readonly isSearchable = computed(() => this.searchable() ?? (this.allowCustom() || this.items().length > 7));
  protected readonly filtered = computed(() => {
    const term = normalize(this.query());
    return term ? this.items().filter((item) => normalize(`${item.label} ${item.hint ?? ''} ${item.group ?? ''}`).includes(term)) : this.items();
  });
  protected readonly selectedLabel = computed(() => {
    const item = this.items().find((option) => option.value === this.value());
    return item ? item.label : this.allowCustom() ? this.value() : '';
  });
  protected readonly customCandidate = computed(() => {
    const text = this.query().trim();
    return text && !this.items().some((item) => normalize(item.label) === normalize(text)) ? text : '';
  });
  protected readonly showError = computed(() => this.forceError() || (this.invalid() && this.touched()));

  protected toggle(): void {
    if (this.open()) this.close();
    else this.openMenu();
  }

  protected openAndMove(step: number): void {
    if (!this.open()) this.openMenu();
    else this.move(step);
  }

  protected move(step: number): void {
    const options = this.filtered();
    if (!options.some((option) => !option.disabled)) return;
    let index = this.activeIndex();
    do index = (index + step + options.length) % options.length;
    while (options[index].disabled);
    this.activeIndex.set(index);
  }

  protected chooseActive(): void {
    const option = this.filtered()[this.activeIndex()];
    if (option && !option.disabled) this.choose(option.value);
    else if (this.allowCustom() && this.customCandidate()) this.choose(this.customCandidate());
  }

  protected choose(value: string): void {
    this.value.set(value);
    this.close();
  }

  close(): void {
    if (!this.open()) return;
    this.open.set(false);
    this.touch.emit();
  }

  protected closeIfOutside(event: Event): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.close();
  }

  private openMenu(): void {
    this.query.set('');
    const selected = this.items().findIndex((option) => option.value === this.value());
    this.activeIndex.set(Math.max(selected, 0));
    this.open.set(true);
    setTimeout(() => this.host.nativeElement.querySelector<HTMLInputElement>('.buscar')?.focus());
  }
}

// Import both together: imports: [...SELECT]
export const SELECT = [SelectComponent, SelectOptionDirective] as const;

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
