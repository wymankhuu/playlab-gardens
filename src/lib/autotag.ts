// Maps keywords to collection tags for auto-suggestion on the share form.
// Based on COLLECTION_CATEGORIES from labels.ts.

const TAG_KEYWORDS: Record<string, string[]> = {
  // Subjects
  'Science & STEM': [
    'science', 'stem', 'biology', 'chemistry', 'physics', 'lab', 'experiment',
    'engineering', 'technology', 'robotics', 'coding', 'computer science',
    'programming', 'data science', 'environmental', 'ecology', 'anatomy',
    'genetics', 'astronomy', 'earth science', 'scientific',
  ],
  'Math': [
    'math', 'algebra', 'calculus', 'geometry', 'statistics', 'arithmetic',
    'fractions', 'equations', 'multiplication', 'division', 'number',
    'trigonometry', 'probability', 'graphing', 'mathematical', 'numeracy',
  ],
  'Illustrative Mathematics': [
    'illustrative mathematics', 'im math', 'illustrative math',
  ],
  'ELA & Literacy': [
    'ela', 'literacy', 'reading', 'writing', 'essay', 'grammar', 'vocabulary',
    'comprehension', 'phonics', 'spelling', 'literature', 'novel', 'poetry',
    'text', 'author', 'book', 'language arts', 'annotation', 'paragraph',
    'thesis', 'argument', 'narrative', 'fiction', 'nonfiction',
  ],
  'Social Studies & History': [
    'social studies', 'history', 'geography', 'civics', 'government',
    'economics', 'civilization', 'culture', 'political', 'revolution',
    'democracy', 'constitution', 'war', 'colonialism', 'ancient',
    'medieval', 'modern history', 'world history', 'us history',
  ],
  'Arts & Design': [
    'art', 'design', 'visual', 'drawing', 'painting', 'sculpture',
    'photography', 'graphic design', 'creative', 'illustration',
    'portfolio', 'aesthetic', 'color theory', 'digital art',
  ],
  'Business & Economics': [
    'business', 'economics', 'finance', 'entrepreneurship', 'marketing',
    'accounting', 'investing', 'stock', 'budget', 'profit', 'startup',
    'commerce', 'trade', 'supply', 'demand', 'economic',
  ],
  'Cultural Studies': [
    'cultural studies', 'cultural', 'diversity', 'heritage', 'tradition',
    'ethnic', 'multicultural', 'indigenous', 'anthropology',
  ],
  'Religious Studies': [
    'religious', 'religion', 'theology', 'faith', 'spiritual', 'bible',
    'scripture', 'church', 'mosque', 'temple', 'worship',
  ],
  'Health & PE': [
    'health', 'physical education', 'pe', 'fitness', 'nutrition',
    'exercise', 'wellness', 'body', 'sport', 'anatomy', 'mental health',
    'hygiene', 'first aid',
  ],
  'Music & Performing Arts': [
    'music', 'performing arts', 'theater', 'theatre', 'drama', 'choir',
    'band', 'orchestra', 'instrument', 'singing', 'dance', 'acting',
    'performance', 'musical',
  ],
  'World Languages': [
    'world languages', 'foreign language', 'spanish', 'french', 'mandarin',
    'chinese', 'german', 'japanese', 'arabic', 'portuguese', 'italian',
    'korean', 'language learning', 'translation', 'bilingual',
  ],

  // Grade levels
  'Elementary': [
    'elementary', 'primary', 'k-5', 'k-2', '3-5', 'kindergarten',
    'first grade', 'second grade', 'third grade', 'fourth grade',
    'fifth grade', '1st grade', '2nd grade', '3rd grade', '4th grade',
    '5th grade', 'young learners', 'early childhood',
  ],
  'Middle School': [
    'middle school', '6-8', 'sixth grade', 'seventh grade', 'eighth grade',
    '6th grade', '7th grade', '8th grade', 'junior high',
  ],
  'High School': [
    'high school', '9-12', 'ninth grade', 'tenth grade', 'eleventh grade',
    'twelfth grade', '9th grade', '10th grade', '11th grade', '12th grade',
    'secondary', 'ap ', 'advanced placement', 'sat', 'act', 'college prep',
  ],
  'Higher Ed': [
    'higher ed', 'college', 'university', 'undergraduate', 'graduate',
    'professor', 'postsecondary', 'post-secondary', 'higher education',
  ],

  // Use cases
  'Project-Based Learning': [
    'project-based', 'pbl', 'project based learning', 'capstone',
    'hands-on', 'inquiry', 'maker', 'makerspace',
  ],
  'Student-Built Apps': [
    'student-built', 'student built', 'student created', 'student made',
    'students build', 'students create',
  ],
  'Study Partners': [
    'study partner', 'study buddy', 'tutor', 'tutoring', 'practice',
    'quiz', 'flashcard', 'review', 'homework help', 'study guide',
    'test prep',
  ],
  'Writing Coaches': [
    'writing coach', 'writing tutor', 'essay feedback', 'peer review',
    'writing support', 'editing', 'proofreading', 'revision',
    'writing feedback', 'writing help', 'writing assistant',
  ],
  'Career & Vocational': [
    'career', 'vocational', 'job', 'resume', 'interview', 'workforce',
    'professional', 'internship', 'apprentice', 'trade', 'employment',
    'occupation', 'cte',
  ],
  'Assessment & Feedback': [
    'assessment', 'feedback', 'rubric', 'grading', 'evaluation',
    'formative', 'summative', 'diagnostic', 'grade', 'scoring',
    'standards-based', 'mastery', 'benchmark',
  ],
  'Teacher Tools': [
    'teacher tool', 'teacher resource', 'classroom management',
    'lesson plan', 'curriculum', 'instructional', 'educator tool',
    'teaching resource', 'for teachers', 'teacher aide',
  ],
  'AI Assistants': [
    'ai assistant', 'chatbot', 'ai tutor', 'ai helper', 'ai tool',
    'artificial intelligence', 'ai-powered', 'conversational',
  ],
  'SEL & Wellbeing': [
    'sel', 'social emotional', 'wellbeing', 'well-being', 'mindfulness',
    'empathy', 'self-awareness', 'emotional', 'resilience', 'conflict resolution',
    'bullying', 'coping', 'mental health', 'anxiety', 'stress',
  ],
  'ELL & Multilingual': [
    'ell', 'esl', 'multilingual', 'english learner', 'english language learner',
    'language acquisition', 'bilingual', 'newcomer', 'immigrant',
    'language support', 'translation', 'dual language',
  ],
  'Special Education': [
    'special education', 'special ed', 'sped', 'iep', 'accommodation',
    'modification', 'differentiated', 'disability', 'learning disability',
    'adhd', 'autism', 'dyslexia', 'assistive', 'inclusive',
    'individualized', '504',
  ],
  'Gamified Learning': [
    'gamified', 'gamification', 'game-based', 'game based', 'educational game',
    'points', 'badges', 'leaderboard', 'level up', 'quest', 'simulation',
    'interactive game', 'play-based',
  ],
  'Data-Driven Instruction': [
    'data-driven', 'data driven', 'analytics', 'data analysis',
    'student data', 'progress monitoring', 'tracking', 'dashboard',
    'metrics', 'intervention',
  ],
  'Family & Community': [
    'family', 'community', 'parent', 'guardian', 'caregiver',
    'family engagement', 'community engagement', 'home-school',
    'outreach', 'volunteer',
  ],
  'School Leadership': [
    'school leadership', 'principal', 'administrator', 'admin',
    'school leader', 'superintendent', 'dean', 'leadership',
    'school improvement', 'district',
  ],
  'Reading Intervention': [
    'reading intervention', 'reading support', 'struggling reader',
    'fluency', 'decoding', 'phonemic', 'guided reading', 'leveled',
    'reading recovery', 'reading program',
  ],
  'Creative & Engagement': [
    'creative', 'engagement', 'motivation', 'interactive', 'fun',
    'engaging', 'innovative', 'student engagement', 'hands-on',
  ],
  'Professional Development': [
    'professional development', 'pd', 'teacher training',
    'coaching', 'mentoring', 'teacher learning', 'workshop',
    'professional learning', 'plc',
  ],
  'Lesson Planning': [
    'lesson planning', 'lesson plan', 'unit plan', 'curriculum design',
    'scope and sequence', 'pacing', 'backward design', 'learning objective',
    'standard alignment', 'lesson design',
  ],
  'Differentiation & Access': [
    'differentiation', 'differentiated instruction', 'scaffolding',
    'accessibility', 'universal design', 'udl', 'tiered',
    'personalized', 'adaptive', 'individualized',
  ],
};

/**
 * Suggests collection tags based on keyword matching against a description.
 * Returns a sorted array of suggested tag names (no duplicates).
 */
export function suggestTags(description: string): string[] {
  if (!description || !description.trim()) return [];

  const lower = description.toLowerCase();
  const scores: Record<string, number> = {};

  for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
    let matchCount = 0;
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        matchCount++;
      }
    }
    if (matchCount > 0) {
      scores[tag] = matchCount;
    }
  }

  // Sort by match count (descending), then alphabetically
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag]) => tag);
}
