import { Injectable, Input } from '@angular/core';
import { Http } from '@angular/http';

import * as d3 from 'd3';

import 'rxjs/add/operator/map';

@Injectable()
export class UserService {
  
  private _url: string;

  constructor(private _http: Http) { }

  getData(params: Object) {
    let url = this.buildUrl(params);
    return this._http.get(url)
      .map( res => res.json());      
  }

  private buildUrl(params) {
    let date: Date = new Date(); // now date

    let query: string, base: string, url: string;

    base = 'select * from yahoo.finance.historicaldata where symbol = "' + params.symbol.toUpperCase() + '" and startDate = "' + params.startDate + '" and endDate = "' + params.endDate + '"';
    query = encodeURIComponent(base);
    url = 'https://query.yahooapis.com/v1/public/yql?q=' + query + '&format=json&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys&callback=';
    
    return url;
  }

}
