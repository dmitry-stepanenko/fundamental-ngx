import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';

@Component({
    selector: 'fdp-platform-input-example',
    templateUrl: './platform-input-example.component.html'
})
export class PlatformInputExampleComponent  {
    formTypesGroupRegister = new FormGroup({
        input1: new FormControl
    });

    constructor() {
        this.formTypesGroupRegister.valueChanges.subscribe(console.log)
    }

    asd(emitEvent: boolean) {
        this.formTypesGroupRegister.get('input1').setValue(null, {emitEvent});
    }

}
