import { beforeEach, describe, expect, it, vi } from "vitest";

const { getProfileMock, postMock, putMock, fetchMock } = vi.hoisted(() => ({
  getProfileMock: vi.fn(),
  postMock: vi.fn(),
  putMock: vi.fn(),
  fetchMock: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    get: getProfileMock,
    post: postMock,
    put: putMock,
  },
  extractAvatarUrl: vi.fn(() => ""),
}));

import { profileService } from "./profile.service";

describe("profileService.updateAvatar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("tenantId", "tenant-123");
    localStorage.setItem("accessToken", "test-token");
    getProfileMock.mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      role: "STUDENT",
      skills: [],
      interests: [],
      educations: [],
      socialLinks: [],
      createdAt: "2024-01-01",
      updatedAt: "2024-01-01",
      lastLoginAt: "2024-01-01",
      lastLogoutAt: null,
      profile: {
        profileId: "profile-123",
        firstName: "Test",
        lastName: "User",
        avatarUrl: "",
        bio: "",
        phone: "",
        country: "",
        city: "",
        phoneVerified: false,
        language: "en",
        timezone: "UTC",
        dateOfBirth: null,
        occupation: null,
      },
    });
    postMock
      .mockResolvedValueOnce({
        presignedUrl: "https://bucket.s3.amazonaws.com/profile.png",
        fileKey: "profile-pictures/user-123/profile.png",
      })
      .mockResolvedValueOnce({});
    fetchMock.mockResolvedValue({ ok: true, status: 200 } as Response);
    vi.stubGlobal("fetch", fetchMock);
  });

  it("sends the documented upload URL, S3 upload, and save-profile requests", async () => {
    const file = new File(["binary-content"], "profile.png", {
      type: "image/png",
    });

    await profileService.updateAvatar(file);

    expect(postMock).toHaveBeenNthCalledWith(
      1,
      "/users/profile-picture/user-123/upload-url",
      { fileName: "profile.png" },
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
          "X-Tenant-Id": "tenant-123",
        }),
      }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://bucket.s3.amazonaws.com/profile.png",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          "Content-Type": "image/png",
        }),
        body: expect.any(File),
      }),
    );

    expect(postMock).toHaveBeenNthCalledWith(
      2,
      "/users/profile-picture?fileKey=profile-pictures%2Fuser-123%2Fprofile.png",
      {},
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
          "X-Tenant-Id": "tenant-123",
        }),
      }),
    );
  });
});

describe("profileService.updateProfile phone payload mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    putMock.mockResolvedValue({});
    getProfileMock.mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      profile: {
        firstName: "Test",
        lastName: "User",
        phone: "+91 9876543210",
      },
    });
  });

  it("sends both phone and phoneNumber fields in payload when updating profile", async () => {
    await profileService.updateProfile({
      firstName: "Syed",
      lastName: "Mohiuddin",
      phone: "+91 9876543210",
    });

    expect(putMock).toHaveBeenCalledWith(
      "/users/me",
      expect.objectContaining({
        firstName: "Syed",
        lastName: "Mohiuddin",
        phone: "+91 9876543210",
        phoneNumber: "+91 9876543210",
      }),
    );
  });

  it("retrieves and maps country and city properly", async () => {
    getProfileMock.mockResolvedValueOnce({
      id: "user-456",
      email: "student@example.com",
      role: "STUDENT",
      profile: {
        firstName: "Jane",
        lastName: "Doe",
        country: "United States",
        city: "California",
      },
    });

    const res = await profileService.getProfile();
    expect(res.data.country).toBe("United States");
    expect(res.data.city).toBe("California");
  });

  it("sends country and city when updating profile", async () => {
    await profileService.updateProfile({
      country: "India",
      city: "Maharashtra",
    });

    expect(putMock).toHaveBeenCalledWith(
      "/users/me",
      expect.objectContaining({
        country: "India",
        city: "Maharashtra",
      }),
    );
  });
});
