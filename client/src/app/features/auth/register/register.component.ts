import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  registerForm: FormGroup;
  errorMessage = '';
  successMessage = '';
  loading = false;
  showPassword = false;
  showPasswordConfirm = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      first_name: ['', [Validators.required, Validators.maxLength(150)]],
      last_name: ['', [Validators.required, Validators.maxLength(150)]],
      rol_id: [3], // 3 = cliente por defecto
      password: ['', [Validators.required, this.passwordComplexityValidator]],
      password_confirm: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  passwordComplexityValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value || '';
    if (!value) return null;

    const hasMinLength = value.length >= 8;
    const hasLetter = /[a-zA-Z]/.test(value);
    const hasNumber = /[0-9]/.test(value);
    const hasSpecial = /[^a-zA-Z0-9]/.test(value);

    const errors: ValidationErrors = {};
    if (!hasMinLength) errors['minLength'] = true;
    if (!hasLetter) errors['missingLetter'] = true;
    if (!hasNumber) errors['missingNumber'] = true;
    if (!hasSpecial) errors['missingSpecial'] = true;

    return Object.keys(errors).length > 0 ? errors : null;
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirm = control.get('password_confirm');
    if (password && confirm && password.value !== confirm.value) {
      return { passwordMismatch: true };
    }
    return null;
  }

  // Helpers para la guía visual de requisitos en tiempo real
  get hasMinLength(): boolean {
    return (this.registerForm.get('password')?.value || '').length >= 8;
  }

  get hasLetter(): boolean {
    return /[a-zA-Z]/.test(this.registerForm.get('password')?.value || '');
  }

  get hasNumber(): boolean {
    return /[0-9]/.test(this.registerForm.get('password')?.value || '');
  }

  get hasSpecial(): boolean {
    return /[^a-zA-Z0-9]/.test(this.registerForm.get('password')?.value || '');
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  togglePasswordConfirmVisibility(): void {
    this.showPasswordConfirm = !this.showPasswordConfirm;
  }

  onSubmit(): void {
    if (this.registerForm.invalid) return;

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.registro(this.registerForm.value).subscribe({
      next: () => {
        this.successMessage = '¡Cuenta creada exitosamente! Redirigiendo al login...';
        setTimeout(() => this.router.navigate(['/login']), 2000);
      },
      error: (err) => {
        this.loading = false;
        if (err.error && typeof err.error === 'object') {
          const messages = Object.values(err.error).flat();
          this.errorMessage = messages.join(' ');
        } else {
          this.errorMessage = 'Error al registrar. Intenta de nuevo.';
        }
      }
    });
  }
}
