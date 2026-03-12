import { Component, EventEmitter, Input, Output } from "@angular/core";

@Component({
  selector: 'app-login',
  template: `
    <div class="modal-card">
      <h2>Enter PIN</h2>
      <input type="password" />
      <button (click)="submit()">Login</button>
    </div>
  `
})
export class LoginComponent {
  @Input()  users: string[] = [];       // who can log in
  @Output() loginSuccess = new EventEmitter<string>();

  submit() {
    //const user = this.users.find(u => u.pin === this.pin);
    //if (user) this.loginSuccess.emit(user);
  }
}