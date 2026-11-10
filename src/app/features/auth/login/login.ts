import { Component, inject, signal } from '@angular/core';
import {
  ReactiveFormsModule,
  FormControl,
  FormGroup,
  Validators
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly mostrarPassword = signal(false);
  readonly mensaje = signal('');
  readonly cargando = signal(false);

  readonly formulario = new FormGroup({
    correo: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.email
      ]
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required]
    })
  });

  alternarPassword(): void {
    this.mostrarPassword.update(valor => !valor);
  }

  iniciarSesion(): void {
    this.mensaje.set('');

    if (this.cargando()) {
      return;
    }

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const { correo, password } =
      this.formulario.getRawValue();

    this.cargando.set(true);

    this.auth.iniciarSesion(correo, password).subscribe({
      next: () => {
        this.formulario.controls.password.reset();

        const retorno =
          this.route.snapshot.queryParamMap.get('returnUrl');

        const destino =
          retorno === '/superadmin' ||
          retorno?.startsWith('/superadmin/')
            ? retorno
            : '/superadmin';

        void this.router.navigateByUrl(destino);
      },

      error: (error: unknown) => {
        this.cargando.set(false);

        if (error instanceof HttpErrorResponse) {
          if (error.status === 401) {
            this.mensaje.set(
              'Las credenciales no son válidas.'
            );
          } else if (error.status === 403) {
            this.mensaje.set(
              'Tu cuenta no tiene permiso para acceder.'
            );
          } else {
            this.mensaje.set(
              'No fue posible comunicarse con el servidor.'
            );
          }
          return;
        }

        this.mensaje.set(
          error instanceof Error
            ? error.message
            : 'No se pudo iniciar sesión.'
        );
      },

      complete: () => {
        this.cargando.set(false);
      }
    });
  }
}