import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ResourceUploadForm } from "./ResourceUploadForm";
import { ResourceListTable } from "./ResourceListTable";

type ResourceView = "upload" | "list";

interface ResourcesSectionProps {
  /** Optional callback fired after a successful upload (e.g. toast/refetch) */
  onUploaded?: () => void;
}

/**
 * Self-contained Resources view for the Instructor Live Classes page.
 * Toggles between the Upload Form and the Resource List using local
 * component state only — no routing, no modals, no navigation.
 */
const ResourcesSection = ({ onUploaded }: ResourcesSectionProps) => {
  const [view, setView] = useState<ResourceView>("upload");

  return (
    <div className="w-full">
      {/* Top-right action button — swaps based on current view */}
      <div className="flex justify-end mb-4">
        {view === "upload" ? (
          <Button
            variant="outline"
            onClick={() => setView("list")}
            className="font-medium"
          >
            View All
          </Button>
        ) : (
          <Button
            onClick={() => setView("upload")}
            className="font-medium bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Upload
          </Button>
        )}
      </div>

      {view === "upload" ? (
        <ResourceUploadForm
          onSuccess={() => {
            onUploaded?.();
            setView("list");
          }}
        />
      ) : (
        <ResourceListTable
          resources={[]}
          loading={false}
          onDownload={() => {}}
        />
      )}
    </div>
  );
};

export default ResourcesSection;
