import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { meetingService } from "@/services/meeting.service";
import type { MeetingResource } from "@/types/meeting.types";
import { ResourceListTable } from "@/components/meetings/ResourceListTable";

interface InstructorResourceListProps {
  onUpload: () => void;
}

const InstructorResourceList = ({ onUpload }: InstructorResourceListProps) => {
  const { toast } = useToast();

  const [items, setItems] = useState<MeetingResource[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const res = await meetingService.getResources();

      if (res.success) {
        setItems(res.data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onDownload = async (id: string) => {
    try {
      const res = await meetingService.downloadResource(id);

      if (res.success) {
        window.open(res.data.url, "_blank");
        load();
      }
    } catch (e) {
      toast({
        title: "Download failed",
        description: (e as Error).message,
        variant: "destructive",
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
    
      <ResourceListTable
        resources={items}
        loading={loading}
        onDownload={onDownload}
      />
    </motion.div>
  );
};

export default InstructorResourceList;
