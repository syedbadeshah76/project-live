export interface Course {
  id: string;
  productId?: string;
  title: string;
  description: string;
  category: string;
  type: "it" | "non-it";
  thumbnail: string;
  instructor: string;
  instructorAvatar: string;
  duration: string;
  lessons: number;
  students: number;
  rating: number;
  price: number;
  originalPrice?: number;
  level: "Beginner" | "Intermediate" | "Advanced";
  status: "Published" | "Draft";
  featured: boolean;
  // Optional Figma-aligned metadata; falls back to sensible defaults in UI
  courseType?: string; // e.g. "Live Course"
  modules?: number;
  occurrence?: string; // e.g. "3 Days/ Week"
  certificate?: string;
  tagline?: string; // shown under title
  learningOutcomes?: string[]; // tick list
  requirements?: string[];
}

export interface ITDomain {
  id: string;
  name: string;
  description: string;
  icon: string;
  type?: "it" | "non-it"; 
  courseCount: number;
  color: string;
 
}
export const nonItDomains: ITDomain[] = [
  // 🧑‍🎓 SCHOOL (6–12)
  {
    id: "school-science",
    name: "School Science (6–12)",
    description: "Physics, Chemistry, Biology with concepts & boards prep",
    icon: "Brain",
    courseCount: 50,
    color: "from-indigo-500 to-purple-500",
    type: "non-it",
  },
  {
    id: "school-maths",
    name: "Mathematics (6–12)",
    description: "Algebra, Geometry, Trigonometry, Olympiad prep",
    icon: "BarChart3",
    courseCount: 40,
    color: "from-pink-500 to-rose-500",
    type: "non-it",
  },

  // 🎓 DEGREE / COLLEGE
  {
    id: "btech-cse",
    name: "B.Tech / Degree (CSE)",
    description: "DSA, DBMS, OS, Interview prep",
    icon: "GitBranch",
    courseCount: 35,
    color: "from-orange-500 to-red-500",
    type: "it",
  },
  {
    id: "commerce-degree",
    name: "B.Com / Commerce",
    description: "Accounts, Economics, Finance",
    icon: "BarChart3",
    courseCount: 25,
    color: "from-green-500 to-emerald-500",
    type: "non-it",
  },

  // 💼 NON-IT / BUSINESS
  {
    id: "business",
    name: "Business & Startups",
    description: "Entrepreneurship, Marketing, Sales",
    icon: "Megaphone",
    courseCount: 20,
    color: "from-yellow-500 to-orange-500",
    type: "non-it",
  },
  {
    id: "career-skills",
    name: "Career Skills",
    description: "Interview, Resume, Communication",
    icon: "Globe",
    courseCount: 15,
    color: "from-teal-500 to-cyan-500",
    type: "non-it",
  },
];
export const itDomains:ITDomain[] = [
  
  {
    id: "web-dev",
    name: "Web Development",
    description: "HTML, CSS, JavaScript, React, Node.js",
    icon: "Globe",
    courseCount: 45,
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: "app-dev",
    name: "App Development",
    description: "iOS, Android, React Native, Flutter",
    icon: "Smartphone",
    courseCount: 32,
    color: "from-green-500 to-emerald-500",
  },
  {
    id: "ui-ux",
    name: "UI/UX Design",
    description: "Figma, Adobe XD, User Research",
    icon: "Palette",
    courseCount: 28,
    color: "from-pink-500 to-rose-500",
  },
  {
    id: "data-science",
    name: "Data Science",
    description: "Python, R, Machine Learning, Analytics",
    icon: "BarChart3",
    courseCount: 38,
    color: "from-purple-500 to-violet-500",
  },
  {
    id: "ai",
    name: "Artificial Intelligence",
    description: "Deep Learning, NLP, Computer Vision",
    icon: "Brain",
    courseCount: 24,
    color: "from-orange-500 to-amber-500",
  },
  {
    id: "cyber-security",
    name: "Cyber Security",
    description: "Ethical Hacking, Network Security",
    icon: "Shield",
    courseCount: 22,
    color: "from-red-500 to-rose-600",
  },
  {
    id: "cloud",
    name: "Cloud Computing",
    description: "AWS, Azure, Google Cloud",
    icon: "Cloud",
    courseCount: 35,
    color: "from-sky-500 to-blue-600",
  },
  {
    id: "devops",
    name: "DevOps",
    description: "Docker, Kubernetes, CI/CD",
    icon: "GitBranch",
    courseCount: 20,
    color: "from-indigo-500 to-purple-600",
  },
  {
    id: "digital-marketing",
    name: "Digital Marketing",
    description: "SEO, Social Media, Analytics",
    icon: "Megaphone",
    courseCount: 18,
    color: "from-teal-500 to-cyan-600",
  },
];

