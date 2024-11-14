import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { CommonModule } from '@angular/common';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { LoginComponent } from './components/login/login.component';
import { RegistrarUsuarioComponent } from './components/registrar-usuario/registrar-usuario.component';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { PerfilComponent } from './components/perfil/perfil.component';
import { UpdateperfilComponent } from './components/updateperfil/updateperfil.component';
import { ConfirmDialogComponent } from './components/confirm-dialog/confirm-dialog.component';
import { HomeComponent } from './components/home/home.component';
import { MatDialogModule } from '@angular/material/dialog';
import { CourseFormComponent } from './components/course-form/course-form.component';
import { CourseListComponent } from './components/course-list/course-list.component';
import { CourseCategoryListComponent } from './components/course-category-list/course-category-list.component';
import { CourseDetailsComponent } from './components/course-details/course-details.component';
import { MyCoursesStudentComponent } from './components/my-courses-student/my-courses-student.component';
import { SuccessDialogComponent } from './components/success-dialog/success-dialog.component';
import { CourseDetailsTutorComponent } from './components/course-details-tutor/course-details-tutor.component';
import { CourseEditTutorComponent } from './components/course-edit-tutor/course-edit-tutor.component';
import { LessonFormComponent } from './components/lesson-form/lesson-form.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { NavbarComponent } from './components/navbar/navbar.component';
import { LessonDetailsComponent } from './components/lesson-details/lesson-details.component';
import { LessonEditComponent } from './components/lesson-edit/lesson-edit.component';
import { ConfirmationDialogComponent } from './components/confirmation-dialog/confirmation-dialog.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { ThemeEditComponent } from './components/theme-edit/theme-edit.component';
import { TemaFormComponent } from './components/tema-form/tema-form.component';
import { SnackBarComponent } from './shared/snack-bar/snack-bar.component';

@NgModule({
  declarations: [
    AppComponent,
    NavbarComponent,
    LoginComponent,
    RegistrarUsuarioComponent,
    ForgotPasswordComponent,
    PerfilComponent,
    UpdateperfilComponent,
    ConfirmDialogComponent,
    HomeComponent,
    CourseFormComponent,
    CourseListComponent,
    CourseCategoryListComponent,
    CourseDetailsComponent,
    MyCoursesStudentComponent,
    SuccessDialogComponent,
    CourseDetailsTutorComponent,
    CourseEditTutorComponent,
    LessonFormComponent,
    LessonDetailsComponent,
    LessonEditComponent,
    ConfirmationDialogComponent,
    ThemeEditComponent,
    TemaFormComponent,
    SnackBarComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    AppRoutingModule,
    RouterModule,
    FontAwesomeModule,
    CommonModule,
    MatDialogModule,
    BrowserAnimationsModule,
    MatSnackBarModule,
    MatToolbarModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatCardModule
  ],
  providers: [],
  bootstrap: [AppComponent],
  schemas: [NO_ERRORS_SCHEMA]
})
export class AppModule { }
