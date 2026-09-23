import { PrismaClient, Permission, type ContentType } from '@prisma/client';

const prisma = new PrismaClient();

const PERMISSIONS: Array<Pick<Permission, 'key' | 'description'>> = [
  { key: 'content:create', description: 'Create content' },
  { key: 'content:update', description: 'Update content' },
  { key: 'content:publish', description: 'Publish content' },
  { key: 'content:review', description: 'Review content' },
  { key: 'question:create', description: 'Create questions' },
  { key: 'question:update', description: 'Update questions' },
  { key: 'question:review', description: 'Review questions' },
  { key: 'question_generation:create', description: 'Run AI question generation' },
  { key: 'quiz:create', description: 'Create quizzes' },
  { key: 'assignment:create', description: 'Create assignments' },
  { key: 'exam:create', description: 'Create exams' },
  { key: 'student:read', description: 'View students' },
  { key: 'performance:read', description: 'View performance analytics' },
  { key: 'analytics:read', description: 'View platform analytics' },
  { key: 'audit:read', description: 'View audit logs' },
  { key: 'user:manage', description: 'Manage users' },
  { key: 'curriculum:manage', description: 'Manage curriculum' },
];

// ----------------------------------------------------------------------------
// Block builders — produce the structured JSON the web renders (§9, blocks are
// never raw HTML). Matches ContentBlock in web/src/lib/api.ts.
// ----------------------------------------------------------------------------

type Block = Record<string, unknown>;

const h = (text: string): Block => ({ type: 'heading', text });
const p = (text: string): Block => ({ type: 'paragraph', text });
const formula = (latex: string): Block => ({ type: 'formula', latex });
const bulletList = (items: string[]): Block => ({ type: 'list', items });
const keyPoints = (points: string[]): Block => ({
  type: 'list',
  items: points.map((t) => `• ${t}`),
});
const important = (text: string): Block => ({ type: 'important', text });

/**
 * Standard NOTE block set for a topic: heading + summary paragraph + key points.
 * The summary's `|` separates key points, so each topic gets real signposted
 * content without hand-authoring every block.
 */
function noteBlocks(title: string, summary: string, pointsExtra: string[] = []): Block[] {
  const [lead, ...points] = summary.split('|');
  return [
    h(title),
    p(lead.trim()),
    ...(points.length || pointsExtra.length
      ? [keyPoints([...points.map((s) => s.trim()).filter(Boolean), ...pointsExtra])]
      : []),
  ];
}

const formulaBlocks = (title: string, latex: string, note?: string): Block[] =>
  [h(title), ...(note ? [p(note)] : []), formula(latex)];

const exampleBlocks = (title: string, statement: string, solution: string): Block[] => [
  h(title),
  { type: 'example', text: statement, children: [{ type: 'paragraph', text: solution }] },
];

// ----------------------------------------------------------------------------
// Curriculum tree data
// ----------------------------------------------------------------------------

interface TopicSeed {
  name: string;
  summary: string;
  /** optional blocks override; defaults to noteBlocks(name, summary) */
  extra?: { contentType: ContentType; blocks: Block[] }[];
}

interface ChapterSeed {
  name: string;
  topics: TopicSeed[];
}

interface SubjectSeed {
  name: string;
  code: string;
  order: number;
  chapters: ChapterSeed[];
}

