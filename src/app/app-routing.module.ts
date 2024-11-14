import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LoginComponent } from './components/login/login.component';
import { RegistrarUsuarioComponent } from './components/registrar-usuario/registrar-usuario.component';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { PerfilComponent } from './components/perfil/perfil.component';
import { UpdateperfilComponent } from './components/updateperfil/updateperfil.component';
import { HomeComponent } from './components/home/home.component';
import { CourseListComponent } from './components/course-list/course-list.component';
import { CourseFormComponent } from './components/course-form/course-form.component';
import { CourseCategoryListComponent } from './components/course-category-list/course-category-list.component';
import { CourseDetailsComponent } from './components/course-details/course-details.component';
import { MyCoursesStudentComponent } from './components/my-courses-student/my-courses-student.component';
import { CourseDetailsTutorComponent } from './components/course-details-tutor/course-details-tutor.component';
import { CourseEditTutorComponent } from './components/course-edit-tutor/course-edit-tutor.component';
import { LessonFormComponent } from './components/lesson-form/lesson-form.component';
import { LessonDetailsComponent } from './components/lesson-details/lesson-details.component';
import { LessonEditComponent } from './components/lesson-edit/lesson-edit.component';
import { ThemeEditComponent } from './components/theme-edit/theme-edit.component';
import { TemaFormComponent } from './components/tema-form/tema-form.component';

const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'home', component: HomeComponent },
  { path: 'perfil', component: PerfilComponent },
  { path: 'updateperfil', component: UpdateperfilComponent },
  { path: 'registrar', component: RegistrarUsuarioComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'my-courses', component: CourseListComponent },
  { path: 'create-course', component: CourseFormComponent },
  { path: 'course-categories', component: CourseCategoryListComponent },
  { path: 'course-details/:id', component: CourseDetailsComponent },
  { path: 'my-courses-student', component: MyCoursesStudentComponent },
  { path: 'course-details-tutor/:id', component: CourseDetailsTutorComponent },
  { path: 'course-edit-tutor', component: CourseEditTutorComponent },
  { path: 'lesson-form/:id', component: LessonFormComponent },
  { path: 'lesson-details/:id', component: LessonDetailsComponent },
  { path: 'tema-form/:id', component: TemaFormComponent },
  { path: 'lesson-edit/:id', component: LessonEditComponent },
  { path: 'theme-edit/:id', component: ThemeEditComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {

  userId: number | null = null;

}
