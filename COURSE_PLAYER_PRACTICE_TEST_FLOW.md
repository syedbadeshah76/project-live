# Course Player: 100% Progress "Take Test" & Practice Test Flow Specification

## 1. Overview & Objectives
When a student completes all lessons in a course and their course progress reaches **100%**, the Course Player unlocks the **“Take Test”** action. This action connects the course completion lifecycle directly to the instructor-created Practice Test for that specific course and unlocks the course certificate upon passing.

---

## 2. Complete End-to-End Architectural & User Flow

```
+-----------------------------------------------------------------------------------+
| 1. All Lessons Completed -> Progress Reaches 100%                                 |
|    - Progress Bar updates to 100%                                                 |
|    - "Completed" Badge & "Take Test" Button appear under video / completion state |
+-----------------------------------------------------------------------------------+
                                         |
                                         v (Student clicks "Take Test")
+-----------------------------------------------------------------------------------+
| 2. Course Practice Test Discovery & Verification                                  |
|    - System checks for Practice Test linked strictly to current `courseId`:       |
|      a. `GET /api/quizzes/course/{courseId}/practice-tests`                       |
|      b. `GET /api/quizzes/course/{courseId}`                                      |
|      c. `GET /api/quizzes?quizType=PRACTICE` filtered by `courseId`               |
+-----------------------------------------------------------------------------------+
                   /                                   \
  (No Test Exists)/                                     \(Test Exists for Course)
                 v                                       v
+------------------------------------+  +--------------------------------------------------+
| 3A. "No Test Available" Notification|  | 3B. Navigate to Practice Test Overview           |
|  - Display clear toast / message:  |  |  - Route: `/dashboard/practice-tests/{testId}`   |
|    "No Practice Test is available  |  |  - Displays instructor-created test details:     |
|    for this course yet."           |  |    * Title, duration, question count             |
|  - Student stays in Course Player  |  |    * Instructor-configured passing percentage    |
+------------------------------------+  +--------------------------------------------------+
                                                                 |
                                                                 v (Student clicks "Start Test")
                                        +--------------------------------------------------+
                                        | 4. Attempt Runner & Evaluation                   |
                                        |  - POST `/api/quizzes/{quiz_id}/attempts`        |
                                        |  - Student answers questions & submits test      |
                                        |  - Evaluates score using instructor's configured |
                                        |    `passingPercentage` (pass: score% >= pass%)   |
                                        +--------------------------------------------------+
                                                                 |
                                                                 v
                                        +--------------------------------------------------+
                                        | 5. Result & Certificate Unlock Flow              |
                                        |  - If Passed (score% >= passPercentage):         |
                                        |    * Unlock certificate via existing flow        |
                                        |      (`certificatesService.requestCertificate`)  |
                                        |    * Show Success Banner & Certificate Actions:  |
                                        |      - Download Certificate PDF                  |
                                        |      - View in Certificates Dashboard            |
                                        |  - If Failed (score% < passPercentage):          |
                                        |    * Show score, required passing %, and Retake  |
                                        +--------------------------------------------------+
```

---

## 3. Detailed Component Specifications

### 3.1 Course Player (`CoursePlayer.tsx`)
- **100% Progress Trigger**:
  - Automatically recognizes when all module lessons are completed (`progressPercentage >= 100` or `isCourseCompleted`).
  - Displays the **"Completed"** badge alongside the **"Take Test"** button (`<ClipboardList className="h-4 w-4" /> Take Test`).
- **Take Test Handler (`handleTestUnlock`)**:
  - Queries `practiceTestService.getPracticeTests(courseId)` and `quizService.getCourseQuiz(courseId)` strictly targeting `courseId`.
  - If a practice test matching the course exists:
    - Navigates the student to `/dashboard/practice-tests/${testId}`.
  - If no practice test exists for the course:
    - Displays an informative notification: `"No Practice Test is available for this course yet."`
    - Prevents redirection to unrelated or random quizzes.
- **Isolation of Module Quizzes**:
  - Existing lesson/module quizzes remain untouched and continue to operate inside their respective modules with `QuizRunner`.

### 3.2 Practice Test Service (`practiceTestService.ts`)
- **Course-Specific Practice Test Retrieval**:
  - `getPracticeTests(courseId)`: Specifically targets quizzes belonging to `courseId`.
  - Ensures accurate extraction of:
    - `id` / `quizId`
    - `courseId`
    - `title`
    - `passPercentage` / `passingPercentage` (set by instructor)
    - `durationMinutes`
    - `questionCount`
- **Result & Evaluation**:
  - Uses the instructor-configured `passPercentage` to evaluate `passed = scorePercentage >= passPercentage`.
  - Preserves attempt history and results.

### 3.3 Practice Test Details (`PracticeTestDetailsPage.tsx`)
- Displays the instructor's test specifications:
  - Exact course practice test title and description.
  - Number of questions, duration in minutes, and the instructor's configured passing percentage badge (`${details.passPercentage}%`).
  - Student attempt history and "Start Test" CTA.

### 3.4 Practice Test Result & Certificate Unlocking (`PracticeTestResultPage.tsx`)
- **Certificate Unlock Condition**:
  - When the student passes the test (`result.passed === true` / `scorePercentage >= passPercentage`):
    - Automatically invokes the platform's existing certificate unlock service (`certificatesService.requestCertificate(courseId)`).
    - Unlocks certificate eligibility for the course.
    - Displays Certificate Claim/Download UI:
      - **"Certificate Unlocked!"** highlight with certificate number / details.
      - **"Download Certificate PDF"** using `generateCertificatePDF`.
      - **"View All Certificates"** link to `/dashboard/certificates`.
  - When the student does not meet the passing percentage:
    - Shows score achieved vs required passing percentage, with performance insights and "Retake Test" option (subject to `maxAttempts`).

---

## 4. Preservation & Safety Rules
1. **Existing Quiz Safety**: The module-level quiz system (`useModuleQuiz`, `QuizRunner`, lesson quizzes) is completely preserved and unaffected.
2. **Existing Certificate API Reused**: No separate certificate endpoint is introduced; standard `certificatesService.requestCertificate(courseId)` and `generateCertificatePDF` are used.
3. **Strict Course Association**: Tests from other courses or arbitrary categories are never shown for the current course.
