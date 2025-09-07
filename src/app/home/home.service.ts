import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class HomeService {

  constructor(private http: HttpClient) { }
  private apiurl = "https://judge0-ce.p.rapidapi.com"
  // private apikey = "16cd7f1b05mshbe81643a1c7cce6p1d1cdajsn04682c5dab0c"
  private apikey = "f4eeeeddbemsheb80a9a6cbac75cp1f41e8jsn7edaf3e0f06f"
  private apihost = "judge0-ce.p.rapidapi.com"

  headers = new HttpHeaders()
    .set('x-rapidapi-key', this.apikey)
    .set('x-rapidapi-host', this.apihost);

  getLanguages() {
    return this.http.get(this.apiurl + "/languages", { headers: this.headers })

  }
  submission(payload:any){
    return this.http.post(this.apiurl + "/submissions", payload,{headers:this.headers})
  }
  getSubmission(token:any){
    return this.http.get(`${this.apiurl}/submissions/${token}`, { headers: this.headers });
  }
}

