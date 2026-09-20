# Backend Auth Guards (Spring Boot)

The React app authenticates with JWT bearer tokens via the existing Axios
interceptor (`src/lib/api-client.ts`). The backend MUST enforce these guards
server-side — never trust the client.

## Required guards

| Endpoint group                     | Required role(s)            | Notes |
| ---------------------------------- | --------------------------- | ----- |
| `GET /api/courses`                 | public                      | Listing OK without auth |
| `GET /api/courses/{id}`            | public                      | Public detail (no enrolment data) |
| `GET /api/courses/{id}/full`       | STUDENT (enrolled) / ADMIN  | Full curriculum + video URLs |
| `POST /api/enrollments`            | STUDENT                     | Self-enrol only |
| `GET /api/courses/{id}/progress`   | STUDENT (owner)             | `@PreAuthorize("#userId == authentication.principal.id")` |
| `POST /api/courses/{id}/lessons/{lessonId}/complete` | STUDENT (enrolled) | |
| `GET /api/courses/{id}/notes`      | STUDENT (owner)             | |
| `POST /api/courses/{id}/notes`     | STUDENT (enrolled)          | |
| `PUT /api/notes/{id}`              | STUDENT (owner)             | |
| `DELETE /api/notes/{id}`           | STUDENT (owner)             | |
| `GET /api/courses/{id}/reviews`    | public                      | |
| `POST /api/courses/{id}/reviews`   | STUDENT (enrolled)          | |
| `POST /api/reviews/{id}/helpful`   | authenticated               | One vote per user |
| `GET /api/quizzes`                 | STUDENT / INSTRUCTOR / ADMIN | |
| `POST /api/quizzes/{id}/attempts`  | STUDENT                     | |
| `GET /api/leaderboard/{quizId}`    | STUDENT / ADMIN             | |
| `POST /api/quizzes`                | INSTRUCTOR / ADMIN          | |
| `GET /api/admin/**`                | ADMIN                       | |
| `GET /api/instructor/**`           | INSTRUCTOR / ADMIN          | |

## Spring Security sketch

```java
@EnableMethodSecurity
@Configuration
public class SecurityConfig {
  @Bean
  SecurityFilterChain filter(HttpSecurity http) throws Exception {
    http
      .csrf(c -> c.disable())
      .sessionManagement(s -> s.sessionCreationPolicy(STATELESS))
      .authorizeHttpRequests(a -> a
        .requestMatchers(GET, "/api/courses", "/api/courses/*",
                              "/api/courses/*/reviews").permitAll()
        .requestMatchers("/api/admin/**").hasRole("ADMIN")
        .requestMatchers("/api/instructor/**").hasAnyRole("INSTRUCTOR","ADMIN")
        .anyRequest().authenticated())
      .oauth2ResourceServer(o -> o.jwt());
    return http.build();
  }
}
```

Use `@PreAuthorize("hasRole('STUDENT') and @enrolService.isEnrolled(#courseId, principal.id)")`
on lesson/notes/progress endpoints to enforce per-resource ownership.
