import { Component } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';

@Component({
    selector: 'fdp-switch-forms-example',
    templateUrl: './switch-forms-example.component.html'
})
export class SwitchFormsExampleComponent {
    customForm = new FormGroup({
        switch1: new FormControl(false),
        switch2: new FormControl(true),
        switch3: new FormControl(false)
    });

    constructor() {
        this.customForm.valueChanges.subscribe(console.log)
    }

    asd(emitEvent: boolean) {
        this.customForm.get('switch1').setValue(false, {emitEvent});
    }
}
