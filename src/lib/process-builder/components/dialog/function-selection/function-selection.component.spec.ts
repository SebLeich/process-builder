import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FunctionSelectionComponent } from './function-selection.component';

describe('FunctionSelectionComponent', () => {
  let component: FunctionSelectionComponent;
  let fixture: ComponentFixture<FunctionSelectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FunctionSelectionComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FunctionSelectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
