import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Subject, from } from  'rxjs';
import { HttpClient } from '@angular/common/http';
import { DoorAccess } from '../dooraccess-model';
import { Observable} from 'rxjs';

declare const Pusher: any;

@Injectable({
  providedIn: 'root'
})
export class PusherService {
  pusher: any;
  messagesChannel: any;

  constructor(private http: HttpClient) {
    this.initializePusher();
  }

  
  initializePusher(): void {
    this.pusher = new Pusher(environment.pusher.key, {cluster: environment.pusher.cluster, encrypted: true});
    this.messagesChannel = this.pusher.subscribe('front-door-access');
    
  }

  openDoor(isOpen) : Observable<DoorAccess[]> {
    return this.http.get<DoorAccess[]>(environment.api_url + `dooraccess/${isOpen}`);
  }

  getUpdates(): Observable<DoorAccess[]> {
    let doorAccessSub = new Subject<DoorAccess[]>();
    let doorAccessSubObservable = from(doorAccessSub);
    this.messagesChannel.bind('new-access', (message) => {
      console.log(message);
      doorAccessSub.next(message);
    });
    return doorAccessSubObservable;
  }
}
