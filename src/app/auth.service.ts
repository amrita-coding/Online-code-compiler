import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { HttpResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../environments/environment';

export interface RegistrationRequest {
  username: string;
  email: string;
  password: string;
}

export interface RegistrationResponse {
  id: number;
  username: string;
  email: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  id: number;
  username: string;
  email: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/api/auth`;

  constructor(private http: HttpClient, private router: Router) { }

  register(request: RegistrationRequest): Observable<RegistrationResponse> {
    return this.http.post<RegistrationResponse>(`${this.apiUrl}/register`, request);
  }

  login(request: LoginRequest) : Observable<HttpResponse<LoginResponse>> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, request, { observe: 'response' });
  }

  logout(): Observable<any> {
    // Make an API call so the backend can blacklist the token.
    // We still clear the client-side session even if the call fails.
    return this.http.post(`${this.apiUrl}/logout`, {}).pipe(
      tap(() => this.clearSession()),
      catchError(err => {
        // Ensure local session is cleared even if the logout call fails
        this.clearSession();
        return of(null);
      })
    );
  }

  clearSession() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.router.navigate(['/']);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  saveCode(code: string, language: string): Observable<any> {
    const request = { code, language };
    return this.http.post(`${environment.apiUrl}/api/code/save`, request);
  }

  getUserCodes(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/api/code/user`);
  }
}
