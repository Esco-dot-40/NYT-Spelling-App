import dictionaryText from './dictionary.txt?raw';

interface PuzzleData {
  centerLetter: string;
  outerLetters: string[];
  validWords: string[];
  pangrams: string[];
  maxScore: number;
}

// Parse dictionary once
const DICTIONARY = dictionaryText
  .split('\n')
  .map(w => w.trim().toLowerCase())
  .filter(w => w.length >= 4);

/**
 * Check if a word can be formed using only the allowed letters
 */
const canFormWord = (word: string, allowedLetters: Set<string>): boolean => {
  return [...word].every(char => allowedLetters.has(char));
};

/**
 * Check if a word uses all 7 letters (pangram)
 */
const isPangram = (word: string, allLetters: Set<string>): boolean => {
  const wordLetters = new Set([...word]);
  return allLetters.size === wordLetters.size &&
    [...allLetters].every(letter => wordLetters.has(letter));
};

/**
 * Calculate score for a word
 */
const calculateWordScore = (word: string, isPangram: boolean): number => {
  if (word.length === 4) return 1;
  if (isPangram) return word.length + 7;
  return word.length;
};

/**
 * Generate a valid puzzle from a set of letters
 */
export const generatePuzzle = (centerLetter: string, outerLetters: string[]): PuzzleData => {
  const center = centerLetter.toLowerCase();
  const outer = outerLetters.map(l => l.toLowerCase());
  const allLetters = new Set([center, ...outer]);
  const allowedLetters = new Set(allLetters);

  const validWords: string[] = [];
  const pangrams: string[] = [];
  let maxScore = 0;

  for (const word of DICTIONARY) {
    // Must contain center letter
    if (!word.includes(center)) continue;

    // Must only use allowed letters
    if (!canFormWord(word, allowedLetters)) continue;

    validWords.push(word);
    const wordIsPangram = isPangram(word, allLetters);

    if (wordIsPangram) {
      pangrams.push(word);
    }

    maxScore += calculateWordScore(word, wordIsPangram);
  }

  return {
    centerLetter: centerLetter.toUpperCase(),
    outerLetters: outer.map(l => l.toUpperCase()),
    validWords,
    pangrams,
    maxScore,
  };
};

/**
 * Generate a seeded random number (for consistent daily puzzles)
 */
const seededRandom = (seed: number): number => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

/**
 * Shuffle array with seed for consistency
 */
const shuffleWithSeed = <T>(array: T[], seed: number): T[] => {
  const shuffled = [...array];
  let currentIndex = shuffled.length;

  while (currentIndex !== 0) {
    seed = (seed * 9301 + 49297) % 233280;
    const randomIndex = Math.floor((seed / 233280) * currentIndex);
    currentIndex--;
    [shuffled[currentIndex], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[currentIndex],
    ];
  }

  return shuffled;
};

/**
 * Get numeric seed from date string
 */
const getDateSeed = (dateString?: string | null): number => {
  const date = dateString ? new Date(dateString) : new Date();
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  // Multiply by a large factor to ensure daily seeds are far apart
  // and won't be reached by the search loop in generateRandomPuzzle
  return (year * 10000 + month * 100 + day) * 10000;
};

/**
 * Pick random letters and generate a puzzle (with optional seed for consistency)
 * Ensures at least some valid words exist
 */
export const generateRandomPuzzle = (seed?: number): PuzzleData => {
  const vowels = ['a', 'e', 'i', 'o', 'u'];
  const commonConsonants = ['r', 't', 'n', 's', 'l', 'c', 'd', 'p', 'g', 'h', 'm', 'b'];

  let attempts = 0;
  const maxAttempts = 100;
  const useSeed = seed !== undefined;
  let currentSeed = seed || 0;

  while (attempts < maxAttempts) {
    // Pick 2-3 vowels and 4-5 consonants for better word coverage
    const numVowels = (useSeed ? seededRandom(currentSeed++) : Math.random()) > 0.5 ? 2 : 3;
    const numConsonants = 7 - numVowels;

    const selectedVowels = shuffleWithSeed(vowels, currentSeed++)
      .slice(0, numVowels);

    const selectedConsonants = shuffleWithSeed(commonConsonants, currentSeed++)
      .slice(0, numConsonants);

    const allLetters = [...selectedVowels, ...selectedConsonants];

    // Prefer a vowel or common consonant as center
    const centerIndex = useSeed
      ? Math.floor(seededRandom(currentSeed++) * allLetters.length)
      : Math.floor(Math.random() * allLetters.length);
    const centerLetter = allLetters[centerIndex];
    const outerLetters = allLetters.filter(l => l !== centerLetter);

    const puzzle = generatePuzzle(centerLetter, outerLetters);

    // Ensure puzzle has at least 20 words and at least 1 pangram
    if (puzzle.validWords.length >= 20 && puzzle.pangrams.length >= 1) {
      return puzzle;
    }

    attempts++;
    currentSeed += 10; // Jump seed for next attempt
  }

  // Fallback to a known good puzzle
  return generatePuzzle('e', ['r', 't', 'a', 'c', 'h', 's']);
};

/**
 * Get or create today's puzzle (same puzzle for the whole day)
 * Can optionally force a specific date for new puzzles
 */
export const getTodaysPuzzle = (forcedDate?: string | null): PuzzleData => {
  // Use UTC ISO date as the consistent key
  const dateKey = forcedDate || new Date().toISOString().split('T')[0];
  const storageKey = `velarix-daily-puzzle-${dateKey}`;

  // If not forcing a date, try to load today's puzzle from storage
  if (!forcedDate) {
    const stored = localStorage.getItem('velarix-daily-puzzle');

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.date === dateKey) {
          return parsed.puzzle;
        }
      } catch (e) {
        console.error('Failed to parse stored puzzle:', e);
      }
    }
  }

  // Generate new puzzle with seed based on date
  const seed = getDateSeed(forcedDate);
  const puzzle = generateRandomPuzzle(seed);

  // Only save to main storage if it's today's actual puzzle (not forced)
  if (!forcedDate) {
    localStorage.setItem('velarix-daily-puzzle', JSON.stringify({
      date: dateKey,
      puzzle,
    }));
  }

  return puzzle;
};
