import { TestBed } from '@angular/core/testing';

import { TaskSelectionControlService } from './function-selection-control.service';

describe('TaskSelectionControlService', () => {
  let service: TaskSelectionControlService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TaskSelectionControlService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
