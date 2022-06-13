import { EventEmitter } from "@angular/core";
import { FormGroup } from "@angular/forms";

export interface IEmbeddedView<T> {
    formGroup: FormGroup;
    ngOnDestroy: () => void;
}
