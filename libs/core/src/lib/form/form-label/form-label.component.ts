import {
    ChangeDetectionStrategy,
    Component,
    HostBinding,
    Input,
    isDevMode,
    OnChanges,
    TemplateRef,
    ViewEncapsulation
} from '@angular/core';
import { Nullable } from '@fundamental-ngx/cdk/utils';
import { Placement } from '@fundamental-ngx/core/shared';
import { InlineHelpFormPlacement } from '../inline-help-placement.type';
import { TriggerConfig } from '@fundamental-ngx/core/popover';

let formLabelIdCount = 0;

/**
 * Label to be linked to a form control.
 *
 * ```html
 * <label fd-form-label for="input-id">Label Text</label>
 * <input fd-form-control type="text" id="input-id" />
 * ```
 */
@Component({
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: '[fd-form-label]',
    templateUrl: './form-label.component.html',
    styleUrls: ['./form-label.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class FormLabelComponent implements OnChanges {
    /** Whether form is required. */
    @Input()
    required = false;

    /** Whether label text should be appended with colon. */
    @Input()
    colon = false;

    /** @deprecated */
    @Input()
    checkbox = false;

    /** @deprecated */
    @Input()
    radio = false;

    /** Align label on end. */
    @Input()
    @HostBinding('class.fd-form-label__wrapper--align-end')
    alignLabelEnd = false;

    /**
     * Inline help body text.
     * @deprecated Use inlineHelpContent instead
     * */
    @Input()
    set inlineHelpTitle(title: Nullable<string>) {
        if (isDevMode()) {
            console.warn('inlineHelpTitle is deprecated, use inlineHelpContent instead');
        }
        this.inlineHelpContent = title;
    }

    /** Inline help content. Could be just a string or complex template */
    @Input()
    inlineHelpContent: Nullable<string | TemplateRef<any>> = null;

    /** Glyph of icon triggering inline help. */
    @Input()
    inlineHelpGlyph = 'question-mark';

    /** Trigger event names for the inline help. */
    @Input()
    inlineHelpTriggers: (string | TriggerConfig)[] = [
        'mouseenter',
        'mouseleave',
        'focusin',
        'focusout',
        { trigger: 'click', openAction: true, closeAction: true }
    ];

    /**
     * The placement of the inline help.
     * It can be one of:
     * top, top-start, top-end, bottom, bottom-start, bottom-end,
     * right, right-start, right-end, left, left-start, left-end.
     */
    @Input()
    inlineHelpBodyPlacement: Placement;

    /** If inline help trigger icon should be placed after, or before text. */
    @Input()
    inlineHelpPlacement: InlineHelpFormPlacement = 'after';

    /** Inline help label. */
    @Input()
    set inlineHelpLabel(label: string) {
        this._inlineHelpLabel = label;
    }
    get inlineHelpLabel(): string {
        if (this._inlineHelpLabel) {
            return this._inlineHelpLabel;
        }
        return typeof this.inlineHelpContent === 'string' ? this.inlineHelpContent : '';
    }

    /** @hidden */
    @HostBinding('class.fd-form-label__wrapper')
    defaultClass = true;

    /** @hidden */
    @HostBinding('class.fd-form-label__wrapper--inline-help')
    inlineHelpClass = true;

    /** @hidden */
    @HostBinding('class.fd-form-label__wrapper--inline-help--after')
    inlineHelpAfter = true;

    /** @hidden */
    // eslint-disable-next-line @angular-eslint/no-input-rename
    @Input('id')
    @HostBinding('id')
    set formLabelId(value: Nullable<string>) {
        this._formLabelId = value || this._formLabelId;
    }
    get formLabelId(): string {
        return this._formLabelId;
    }

    /** @hidden */
    private _formLabelId = `fd-form-label-${++formLabelIdCount}`;

    /** @hidden */
    private _inlineHelpLabel?: string;

    /** @hidden */
    ngOnChanges(): void {
        this.inlineHelpClass = !!this.inlineHelpContent;
        this.inlineHelpAfter = !!this.inlineHelpContent && this.inlineHelpPlacement === 'after';
    }
}
