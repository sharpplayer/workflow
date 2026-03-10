import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { StatusLine } from './component/StatusLine';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, StatusLine],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('matchboard-client');
}
