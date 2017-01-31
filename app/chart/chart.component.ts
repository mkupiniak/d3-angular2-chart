import { Component, OnInit, Input } from "@angular/core";
import { UserService } from "../user-service/user.service";

import * as d3 from "d3";

const now = new Date();

@Component({
  selector: "app-chart",
  templateUrl: "./chart.component.html",
  styleUrls: ["./chart.component.css"]
})
export class ChartComponent implements OnInit {
  private _model1;
  private _model2;
  private _isLoading: boolean = true;
  private _selectedCompany: string = "AAPL";
  private _activeStatus: Array<boolean> = [];

  private _maxDate = {
    year: now.getFullYear(), 
    month: now.getMonth() + 1, 
    day: now.getDate()
  };

  private _companies: Object[] = [
    { value: "AAPL", name: "Apple" },
    { value: "CSCO", name: "Cisco" },
    { value: "YHOO", name: "Yahoo" }
  ];

  private _timePeriod: Object[] = [
    { name: "1 month" },
    { name: "3 months" },
    { name: "6 months" }
  ];

  date: Date = new Date();
  dateFormat = d3.timeFormat('%Y-%m-%d');
  
  endDate = this.dateFormat(this.date);
  
  oneMonthBefore = this.calcMonths(-1);
  threeMonthsBefore = this.calcMonths(-3);
  sixMonthsBefore = this.calcMonths(-6);

  startDate = this.dateFormat(this.sixMonthsBefore);

  constructor(private _userService: UserService) { }

  ngOnInit() {
    this.getCompanyData();
  };

  log(x) {
    console.log(x);
  }

  getCompanyData() {
    this._userService.getData(this.getOptions())
      .subscribe( data => { 
        this._isLoading = false;
        this.buildChart(data);
      });
  }

  getOptions() {
    return { 
      symbol: this._selectedCompany,
      startDate: this.startDate,
      endDate: this.endDate
    };
  }

  changeDates() {  
    if (this._model1 && this._model2) {
      console.log('ok mam dwie wartości model');
    }
  }

  changeCompany(sym: string) {
    this._isLoading = true;
    this._selectedCompany = sym;
    this.getCompanyData();
  }

  setTimePeriod(period: string) {
    this._isLoading = true;
    switch (period) {
      
      case "1 month":
        this.startDate = this.dateFormat(this.oneMonthBefore);
        this.getCompanyData();
        break;
      
      case "3 months":
        this.startDate = this.dateFormat(this.threeMonthsBefore);
        this.getCompanyData();   
        break;
      
      case "6 mmonths":
        this.startDate = this.dateFormat(this.sixMonthsBefore);
        this.getCompanyData();
        break;
      
      default:
        this.startDate = this.dateFormat(this.sixMonthsBefore);
        this.getCompanyData();
        break;
    }
  }

  private calcMonths(months: number) {
    let date = new Date();
    date.setMonth(date.getMonth() + months);
    return date;
  }

  private setActiveStatus(i) {
    if (this._activeStatus.length) {
      for (let j=0; j < this._activeStatus.length; j++) {
        this._activeStatus[j] = false;
      }
    }
    this._activeStatus[i] = true;
  }

