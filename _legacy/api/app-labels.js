const path = require('path');
const fs = require('fs');
const { categorizeCollection, COLLECTION_CATEGORIES, titleCase } = require('./_labels');

const dataPath = path.join(__dirname, '..', 'data', 'collections.json');
const allCollections = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Pre-build the labels map from static data
const labelsMap = {};

for (const col of allCollections) {
  const cat = categorizeCollection(col.name);
  if (!cat || cat.category === 'org') continue;

  const targetKey = cat.category === 'subject' ? 'subjects'
    : cat.category === 'grade' ? 'grades'
    : 'useCases';

  for (const app of col.apps) {
    if (!app.id) continue;
    if (!labelsMap[app.id]) {
      labelsMap[app.id] = { subjects: [], grades: [], useCases: [] };
    }
    if (!labelsMap[app.id][targetKey].includes(cat.label)) {
      labelsMap[app.id][targetKey].push(cat.label);
    }
  }
}

const filterOptions = {
  subjects: COLLECTION_CATEGORIES.subject.map(titleCase).sort(),
  grades: COLLECTION_CATEGORIES.grade.map(titleCase),
  useCases: COLLECTION_CATEGORIES.useCase.map(titleCase).sort(),
};

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.status(200).json({ labels: labelsMap, filterOptions });
};