const SUBJECTS: SubjectSeed[] = [
  {
    name: 'Mathematics',
    code: 'math',
    order: 1,
    chapters: [
      {
        name: 'Algebra',
        topics: [
          {
            name: 'Factorization',
            summary:
              'Writing an algebraic expression as a product of its factors. | Common factor method | Grouping method | Difference of squares',
          },
          {
            name: 'Quadratic Equations',
            summary:
              'An expression of the form ax² + bx + c = 0, solved by factorisation or the quadratic formula. | Standard form | Factorisation method | Quadratic formula',
            extra: [
              {
                contentType: 'FORMULA',
                blocks: formulaBlocks(
                  'Quadratic formula',
                  'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
                  'For ax² + bx + c = 0 with a ≠ 0.',
                ),
              },
              {
                contentType: 'EXAMPLE',
                blocks: exampleBlocks(
                  'Worked example',
                  'Solve x² - 5x + 6 = 0 by factorization.',
                  'x² - 5x + 6 = (x - 2)(x - 3) = 0 ⇒ x = 2 or x = 3.',
                ),
              },
            ],
          },
          {
            name: 'Simultaneous Equations',
            summary:
              'Solving two linear equations at once. | Elimination method | Substitution method | Graphical method',
            extra: [
              {
                contentType: 'FORMULA',
                blocks: formulaBlocks(
                  'Two linear equations',
                  'a_1 x + b_1 y = c_1,\\quad a_2 x + b_2 y = c_2',
                ),
              },
            ],
          },
          {
            name: 'Indices',
            summary: 'Rules of indices with rational exponents. | Product law | Quotient law | Power of a power',
            extra: [
              {
                contentType: 'FORMULA',
                blocks: formulaBlocks(
                  'Index laws',
                  'a^m \\times a^n = a^{m+n},\\quad a^m \\div a^n = a^{m-n},\\quad (a^m)^n = a^{mn}',
                ),
              },
            ],
          },
          {
            name: 'Sequences and Series',
            summary:
              'Arithmetic and geometric progression. | Common difference | Common ratio | Sum of n terms',
            extra: [
              {
                contentType: 'FORMULA',
                blocks: formulaBlocks(
                  'AP nth term',
                  'a_n = a + (n-1)d',
                  'Arithmetic progression with first term a and common difference d.',
                ),
              },
            ],
          },
        ],
      },
      {
        name: 'Geometry',
        topics: [
          {
            name: 'Angles and Circles',
            summary:
              'Angle properties of a circle. | Angle at the centre is twice the angle at the circumference | Angles in the same segment are equal',
            extra: [
              {
                contentType: 'FORMULA',
                blocks: formulaBlocks(
                  'Circle facts',
                  '\\angle \\text{ at centre } = 2 \\times \\angle \\text{ at circumference}',
                ),
              },
            ],
          },
          {
            name: 'Triangles and Similarity',
            summary: 'Conditions for similarity and congruence of triangles. | AA criterion | SAS criterion | SSS criterion',
          },
          {
            name: 'Construction',
            summary: 'Geometric construction with ruler and compass. | Angle bisector | Perpendicular bisector | Triangle construction',
          },
        ],
      },
      {
        name: 'Trigonometry',
        topics: [
          {
            name: 'Trigonometric Ratios',
            summary:
              'Ratios of the sides of a right-angled triangle. | sine, cosine, tangent | Fundamental identities',
            extra: [
              {
                contentType: 'FORMULA',
                blocks: formulaBlocks(
                  'Fundamental identity',
                  '\\sin^2 \\theta + \\cos^2 \\theta = 1,\\quad \\tan \\theta = \\frac{\\sin \\theta}{\\cos \\theta}',
                ),
              },
            ],
          },
          {
            name: 'Heights and Distances',
            summary:
              'Using trigonometry to measure heights and distances. | Angle of elevation | Angle of depression',
            extra: [
              {
                contentType: 'FORMULA',
                blocks: formulaBlocks(
                  'Height of an object',
                  'h = d \\times \\tan \\theta',
                ),
              },
            ],
          },
        ],
      },
      {
        name: 'Mensuration',
        topics: [
          {
            name: 'Area of Plane Figures',
            summary: 'Area of triangles, rectangles, parallelograms and circles. | Heron formula | Area of sector',
          },
          {
            name: 'Surface Area and Volume',
            summary:
              'Surface area and volume of cylinders, cones, spheres and prisms. | Curved surface area | Total surface area | Volume',
            extra: [
              {
                contentType: 'FORMULA',
                blocks: formulaBlocks(
                  'Volume of a cylinder',
                  'V = \\pi r^2 h',
                ),
              },
            ],
          },
        ],
      },
      {
        name: 'Statistics and Probability',
        topics: [
          {
            name: 'Measures of Central Tendency',
            summary: 'Mean, median and mode of grouped and ungrouped data. | Arithmetic mean | Median | Mode',
          },
          {
            name: 'Probability',
            summary:
              'The chance of an event happening. | Sample space | Favorable outcomes | P(event) = favorable/total',
            extra: [
              {
                contentType: 'FORMULA',
                blocks: formulaBlocks(
                  'Probability',
                  'P(E) = \\frac{n(E)}{n(S)}',
                ),
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: 'Science',
    code: 'science',
    order: 2,
    chapters: [
      {
        name: 'Force and Motion',
        topics: [
          {
            name: 'Force',
            summary:
              'A push or pull on an object. | Gravitational force | Friction | Effects of force on motion',
          },
          {
            name: 'Equation of Motion',
            summary: 'Relations between distance, velocity, time and acceleration. | v = u + at | s = ut + ½at²',
            extra: [
              {
                contentType: 'FORMULA',
                blocks: formulaBlocks(
                  'First equation',
                  'v = u + at',
                ),
              },
            ],
          },
        ],
      },
      {
        name: 'Pressure',
        topics: [
          {
            name: 'Pressure in Liquids and Gases',
            summary:
              'Pressure depends on force and area. | P = F/A | Hydraulic press | Atmospheric pressure',
            extra: [
              {
                contentType: 'FORMULA',
                blocks: formulaBlocks('Pressure', 'P = \\frac{F}{A}'),
              },
            ],
          },
        ],
      },
      {
        name: 'Energy',
        topics: [
          {
            name: 'Work, Energy and Power',
            summary: 'Mechanical work, forms of energy, and rate of doing work. | Work = force × distance | Kinetic & potential energy | Power',
            extra: [
              {
                contentType: 'FORMULA',
                blocks: formulaBlocks(
                  'Kinetic energy',
                  'KE = \\tfrac{1}{2} m v^2',
                ),
              },
            ],
          },
          {
            name: 'Conservation of Energy',
            summary: 'Energy can be transformed but never created or destroyed. | Energy transformation examples',
          },
        ],
      },
      {
        name: 'Wave and Sound',
        topics: [
          {
            name: 'Nature of Waves',
            summary: 'Wave motion carries energy. | Transverse & longitudinal | Amplitude, wavelength, frequency',
            extra: [
              {
                contentType: 'FORMULA',
                blocks: formulaBlocks('Wave speed', 'v = f \\lambda'),
              },
            ],
          },
          {
            name: 'Sounds and Acoustics',
            summary: 'Production and propagation of sound. | Sources of sound | Echo and its causes',
          },
        ],
      },
      {
        name: 'Heat',
        topics: [
          {
            name: 'Heat and Temperature',
            summary: 'Heat is energy in transit. | Temperature scales | Specific heat capacity',
            extra: [
              {
                contentType: 'FORMULA',
                blocks: formulaBlocks(
                  'Heat gained or lost',
                  'Q = m c \\Delta T',
                ),
              },
            ],
          },
        ],
      },
      {
        name: 'Light',
        topics: [
          {
            name: 'Reflection of Light',
            summary: 'Bouncing of light off a surface. | Laws of reflection | Plane mirror images',
          },
          {
            name: 'Refraction of Light',
            summary: 'Bending of light when it changes medium. | Snell’s law | Lenses and their uses',
            extra: [
              {
                contentType: 'FORMULA',
                blocks: formulaBlocks('Snell’s law', 'n = \\frac{\\sin i}{\\sin r}'),
              },
            ],
          },
        ],
      },
      {
        name: 'Electricity and Magnetism',
        topics: [
          {
            name: 'Electric Current',
            summary: 'Flow of charge through a conductor. | Ohm’s law | Series and parallel circuits',
            extra: [
              {
                contentType: 'FORMULA',
                blocks: formulaBlocks('Ohm’s law', 'V = I R'),
              },
            ],
          },
          {
            name: 'Magnetism',
            summary: 'Magnetic field and induced magnetism. | Bar magnet fields | Electromagnets',
          },
        ],
      },
    ],
  },
  {
    name: 'English',
    code: 'english',
    order: 3,
    chapters: [
      {
        name: 'Reading Comprehension',
        topics: [
          {
            name: 'Main Idea and Supporting Details',
            summary:
              'Identifying the central point of a passage. | Topic sentence | Inference | Context clues',
          },
          {
            name: 'Vocabulary in Context',
            summary: 'Using surrounding words to find meaning. | Synonyms & antonyms | Word families',
          },
        ],
      },
      {
        name: 'Grammar',
        topics: [
          {
            name: 'Tenses',
            summary: 'Expressing time through verb forms. | Present, past, future | Aspect and voice',
          },
          {
            name: 'Passive Voice',
            summary: 'Focus on the action rather than the doer. | Form of to be + past participle | When to use passive voice',
          },
          {
            name: 'Reported Speech',
            summary: 'Reporting what someone said. | Direct vs indirect | Pronoun and tense shifts',
          },
        ],
      },
      {
        name: 'Writing',
        topics: [
          {
            name: 'Paragraph and Essay Writing',
            summary: 'Organising ideas into coherent paragraphs. | Introduction, body, conclusion | Topic sentences',
          },
          {
            name: 'Formal Letter and Email',
            summary: 'Structure of formal correspondence. | Salutation, body, closing | Official vs personal tone',
          },
        ],
      },
      {
        name: 'Literature',
        topics: [
          {
            name: 'Poetry Analysis',
            summary: 'Reading and interpreting poems. | Imagery and figurative language | Rhyme and rhythm',
          },
          {
            name: 'Short Story and Drama',
            summary: 'Elements of narrative texts. | Plot, character, setting, theme | Dramatic techniques',
          },
        ],
      },
    ],
  },
  {
    name: 'Nepali',
    code: 'nepali',
    order: 4,
    chapters: [
      {
        name: 'कथा र कविता (Stories and Poems)',
        topics: [
          {
            name: 'कथाका तत्त्व (Elements of the Story)',
            summary: 'कथाका आधारभूत तत्त्वहरू पहिचान गर्ने। | Plot, character, setting, theme',
          },
          {
            name: 'कविता विश्लेषण (Poetry Analysis)',
            summary: 'कविताको भाव र बिम्ब बुझ्ने। | Imagery | Rhyme | Symbol',
          },
        ],
      },
      {
        name: 'व्याकरण (Grammar)',
        topics: [
          {
            name: 'शब्द र पद (Words and Word Classes)',
            summary: 'शब्दका प्रकार र पदको काम। | Noun, pronoun, verb, adjective',
          },
          {
            name: 'वाक्य र यसका प्रकार (Sentences)',
            summary: 'वाक्यको संरचना। | Simple, compound, complex sentence',
          },
        ],
      },
      {
        name: 'रचना (Composition)',
        topics: [
          {
            name: 'निबन्ध लेखन (Essay Writing)',
            summary: 'विचारलाई क्रमबद्ध तरिकाले प्रस्तुत गर्ने। | Introduction | Body | Conclusion',
          },
          {
            name: 'चिठी र निवेदन (Letters)',
            summary: 'औपचारिक चिठीको ढाँचा। | Salutation | Body | Closing',
          },
        ],
      },
    ],
  },
  {
    name: 'Social Studies',
    code: 'social',
    order: 5,
    chapters: [
      {
        name: 'History of Nepal',
        topics: [
          {
            name: 'Ancient and Medieval Nepal',
            summary: 'Early kingdoms and dynasties. | Lichchhavi and Malla periods | Key rulers and events',
          },
          {
            name: 'Modern Nepal',
            summary: 'Unification and the establishment of the nation. | Prithvi Narayan Shah | Recent political changes',
          },
        ],
      },
      {
        name: 'Geography of Nepal',
        topics: [
          {
            name: 'Physiographic Division',
            summary: 'The Himalayan, Hilly and Terai regions. | Climate variation | Natural resources',
          },
          {
            name: 'Agriculture and Economy',
            summary: 'Primary economic activities. | Crops and farming systems | Agro-industries',
          },
        ],
      },
      {
        name: 'Civics and Governance',
        topics: [
          {
            name: 'Constitution and Fundamental Rights',
            summary: 'The Constitution of Nepal. | Human rights | Duties of citizens',
          },
          {
            name: 'Local Government',
            summary: 'Provincial and local structures. | Gaunpalika and Nagarpalika | Federalism',
          },
        ],
      },
    ],
  },
  {
    name: 'Optional Mathematics',
    code: 'optional-math',
    order: 6,
    chapters: [
      {
        name: 'Algebra',
        topics: [
          {
            name: 'Functions and Graphs',
            summary: 'Mapping between sets. | Domain and range | Linear and quadratic graphs',
          },
          {
            name: 'Polynomials',
            summary: 'Operations on polynomial expressions. | Addition & multiplication | Remainder theorem',
          },
        ],
      },
      {
        name: 'Trigonometry',
        topics: [
          {
            name: 'Multiple Angles',
            summary: 'Formulae for 2θ and 3θ. | Double-angle identity | Inverse functions',
            extra: [
              {
                contentType: 'FORMULA',
                blocks: formulaBlocks(
                  'Double angle',
                  '\\sin 2\\theta = 2\\sin\\theta\\cos\\theta',
                ),
              },
            ],
          },
        ],
      },
      {
        name: 'Coordinate Geometry',
        topics: [
          {
            name: 'Straight Lines',
            summary: 'The equation of a straight line. | Slope–intercept form | Distance between points',
            extra: [
              {
                contentType: 'FORMULA',
                blocks: formulaBlocks(
                  'Slope–intercept',
                  'y = mx + c',
                ),
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: 'Computer Science',
    code: 'computer',
    order: 7,
    chapters: [
      {
        name: 'Computer Systems',
        topics: [
          {
            name: 'Hardware and Software',
            summary: 'Physical components and programs that run them. | CPU, memory, storage | System vs application software',
          },
          {
            name: 'Number Systems',
            summary: 'Binary, octal and hexadecimal. | Conversion between bases | Binary arithmetic',
          },
        ],
      },
      {
        name: 'Programming',
        topics: [
          {
            name: 'Introduction to C Programming',
            summary: 'Structure of a C program. | Variables and data types | Input and output',
            extra: [
              {
                contentType: 'EXAMPLE',
                blocks: exampleBlocks(
                  'Hello world in C',
                  'Write a C program that prints “Hello, World!”.',
                  '#include <stdio.h>\nint main() { printf("Hello, World!"); return 0; }',
                ),
              },
            ],
          },
          {
            name: 'Control Structures',
            summary: 'Decision making and loops. | if–else | for and while loops',
          },
        ],
      },
      {
        name: 'Networking and Internet',
        topics: [
          {
            name: 'Computer Networks',
            summary: 'Connecting computers to share resources. | LAN, WAN | Network hardware and topology',
          },
          {
            name: 'Internet and Web',
            summary: 'The global network of networks. | WWW and browsers | Search engines and security',
          },
        ],
      },
    ],
  },
];

// ----------------------------------------------------------------------------
// Upsert helpers — idempotent by the schema’s unique constraints.
// ----------------------------------------------------------------------------

async function upsertCurriculum() {
  const curriculum = await prisma.curriculum.upsert({
    where: { code: 'NEP-GRADE10' },
    update: { status: 'PUBLISHED', name: 'Nepal Grade 10 Curriculum' },
    create: {
      code: 'NEP-GRADE10',
      name: 'Nepal Grade 10 Curriculum',
      status: 'PUBLISHED',
    },
  });

  const grade = await prisma.grade.upsert({
    where: { curriculumId_code: { curriculumId: curriculum.id, code: '10' } },
    update: { name: 'Class 10' },
    create: {
      curriculumId: curriculum.id,
      name: 'Class 10',
      code: '10',
      order: 1,
    },
  });

  return { curriculum, grade };
}

async function seedSubjects(gradeId: string) {
  const subjectIds: string[] = [];
  for (const [si, subject] of SUBJECTS.entries()) {
    const s = await prisma.subject.upsert({
      where: { gradeId_code: { gradeId, code: subject.code } },
      update: { name: subject.name, order: subject.order },
      create: { gradeId, name: subject.name, code: subject.code, order: subject.order },
    });
    subjectIds.push(s.id);
    await seedChapters(s.id, subject.chapters);
  }
  return subjectIds;
}

// ----------------------------------------------------------------------------
// Asmita Class 10 Set Book — structural scaffold (§ loader).
// The Asmita "Set Book" is a groundable question source for Class 10. The full
// copyrighted exercise text is NOT embedded here; this seeds the subject →
// set → topic skeleton so question generation can be grounded on it. The
// loader (ai-worker, Phase 5) ingests the publisher content into these nodes.
// ----------------------------------------------------------------------------

const ASMITA_SUBJECTS: SubjectSeed[] = [
  {
    name: 'Compulsory Mathematics',
    code: 'asmita-math',
    order: 1,
    chapters: [
      {
        name: 'Algebra — Set 1',
        topics: [
          { name: 'Factorization', summary: 'Asmita Set Book: algebra factorization practice set.' },
          { name: 'Quadratic equations', summary: 'Asmita Set Book: quadratic equations practice set.' },
        ],
      },
      {
        name: 'Geometry — Set 1',
        topics: [
          { name: 'Angles and circles', summary: 'Asmita Set Book: circle theorem practice set.' },
        ],
      },
    ],
  },
  {
    name: 'Science',
    code: 'asmita-science',
    order: 2,
    chapters: [
      {
        name: 'Physics — Set 1',
        topics: [
          { name: 'Force and equation of motion', summary: 'Asmita Set Book: force and motion practice set.' },
          { name: 'Pressure', summary: 'Asmita Set Book: pressure practice set.' },
        ],
      },
      {
        name: 'Chemistry — Set 1',
        topics: [
          { name: 'Chemical reaction', summary: 'Asmita Set Book: chemical reactions practice set.' },
        ],
      },
    ],
  },
  {
    name: 'English',
    code: 'asmita-english',
    order: 3,
    chapters: [
      {
        name: 'Grammar — Set 1',
        topics: [
          { name: 'Tenses', summary: 'Asmita Set Book: tenses practice set.' },
          { name: 'Reported speech', summary: 'Asmita Set Book: reported speech practice set.' },
        ],
      },
    ],
  },
  {
    name: 'Compulsory Nepali',
    code: 'asmita-nepali',
    order: 4,
    chapters: [
      {
        name: 'व्याकरण — Set 1',
        topics: [
          { name: 'वाक्य र यसका प्रकार', summary: 'Asmita Set Book: sentence types practice set.' },
        ],
      },
    ],
  },
  {
    name: 'Social Studies',
    code: 'asmita-social',
    order: 5,
    chapters: [
      {
        name: 'History — Set 1',
        topics: [
          { name: 'Modern Nepal', summary: 'Asmita Set Book: modern Nepali history practice set.' },
        ],
      },
    ],
  },
  {
    name: 'Optional Mathematics',
    code: 'asmita-opt-math',
    order: 6,
    chapters: [
      {
        name: 'Functions — Set 1',
        topics: [
          { name: 'Functions and graphs', summary: 'Asmita Set Book: functions practice set.' },
        ],
      },
    ],
  },
  {
    name: 'Computer Science',
    code: 'asmita-computer',
    order: 7,
    chapters: [
      {
        name: 'Programming — Set 1',
        topics: [
          { name: 'Introduction to C', summary: 'Asmita Set Book: C programming practice set.' },
        ],
      },
    ],
  },
];

async function upsertAsmitaSetBook() {
  const curriculum = await prisma.curriculum.upsert({
    where: { code: 'ASMITA-SET-10' },
    update: { status: 'PUBLISHED', name: 'Asmita Class 10 Set Book' },
    create: {
      code: 'ASMITA-SET-10',
      name: 'Asmita Class 10 Set Book',
      status: 'PUBLISHED',
    },
  });

  const grade = await prisma.grade.upsert({
    where: { curriculumId_code: { curriculumId: curriculum.id, code: '10' } },
    update: { name: 'Class 10' },
    create: {
      curriculumId: curriculum.id,
      name: 'Class 10',
      code: '10',
      order: 1,
    },
  });

  for (const [si, subject] of ASMITA_SUBJECTS.entries()) {
    const s = await prisma.subject.upsert({
      where: { gradeId_code: { gradeId: grade.id, code: subject.code } },
      update: { name: subject.name, order: subject.order },
      create: { gradeId: grade.id, name: subject.name, code: subject.code, order: subject.order },
    });
    await seedChapters(s.id, subject.chapters);
  }

  return { curriculum, grade };
}

async function seedChapters(subjectId: string, chapters: ChapterSeed[]) {
  for (const [ci, chapter] of chapters.entries()) {
    const ch = await prisma.chapter.upsert({
      where: { subjectId_name: { subjectId, name: chapter.name } },
      update: { order: ci + 1 },
      create: { subjectId, name: chapter.name, order: ci + 1 },
    });
    await seedTopics(ch.id, chapter.topics);
  }
}

async function seedTopics(chapterId: string, topics: TopicSeed[]) {
  for (const [ti, topic] of topics.entries()) {
    const t = await prisma.topic.upsert({
      where: { chapterId_name: { chapterId, name: topic.name } },
      update: { summary: topic.summary.replaceAll('|', '\n') },
      create: {
        chapterId,
        name: topic.name,
        order: ti + 1,
        summary: topic.summary.replaceAll('|', '\n'),
      },
    });
    const extra = topic.extra ?? [];
    const entries: { contentType: ContentType; title: string; blocks: Block[] }[] = [
      { contentType: 'NOTE' as ContentType, title: `${topic.name} — Notes`, blocks: noteBlocks(topic.name, topic.summary) },
      ...extra.map((e, i) => ({
        contentType: e.contentType,
        title: `${topic.name} — ${e.contentType === 'FORMULA' ? 'Formula' : 'Example'} ${i + 1}`,
        blocks: e.blocks,
      })),
    ];
    for (const entry of entries) {
      await prisma.contentItem.upsert({
        where: {
          topicId_contentType_title: {
            topicId: t.id,
            contentType: entry.contentType,
            title: entry.title,
          },
        },
        update: { blocks: entry.blocks as never, status: 'PUBLISHED' },
        create: {
          topicId: t.id,
          contentType: entry.contentType,
          title: entry.title,
          status: 'PUBLISHED',
          visibility: 'PUBLIC',
          blocks: entry.blocks as never,
        },
      });
    }
  }
}

async function main() {
  console.log('Seeding permissions...');
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: p.key },
      update: { description: p.description },
      create: p,
    });
  }

  const org = await prisma.organization.upsert({
    where: { slug: 'demo-academy' },
    update: {},
    create: { name: 'Demo Academy', slug: 'demo-academy' },
  });

  const { curriculum, grade } = await upsertCurriculum();
  console.log(`Curriculum ready: ${curriculum.id} (${curriculum.code})`);

  const subjectIds = await seedSubjects(grade.id);

  const asmita = await upsertAsmitaSetBook();
  console.log(`Asmita set book ready: ${asmita.curriculum.id} (${asmita.curriculum.code})`);

  const stats = await Promise.all([
    prisma.subject.count({ where: { gradeId: grade.id } }),
    prisma.chapter.count(),
    prisma.topic.count(),
    prisma.contentItem.count(),
  ]);

  console.log('Seed complete.');
  console.log(
    JSON.stringify(
      {
        org: { id: org.id, slug: org.slug },
        curriculum: { id: curriculum.id, code: curriculum.code },
        grade: { id: grade.id, name: grade.name },
        asmitaSetBook: { id: asmita.curriculum.id, code: asmita.curriculum.code },
        subjects: stats[0],
        chapters: stats[1],
        topics: stats[2],
        contentItems: stats[3],
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
