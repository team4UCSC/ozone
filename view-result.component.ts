import {AfterViewInit, Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {AbstractControl, FormBuilder, FormGroup, Validators} from '@angular/forms';
import {EMPTY, Subject, Subscription} from 'rxjs';
import {debounceTime, distinctUntilChanged, switchMap} from 'rxjs/operators';
import {DataService} from '../../../_services/data.service';
import {glow, YEARS} from '../../../_services/shared.service';
import {MatTableDataSource} from '@angular/material/table';
import {MatSort} from '@angular/material/sort';
import {ActivatedRoute} from '@angular/router';
import {Class} from '../../course-module/module-detail/module-detail.component';

interface Result {
  studentIndex: string;
  studentName: string;
  year: number;
  mark: number;
}

export interface Exam {
  examID: number;
  examDate: Date;
}

@Component({
  selector: 'app-view-result',
  templateUrl: './view-result.component.html',
  styleUrls: ['./view-result.component.css']
})

export class ViewResultComponent implements OnInit {

  classes: Class[] = [];
  exams: Exam[] = [];

  viewResultsProgress = false;
  success = false;
  noExamsFound = false;

  error = '';

  viewResultsForm: FormGroup;
  results: Result[] = [];

  displayedColumnsStudent = ['no', 'studentIndex', 'studentName', 'year', 'mark'];
  displayedColumns: string[] = this.displayedColumnsStudent;
  dataSource: MatTableDataSource<Result>;

  @ViewChild(MatSort, {static: false}) sort: MatSort;
  @ViewChild('filter') filter;

  constructor(
    private formBuilder: FormBuilder,
    private data: DataService,
    private elementRef: ElementRef,
    private route: ActivatedRoute
  ) {

    this.viewResultsForm = this.formBuilder.group({
      session: ['', [Validators.required]],
      exam: ['', [Validators.required]]
    });

  }

  ngOnInit(): void {

    this.viewResultsProgress = true;
    this.data.getClasses().subscribe(
      response => {
        console.log(response.classes);
        this.classes = response.classes;
      },
      error => this.error = error
    ).add(() => this.viewResultsProgress = false);

  }

  getExams() {
    this.noExamsFound = false;
    this.viewResultsProgress = true;
    this.data.getExams(this.session.value).subscribe(
      response => {
        this.exams = response.exams;
        this.noExamsFound = this.exams.length === 0;
      },
      error => {
        this.error = error;
      }
    ).add(() => this.viewResultsProgress = false);
  }

  getResults() {

    this.data.getResults(this.exam.value).subscribe(
      response => {
        this.results = response.results ? response.results as [] : [];
        console.log(this.results);
        this.dataSource = new MatTableDataSource<Result>(this.results);
        this.dataSource.sort = this.sort;
        glow(this.elementRef, 'view_results', 'rgb(0,50,255)');
      },
      error => {
        this.error = error;
      }
    );

  }

  toggleProgress(): void {
    this.viewResultsProgress = true;
  }

  get session(): AbstractControl {
    return this.viewResultsForm.get('session');
  }

  get exam(): AbstractControl {
    return this.viewResultsForm.get('exam');
  }

}
