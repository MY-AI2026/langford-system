import { Course } from "@/lib/types";
export type { Course };
import {
  fetchCollection,
  createSubscription,
  restCreate,
  restUpdate,
  restDelete,
} from "@/lib/firebase/rest-helpers";

export type CourseInput = Omit<Course, "id" | "createdAt" | "updatedAt">;

/** REST-based polling subscription (replaces onSnapshot) */
export function subscribeToCourses(
  callback: (courses: Course[]) => void
): () => void {
  return createSubscription<Course>(
    async () => {
      return (await fetchCollection(
        "courses",
        "createdAt",
        "DESCENDING"
      )) as Course[];
    },
    callback
  );
}

export async function createCourse(data: CourseInput): Promise<string> {
  const now = new Date();
  return restCreate("courses", {
    ...data,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateCourse(
  courseId: string,
  data: Partial<CourseInput>
): Promise<void> {
  await restUpdate(`courses/${courseId}`, {
    ...data,
    updatedAt: new Date(),
  });
}

export async function deleteCourse(courseId: string): Promise<void> {
  await restDelete(`courses/${courseId}`);
}
