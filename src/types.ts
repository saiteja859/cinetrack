/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum ItemStatus {
  PLANNED = 'planned',
  WATCHING = 'watching',
  COMPLETED = 'completed',
  OVERDUE = 'overdue',
}

export enum ItemType {
  MOVIE = 'movie',
  SERIES = 'series',
  ANIME = 'anime',
}

export interface Movie {
  id: string; // OMDB ID or Jikan ID
  title: string;
  year: string;
  poster: string;
  type: ItemType;
  genre?: string;
  runtime?: string;
  plot?: string;
  rating?: string;
  score?: number; // External rating score
  source?: 'omdb' | 'jikan' | 'manual';
}

export interface TrackedItem {
  id: string;
  title: string;
  year: string;
  poster: string;
  type: ItemType;
  status: ItemStatus;
  progress: number; // % or ep count
  total?: number; // total duration or total eps
  lastWatched?: string;
  rating?: number;
  userId: string;
  createdAt: string;
  updatedAt: string;
  plannedDate?: string;
  genre?: string;
  plot?: string;
  source?: 'omdb' | 'jikan' | 'manual';
}

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  totalWatchTime: number;
}
