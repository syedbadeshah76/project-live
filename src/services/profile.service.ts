import { apiClient, extractAvatarUrl } from "@/lib/api-client";
import type { ApiResponse } from "@/lib/api-client";
import { GetMyProfileResponse } from "@/types/api.types";

const MOCK_MODE = false;

// ============= Types =============
export interface ProfileData {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone: string;
  avatar: string;
  bio: string;
  headline: string;
  country?: string;
  city?: string;
  skills: string[];
  learningInterests: string[];
  socials: {
    linkedin?: string;
    github?: string;
    website?: string;
    instagram?: string;
    twitter?: string;
  };
  socialLink?: string;
  education: Education[];
  stamps: Stamp[];
  memberSince: string;
  role: "student" | "instructor" | "admin";
}

export interface Education {
  id: string;
  school: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface Stamp {
  id: string;
  title: string;
  date: string;
  courseId: string;
  imageUrl?: string;
}

export type SkillField = "skills" | "learningInterests";

// ============= Suggestion Catalog =============
// Used only for client-side autocomplete; profile persistence still goes
// through the documented /users/me contract.
const SKILL_CATALOG: string[] = [
  // Web
  "React",
  "Next.js",
  "Vue.js",
  "Angular",
  "Svelte",
  "HTML5",
  "CSS3",
  "Tailwind CSS",
  "JavaScript",
  "TypeScript",
  "Redux",
  "Web Dev",
  "REST API",
  "GraphQL",
  // Backend
  "Node.js",
  "Express",
  "NestJS",
  "Spring Boot",
  "Java",
  "Python",
  "Django",
  "FastAPI",
  "Go",
  "Rust",
  "Ruby on Rails",
  "PHP",
  "Laravel",
  // Mobile
  "React Native",
  "Flutter",
  "Swift",
  "Kotlin",
  "iOS",
  "Android",
  // Data / AI
  "Machine Learning",
  "Deep Learning",
  "Data Science",
  "TensorFlow",
  "PyTorch",
  "Pandas",
  "NumPy",
  "Scikit-learn",
  "NLP",
  "Computer Vision",
  // Cloud / DevOps
  "AWS",
  "Azure",
  "GCP",
  "Docker",
  "Kubernetes",
  "Terraform",
  "CI/CD",
  "Jenkins",
  "Linux",
  "DevOps",
  // Database
  "MongoDB",
  "PostgreSQL",
  "MySQL",
  "Redis",
  "SQLite",
  "Database",
  // Design / UX
  "UI/UX",
  "Figma",
  "Adobe XD",
  "Sketch",
  "Design Systems",
  // Cyber
  "Cyber Security",
  "Ethical Hacking",
  "Penetration Testing",
  "Network Security",
  // Other
  "Git",
  "GitHub",
  "Agile",
  "Scrum",
  "System Design",
  "Algorithms",
  "Data Structures",
];

// -----------------------------------------------------
// ============= Backend contract: GET / PUT /api/users/me =============
// Field names verified against the real Swagger payloads.
interface BackendSkill {
  id?: string;
  skill: string;
}
interface BackendInterest {
  id?: string;
  interest: string;
}
interface BackendEducation {
  educationId?: string;
  institutionName?: string;
  degree?: string;
  fieldOfStudy?: string;
  startYear?: number;
  endYear?: number;
  gradeOrCgpa?: string;
  description?: string;
}
interface BackendSocialLink {
  platform?: string;
  type?: string;
  label?: string;
  url?: string;
  link?: string;
}
interface BackendStamp {
  id?: string;
  title?: string;
  name?: string;
  date?: string;
  issuedAt?: string;
  courseId?: string;
  imageUrl?: string;
}
interface BackendProfile {
  profileId?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  bio?: string;
  phone?: string;
  phoneNumber?: string;
  country?: string;
  city?: string;
  phoneVerified?: boolean;
  language?: string;
  timezone?: string;
  dateOfBirth?: string | null;
  occupation?: string | null;
}
interface BackendMe {
  id: string;
  email?: string;
  role?: string;
  skills?: BackendSkill[];
  interests?: BackendInterest[];
  educations?: BackendEducation[];
  socialLinks?: Array<BackendSocialLink | string>;
  stamps?: BackendStamp[];
  achievements?: BackendStamp[];
  createdAt?: string;
  updatedAt?: string;
  profile?: BackendProfile;
}

interface ProfilePictureUploadUrlResponse {
  presignedUrl?: string;
  uploadUrl?: string;
  fileKey?: string;
}

type BackendMeResult = ApiResponse<BackendMe> | BackendMe;
type UploadUrlResult =
  | ApiResponse<ProfilePictureUploadUrlResponse>
  | ProfilePictureUploadUrlResponse;

const getAuthHeaders = (
  extraHeaders: Record<string, string> = {},
): Record<string, string> => {
  const headers: Record<string, string> = { ...extraHeaders };
  const token = localStorage.getItem("accessToken");
  const tenantId =
    localStorage.getItem("tenantId") || import.meta.env.VITE_TENANT_ID || "";

  if (token) headers.Authorization = `Bearer ${token}`;
  if (tenantId) headers["X-Tenant-Id"] = tenantId;

  return headers;
};

const isApiResponse = <T>(value: ApiResponse<T> | T): value is ApiResponse<T> =>
  typeof value === "object" &&
  value !== null &&
  "success" in value &&
  "data" in value;

const normalizeMeResponse = (
  result: BackendMeResult,
): ApiResponse<BackendMe> =>
  isApiResponse(result) ? result : { success: true, data: result };

const normalizeUploadUrlResponse = (
  result: UploadUrlResult,
): ProfilePictureUploadUrlResponse =>
  isApiResponse(result) ? result.data : result;

// "2021-10" | "2021" -> 2021
const yearFromDate = (v?: string): number | undefined => {
  if (!v) return undefined;
  const y = parseInt(v.slice(0, 4), 10);
  return Number.isNaN(y) ? undefined : y;
};

const isValidHttpUrl = (value?: string): value is string => {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const detectSocialKey = (
  rawPlatform: string | undefined,
  rawUrl: string,
): keyof ProfileData["socials"] => {
  const platform = (rawPlatform ?? "").toLowerCase();
  const hostname = new URL(rawUrl).hostname.replace(/^www\./, "").toLowerCase();
  if (platform.includes("linkedin") || hostname.includes("linkedin.com"))
    return "linkedin";
  if (platform.includes("github") || hostname.includes("github.com"))
    return "github";
  if (platform.includes("instagram") || hostname.includes("instagram.com"))
    return "instagram";
  if (
    platform.includes("twitter") ||
    platform === "x" ||
    hostname.includes("twitter.com") ||
    hostname === "x.com"
  )
    return "twitter";
  return "website";
};

const mapSocialLinks = (
  links: BackendMe["socialLinks"],
): ProfileData["socials"] => {
  const socials: ProfileData["socials"] = {};

  for (const link of links ?? []) {
    const url = typeof link === "string" ? link : (link.url ?? link.link ?? "");

    if (!isValidHttpUrl(url)) continue;

    const platform =
      typeof link === "string"
        ? undefined
        : (link.platform ?? link.type ?? link.label);

    const key = detectSocialKey(platform, url);

    socials[key] = url;
  }

  return socials;
};

const mapStamps = (stamps: BackendStamp[] | undefined): Stamp[] =>
  (stamps ?? [])
    .map((stamp, index) => ({
      id: stamp.id ?? String(index),
      title: stamp.title ?? stamp.name ?? "",
      date: stamp.date ?? stamp.issuedAt ?? "",
      courseId: stamp.courseId ?? "",
      imageUrl: stamp.imageUrl,
    }))
    .filter((stamp) => stamp.title);

// Backend → Frontend (ProfileData)
const mapMeToProfileData = (me: BackendMe): ProfileData => {
  const p = me.profile ?? {};
  return {
    id: me.id,
    firstName: p.firstName ?? "",
    lastName: p.lastName ?? "",
    username: "", // backend has no username field
    email: me.email ?? "",
    phone: p.phone ?? p.phoneNumber ?? (me as any).phone ?? (me as any).phoneNumber ?? "",
    avatar: extractAvatarUrl(me) || extractAvatarUrl(p) || "",
    bio: p.bio ?? "",
    headline: "", // backend has no headline field
    country: p.country ?? "",
    city: p.city ?? "",
    skills: (me.skills ?? []).map((s) => s.skill).filter(Boolean),
    learningInterests: (me.interests ?? [])
      .map((i) => i.interest)
      .filter(Boolean),
    socials: mapSocialLinks(me.socialLinks),
    education: (me.educations ?? []).map((e, i) => ({
      id: e.educationId ?? String(i),
      school: e.institutionName ?? "",
      degree: e.degree ?? "",
      fieldOfStudy: e.fieldOfStudy ?? "",
      startDate: e.startYear != null ? String(e.startYear) : "",
      endDate: e.endYear != null ? String(e.endYear) : "",
      description: e.description ?? "",
    })),
    stamps: mapStamps(me.stamps ?? me.achievements),
    memberSince: me.createdAt ?? "",
    role: (me.role ?? "student").toLowerCase() as ProfileData["role"],
  };
};

// Frontend (Partial<ProfileData>) → Backend PUT body (FLAT shape per Swagger)
const mapProfileDataToMePayload = (d: Partial<ProfileData>) => {
  const payload: Record<string, unknown> = {};
  if (d.firstName !== undefined) payload.firstName = d.firstName;
  if (d.lastName !== undefined) payload.lastName = d.lastName;
  if (d.phone !== undefined) {
    payload.phone = d.phone;
    payload.phoneNumber = d.phone;
  }
  if (d.avatar !== undefined) payload.avatarUrl = d.avatar;
  if (d.bio !== undefined) payload.bio = d.bio;
  if (d.country !== undefined) payload.country = d.country;
  if (d.city !== undefined) payload.city = d.city;
  if (d.skills) payload.skills = d.skills.map((skill) => ({ skill }));
  if (d.learningInterests)
    payload.interests = d.learningInterests.map((interest) => ({ interest }));
  if (d.education) {
    payload.educations = d.education.map((e) => ({
      institutionName: e.school,
      degree: e.degree,
      fieldOfStudy: e.fieldOfStudy,
      startYear: yearFromDate(e.startDate),
      endYear: yearFromDate(e.endDate),
      description: e.description,
    }));
  }
  return payload;
};

// In-memory mock store — simulates backend persistence within the session.
const mockProfile: ProfileData = {
  id: "1",
  firstName: "Dwyane",
  lastName: "J",
  username: "dwayne_j07",
  email: "dwaynej@gmail.com",
  phone: "9929324234234",
  avatar: "",
  bio: "Curious and driven student passionate about learning, creativity, and growth. Actively explores new ideas, builds skills, and strives for excellence while balancing academics, personal development, and future career goals.",
  headline:
    "Team Leader | MERN Stack Developer | React | Node | REST API | JavaScript | HTML5 | CSS3 | Redux",
  skills: [
    "React",
    "Web Dev",
    "UI/UX",
    "Database",
    "MongoDB",
    "TypeScript",
    "Node.js",
    "REST API",
    "HTML5",
    "CSS3",
    "Redux",
    "Git",
  ],
  learningInterests: [
    "Machine Learning",
    "Cloud Computing",
    "DevOps",
    "System Design",
    "Data Structures",
    "Algorithms",
    "Python",
    "Docker",
    "Kubernetes",
    "AWS",
  ],
  socials: {
    linkedin: "https://linkedin.com/in/dwaynej",
    github: "https://github.com/dwaynej",
    website: "",
    instagram: "",
    twitter: "",
  },
  education: [
    {
      id: "1",
      school: "Stanford University",
      degree: "Bachelor of Technology",
      fieldOfStudy:
        "Computer Science and Engineering with Specialization in AI, ML",
      startDate: "2021-10",
      endDate: "2025-08",
      description:
        "Bachelor of Technology in Computer Science and Engineering with Specialization in Artificial Intelligence, Machine Learning, and Data Science",
    },
    {
      id: "2",
      school: "MIT",
      degree: "Master of Science",
      fieldOfStudy: "Data Science",
      startDate: "2025-09",
      endDate: "2027-06",
      description:
        "Master of Science in Data Science with focus on Deep Learning and NLP",
    },
  ],
  stamps: [
    {
      id: "1",
      title: "AI Fundamentals Certificate",
      date: "Issued on 31 March 2026",
      courseId: "1",
    },
    { id: "2", title: "Web Development", date: "14 Apr 2026", courseId: "2" },
    {
      id: "3",
      title: "Data Science Bootcamp",
      date: "Issued on 20 Feb 2026",
      courseId: "3",
    },
    { id: "4", title: "React Mastery", date: "10 Jan 2026", courseId: "4" },
    { id: "5", title: "Python Advanced", date: "5 Dec 2025", courseId: "5" },
    {
      id: "6",
      title: "Cloud Architecture",
      date: "Issued on 15 Nov 2025",
      courseId: "6",
    },
  ],
  memberSince: "2024-01-15",
  role: "student",
};

const norm = (s: string) => s.trim().toLowerCase();
const dedupe = (list: string[]): string[] => {
  const seen = new Set<string>();
  return list.filter((s) => {
    const k = norm(s);
    if (!s.trim() || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

// ============= Service =============
export const profileService = {
  async getProfile(): Promise<ApiResponse<ProfileData>> {
    const user = await apiClient.get<GetMyProfileResponse>("/users/me");
    const p = user.profile ?? ({} as GetMyProfileResponse["profile"]);
    // console.log(user.skills);
    return {
      success: true,

      data: {
        id: user.id,
        firstName: p.firstName ?? "",
        lastName: p.lastName ?? "",
        username: (user.email ?? "").split("@")[0],
        email: user.email ?? "",
        phone: p.phone ?? (p as any).phoneNumber ?? (user as any).phone ?? (user as any).phoneNumber ?? "",
        avatar: extractAvatarUrl(user) || extractAvatarUrl(p) || "",
        bio: p.bio ?? "",
        headline: p.headline ?? "",
        country: p.country ?? (user as any).country ?? "",
        city: p.city ?? (user as any).city ?? (user as any).state ?? (p as any).state ?? "",
        skills: (user.skills ?? []).map((s) => s.skill).filter(Boolean),

        learningInterests: (user.interests ?? [])
          .map((i) => i.interest)
          .filter(Boolean),
        socials: mapSocialLinks(user.socialLinks),
        socialLink:
          (user.socialLinks && user.socialLinks.length > 0
            ? typeof user.socialLinks[0] === "string"
              ? user.socialLinks[0]
              : (user.socialLinks[0] as any)?.url || (user.socialLinks[0] as any)?.link || ""
            : "") ||
          (p as any)?.socialLink ||
          (user as any)?.socialLink ||
          "",
        education: (user.educations ?? []).map((e, i) => ({
          id: e.educationId ?? String(i),
          school: e.institutionName ?? "",
          degree: e.degree ?? "",
          fieldOfStudy: e.fieldOfStudy ?? "",
          startDate: e.startYear ? String(e.startYear) : "",
          endDate: e.endYear ? String(e.endYear) : "",
          description: e.description ?? "",
        })),
        stamps: [],
        memberSince: user.createdAt,
        role: (user.role ?? "student").toLowerCase() as ProfileData["role"],
      },
    };
  },

  async updateProfile(
    data: Partial<ProfileData>,
  ): Promise<ApiResponse<ProfileData>> {
    const body: Record<string, unknown> = {};
    if (data.firstName !== undefined) body.firstName = data.firstName;
    if (data.lastName !== undefined) body.lastName = data.lastName;
    if (data.phone !== undefined) {
      body.phone = data.phone;
      body.phoneNumber = data.phone;
    }
    if (data.avatar !== undefined && data.avatar !== null && data.avatar !== "") {
      body.avatarUrl = data.avatar;
      body.avatar = data.avatar;
    } else if (data.avatar === undefined) {
      try {
        const user = await apiClient.get<GetMyProfileResponse>("/users/me");
        const existingAvatar = extractAvatarUrl(user) || extractAvatarUrl(user?.profile) || "";
        if (existingAvatar) {
          body.avatarUrl = existingAvatar;
          body.avatar = existingAvatar;
        }
      } catch {
        /* non-fatal fallback */
      }
    }
    if (data.bio !== undefined) body.bio = data.bio;
    if (data.headline !== undefined) body.headline = data.headline;
    if (data.country !== undefined) body.country = data.country;
    if (data.city !== undefined) body.city = data.city;

    if (data.skills) body.skills = data.skills.map((skill) => ({ skill }));
    if (data.learningInterests)
      body.interests = data.learningInterests.map((interest) => ({ interest }));

    if (data.socialLink !== undefined) {
      body.socialLink = data.socialLink;
      if (!data.socials && data.socialLink) {
        body.socialLinks = [
          {
            platform: "WEBSITE",
            url: data.socialLink,
          },
        ];
      }
    }

    if (data.socials) {
      body.socialLinks = Object.entries(data.socials)
        .filter(([, url]) => !!url)
        .map(([platform, url]) => ({
          platform: platform.toUpperCase(),
          url,
        }));
    }

    if (data.education) {
      const isUuid = (v?: string) =>
        !!v &&
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
          v,
        );
      body.educations = data.education.map((e) => {
        const row: Record<string, unknown> = {
          institutionName: e.school,
          degree: e.degree,
          fieldOfStudy: e.fieldOfStudy,
          startYear: yearFromDate(e.startDate),
          endYear: yearFromDate(e.endDate),
          description: e.description,
        };
        if (isUuid(e.id)) row.educationId = e.id; // update existing; omit for new
        return row;
      });
    }

    // 1. PUT the full profile. 2. Wait. 3. Refetch — don't touch local state.
    await apiClient.put("/users/me", body);
    return this.getProfile();
  },

  async updateAvatar(file: File): Promise<ApiResponse<{ avatarUrl: string }>> {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const maxSizeBytes = 5 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      throw new Error(
        "Unsupported file type. Please choose a JPG, PNG, or WebP image.",
      );
    }

    if (file.size > maxSizeBytes) {
      throw new Error(
        "File is too large. Please choose an image smaller than 5MB.",
      );
    }

    const current = await this.getProfile();
    const userId = current.data.id;
    if (!userId) throw new Error("Cannot upload avatar: missing user id");

    console.info("[avatar-upload] step 1: requesting upload-url", {
      userId,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    });

    const upload = normalizeUploadUrlResponse(
      await apiClient.post<UploadUrlResult>(
        `/users/profile-picture/${userId}/upload-url`,
        { fileName: file.name },
        { headers: getAuthHeaders() },
      ),
    );

    console.info("[avatar-upload] step 1 response", upload);

    const presignedUrl = upload.presignedUrl || upload.uploadUrl;
    const fileKey = upload.fileKey;

    if (!presignedUrl || !fileKey) {
      throw new Error("Invalid upload-url response from server");
    }

    let uploadResponse: Response;
    const uploadRequestOptions: RequestInit = {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
      },
      body: file,
    };

    try {
      console.info("[avatar-upload] step 2: uploading to S3", {
        presignedUrl,
        fileKey,
        file: {
          name: file.name,
          type: file.type,
          size: file.size,
        },
      });

      const contentType = file.type || "application/octet-stream";

      uploadResponse = await fetch(presignedUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": contentType,
        },
      });

      console.log({
        fileName: file.name,
        fileType: file.type,
        contentType,
      });
    } catch (error) {
      console.error("[avatar-upload] step 2 failed", {
        presignedUrl,
        file: {
          name: file.name,
          type: file.type,
          size: file.size,
        },
        requestOptions: uploadRequestOptions,
        error,
      });
      throw error;
    }

    if (!uploadResponse.ok && uploadResponse.status !== 204) {
      throw new Error(`S3 upload failed with status ${uploadResponse.status}`);
    }

    console.info("[avatar-upload] step 3: saving profile picture", {
      fileKey,
      userId,
    });

    const saveResponse = await apiClient.post(
      `/users/profile-picture?fileKey=${encodeURIComponent(fileKey)}`,
      {},
      {
        headers: getAuthHeaders(),
      },
    );

    console.info("[avatar-upload] step 3 response", saveResponse);

    console.info("[avatar-upload] step 4: refreshing profile");
    const refreshed = await this.getProfile();
    console.info("[avatar-upload] step 4 response", refreshed);

    const uploadedAvatar =
      extractAvatarUrl(saveResponse) ||
      extractAvatarUrl((saveResponse as any)?.data) ||
      refreshed.data.avatar ||
      "";

    if (uploadedAvatar) {
      try {
        await apiClient.put("/users/me", { avatarUrl: uploadedAvatar, avatar: uploadedAvatar });
      } catch {
        /* non-fatal */
      }
    }

    return { success: true, data: { avatarUrl: uploadedAvatar } };
  },

  /**
   * Suggest skills/interests for autocomplete.
   * Backend suggestion API is not documented yet.
   */
  async suggestSkills(query: string): Promise<ApiResponse<string[]>> {
    if (!query.trim()) {
      return {
        success: true,
        data: [],
      };
    }

    const data = await apiClient.get<string[]>(
      `/users/search-skills?skillName=${encodeURIComponent(query)}`,
    );

    return {
      success: true,
      data,
    };
  },

  /**
   * Add a skill to either the skills list or learning interests.
   * Backend persistence: PUT /users/me.
   */
  async addSkill(
    field: SkillField,
    value: string,
  ): Promise<ApiResponse<{ items: string[] }>> {
    const current = await this.getProfile();

    const next = [...current.data[field], value];

    await this.updateProfile({
      firstName: current.data.firstName,
      lastName: current.data.lastName,
      phone: current.data.phone,
      avatar: current.data.avatar,
      bio: current.data.bio,
      headline: current.data.headline,
      socials: current.data.socials,
      education: current.data.education,
      skills: field === "skills" ? next : current.data.skills,
      learningInterests:
        field === "learningInterests" ? next : current.data.learningInterests,
    });

    return {
      success: true,
      data: {
        items: next,
      },
    };
  },
  /**
   * Remove a skill from either the skills list or learning interests.
   * Backend persistence: PUT /users/me.
   */
  async removeSkill(
    field: SkillField,
    value: string,
  ): Promise<ApiResponse<{ items: string[] }>> {
    const current = await this.getProfile();

    const next = current.data[field].filter(
      (s) => s.toLowerCase() !== value.toLowerCase(),
    );

    await this.updateProfile({
      firstName: current.data.firstName,
      lastName: current.data.lastName,
      phone: current.data.phone,
      avatar: current.data.avatar,
      bio: current.data.bio,
      headline: current.data.headline,
      socials: current.data.socials,
      education: current.data.education,
      skills: field === "skills" ? next : current.data.skills,
      learningInterests:
        field === "learningInterests" ? next : current.data.learningInterests,
    });

    return {
      success: true,
      data: {
        items: next,
      },
    };
  },

  async addEducation(
    edu: Omit<Education, "id">,
  ): Promise<ApiResponse<Education>> {
    if (MOCK_MODE) {
      await new Promise((r) => setTimeout(r, 500));
      const created = { ...edu, id: Date.now().toString() };
      mockProfile.education.push(created);
      return { success: true, data: created };
    }
    const current = await this.getProfile();
    const created = { ...edu, id: Date.now().toString() };
    await this.updateProfile({
      education: [...current.data.education, created],
    });
    return { success: true, data: created };
  },

  async updateEducation(
    id: string,
    edu: Partial<Education>,
  ): Promise<ApiResponse<Education>> {
    if (MOCK_MODE) {
      await new Promise((r) => setTimeout(r, 500));
      const idx = mockProfile.education.findIndex((e) => e.id === id);
      if (idx >= 0)
        mockProfile.education[idx] = {
          ...mockProfile.education[idx],
          ...edu,
          id,
        };
      return { success: true, data: mockProfile.education[idx] };
    }
    const current = await this.getProfile();
    const nextEducation = current.data.education.map((item) =>
      item.id === id ? { ...item, ...edu, id } : item,
    );
    await this.updateProfile({ education: nextEducation });
    const updated = nextEducation.find((item) => item.id === id);
    if (!updated) {
      throw { success: false, message: "Education not found", statusCode: 404 };
    }
    return { success: true, data: updated };
  },

  async getStamps(): Promise<ApiResponse<Stamp[]>> {
    if (MOCK_MODE) {
      await new Promise((r) => setTimeout(r, 400));
      return { success: true, data: mockProfile.stamps };
    }
    const current = await this.getProfile();
    return { success: true, data: current.data.stamps };
  },
};
