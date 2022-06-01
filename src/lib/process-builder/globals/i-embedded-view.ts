import { EventEmitter } from "@angular/core";

export interface IEmbeddedView<T> {
    applyInputParams?: (...args: any) => void;
    initialValue: T | undefined;
    valueChange: EventEmitter<T>;
    ngOnDestroy: () => void;
}
