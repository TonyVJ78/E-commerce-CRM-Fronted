import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  profileForm: FormGroup;
  perfil: any = null;
  editing = false;
  message = '';
  errorMessage = '';
  loading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) {
    this.profileForm = this.fb.group({
      first_name: ['', [Validators.required, Validators.maxLength(150)]],
      last_name: ['', [Validators.required, Validators.maxLength(150)]]
    });
  }

  ngOnInit(): void {
    this.loadPerfil();
  }

  loadPerfil(): void {
    this.loading = true;
    this.authService.getPerfil().subscribe({
      next: (data) => {
        this.perfil = data;
        this.profileForm.patchValue({
          first_name: data.first_name,
          last_name: data.last_name
        });
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Error al cargar el perfil.';
        this.loading = false;
      }
    });
  }

  toggleEdit(): void {
    this.editing = !this.editing;
    this.message = '';
    this.errorMessage = '';
  }

  onSubmit(): void {
    if (this.profileForm.invalid) return;

    this.loading = true;
    this.message = '';
    this.errorMessage = '';

    this.authService.updatePerfil(this.profileForm.value).subscribe({
      next: (data) => {
        this.perfil = data;
        this.editing = false;
        this.loading = false;
        this.message = 'Perfil actualizado exitosamente.';
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = 'Error al actualizar el perfil.';
      }
    });
  }
}