export const courses: Course[] = [
 {
    id: "1",
    title: "React Developer",
    description: "Learn React",
    category: "web-dev",
    type: "it",
    thumbnail: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800",
    instructor: "Sarah",
    instructorAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100",
    duration: "40h",
    lessons: 120,
    students: 10000,
    rating: 4.9,
    price: 2999,
    level: "Intermediate",
    status: "Published",
    featured: true,
  },
  {
    id: "2",
    title: "Python for Data Science & Machine Learning",
    description: "Learn Python programming for data analysis, visualization, and machine learning.",
    category: "Data Science",
       type: "it",
    thumbnail: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&h=450&fit=crop",
    instructor: "Michael Chen",
    instructorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    duration: "56h 15m",
    lessons: 189,
    students: 18320,
    rating: 4.8,
    price: 3499,
    level: "Beginner",
    status: "Published",
    featured: true,
  },
  {
    id: "3",
    title: "UI/UX Design Masterclass",
    description: "Create stunning user interfaces and experiences using Figma and modern design principles.",
    category: "UI/UX Design",
       type: "it",
    thumbnail: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&h=450&fit=crop",
    instructor: "Emma Williams",
    instructorAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
    duration: "38h 45m",
    lessons: 124,
    students: 8750,
    rating: 4.9,
    price: 2499,
    level: "Beginner",
    status: "Published",
    featured: true,
  },
   // 🔹 BUSINESS (NON-IT)
  {
    id: "4",
    title: "Startup & Business Mastery",
    description: "Learn how to build & scale startups",
    category: "business",
    type: "non-it",
    thumbnail: "https://images.unsplash.com/photo-1556761175-4b46a572b786?w=800",
    instructor: "Rohit Sharma",
    instructorAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100",
    duration: "25h",
    lessons: 80,
    students: 5000,
    rating: 4.8,
    price: 1999,
    level: "Beginner",
    status: "Published",
    featured: true,
  },

   {
    id: "5",
    title: "Class 10 Physics",
    description: "Full syllabus + numericals",
    category: "school-science",
    type: "non-it",
    thumbnail: "https://images.moneycontrol.com/static-mcnews/2026/02/20260216112835_CBSE-Class-10-Maths-Exam-2026-.png?impolicy=website&width=1280&height=720",
    instructor: "Ankit Sir",
    instructorAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100",
    duration: "60h",
    lessons: 200,
    students: 15000,
    rating: 4.9,
    price: 999,
    level: "Beginner",
    status: "Published",
    featured: true,
  },
  {
    id: "6",
    title: "AWS Certified Solutions Architect",
    description: "Prepare for AWS certification and learn cloud architecture best practices.",
    category: "Cloud Computing",
       type: "it",
    thumbnail: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=450&fit=crop",
    instructor: "David Kumar",
    instructorAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
    duration: "48h 20m",
    lessons: 145,
    students: 6890,
    rating: 4.7,
    price: 3999,
    level: "Advanced",
    status: "Published",
    featured: false,
  },
  {
    id: "7",
    title: "Complete Node.js Developer Course",
    description: "Build scalable backend applications with Node.js, Express, and MongoDB.",
    category: "Web Development",
       type: "it",
    thumbnail: "https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=800&h=450&fit=crop",
    instructor: "Alex Rodriguez",
    instructorAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
    duration: "35h 10m",
    lessons: 118,
    students: 9420,
    rating: 4.8,
    price: 2799,
    level: "Intermediate",
    status: "Published",
    featured: false,
  },
  {
    id: "8",
    title: "Ethical Hacking & Penetration Testing",
    description: "Learn cybersecurity from scratch and become a certified ethical hacker.",
    category: "Cyber Security",
       type: "it",
    thumbnail: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&h=450&fit=crop",
    instructor: "James Wilson",
    instructorAvatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop",
    duration: "52h 00m",
    lessons: 168,
    students: 5670,
    rating: 4.9,
    price: 4999,
    level: "Advanced",
    status: "Published",
    featured: true,
  },
  {
    id: "9",
    title: "Flutter Mobile App Development",
    description: "Build beautiful cross-platform mobile apps with Flutter and Dart.",
    category: "App Development",
       type: "it",
    thumbnail: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&h=450&fit=crop",
    instructor: "Lisa Park",
    instructorAvatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop",
    duration: "40h 30m",
    lessons: 132,
    students: 7230,
    rating: 4.7,
    price: 2499,
    level: "Intermediate",
    status: "Published",
    featured: false,
  },
  {
    id: "10",
    title: "Docker & Kubernetes Complete Guide",
    description: "Master containerization and orchestration for modern DevOps workflows.",
    category: "DevOps",
       type: "it",
    thumbnail: "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=800&h=450&fit=crop",
    instructor: "Robert Taylor",
    instructorAvatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop",
    duration: "32h 45m",
    lessons: 98,
    students: 4560,
    rating: 4.8,
    price: 2999,
    level: "Intermediate",
    status: "Published",
    featured: false,
  },
];

export const featuredCourses = courses.filter((course) => course.featured);
