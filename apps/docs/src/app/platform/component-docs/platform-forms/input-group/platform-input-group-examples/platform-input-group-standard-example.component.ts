import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FormControl } from '@angular/forms';

@Component({
    selector: 'fdp-input-group-standard-example',
    templateUrl: './platform-input-group-standard-example.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlatformInputGroupStandardExampleComponent {
    ctrl = new FormControl

    constructor() {
        this.ctrl.valueChanges.subscribe(console.log)
    }

    asd(emitEvent: boolean) {
        this.ctrl.setValue(null, {emitEvent});
    }

}
