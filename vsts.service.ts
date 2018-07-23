import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { map, flatMap } from 'rxjs/operators'
import * as moment from 'moment';

@Injectable({
  providedIn: 'root'
})
export class VstsService {

  private PAT: string = "";
  private BASEURI: string = "";
  private PRJPATH: string = "";

  constructor(private _http: HttpClient) {
    this.getIterationDays().subscribe();
  }

  private getBasicAuthHeader(): string {
    return `Basic ${btoa(`PAT:${this.PAT}`)}`;
  }

  private getRequestHeaders(): HttpHeaders {
    return new HttpHeaders({ "Authorization": this.getBasicAuthHeader() });
  }

  private getCurrentIteration(): Observable<any> {
    let uri: string = `${this.BASEURI}/${this.PRJPATH}/_apis/work/teamsettings/iterations?$timeframe=current&api-version=4.1`
    return this._http.get(uri, { headers: this.getRequestHeaders() });
  }

  private getTeamSettings(): Observable<any> {
    let uri: string = `${this.BASEURI}/${this.PRJPATH}/_apis/work/teamsettings?api-version=4.1`
    return this._http.get(uri, { headers: this.getRequestHeaders() });
  }

  private getTeamDaysOff(iterationId: string): Observable<any> {
    let uri: string = `${this.BASEURI}/${this.PRJPATH}/_apis/work/teamsettings/iterations/${iterationId}/teamdaysoff?api-version=4.1`
    return this._http.get(uri, { headers: this.getRequestHeaders() });
  }
  

  private getIterationDays(): Observable<IterationDay[]> {
    return forkJoin(this.getCurrentIteration(), this.getTeamSettings()).pipe(flatMap(v => {
      let itd = v[0].value[0];
      let ts = v[1];
      return this.getTeamDaysOff(itd.id).pipe(map(tdo => {
        let startDate = new Date(itd.attributes.startDate);
        let finishDate = new Date(itd.attributes.finishDate);
        let workingDays: string[] = ts.workingDays;
  
        let iterationDays: IterationDay[] = [];
        let current: moment.Moment = moment(startDate).add(-1, 'days');
        let last: moment.Moment = moment(finishDate);
  
        while (current.add(1, 'days').diff(last) <= 0) {
          iterationDays.push({
            date: current.toDate(),
            isWorkingDay: workingDays.includes(current.format('dddd').toLowerCase())
          });
        }
        console.log(tdo);
        return iterationDays;
      }));
    }));
  }
}

interface IterationDay {
  date: Date;
  isWorkingDay: boolean;
}
