import { Component } from "@angular/core";
import {JobComponent } from "../job/job.component"

@Component({
    selector: 'app-job-page',
    standalone : true,
    template: `
    <div class="full-screen-center">
      <job></job> 
    </div>
  `,
    imports : [JobComponent]
})

export class JobPageComponent {
}