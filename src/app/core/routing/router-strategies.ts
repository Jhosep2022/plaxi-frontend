import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, BaseRouteReuseStrategy, RouterStateSnapshot, TitleStrategy } from '@angular/router';

// Título de la pestaña: "Mis cursos · QuizWiz"
@Injectable({ providedIn: 'root' })
export class QuizWizTitleStrategy extends TitleStrategy {
  private title = inject(Title);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const titulo = this.buildTitle(snapshot);
    this.title.setTitle(titulo ? `${titulo} · QuizWiz` : 'QuizWiz');
  }
}

// Recrea el componente cuando cambian los parámetros de la ruta
// (ej. /cursos/1 -> /cursos/2), así cada pantalla carga sus datos de nuevo.
@Injectable({ providedIn: 'root' })
export class RecrearConParametrosStrategy extends BaseRouteReuseStrategy {
  override shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
    return future.routeConfig === curr.routeConfig && mismosParametros(future, curr);
  }
}

function mismosParametros(a: ActivatedRouteSnapshot, b: ActivatedRouteSnapshot): boolean {
  const keys = new Set([...Object.keys(a.params), ...Object.keys(b.params)]);
  return [...keys].every((key) => a.params[key] === b.params[key]);
}
