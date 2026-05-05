/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import axios from 'axios';
import { Movie, ItemType } from '../types';

const API_KEY = 'e6f7ee0f';
const OMDB_BASE_URL = 'https://www.omdbapi.com/';
const JIKAN_BASE_URL = 'https://api.jikan.moe/v4';

const PLACEHOLDER_POSTER = 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&q=80&w=400';

export async function searchMovies(query: string): Promise<Movie[]> {
  if (!query) return [];
  
  try {
    const [omdbItems, jikanItems] = await Promise.all([
      searchOMDB(query),
      searchJikan(query)
    ]);

    // Merge and sort by year or just return combined
    return [...omdbItems, ...jikanItems].sort((a, b) => b.year.localeCompare(a.year));
  } catch (error) {
    console.error('Unified Search Error:', error);
    return [];
  }
}

async function searchOMDB(query: string): Promise<Movie[]> {
  try {
    const response = await axios.get(OMDB_BASE_URL, {
      params: { apikey: API_KEY, s: query }
    });

    if (response.data.Response === 'True') {
      return response.data.Search.map((m: any) => ({
        id: m.imdbID,
        title: m.Title,
        year: m.Year,
        poster: m.Poster !== 'N/A' ? m.Poster : PLACEHOLDER_POSTER,
        type: m.Type === 'movie' ? ItemType.MOVIE : ItemType.SERIES,
        source: 'omdb'
      }));
    }
    return [];
  } catch (error) {
    console.error('OMDB Search Error:', error);
    return [];
  }
}

async function searchJikan(query: string): Promise<Movie[]> {
  try {
    const response = await axios.get(`${JIKAN_BASE_URL}/anime`, {
      params: { q: query, limit: 10 }
    });

    if (response.data.data) {
      return response.data.data.map((a: any) => ({
        id: `anime-${a.mal_id}`,
        title: a.title,
        year: a.aired?.from ? new Date(a.aired.from).getFullYear().toString() : 'N/A',
        poster: a.images?.jpg?.large_image_url || PLACEHOLDER_POSTER,
        type: ItemType.ANIME,
        source: 'jikan'
      }));
    }
    return [];
  } catch (error) {
    console.error('Jikan Search Error:', error);
    return [];
  }
}

export async function getMovieDetails(id: string, source: 'omdb' | 'jikan' | 'manual' = 'omdb'): Promise<Movie | null> {
  if (source === 'manual') return null; // Logic for manual usually handled in-app
  if (id.startsWith('anime-') || source === 'jikan') {
    const animeId = id.replace('anime-', '');
    return getAnimeDetails(animeId);
  }

  try {
    const response = await axios.get(OMDB_BASE_URL, {
      params: { apikey: API_KEY, i: id, plot: 'full' }
    });

    if (response.data.Response === 'True') {
      const m = response.data;
      return {
        id: m.imdbID,
        title: m.Title,
        year: m.Year,
        poster: m.Poster !== 'N/A' ? m.Poster : PLACEHOLDER_POSTER,
        type: m.Type === 'movie' ? ItemType.MOVIE : ItemType.SERIES,
        genre: m.Genre,
        runtime: m.Runtime,
        plot: m.Plot,
        rating: m.imdbRating,
        source: 'omdb'
      };
    }
    return null;
  } catch (error) {
    console.error('OMDB Detail Error:', error);
    return null;
  }
}

async function getAnimeDetails(id: string): Promise<Movie | null> {
  try {
    const response = await axios.get(`${JIKAN_BASE_URL}/anime/${id}/full`);
    if (response.data.data) {
      const a = response.data.data;
      return {
        id: `anime-${a.mal_id}`,
        title: a.title,
        year: a.aired?.from ? new Date(a.aired.from).getFullYear().toString() : 'N/A',
        poster: a.images?.jpg?.large_image_url || PLACEHOLDER_POSTER,
        type: ItemType.ANIME,
        genre: a.genres?.map((g: any) => g.name).join(', '),
        runtime: a.duration,
        plot: a.synopsis,
        score: a.score,
        rating: a.score?.toString(),
        source: 'jikan'
      };
    }
    return null;
  } catch (error) {
    console.error('Jikan Detail Error:', error);
    return null;
  }
}
