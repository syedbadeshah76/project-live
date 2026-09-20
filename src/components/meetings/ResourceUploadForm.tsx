import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { meetingService } from "@/services/meeting.service";
import {
  resourceUploadSchema,
  type ResourceUploadFormValues,
} from "@/lib/meeting-validation";
import { ApprovedCourseDropdown } from "./ApprovedCourseDropdown";
import { ResourceUploader } from "./ResourceUploader";

interface ResourceUploadFormProps {
  onSuccess?: () => void;
  onViewAll?: () => void;
}

export const ResourceUploadForm = ({
  onSuccess,
  onViewAll,
}: ResourceUploadFormProps) => {
  const { toast } = useToast();

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ResourceUploadFormValues>({
    resolver: zodResolver(resourceUploadSchema),
    mode: "onChange",
    defaultValues: {
      title: "",
      description: "",
      courseId: "",
      file: undefined,
    },
  });

  const onSubmit = async (values: ResourceUploadFormValues) => {
    try {
      const res = await meetingService.uploadResource({
        title: values.title,
        description: values.description,
        courseId: values.courseId,
        file: values.file,
      });

     if (res.success) {
  toast({
    title: "Resource uploaded",
    description: res.message,
  });

  reset();

  // Switch to the Resource List
  onSuccess?.();
      }
    } catch (e) {
      toast({
        title: "Upload failed",
        description: (e as Error).message,
        variant: "destructive",
      });
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-xl bg-white border border-gray-200 shadow-sm p-6 space-y-5 relative"
    >
      <div className="absolute right-6 top-6">
        <Button type="button" variant="outline" size="sm" onClick={onViewAll}>
          View All
        </Button>
      </div>

      <div>
        <label className="block text-xs tracking-wider text-gray-500 mb-1.5">
          TITLE
        </label>

        <Input placeholder="Enter resource title" {...register("title")} />

        {errors.title && (
          <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>
        )}
      </div>

      <div>
        <label className="block text-xs tracking-wider text-gray-500 mb-1.5">
          DESCRIPTION
        </label>

        <Textarea rows={5} {...register("description")} />

        {errors.description && (
          <p className="mt-1 text-xs text-red-600">
            {errors.description.message}
          </p>
        )}
      </div>

      <div>
        <label className="block text-xs tracking-wider text-gray-500 mb-1.5">
          UPLOAD
        </label>

        <Controller
          control={control}
          name="file"
          render={({ field }) => (
            <ResourceUploader
              file={(field.value as File) ?? null}
              onFile={(f) => field.onChange(f as File)}
              error={errors.file?.message as string | undefined}
            />
          )}
        />
      </div>

      <div>
        <label className="block text-xs tracking-wider text-gray-500 mb-1.5">
          SELECT COURSE
        </label>

        <Controller
          control={control}
          name="courseId"
          render={({ field }) => (
            <ApprovedCourseDropdown
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />

        {errors.courseId && (
          <p className="mt-1 text-xs text-red-600">{errors.courseId.message}</p>
        )}
      </div>

      <div className="flex justify-center pt-2">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="px-10 bg-blue-600 hover:bg-blue-700"
        >
          {isSubmitting ? "Uploading..." : "Submit"}
        </Button>
      </div>
    </form>
  );
};
