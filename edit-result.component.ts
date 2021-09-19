import {Component, ElementRef, OnDestroy, OnInit} from '@angular/core';
import {AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {EMPTY, Subject, Subscription} from 'rxjs';
import {debounceTime, switchMap} from 'rxjs/operators';
import {DataService} from '../../../_services/data.service';
import * as _ from 'lodash';
import {glow} from '../../../_services/shared.service';
import {Class} from '../../course-module/module-detail/module-detail.component';
import {Exam} from '../view-result/view-result.component';
import {Result} from "../upload-result/upload-result.component";

@Component({
  selector: 'app-edit-result',
  templateUrl: './edit-result.component.html',
  styleUrls: ['./edit-result.component.css', '../results.component.css']
})
export class EditResultComponent implements OnInit {

  classes: Class [];
  exams: Exam[] = [];

  editResultsProgress = false;
  buttonProgress = false;
  noExamsFound = false;
  success = false;
  resultsFound = false;
  successfullyDeleted = false;

  roteParameter: string;
  error: string;

  editResultsForm: FormGroup;
  maxDate = new Date();
  results: Result[] = [];
  updatedResults: Result[] = [];
  filteredResults: Result[] = [];

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private data: DataService,
    private elementRef: ElementRef,
    private router: Router
  ) {
  }

  ngOnInit(): void {
    this.editResultsProgress = true;
    this.data.getClasses().subscribe(
      response => this.classes = response.classes,
      error => this.error = error
    ).add(() => this.editResultsProgress = false);

    this.editResultsForm = this.formBuilder.group({
      session: ['', [Validators.required]],
      exam: ['', [Validators.required]]
    });

    this.route.params.subscribe(params => {
      if (params.moduleCode && /^[A-Za-z]{2}[0-9]{4}/.test(params.moduleCode)) {
        // this.moduleCode.setValue(params.moduleCode);
        // this.editResultsProgress = true;
        // this.checkModule(params.moduleCode);
      }
    });

  }

  getExams() {
    this.editResultsProgress = true;
    this.data.getExams(this.session.value).subscribe(
      response => {
        this.exams = response.exams;
        this.noExamsFound = this.exams.length === 0;
      },
      error => {
        this.error = error;
      }
    ).add(() => this.editResultsProgress = false);
  }

  getResults() {
    if (this.results.length === 0 || confirm('are you sure you want to discard changes?')) {
      this.error = '';
      this.success = false;
      this.data.getResults(this.exam.value).subscribe(
        response => {
          this.results = response.results.map(result => ({index: result.studentIndex, mark: result.mark}));
          this.updatedResults = _.cloneDeep(this.results);
          this.filteredResults = this.updatedResults;
          console.log(this.results);
          this.elementRef.nativeElement.querySelector('#upload_preview').scrollIntoView({behavior: 'smooth'});
          glow(this.elementRef, 'upload_preview', 'rgb(100, 60, 180)');
        },
        error => this.error = error
      );
    }
  }

  modifyResults() {
    this.editResultsProgress = true;
    this.buttonProgress = true;
    if (confirm('Are you sure you want save changes?')) {
      this.error = '';
      this.success = false;
      if (this.editResultsForm.valid) {
        const selected = {
          examID: this.exam.value,
          results: this.updatedResults
        };
        this.data.editResults(selected).subscribe(
          response => {
            this.results = _.cloneDeep(this.updatedResults);
            try {
              this.elementRef.nativeElement.querySelectorAll('[id^="result_"]').forEach(element => element.style.background = 'white');
            } catch (exception) {
            }
            this.success = true;
            this.elementRef.nativeElement.querySelector('#success_message').scrollIntoView({behavior: 'smooth'});
            glow(this.elementRef, 'upload_preview', 'rgb(100, 60, 180)');
          },
          error => {
            this.error = error;
            this.elementRef.nativeElement.querySelector('#error_message').scrollIntoView({behavior: 'smooth'});
            glow(this.elementRef, 'upload_preview', 'red');
          }
        ).add(() => {
          this.editResultsProgress = false;
          this.buttonProgress = false;
        });
      } else {
        this.scrollToFirstInvalidControl();
        this.editResultsProgress = false;
        this.buttonProgress = true;
      }
    } else {
      this.editResultsProgress = false;
      this.buttonProgress = true;
    }
  }

  deleteExam() {
    if (confirm('Are your sure you want delete this exam?\nAll results will also be deleted.')) {
      this.editResultsProgress = true;
      this.data.deleteExam(this.exam.value).subscribe(
        response => {
          this.editResultsForm.reset();
          this.session.reset();
          this.exam.reset();
          this.results = [];
          this.filteredResults = [];
          this.updatedResults = [];
          this.successfullyDeleted = true;
        },
        error => console.log(error)
      ).add(() => setTimeout(() => this.editResultsProgress = false, 1000));
    }
  }

  onChange(i: number, value: string) {
    if (value === '') {
      this.elementRef.nativeElement.querySelector('#result_' + i).style.background = 'rgb(255,150,150)';
    } else {
      this.filteredResults[i].mark = parseInt(value, 10);
      this.elementRef.nativeElement
        .querySelector('#result_' + i).style.background = (this.filteredResults[i].mark !== this.results[i].mark) ? 'rgb(150,255,150)' : 'white';
    }
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value.toLowerCase();
    if (filterValue) {
      this.filteredResults = this.updatedResults.filter(obj => obj.index.toLowerCase().includes(filterValue));
    } else {
      this.filteredResults = this.updatedResults;
    }
  }

  scrollToFirstInvalidControl() {
    const firstInvalidControl: HTMLElement = this.elementRef.nativeElement.querySelector('form .ng-invalid');
    firstInvalidControl.scrollIntoView({behavior: 'smooth'});
  }

  toggleProgress() {
    this.editResultsProgress = true;
  }

  get session(): AbstractControl {
    return this.editResultsForm.get('session');
  }

  get exam(): AbstractControl {
    return this.editResultsForm.get('exam');
  }

}
