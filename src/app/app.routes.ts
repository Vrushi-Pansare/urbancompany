import { Routes } from '@angular/router';
import { HomeComponent } from './modules/home/home.component';
import { WallPanelsComponent } from './modules/wall-panels/wall-panels.component';
import { NativeComponent } from './modules/native/native.component';
import { BeautyComponent } from './modules/beauty/beauty.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'wall-panels', component: WallPanelsComponent },
  { path: 'native', component: NativeComponent },
  { path: 'beauty', component: BeautyComponent },
  { path: '**', redirectTo: '' }
];

