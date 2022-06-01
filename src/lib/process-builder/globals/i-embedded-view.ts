import { EventEmitter } from "@angular/core";

export interface IEmbeddedView<T> {
    valueChange: EventEmitter<T>;
    ngOnDestroy: () => void;
}
