import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {debounceTime, distinctUntilChanged, switchMap} from 'rxjs/operators';
import {EMPTY, Subject, Subscription} from 'rxjs';
import {DataService} from '../../../_services/data.service';
import * as XLSX from 'xlsx';
import {ActivatedRoute, Router} from '@angular/router';
import {glow} from '../../../_services/shared.service';
import {Class} from '../../course-module/module-detail/module-detail.component';

export interface Exam {
  examID: number;
  type: string;
  dateHeld: Date;
  allocation: number;
  hideMarks: boolean;
}

export interface Result {
  index: string;
  mark: number;
}

@Component({
  selector: 'app-upload-result',
  templateUrl: './upload-result.component.html',
  styleUrls: ['./upload-result.component.css', '../results.component.css']
})

export class UploadResultComponent implements OnInit {

  classes: Class [];
  exams: Exam[] = [];

  routeParams = '';
  error = '';
  allocationAvailable;
  resultsFile;
  file;

  uploadResultsForm: FormGroup;
  maxDate: Date = new Date();

  uploadResultsProgress = false;
  moduleExists = false;
  fileError = false;
  success = false;

  @ViewChild('resultUploadFormRef') resultUploadFormRef;
  constructor(
    private formBuilder: FormBuilder,
    private data: DataService,
    private elementRef: ElementRef,
    private route: ActivatedRoute,
    private router: Router
  ) {
  }

  ngOnInit(): void {
    this.getClasses();
    this.route.params.subscribe(params => {
      this.routeParams = params.moduleCode;
    });
    this.uploadResultsForm = this.formBuilder.group({
      session: ['', [Validators.required]],
      examDate: ['', [Validators.required]],
    });
  }

  getClasses(): void {
    this.uploadResultsProgress = true;
    this.data.getClasses().subscribe(
      response => {
        this.classes = response.classes;
      },
      error => this.error = error
    ).add(() => this.uploadResultsProgress = false);
  }

  onFileChange(ev) {
    this.uploadResultsProgress = true;
    this.resultsFile = [];
    let workBook = null;
    let jsonData = null;
    const reader = new FileReader();
    this.file = ev.target.files[0];
    reader.onload = (event) => {
      const data = reader.result;
      workBook = XLSX.read(data, {type: 'binary'});
      jsonData = workBook.SheetNames.reduce((initial, name) => {
        const sheet = workBook.Sheets[name];
        initial[name] = XLSX.utils.sheet_to_json(sheet);
        return initial;
      }, {});
      this.resultsFile = jsonData.Sheet1;
      let isValid = true;
      if (this.resultsFile[0].hasOwnProperty('index') && this.resultsFile[0].hasOwnProperty('mark')) {
        for (const attendance of this.resultsFile) {
          if (attendance.index.toString().match(/^[A-Z][0-9]{6}$/) === null ||
            isNaN(attendance.mark) || attendance.mark < 0 || attendance.mark > 100) {
            isValid = false;
            break;
          }
        }
      } else {
        isValid = false;
      }
      console.log(isValid);
      if (isValid) {
        this.resultsFile.sort((a, b) => a.index > b.index ? 1 : -1);
        glow(this.elementRef, 'upload_preview', 'rgb(100, 60, 180)');
      } else {
        this.resultsFile = [];
        glow(this.elementRef, 'upload_preview', 'red');
      }
      this.fileError = !isValid;
    };
    reader.readAsBinaryString(this.file);
    this.uploadResultsProgress = false;
    this.elementRef.nativeElement.querySelector('#resultFileUpload').value = '';
  }

  uploadResults() {
    this.success = false;
    this.error = '';
    this.uploadResultsProgress = true;
    if (confirm('Are you sure you want to save this file')) {
      if (this.uploadResultsForm.valid) {
        if (this.resultsFile.length !== 0) {
          const data = {
            classID: this.session.value,
            examDate: this.examDate.value,
            results: this.resultsFile
          };
          this.data.uploadExamResults(data).subscribe(
            response => {
              this.success = true;
              glow(this.elementRef, 'upload_preview', 'rgb(100, 60, 180)');
            },
            error => this.error = error
          ).add(() => this.uploadResultsProgress = false);
        } else {
          this.uploadResultsProgress = false;
          glow(this.elementRef, 'upload_preview', 'red');
          this.elementRef.nativeElement.querySelector('#upload_messages').scrollIntoView({behavior: 'smooth'});
        }
      } else {
        this.scrollToFirstInvalidControl();
      }
    } else {
      this.uploadResultsProgress = false;
    }
  }

  resetForm() {
    this.resultsFile = null;
    this.moduleExists = false;
    this.resultUploadFormRef.reset();
    setTimeout(() => this.uploadResultsProgress = false, 1000);
  }

  scrollToFirstInvalidControl() {
    const firstInvalidControl: HTMLElement = this.elementRef.nativeElement.querySelector('form .ng-invalid');
    firstInvalidControl.scrollIntoView({behavior: 'smooth'});
  }

  openFile() {
    this.elementRef.nativeElement.querySelector('#resultFileUpload').click();
  }

  toggleProgress() {
    this.uploadResultsProgress = true;
  }

  get session() {
    return this.uploadResultsForm.get('session');
  }

  get examDate() {
    return this.uploadResultsForm.get('examDate');
  }

}
