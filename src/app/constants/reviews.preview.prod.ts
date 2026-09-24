// Production stand-in for reviews.preview.ts (swapped in via "fileReplacements" in angular.json),
// so preview reviews are never shipped in a production build.

import { CustomerReview } from './reviews';

export const PREVIEW_REVIEWS: CustomerReview[] = [];
