import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {AuthenticationService} from '../../../_services/authentication.service';
import {DataService} from '../../../_services/data.service';
import {getSemester, glow, filter} from '../../../_services/shared.service';
import {FormControl} from '@angular/forms';
import {MatSnackBar} from '@angular/material/snack-bar';
import {MatTableDataSource} from '@angular/material/table';
import {MatSort} from '@angular/material/sort';

export interface Mark {
  examID: number;
  dateHeld: Date;
  mark: number;
}

export interface Result {
  classID: number;
  moduleCode: string;
  moduleName: string;
  year: number;
  results: MatTableDataSource<Mark>;
}

@Component({
  selector: 'app-exam-results',
  templateUrl: './exam-results.component.html',
  styleUrls: ['./exam-results.component.css']
})
export class ExamResultsComponent implements OnInit {

  classID: string;
  filter: FormControl = new FormControl('');

  resultsError = '';
  results: Result[] = [];
  filteredResults: Result[] = [];
  progress = false;
  resultsFound = true;

  displayedColumns = ['no', 'examDate', 'mark'];

  @ViewChild(MatSort, {static: false}) sort: MatSort;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authentication: AuthenticationService,
    private data: DataService,
    private elementRef: ElementRef,
    private snackBar: MatSnackBar
  ) {
    if (this.getRole !== 'Student') {
      router.navigate(['../view-results'], {relativeTo: this.route});
    }
  }

  ngOnInit(): void {

    this.progress = true;
    this.route.params.subscribe(params => {
      this.classID = params.classID;
    });

    this.filter.valueChanges.subscribe(value => {
      this._filter(value);
    });

    this.data.getClasses().subscribe(
      response => {
        this.results = response.classes;
        this.data.getStudentResults().subscribe(
          response1 => {
            this.results.forEach(_class => {
              _class.results = new MatTableDataSource<Mark>(response1.results.filter(result => result.classID === _class.classID));
              _class.results.sort = this.sort;
            });
            this.filteredResults = this.results;
          },
          error => this.resultsError = error
        ).add(() => {
          this.progress = false;
          if (this.classID) {
            setTimeout(() => {
              try {
                const element = this.elementRef.nativeElement.querySelector(`[id^='card${this.classID}']`);
                if (element) {
                  element.scrollIntoView({behavior: 'smooth'});
                  element.style.boxShadow = '0 0 0 2px purple';
                  setTimeout(
                    () => element.style.boxShadow = '0 0 0 2px white',
                    2000
                  );
                } else {
                  this.snackBar.open(`No Exam Results Available for the selected class.`, 'Close', {duration: 4000});
                }
              } catch (Exception) {
              }
            }, 500);
          }
        });
      },
      error => {
        this.resultsError = error;
      });
  }

  isEmpty(): boolean {
    for (let i = 0; i < 4; i++) {
      if (this.filteredResults[getSemester(i)].length !== 0) {
        return false;
      }
    }
    return true;
  }

  get getRole() {
    return this.authentication.details.role;
  }

  getColor(val: number) {
    const red = (val < 50) ? 250 : 500 - val * 5;
    const green = (val < 50) ? val * 5 : 250;
    return 'rgb(' + red + ',' + green + ',' + '0)';
  }

  getAverage(result: Result): number {
    let total = 0;
    result.results.data.forEach(_exam => total += _exam.mark);
    return Math.round(total * 100 / result.results.data.length) / 100;
  }

  _filter(value: string): void {
    const filterValue = value ? value.trim().toLowerCase() : '';
    if (filterValue) {
      this.filteredResults = this.results.filter(
        _class => _class.moduleName.toLowerCase().includes(filterValue) || _class.moduleCode.toLowerCase().includes(filterValue)
      );
    } else {
      this.filteredResults = this.results;
    }
  }

}
