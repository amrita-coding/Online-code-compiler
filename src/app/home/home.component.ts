import { Component } from '@angular/core';
import { HomeService } from './home.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
// import { co} from '@angular/forms';


@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  constructor(private service: HomeService) { }

  isLoading = false;
  languages: any
  sourceCode: any
  input: any = null
  output: any
  langId: any
  token: any
  ngOnInit(): void {

    this.service.getLanguages().subscribe(data => {
      this.languages = data
    })


  }
  onRun() {
    this.isLoading = true;  
    this.output = null
    const payload = {
      "source_code": this.sourceCode,
      "language_id": this.langId,
      "stdin": this.input
    }
    console.log(payload)
    this.service.submission(payload).subscribe(data => {
      this.token = data
      this.token = this.token['token']


      setTimeout(() => {
        this.service.getSubmission(this.token).subscribe(stdout => {
          this.output = stdout
          this.output = this.output['stdout']
        })
         this.isLoading = false;
      }, 5000)

      // while (true) {
      //   if (this.output['status']['id'] == 3) {
      //     this.output = this.output['stdout']
      //     break;
      //   }
      //   else {
      //     this.service.getSubmission(this.token).subscribe(stdout => {
      //       this.output = stdout

      //     })
      //   }
      // }

    })

  }



}
