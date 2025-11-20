/**
 * Add firstPostDate to species-hierarchy-index.json
 *
 * This script reads all individual species JSON files and adds the firstPostDate
 * field to each subspecies in the hierarchy.
 */

import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(process.cwd(), 'public/data');
const HIERARCHY_FILE = path.join(DATA_DIR, 'species-hierarchy-index.json');
const SPECIES_DIR = path.join(DATA_DIR, 'species');

interface Post {
  id: string;
  date: string;
  timestamp: number;
}

interface SpeciesData {
  species: {
    id: string;
    [key: string]: any;
  };
  posts: Post[];
}

interface SubSpecies {
  id: string;
  file: string;
  latestPostDate?: string;
  firstPostDate?: string;
  [key: string]: any;
}

interface Species {
  id: string;
  file?: string;
  subSpecies?: SubSpecies[];
  latestPostDate?: string;
  firstPostDate?: string;
  [key: string]: any;
}

interface HierarchyData {
  meta: any;
  species: any[];
  hierarchy: Species[];
}

/**
 * Get first and last post dates from a species JSON file
 */
function getPostDates(speciesId: string): { firstPostDate: string | null; latestPostDate: string | null } {
  const filePath = path.join(SPECIES_DIR, `${speciesId}.json`);

  if (!fs.existsSync(filePath)) {
    console.warn(`Warning: File not found for ${speciesId}: ${filePath}`);
    return { firstPostDate: null, latestPostDate: null };
  }

  try {
    const data: SpeciesData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    if (!data.posts || data.posts.length === 0) {
      console.warn(`Warning: No posts found for ${speciesId}`);
      return { firstPostDate: null, latestPostDate: null };
    }

    // Posts are sorted from newest to oldest
    const latestPost = data.posts[0];
    const firstPost = data.posts[data.posts.length - 1];

    return {
      firstPostDate: firstPost.date,
      latestPostDate: latestPost.date
    };
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return { firstPostDate: null, latestPostDate: null };
  }
}

/**
 * Main function
 */
function main() {
  console.log('Reading hierarchy file...');
  const hierarchyData: HierarchyData = JSON.parse(fs.readFileSync(HIERARCHY_FILE, 'utf-8'));

  let updatedCount = 0;

  console.log('Processing hierarchy...');

  // Process each species in hierarchy
  for (const species of hierarchyData.hierarchy) {
    // If this is a hybrid or species with its own file, add dates
    if (species.file) {
      const dates = getPostDates(species.id);
      if (dates.firstPostDate) {
        species.firstPostDate = dates.firstPostDate;
        if (dates.latestPostDate) {
          species.latestPostDate = dates.latestPostDate;
        }
        updatedCount++;
        console.log(`✓ ${species.id}: ${dates.firstPostDate} ~ ${dates.latestPostDate}`);
      }
    }

    // Process subspecies
    if (species.subSpecies && species.subSpecies.length > 0) {
      for (const subspecies of species.subSpecies) {
        const dates = getPostDates(subspecies.id);
        if (dates.firstPostDate) {
          subspecies.firstPostDate = dates.firstPostDate;
          if (dates.latestPostDate) {
            subspecies.latestPostDate = dates.latestPostDate;
          }
          updatedCount++;
          console.log(`  ✓ ${subspecies.id}: ${dates.firstPostDate} ~ ${dates.latestPostDate}`);
        }
      }
    }
  }

  // Also update the top-level species array
  console.log('\nProcessing top-level species array...');
  for (const species of hierarchyData.species) {
    const dates = getPostDates(species.id);
    if (dates.firstPostDate) {
      species.firstPostDate = dates.firstPostDate;
      // latestPostDate should already exist, but update if needed
      if (dates.latestPostDate && !species.latestPostDate) {
        species.latestPostDate = dates.latestPostDate;
      }
      console.log(`✓ ${species.id}: ${dates.firstPostDate} ~ ${species.latestPostDate}`);
    }
  }

  // Write back to file
  console.log(`\nUpdating hierarchy file with ${updatedCount} firstPostDate fields...`);
  fs.writeFileSync(
    HIERARCHY_FILE,
    JSON.stringify(hierarchyData, null, 2),
    'utf-8'
  );

  console.log('✅ Done! firstPostDate added to all species and subspecies.');
}

main();
