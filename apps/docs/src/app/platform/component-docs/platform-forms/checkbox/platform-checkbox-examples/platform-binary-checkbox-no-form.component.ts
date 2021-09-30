import { Component } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';

@Component({
    selector: 'fdp-platform-binary-checkbox-no-form',
    templateUrl: 'platform-binary-checkbox-no-form.component.html'
})
export class PlatformChekboxNoFormComponent {
    customForm = new FormGroup({});
    readonly ctrl = new FormControl();

    constructor() {
      this.ctrl.valueChanges.subscribe(v => this.ctrlModelChangeEventsList.push('valueChanges: ' + v))
    }

    model = false;

    modelChangeEventsList: string[] = [];
    ctrlModelChangeEventsList: string[] = [];

    public onModelChange(event: boolean): void {
      this.model = event;
      this.modelChangeEventsList.push(`onModelChange: ${event}`);
    }

    public toggle(): void {
      this.model = !this.model;
    }

    public toggleCtrlValue(emitEvent: boolean): void {
      this.ctrl.setValue(!this.ctrl.value, {emitEvent});
    }
}
