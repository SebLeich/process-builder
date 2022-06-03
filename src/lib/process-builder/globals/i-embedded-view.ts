import { EventEmitter } from "@angular/core";

export interface IEmbeddedView<T> {
    initialValue: T | undefined;
    valueChange: EventEmitter<T>;
    ngOnDestroy: () => void;
}
