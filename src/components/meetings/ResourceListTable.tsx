import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ResourceFileIcon } from "./ResourceFileIcon";
import type { MeetingResource } from "@/types/meeting.types";
interface Props {
  resources: MeetingResource[];
  loading?: boolean;
  onDownload: (id: string) => void;
}

const formatSize = (b: number) =>
  b >= 1024 * 1024
    ? `${(b / 1024 / 1024).toFixed(1)} MB`
    : b >= 1024
      ? `${(b / 1024).toFixed(1)} KB`
      : `${b} B`;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export const ResourceListTable = ({
  resources,
  loading,
  onDownload,
}: Props) => {
  if (loading) {
    return (
      <div className="p-8 text-center text-sm text-gray-500">
        Loading resources...
      </div>
    );
  }
  if (!resources.length) {
    return (
      <div className="p-12 text-center text-sm text-gray-500">
        No resources uploaded yet.
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-500 tracking-wider">
            <th className="text-left font-normal px-6 py-4">NAME</th>
            <th className="text-left font-normal px-4 py-4">TYPE</th>
            <th className="text-left font-normal px-4 py-4">SIZE</th>
            <th className="text-left font-normal px-4 py-4">UPLOADED</th>
            <th className="text-left font-normal px-4 py-4">DOWNLOADS</th>
            <th className="text-left font-normal px-4 py-4">ACTION</th>
          </tr>
        </thead>
        <tbody>
          {resources.map((r) => (
            <tr key={r.id} className="border-t border-gray-100">
              <td className="px-6 py-4">
                <div className="flex items-start gap-3">
                  <ResourceFileIcon type={r.type} />
                  <div>
                    <p className="font-medium text-gray-900">{r.title}</p>
                    <p className="text-gray-500 text-xs mt-0.5 max-w-md">
                      {r.description}
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-4">
                <Badge
                  variant="outline"
                  className="text-blue-600 border-blue-200 rounded-full"
                >
                  {r.type.charAt(0).toUpperCase() + r.type.slice(1)}
                </Badge>
              </td>
              <td className="px-4 py-4 text-gray-700">
                {formatSize(r.fileSize)}{" "}
              </td>
              <td className="px-4 py-4 text-gray-700">
                {formatDate(r.uploadedAt)}
              </td>
              <td className="px-4 py-4 text-gray-700">
                <span className="inline-flex items-center gap-1">
                  <Download className="w-4 h-4" /> {r.downloads}
                </span>
              </td>
              <td className="px-4 py-4">
                <Button
                  size="sm"
                  variant="secondary"
                  className="bg-blue-50 text-blue-700 hover:bg-blue-100"
                  onClick={() => onDownload(r.id)}
                >
                  Download
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
