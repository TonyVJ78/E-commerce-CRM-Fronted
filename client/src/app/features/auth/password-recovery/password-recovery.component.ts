import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-password-recovery',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './password-recovery.component.html',
  styleUrls: ['./password-recovery.component.css']
})
export class PasswordRecoveryComponent {
  requestForm: FormGroup;
  resetForm: FormGroup;
  mode: 'request' | 'reset' = 'request';
  message = '';
  errorMessage = '';
  loading = false;
  uid = '';
  token = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private route: ActivatedRoute
  ) {
    this.requestForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });

    this.resetForm = this.fb.group({
      new_password: ['', [Validators.required, Validators.minLength(8)]],
      new_password_confirm: ['', [Validators.required]]
    });

    // Detectar si estamos en modo "reset" por parámetros de ruta
    this.route.params.subscribe(params => {
      if (params['uid'] && params['token']) {
        this.mode = 'reset';
        this.uid = params['uid'];
        this.token = params['token'];
      }
    });
  }

  onRequestSubmit(): void {
    if (this.requestForm.invalid) return;

    this.loading = true;
    this.message = '';
    this.errorMessage = '';

    this.authService.requestPasswordReset(this.requestForm.value.email).subscribe({
      next: (res) => {
        this.loading = false;
        this.message = res.mensaje || 'Si el correo existe, recibirás un enlace de recuperación.';
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Error al procesar la solicitud. Intenta de nuevo.';
      }
    });
  }

  onResetSubmit(): void {
    if (this.resetForm.invalid) return;

    const { new_password, new_password_confirm } = this.resetForm.value;
    if (new_password !== new_password_confirm) {
      this.errorMessage = 'Las contraseñas no coinciden.';
      return;
    }

    this.loading = true;
    this.message = '';
    this.errorMessage = '';

    this.authService.confirmPasswordReset(this.uid, this.token, new_password, new_password_confirm).subscribe({
      next: (res) => {
        this.loading = false;
        this.message = res.mensaje || 'Contraseña restablecida exitosamente. Ya puedes iniciar sesión.';
      },
      error: (err) => {
        this.loading = false;
        if (err.error && typeof err.error === 'object') {
          const messages = Object.values(err.error).flat();
          this.errorMessage = (messages as string[]).join(' ');
        } else {
          this.errorMessage = 'Error al restablecer la contraseña. El enlace puede haber expirado.';
        }
      }
    });
  }
}
