
import { Component, signal } from '@angular/core';

import {
  RouterLink,
  RouterLinkActive,
  RouterOutlet
} from '@angular/router';

@Component({
  selector: 'app-saas-shell',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet
  ],
  templateUrl: './saas-shell.component.html',
  styleUrls: ["./saas-shell.css", "./saas-shell.component.css"]
})
export class SaasShellComponent {

  readonly menuAbierto = signal(false);

  alternarMenu(): void {
    this.menuAbierto.update(
      abierto => !abierto
    );
  }

  cerrarMenu(): void {
    this.menuAbierto.set(false);
  }
}