  buildChart(queryData){
    if (d3.select('.chart')) {
      d3.select('.chart').remove();
      d3.select('.context').remove();
    }

    let data = queryData.query.results.quote;
    let dataArray = [];
    let dateArray = [];

    let parseTime = d3.timeParse("%Y-%m-%d");
    
    for (let d of data ) {
      dateArray.push(d.Date);
      d.Date = parseTime(d.Date);
      d.Close = +d.Close;
      d.High = +d.High;
      d.Low = +d.Low;
      d.Open = +d.Open;
      d.Volume = +d.Volume;
      dataArray.push(d);
    }    
    
    function minMy(a, b){ return a < b ? a : b ; }
    function maxMy(a, b){ return a > b ? a : b ; }    

    let svg = d3.select("svg"),
        margin = {top: 20, right: 20, bottom: 110, left: 40},
        margin2 = {top: 330, right: 20, bottom: 30, left: 40},
        width = 768 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom,
        height2 = 400 - margin2.top - margin2.bottom;
    
    // set x, y, x2 and y2 scales
    let x = d3.scaleTime().range([0, width]),
       x2 = d3.scaleTime().range([0, width]),
        y = d3.scaleLinear().range([height, 0]),
       y2 = d3.scaleLinear().range([height2, 0]),
       yVolume = d3.scaleLinear().range([y(0), y(0.3)]);

    // set min and max values to the domain
      x.domain(d3.extent( dataArray, d => d.Date ));
      y.domain([ d3.min(dataArray.map( d => d.Low )), d3.max(dataArray.map( d => d.High ))])
      x2.domain(x.domain());
      y2.domain(y.domain());
      yVolume.domain(d3.extent( dataArray, d => d.Volume ));

    // create x, y and x2 axis
    let xAxis = d3.axisBottom(x),
       xAxis2 = d3.axisBottom(x2),
        yAxis = d3.axisLeft(y),
        yVolumeAxis = d3.axisRight(yVolume);

    // format yVolume axis
    let f = d3.formatPrefix(",.0", 1e6);
    yVolumeAxis.tickFormat(f).ticks(4);

    // create one-dimensional brush along X axis
    let brush = d3.brushX()
      .extent([[0, 0], [width, height2]])
      .on("brush end", brushed);

    let line = d3.line()
      .x((d:any) => x2(d.Date))
      .y((d:any) => y2(d.Close));

    svg.append("defs")
      .append("clipPath")
      .attr("id", "clip")
      .append("rect")
      .attr("width", width)
      .attr("height", height);

    let chart = svg.append("g")
      .attr("class", "chart")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    let context = svg.append("g")
      .attr("class", "context")
      .attr("transform", "translate(" + margin2.left + "," + margin2.top + ")");

    // calc rectangle width  
    let rectWidth = 0.5 * (width - (margin.left + margin.right)) / dataArray.length;

    // create volume
    let volume = chart.append('g')
      .attr('class', 'volume')
      .attr("fill", "#ccc")
      .selectAll('rect.volume')
      .data(dataArray)
      .enter()
      .append("rect")
      .attr("x", (d: any) => x(d.Date) - 0.5 * rectWidth )
      .attr("y", (d: any) => yVolume(d.Volume) )      
      .attr("height", (d: any) => yVolume(-d.Volume) )
      .attr("width", (d: any) => rectWidth )

    // create rectangles
    let rectangles = chart.append('g')
      .attr('class', "rectangles")
      .selectAll('rect.candle')
      .data(dataArray)
      .enter()
      .append("rect")
      .attr("x", (d: any) => x(d.Date) - 0.5 * rectWidth )
      .attr("y", (d: any) => y(maxMy(d.Open, d.Close)) )      
      .attr("height", (d: any) => y(minMy(d.Open, d.Close)) - y(maxMy(d.Open, d.Close)) )
      .attr("width", (d: any) => rectWidth )
      .attr("fill", (d: any) => d.Open > d.Close ? "red" : "green" )

    // create vertical lines
    let lines = chart.append('g')
      .attr('class', 'lines')
      .selectAll('line.v')
      .data(dataArray)
      .enter()
      .append('line')
      .attr('x1', (d: any) => x(d.Date) )
      .attr('x2', (d: any) => x(d.Date) )
      .attr('y1', (d: any) => y(d.High))
      .attr('y2', (d: any) => y(d.Low))
      .attr('stroke', (d: any) => d.Close > d.Open ? 'green' : 'red')
      .attr('stroke-width', 1);

    chart.append("g")
      .attr("class", "axis axis-x")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

    chart.append("g")
      .attr("class", "axis axis-y")
      .call(yAxis);

    //create volume axis
    chart.append("g")
      .attr("class", "axis axis-y-volume")
      .call(yVolumeAxis);

    chart.append("g")
      .attr("class", "y axis")
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".75rem")
      .style("text-anchor", "end")
      .style("font-size", "12px")
      .text("Price ($)");

    // create line chart of stock close prices
    context.append('path')
      .datum(dataArray)
      .attr('class', 'path')
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round")
      .attr("stroke-width", 1)
      .attr("d", line);

    // create xAxis2
    context.append("g")
      .attr("class", "axis axis--x")
      .attr("transform", "translate(0," + height2 + ")")
      .call(xAxis2);

    // call brush on lower chart
    context.append("g")
      .attr("class", "brush")
      .call(brush);


    function brushed() {
      
      let selection = d3.select(".selection");
      if (d3.event.selection == null) {
        selection.attr("display", "none");
      } else {
        selection.attr("display", "inline");
      }
      let s = d3.event.selection || x2.range(); // [num, num]

      x.domain(s.map(x2.invert));

      chart.select(".axis-x").call(xAxis);

      // update volume
      volume
        .attr("x", (d: any) => x(d.Date) - 0.5 * rectWidth )
        .attr("y", (d: any) => yVolume(d.Volume) )      
        .attr("height", (d: any) => yVolume(-d.Volume) )
        .attr("width", (d: any) => rectWidth );

      // update candles
      rectangles
        .attr("x", (d: any) => x(d.Date) - 0.5 * rectWidth )
        .attr("y", (d: any) => y(maxMy(d.Open, d.Close)) )      
        .attr("height", (d: any) => y(minMy(d.Open, d.Close)) - y(maxMy(d.Open, d.Close)) )
        .attr("width", (d: any) => rectWidth )
        .attr("fill", (d: any) => d.Open > d.Close ? "red" : "green" );

      // update lines
      lines
        .attr('x1', (d: any) => x(d.Date) )
        .attr('x2', (d: any) => x(d.Date) )
        .attr('y1', (d: any) => y(d.High))
        .attr('y2', (d: any) => y(d.Low))
        .attr('stroke', (d: any) => d.Close > d.Open ? 'green' : 'red')
        .attr('stroke-width', 1);

    }
  }
}
