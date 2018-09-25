import { Component, OnInit, ViewEncapsulation, ElementRef, ViewChild} from '@angular/core';
import { PusherService } from './services/pusher.service';
import { DoorAccess } from './dooraccess-model';

import * as d3 from 'd3-selection';
import * as d3Scale from 'd3-scale';
import * as d3Array from 'd3-array';
import * as d3Axis from 'd3-axis';

@Component({
  selector: 'app-root',
  encapsulation: ViewEncapsulation.None,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit{
  title = 'realtime-chart';
  doorAccess:Array<DoorAccess> = [];

  private width: number;
  private height: number;
  private margin = {top: 20, right: 20, bottom: 30, left: 40};

  private x: any;
  private y: any;
  private svg: any;
  private g: any;
  private drawAlready: boolean = false;

  constructor(private pusherSvc: PusherService) {}

  ngOnInit() {
    
    this.pusherSvc.getUpdates().subscribe((results)=>{
      if(this.drawAlready){
        console.log("refresh chart !")
        //remove and create svg
        d3.select("svg").remove(); 
        this.svg = d3.select("body").select("div").append("svg").attr("width","1200").attr("height", "500");
        this.svg.append("g");
      }
        
      this.initSvg();
      console.log(results);
      this.doorAccess = [];
      results.forEach((element)=>{
          console.log(">" + element.date);
          console.log(element.counter);
          let dV = {'date' : element.date, 'counter': Number(element.counter)};
          this.doorAccess.push(dV);
      })
      this.initAxis();
      this.drawAxis();
      this.drawBars();
    })
  }

  private initSvg() {
    this.svg = d3.select('svg');
    this.width = +this.svg.attr('width') - this.margin.left - this.margin.right;
    this.height = +this.svg.attr('height') - this.margin.top - this.margin.bottom;
    this.g = this.svg.append('g')
        .attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');
}

private initAxis() {
    this.x = d3Scale.scaleBand().rangeRound([0, this.width]).padding(0.1);
    this.y = d3Scale.scaleLinear().rangeRound([this.height, 0]);
    this.x.domain(this.doorAccess.map((d) => d.date));
    this.y.domain([0, d3Array.max(this.doorAccess, (d) => d.counter)]);
}

private drawAxis() {
    this.g.append('g')
        .attr('class', 'axis axis--x')
        .attr('transform', 'translate(0,' + this.height + ')')
        .call(d3Axis.axisBottom(this.x));
    this.g.append('g')
        .attr('class', 'axis axis--y')
        .call(d3Axis.axisLeft(this.y))
        .append('text')
        .attr('class', 'axis-title')
        .attr('transform', 'rotate(-90)')
        .attr('y', 6)
        .attr('dy', '0.71em')
        .attr('text-anchor', 'end')
        .text('Counter');
}

private drawBars() {
    console.log(this.doorAccess);
    this.g.selectAll('.bar')
        .data(this.doorAccess)
        .enter().append('rect')
        .attr('class', 'bar')
        .attr('x', (d) => this.x(d.date) )
        .attr('y', (d) => this.y(d.counter))
        .attr('width', this.x.bandwidth())
        .attr('height', (d) => this.height - this.y(d.counter));
    this.drawAlready = true;
}

  openDoor(){
    this.pusherSvc.openDoor(1).subscribe((results)=>{
      console.log(results);
      //this.doorAccess = results; 
    })
  }
}
